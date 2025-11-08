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
  status: 'synced' | 'orphaned' | 'not_checked';
}

// Buscar credential específica do Twilio
async function getTwilioCredential(accountSid: string, authToken: string, credListSid: string, credentialSid: string) {
  try {
    const authHeader = `Basic ${btoa(`${accountSid}:${authToken}`)}`;
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/SIP/CredentialLists/${credListSid}/Credentials/${credentialSid}.json`,
      { headers: { 'Authorization': authHeader } }
    );
    
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error('[Twilio] Error fetching credential:', error);
    return null;
  }
}

// Buscar endpoint específico da Vonage
async function getVonageEndpoint(apiKey: string, apiSecret: string, appId: string, endpointId: string) {
  try {
    const response = await fetch(
      `https://api.nexmo.com/v1/applications/${appId}/endpoints/${endpointId}`,
      {
        headers: {
          'Authorization': `Basic ${btoa(`${apiKey}:${apiSecret}`)}`,
        },
      }
    );
    
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error('[Vonage] Error fetching endpoint:', error);
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

    console.log('[Dashboard Sync] Starting verification of existing users...');

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

    console.log(`[Dashboard Sync] Found ${dbUsers?.length || 0} users in database`);

    const results: SyncResult[] = [];

    // === VERIFICAR USUÁRIOS TWILIO ===
    if (twilioSid && twilioToken) {
      const twilioUsers = dbUsers?.filter(u => u.provider === 'twilio') || [];
      console.log(`[Dashboard Sync] Checking ${twilioUsers.length} Twilio users...`);
      
      for (const dbUser of twilioUsers) {
        if (!dbUser.twilio_credlist_sid || !dbUser.twilio_credential_sid) {
          console.warn(`[Twilio] User ${dbUser.sip_username} missing IDs, marking as not checked`);
          results.push({
            provider: 'twilio',
            api_data: {
              sid: dbUser.twilio_credential_sid || 'N/A',
              username: dbUser.sip_username,
              account_sid: twilioSid,
              credential_list_sid: dbUser.twilio_credlist_sid || 'N/A',
              date_created: dbUser.created_at,
            },
            db_data: dbUser,
            status: 'not_checked',
          });
          continue;
        }

        const apiData = await getTwilioCredential(
          twilioSid,
          twilioToken,
          dbUser.twilio_credlist_sid,
          dbUser.twilio_credential_sid
        );

        if (apiData) {
          results.push({
            provider: 'twilio',
            api_data: {
              sid: apiData.sid,
              username: apiData.username,
              account_sid: twilioSid,
              credential_list_sid: dbUser.twilio_credlist_sid,
              date_created: apiData.date_created,
            },
            db_data: dbUser,
            status: 'synced',
          });
        } else {
          results.push({
            provider: 'twilio',
            api_data: {
              sid: dbUser.twilio_credential_sid,
              username: dbUser.sip_username,
              account_sid: twilioSid,
              credential_list_sid: dbUser.twilio_credlist_sid,
              date_created: dbUser.created_at,
            },
            db_data: dbUser,
            status: 'orphaned',
          });
        }
      }
    }

    // === VERIFICAR USUÁRIOS VONAGE ===
    if (vonageKey && vonageSecret) {
      const vonageUsers = dbUsers?.filter(u => u.provider === 'vonage') || [];
      console.log(`[Dashboard Sync] Checking ${vonageUsers.length} Vonage users...`);
      
      for (const dbUser of vonageUsers) {
        if (!dbUser.vonage_endpoint_id) {
          console.warn(`[Vonage] User ${dbUser.sip_username} missing endpoint ID, marking as not checked`);
          results.push({
            provider: 'vonage',
            api_data: {
              id: 'N/A',
              username: dbUser.sip_username,
              domain: dbUser.sip_domain,
              application_id: 'N/A',
            },
            db_data: dbUser,
            status: 'not_checked',
          });
          continue;
        }

        // Buscar app_id da config
        const { data: config } = await supabase
          .from('sip_provider_config')
          .select('config_value')
          .eq('provider', 'vonage')
          .eq('config_key', 'app_id')
          .eq('domain_group_id', dbUser.domain_group_id)
          .single();

        if (!config) {
          console.warn(`[Vonage] No app_id found for user ${dbUser.sip_username}`);
          results.push({
            provider: 'vonage',
            api_data: {
              id: dbUser.vonage_endpoint_id,
              username: dbUser.sip_username,
              domain: dbUser.sip_domain,
              application_id: 'N/A',
            },
            db_data: dbUser,
            status: 'not_checked',
          });
          continue;
        }

        const apiData = await getVonageEndpoint(
          vonageKey,
          vonageSecret,
          config.config_value,
          dbUser.vonage_endpoint_id
        );

        if (apiData) {
          results.push({
            provider: 'vonage',
            api_data: {
              id: apiData.id,
              username: apiData.username,
              domain: dbUser.sip_domain,
              application_id: config.config_value,
            },
            db_data: dbUser,
            status: 'synced',
          });
        } else {
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

    console.log(`[Dashboard Sync] Complete: ${results.length} items processed`);

    const stats = {
      total: results.length,
      synced: results.filter(r => r.status === 'synced').length,
      orphaned: results.filter(r => r.status === 'orphaned').length,
      not_checked: results.filter(r => r.status === 'not_checked').length,
    };

    return new Response(
      JSON.stringify({
        success: true,
        results,
        total_checked: stats.total,
        synced: stats.synced,
        orphaned: stats.orphaned,
        not_checked: stats.not_checked,
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
