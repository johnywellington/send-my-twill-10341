import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Buscar todos os credentials do Twilio e encontrar pelo username
async function findTwilioCredentialByUsername(accountSid: string, authToken: string, username: string) {
  try {
    const authHeader = `Basic ${btoa(`${accountSid}:${authToken}`)}`;
    
    // Buscar todas as CredentialLists
    const listsResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/SIP/CredentialLists.json`,
      { headers: { 'Authorization': authHeader } }
    );
    
    if (!listsResponse.ok) return null;
    
    const listsData = await listsResponse.json();
    const credentialLists = listsData.credential_lists || [];
    
    // Para cada lista, buscar credentials
    for (const list of credentialLists) {
      const credsResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/SIP/CredentialLists/${list.sid}/Credentials.json`,
        { headers: { 'Authorization': authHeader } }
      );
      
      if (credsResponse.ok) {
        const credsData = await credsResponse.json();
        const credentials = credsData.credentials || [];
        
        const found = credentials.find((cred: any) => cred.username === username);
        if (found) {
          return {
            credential_sid: found.sid,
            credlist_sid: list.sid,
          };
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('[Twilio Recovery] Error:', error);
    return null;
  }
}

// Buscar endpoints da Vonage pelo username
async function findVonageEndpointByUsername(apiKey: string, apiSecret: string, appId: string, username: string) {
  try {
    const response = await fetch(
      `https://api.nexmo.com/v1/applications/${appId}/endpoints`,
      {
        headers: {
          'Authorization': `Basic ${btoa(`${apiKey}:${apiSecret}`)}`,
        },
      }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const endpoints = data._embedded?.endpoints || [];
    
    const found = endpoints.find((ep: any) => ep.username === username);
    return found ? { endpoint_id: found.id } : null;
  } catch (error) {
    console.error('[Vonage Recovery] Error:', error);
    return null;
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

    console.log('[SIP Recovery] Starting recovery of missing IDs...');

    // Credenciais
    const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const vonageKey = Deno.env.get('VONAGE_API_KEY');
    const vonageSecret = Deno.env.get('VONAGE_API_SECRET');

    // Buscar usuários SIP sem IDs
    const { data: sipUsers, error: fetchError } = await supabase
      .from('sip_users')
      .select('*')
      .eq('user_id', user.id);

    if (fetchError) throw fetchError;

    let recovered = 0;
    let failed = 0;
    const details: any[] = [];

    // === RECUPERAR TWILIO ===
    if (twilioSid && twilioToken) {
      const twilioUsers = sipUsers?.filter(
        u => u.provider === 'twilio' && (!u.twilio_credlist_sid || !u.twilio_credential_sid)
      ) || [];
      
      console.log(`[SIP Recovery] Found ${twilioUsers.length} Twilio users to recover`);
      
      for (const user of twilioUsers) {
        const result = await findTwilioCredentialByUsername(twilioSid, twilioToken, user.sip_username);
        
        if (result) {
          const { error: updateError } = await supabase
            .from('sip_users')
            .update({
              twilio_credlist_sid: result.credlist_sid,
              twilio_credential_sid: result.credential_sid,
            })
            .eq('id', user.id);
          
          if (!updateError) {
            recovered++;
            details.push({
              username: user.sip_username,
              provider: 'twilio',
              status: 'recovered',
              credential_sid: result.credential_sid,
              credlist_sid: result.credlist_sid,
            });
            console.log(`[SIP Recovery] ✓ Twilio user ${user.sip_username} recovered`);
          } else {
            failed++;
            details.push({
              username: user.sip_username,
              provider: 'twilio',
              status: 'error',
              error: updateError.message,
            });
          }
        } else {
          failed++;
          details.push({
            username: user.sip_username,
            provider: 'twilio',
            status: 'not_found',
          });
          console.log(`[SIP Recovery] ✗ Twilio user ${user.sip_username} not found in API`);
        }
      }
    }

    // === RECUPERAR VONAGE ===
    if (vonageKey && vonageSecret) {
      const vonageUsers = sipUsers?.filter(
        u => u.provider === 'vonage' && !u.vonage_endpoint_id
      ) || [];
      
      console.log(`[SIP Recovery] Found ${vonageUsers.length} Vonage users to recover`);
      
      for (const user of vonageUsers) {
        // Buscar app_id da config
        const { data: config } = await supabase
          .from('sip_provider_config')
          .select('config_value')
          .eq('provider', 'vonage')
          .eq('config_key', 'app_id')
          .eq('domain_group_id', user.domain_group_id)
          .single();

        if (!config) {
          failed++;
          details.push({
            username: user.sip_username,
            provider: 'vonage',
            status: 'no_config',
          });
          continue;
        }

        const result = await findVonageEndpointByUsername(vonageKey, vonageSecret, config.config_value, user.sip_username);
        
        if (result) {
          const { error: updateError } = await supabase
            .from('sip_users')
            .update({
              vonage_endpoint_id: result.endpoint_id,
            })
            .eq('id', user.id);
          
          if (!updateError) {
            recovered++;
            details.push({
              username: user.sip_username,
              provider: 'vonage',
              status: 'recovered',
              endpoint_id: result.endpoint_id,
            });
            console.log(`[SIP Recovery] ✓ Vonage user ${user.sip_username} recovered`);
          } else {
            failed++;
            details.push({
              username: user.sip_username,
              provider: 'vonage',
              status: 'error',
              error: updateError.message,
            });
          }
        } else {
          failed++;
          details.push({
            username: user.sip_username,
            provider: 'vonage',
            status: 'not_found',
          });
          console.log(`[SIP Recovery] ✗ Vonage user ${user.sip_username} not found in API`);
        }
      }
    }

    console.log(`[SIP Recovery] Complete: ${recovered} recovered, ${failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        recovered,
        failed,
        details,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[SIP Recovery] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        recovered: 0,
        failed: 0,
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
