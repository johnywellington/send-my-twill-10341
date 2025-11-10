import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrphanedResource {
  id: string;
  name: string;
  type: 'credential' | 'endpoint';
  provider: 'twilio' | 'vonage';
  metadata?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[Orphaned Cleanup] Request received');
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[Orphaned Cleanup] No authorization header');
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('[Orphaned Cleanup] Missing Supabase credentials');
      throw new Error('Missing Supabase configuration');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (authError || !user) {
      console.error('[Orphaned Cleanup] Auth error:', authError);
      throw new Error('Unauthorized');
    }

    const requestBody = await req.json();
    const { action = 'detect', provider, orphanedIds = [] } = requestBody;
    
    console.log(`[Orphaned Cleanup] Processing request - Action: ${action}, Provider: ${provider || 'all'}, OrphanedIds count: ${orphanedIds.length}`);

    console.log(`[Orphaned Cleanup] Action: ${action}, Provider: ${provider || 'all'}`);

    let orphanedResources: OrphanedResource[] = [];

    // ========== TWILIO: Detectar Credentials órfãos ==========
    if (!provider || provider === 'twilio') {
      try {
        console.log('[Twilio] Checking for orphaned Credentials...');
        
        const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
        const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');

        if (twilioSid && twilioToken) {
          // Buscar todos os CredentialLists do Twilio
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          
          try {
            const twilioResponse = await fetch(
              `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/SIP/CredentialLists.json`,
              {
                headers: {
                  'Authorization': 'Basic ' + btoa(`${twilioSid}:${twilioToken}`),
                },
                signal: controller.signal,
              }
            );
            
            clearTimeout(timeoutId);

            if (!twilioResponse.ok) {
              console.error(`[Twilio] API error: ${twilioResponse.status} ${twilioResponse.statusText}`);
              throw new Error(`Twilio API returned ${twilioResponse.status}`);
            }

            const twilioData = await twilioResponse.json();
            const twilioCredLists = twilioData.credential_lists || [];

            console.log(`[Twilio] Found ${twilioCredLists.length} CredentialLists in API`);

            // Buscar todos os usuários SIP Twilio do banco
            const { data: dbTwilioUsers, error: dbError } = await supabase
              .from('sip_users')
              .select('twilio_credential_sid, twilio_credlist_sid, sip_username')
              .eq('provider', 'twilio')
              .not('twilio_credential_sid', 'is', null);

            if (dbError) {
              console.error('[Twilio] Database error:', dbError);
              throw dbError;
            }

            const dbCredentialSids = new Set(dbTwilioUsers?.map(u => u.twilio_credential_sid) || []);

            console.log(`[Twilio] Found ${dbCredentialSids.size} Credentials in database`);

            // Para cada CredentialList, buscar seus Credentials
            for (const credList of twilioCredLists) {
              try {
                const credsController = new AbortController();
                const credsTimeoutId = setTimeout(() => credsController.abort(), 10000);
                
                const credsResponse = await fetch(
                  `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/SIP/CredentialLists/${credList.sid}/Credentials.json`,
                  {
                    headers: {
                      'Authorization': 'Basic ' + btoa(`${twilioSid}:${twilioToken}`),
                    },
                    signal: credsController.signal,
                  }
                );
                
                clearTimeout(credsTimeoutId);

                if (!credsResponse.ok) {
                  console.error(`[Twilio] Error fetching credentials for list ${credList.sid}: ${credsResponse.status}`);
                  continue;
                }

                const credsData = await credsResponse.json();
                const credentials = credsData.credentials || [];

                console.log(`[Twilio] CredentialList ${credList.friendly_name}: ${credentials.length} credentials`);

                // Identificar Credentials órfãos
                for (const credential of credentials) {
                  if (!dbCredentialSids.has(credential.sid)) {
                    orphanedResources.push({
                      id: credential.sid,
                      name: credential.username,
                      type: 'credential',
                      provider: 'twilio',
                      metadata: {
                        credential_list_sid: credList.sid,
                        credential_list_name: credList.friendly_name,
                        date_created: credential.date_created,
                        date_updated: credential.date_updated,
                      }
                    });
                  }
                }
              } catch (credError: any) {
                if (credError.name === 'AbortError') {
                  console.error(`[Twilio] Request timeout for CredentialList ${credList.sid}`);
                } else {
                  console.error(`[Twilio] Error checking CredentialList ${credList.sid}:`, credError.message);
                }
              }
            }

            console.log(`[Twilio] Found ${orphanedResources.filter(r => r.provider === 'twilio').length} orphaned Credentials`);
          } catch (fetchError: any) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
              console.error('[Twilio] Request timeout');
            } else {
              console.error('[Twilio] Fetch error:', fetchError);
            }
            throw fetchError;
          }
        } else {
          console.log('[Twilio] Credentials not configured, skipping...');
        }
      } catch (twilioError: any) {
        console.error('[Twilio] Error checking orphaned resources:', twilioError.message);
        // Continue to Vonage check even if Twilio fails
      }
    }

    // ========== VONAGE: Detectar Endpoints órfãos ==========
    if (!provider || provider === 'vonage') {
      try {
        console.log('[Vonage] Checking for orphaned Endpoints...');
        
        const vonageApiKey = Deno.env.get('VONAGE_API_KEY');
        const vonageApiSecret = Deno.env.get('VONAGE_API_SECRET');

        if (vonageApiKey && vonageApiSecret) {
          // Buscar todas as aplicações Vonage ativas do banco
          const { data: vonageApps, error: dbError } = await supabase
            .from('sip_provider_config')
            .select('config_value')
            .eq('provider', 'vonage')
            .eq('config_key', 'app_id')
            .eq('is_active', true);

          if (dbError) {
            console.error('[Vonage] Database error:', dbError);
            throw dbError;
          }

          const appIds = vonageApps?.map(a => a.config_value) || [];

          console.log(`[Vonage] Found ${appIds.length} active applications`);

          // Para cada aplicação, verificar endpoints
          for (const appId of appIds) {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
              
              const vonageResponse = await fetch(
                `https://api.nexmo.com/v1/applications/${appId}?api_key=${vonageApiKey}&api_secret=${vonageApiSecret}`,
                { signal: controller.signal }
              );
              
              clearTimeout(timeoutId);

              if (!vonageResponse.ok) {
                console.log(`[Vonage] App ${appId}: API returned ${vonageResponse.status}, skipping...`);
                continue;
              }

              const appData = await vonageResponse.json();
              const endpoints = appData.voice?.webhooks?.sip || [];

              console.log(`[Vonage] App ${appId}: Found ${endpoints.length} endpoints in API`);

              // Buscar endpoints do banco para esta aplicação
              const { data: dbVonageUsers } = await supabase
                .from('sip_users')
                .select('vonage_endpoint_id, sip_username')
                .eq('provider', 'vonage')
                .not('vonage_endpoint_id', 'is', null);

              const dbEndpointIds = new Set(dbVonageUsers?.map(u => u.vonage_endpoint_id) || []);

              console.log(`[Vonage] App ${appId}: Found ${dbEndpointIds.size} endpoints in database`);

              // Identificar órfãos (endpoints na API mas não no banco)
              for (const endpoint of endpoints) {
                const endpointId = endpoint.uri?.split('@')[0]?.replace('sip:', '');
                
                if (endpointId && !dbEndpointIds.has(endpointId)) {
                  orphanedResources.push({
                    id: endpointId,
                    name: endpoint.uri || endpointId,
                    type: 'endpoint',
                    provider: 'vonage',
                    metadata: {
                      app_id: appId,
                      uri: endpoint.uri,
                    }
                  });
                }
              }
            } catch (fetchError: any) {
              if (fetchError.name === 'AbortError') {
                console.error(`[Vonage] App ${appId}: Request timeout`);
              } else {
                console.error(`[Vonage] Error checking app ${appId}:`, fetchError.message);
              }
            }
          }

          console.log(`[Vonage] Found ${orphanedResources.filter(r => r.provider === 'vonage').length} orphaned Endpoints`);
        } else {
          console.log('[Vonage] Credentials not configured, skipping...');
        }
      } catch (vonageError: any) {
        console.error('[Vonage] Error checking orphaned resources:', vonageError.message);
        // Continue even if Vonage fails
      }
    }

    // ========== AÇÃO: LIMPAR ==========
    if (action === 'cleanup' && orphanedIds.length > 0) {
      console.log(`[Cleanup] Starting cleanup of ${orphanedIds.length} resources...`);
      
      const cleanupResults = {
        success: [] as string[],
        failed: [] as { id: string; error: string }[],
      };

      for (const resourceId of orphanedIds) {
        const resource = orphanedResources.find(r => r.id === resourceId);
        if (!resource) continue;

        try {
          if (resource.provider === 'twilio') {
            // Deletar Credential individual do Twilio
            const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
            const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');
            const credListSid = resource.metadata?.credential_list_sid;

            if (!credListSid) {
              cleanupResults.failed.push({ id: resourceId, error: 'Missing credential_list_sid' });
              console.error(`✗ Cannot delete Credential ${resourceId}: missing CredentialList SID`);
              continue;
            }

            const deleteResponse = await fetch(
              `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/SIP/CredentialLists/${credListSid}/Credentials/${resourceId}.json`,
              {
                method: 'DELETE',
                headers: {
                  'Authorization': 'Basic ' + btoa(`${twilioSid}:${twilioToken}`),
                },
              }
            );

            if (deleteResponse.ok || deleteResponse.status === 404) {
              cleanupResults.success.push(resourceId);
              console.log(`✓ Deleted Twilio Credential: ${resource.name} (${resourceId})`);
            } else {
              const errorText = await deleteResponse.text();
              cleanupResults.failed.push({ id: resourceId, error: errorText });
              console.error(`✗ Failed to delete Twilio Credential ${resourceId}:`, errorText);
            }
          } else if (resource.provider === 'vonage') {
            // Nota: Vonage não permite deletar endpoints individuais via API
            // Apenas podemos remover toda a aplicação ou reconfigurar
            console.log(`⚠️ Vonage endpoint ${resourceId} cannot be deleted via API`);
            cleanupResults.failed.push({ 
              id: resourceId, 
              error: 'Vonage endpoints cannot be deleted individually. Must recreate application.' 
            });
          }
        } catch (error: any) {
          cleanupResults.failed.push({ id: resourceId, error: error.message });
          console.error(`✗ Error cleaning up ${resourceId}:`, error);
        }
      }

      console.log(`[Cleanup] Complete. Success: ${cleanupResults.success.length}, Failed: ${cleanupResults.failed.length}`);

      return new Response(
        JSON.stringify({
          action: 'cleanup',
          results: cleanupResults,
          orphaned: orphanedResources.filter(r => !orphanedIds.includes(r.id)),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== AÇÃO: DETECTAR (padrão) ==========
    return new Response(
      JSON.stringify({
        action: 'detect',
        count: orphanedResources.length,
        orphaned: orphanedResources,
        summary: {
          twilio: orphanedResources.filter(r => r.provider === 'twilio').length,
          vonage: orphanedResources.filter(r => r.provider === 'vonage').length,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Orphaned Cleanup] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
