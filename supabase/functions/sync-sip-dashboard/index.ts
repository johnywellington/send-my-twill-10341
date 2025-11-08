import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TwilioCredential {
  sid: string;
  username: string;
  account_sid: string;
  credential_list_sid: string;
  date_created: string;
}

interface VonageEndpoint {
  id: string;
  username: string;
  domain: string;
  application_id: string;
}

interface SyncResult {
  provider: 'twilio' | 'vonage';
  api_data: TwilioCredential | VonageEndpoint;
  db_data?: any;
  status: 'synced' | 'orphaned' | 'missing';
}

// Buscar todos os credentials de um CredentialList no Twilio
async function getTwilioCredentials(accountSid: string, authToken: string) {
  try {
    const authHeader = `Basic ${btoa(`${accountSid}:${authToken}`)}`;
    
    // Primeiro, buscar todas as CredentialLists
    const listsResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/SIP/CredentialLists.json`,
      { headers: { 'Authorization': authHeader } }
    );
    
    if (!listsResponse.ok) {
      throw new Error(`Twilio API error: ${listsResponse.status}`);
    }
    
    const listsData = await listsResponse.json();
    const credentialLists = listsData.credential_lists || [];
    
    console.log(`[Twilio] Found ${credentialLists.length} credential lists`);
    
    // Para cada CredentialList, buscar suas credentials
    const allCredentials: TwilioCredential[] = [];
    
    for (const list of credentialLists) {
      const credsResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/SIP/CredentialLists/${list.sid}/Credentials.json`,
        { headers: { 'Authorization': authHeader } }
      );
      
      if (credsResponse.ok) {
        const credsData = await credsResponse.json();
        const credentials = (credsData.credentials || []).map((cred: any) => ({
          sid: cred.sid,
          username: cred.username,
          account_sid: accountSid,
          credential_list_sid: list.sid,
          date_created: cred.date_created,
        }));
        
        allCredentials.push(...credentials);
      }
    }
    
    console.log(`[Twilio] Total credentials found: ${allCredentials.length}`);
    return allCredentials;
  } catch (error) {
    console.error('[Twilio] Error fetching credentials:', error);
    throw error;
  }
}

// Buscar todos os endpoints de uma aplicação Vonage
async function getVonageEndpoints(apiKey: string, apiSecret: string, appId: string) {
  try {
    const response = await fetch(
      `https://api.nexmo.com/v1/applications/${appId}/endpoints`,
      {
        headers: {
          'Authorization': `Basic ${btoa(`${apiKey}:${apiSecret}`)}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Vonage API error: ${response.status}`);
    }
    
    const data = await response.json();
    const endpoints = (data._embedded?.endpoints || []).map((ep: any) => ({
      id: ep.id,
      username: ep.username,
      domain: ep.sip?.uri?.split('@')[1] || 'sip.nexmo.com',
      application_id: appId,
    }));
    
    console.log(`[Vonage] Found ${endpoints.length} endpoints`);
    return endpoints;
  } catch (error) {
    console.error('[Vonage] Error fetching endpoints:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) throw new Error('Unauthorized');

    console.log('[Dashboard Sync] Starting comprehensive sync...');

    // Buscar credenciais
    const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const vonageKey = Deno.env.get('VONAGE_API_KEY');
    const vonageSecret = Deno.env.get('VONAGE_API_SECRET');

    // Buscar usuários do BD
    const { data: dbUsers, error: dbError } = await supabase
      .from('sip_users')
      .select('*')
      .eq('user_id', user.id);

    if (dbError) throw dbError;

    const results: SyncResult[] = [];

    // === TWILIO ===
    if (twilioSid && twilioToken) {
      try {
        const twilioCredentials = await getTwilioCredentials(twilioSid, twilioToken);
        
        // Comparar com BD
        for (const apiCred of twilioCredentials) {
          const dbMatch = dbUsers?.find(
            u => u.provider === 'twilio' && u.twilio_credential_sid === apiCred.sid
          );
          
          results.push({
            provider: 'twilio',
            api_data: apiCred,
            db_data: dbMatch || undefined,
            status: dbMatch ? 'synced' : 'missing',
          });
        }
        
        // Buscar órfãos (só no BD)
        const twilioDbUsers = dbUsers?.filter(u => u.provider === 'twilio') || [];
        for (const dbUser of twilioDbUsers) {
          const apiMatch = twilioCredentials.find(c => c.sid === dbUser.twilio_credential_sid);
          
          if (!apiMatch && dbUser.twilio_credential_sid) {
            results.push({
              provider: 'twilio',
              api_data: {
                sid: dbUser.twilio_credential_sid,
                username: dbUser.sip_username,
                account_sid: twilioSid,
                credential_list_sid: dbUser.twilio_credlist_sid || 'N/A',
                date_created: dbUser.created_at,
              },
              db_data: dbUser,
              status: 'orphaned',
            });
          }
        }
      } catch (error) {
        console.error('[Dashboard Sync] Twilio error:', error);
      }
    }

    // === VONAGE ===
    if (vonageKey && vonageSecret) {
      try {
        // Buscar todas as aplicações Vonage configuradas
        const { data: vonageConfigs } = await supabase
          .from('sip_provider_config')
          .select('config_value, domain_group_id')
          .eq('provider', 'vonage')
          .eq('config_key', 'app_id');

        for (const config of vonageConfigs || []) {
          const vonageEndpoints = await getVonageEndpoints(vonageKey, vonageSecret, config.config_value);
          
          // Comparar com BD
          for (const apiEndpoint of vonageEndpoints) {
            const dbMatch = dbUsers?.find(
              u => u.provider === 'vonage' && u.vonage_endpoint_id === apiEndpoint.id
            );
            
            results.push({
              provider: 'vonage',
              api_data: apiEndpoint,
              db_data: dbMatch || undefined,
              status: dbMatch ? 'synced' : 'missing',
            });
          }
          
          // Buscar órfãos (só no BD)
          const vonageDbUsers = dbUsers?.filter(
            u => u.provider === 'vonage' && u.domain_group_id === config.domain_group_id
          ) || [];
          
          for (const dbUser of vonageDbUsers) {
            const apiMatch = vonageEndpoints.find((e: VonageEndpoint) => e.id === dbUser.vonage_endpoint_id);
            
            if (!apiMatch && dbUser.vonage_endpoint_id) {
              results.push({
                provider: 'vonage',
                api_data: {
                  id: dbUser.vonage_endpoint_id,
                  username: dbUser.sip_username,
                  domain: dbUser.sip_domain,
                  application_id: config.config_value,
                },
                db_data: dbUser,
                status: 'orphaned',
              });
            }
          }
        }
      } catch (error) {
        console.error('[Dashboard Sync] Vonage error:', error);
      }
    }

    console.log(`[Dashboard Sync] Complete: ${results.length} items processed`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        total_checked: results.length,
        synced: results.filter(r => r.status === 'synced').length,
        orphaned: results.filter(r => r.status === 'orphaned').length,
        missing: results.filter(r => r.status === 'missing').length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Dashboard Sync] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        results: [],
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
