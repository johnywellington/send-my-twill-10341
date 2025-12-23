import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncResult {
  success: boolean;
  provider: string;
  routes: any[];
  count: number;
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { credentialId } = await req.json();

    // Get credentials
    let credQuery = supabase
      .from('provider_credentials')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (credentialId) {
      credQuery = credQuery.eq('id', credentialId);
    }

    const { data: credentials, error: credError } = await credQuery;

    if (credError) throw credError;
    if (!credentials || credentials.length === 0) {
      throw new Error('No active credentials found');
    }

    const results: SyncResult[] = [];
    const logs: string[] = [];

    for (const cred of credentials) {
      logs.push(`\n🔍 Consultando rotas ${cred.provider.toUpperCase()} - ${cred.credential_name}...`);

      try {
        if (cred.provider === 'twilio') {
          logs.push('📡 Conectando à API Twilio...');
          
          const accountSid = cred.account_identifier;
          const authToken = cred.secret_key;
          const auth = btoa(`${accountSid}:${authToken}`);

          // Get Twilio SIP domains
          const domainsResponse = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/SIP/Domains.json`,
            {
              headers: {
                'Authorization': `Basic ${auth}`,
              },
            }
          );

          if (!domainsResponse.ok) {
            throw new Error(`Twilio API error: ${domainsResponse.status}`);
          }

          const domainsData = await domainsResponse.json();
          logs.push(`✅ ${domainsData.domains?.length || 0} domínios encontrados`);

          // Get credential lists for each domain
          const routes: any[] = [];
          for (const domain of domainsData.domains || []) {
            logs.push(`  📋 Domínio: ${domain.friendly_name || domain.domain_name}`);
            
            // Get credential lists
            const credListsResponse = await fetch(
              `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/SIP/Domains/${domain.sid}/Auth/Calls/CredentialListMappings.json`,
              {
                headers: {
                  'Authorization': `Basic ${auth}`,
                },
              }
            );

            if (credListsResponse.ok) {
              const credListsData = await credListsResponse.json();
              logs.push(`    🔐 ${credListsData.credential_list_mappings?.length || 0} credential lists`);
              
              routes.push({
                domain_sid: domain.sid,
                domain_name: domain.domain_name,
                friendly_name: domain.friendly_name,
                credential_lists: credListsData.credential_list_mappings || [],
                voice_url: domain.voice_url,
                voice_method: domain.voice_method,
              });
            }
          }

          results.push({
            success: true,
            provider: 'twilio',
            routes,
            count: routes.length,
          });

        } else if (cred.provider === 'vonage') {
          logs.push('📡 Conectando à API Vonage...');
          
          const apiKey = cred.account_identifier;
          const apiSecret = cred.secret_key;

          // Get Vonage applications
          const appsResponse = await fetch(
            `https://api.nexmo.com/v2/applications?api_key=${apiKey}&api_secret=${apiSecret}`,
            {
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );

          if (!appsResponse.ok) {
            throw new Error(`Vonage API error: ${appsResponse.status}`);
          }

          const appsData = await appsResponse.json();
          logs.push(`✅ ${appsData._embedded?.applications?.length || 0} aplicações encontradas`);

          const routes: any[] = [];
          for (const app of appsData._embedded?.applications || []) {
            logs.push(`  📋 Aplicação: ${app.name}`);
            
            if (app.capabilities?.voice) {
              logs.push(`    🎤 Voice webhook: ${app.capabilities.voice.webhooks?.answer?.address || 'N/A'}`);
              
              routes.push({
                app_id: app.id,
                app_name: app.name,
                voice_webhooks: app.capabilities.voice.webhooks,
                rtc: app.capabilities.rtc || null,
              });
            }
          }

          results.push({
            success: true,
            provider: 'vonage',
            routes,
            count: routes.length,
          });
        }
      } catch (error: any) {
        logs.push(`❌ Erro: ${error.message}`);
        results.push({
          success: false,
          provider: cred.provider,
          routes: [],
          count: 0,
          error: error.message,
        });
      }
    }

    logs.push('\n✨ Consulta concluída!');

    return new Response(
      JSON.stringify({
        success: true,
        results,
        logs: logs.join('\n'),
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error syncing SIP routes:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        logs: `❌ Erro: ${error.message}`,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});