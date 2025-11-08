import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrphanedResource {
  id: string;
  name: string;
  type: 'credential_list' | 'endpoint';
  provider: 'twilio' | 'vonage';
  metadata?: any;
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

    const { action = 'detect', provider, orphanedIds = [] } = await req.json();

    console.log(`[Orphaned Cleanup] Action: ${action}, Provider: ${provider || 'all'}`);

    let orphanedResources: OrphanedResource[] = [];

    // ========== TWILIO: Detectar CredentialLists órfãs ==========
    if (!provider || provider === 'twilio') {
      console.log('[Twilio] Checking for orphaned CredentialLists...');
      
      const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
      const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');

      if (twilioSid && twilioToken) {
        // Buscar todos os CredentialLists do Twilio
        const twilioResponse = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/SIP/CredentialLists.json`,
          {
            headers: {
              'Authorization': 'Basic ' + btoa(`${twilioSid}:${twilioToken}`),
            },
          }
        );

        const twilioData = await twilioResponse.json();
        const twilioCredLists = twilioData.credential_lists || [];

        console.log(`[Twilio] Found ${twilioCredLists.length} CredentialLists in API`);

        // Buscar todos os usuários SIP Twilio do banco
        const { data: dbTwilioUsers } = await supabase
          .from('sip_users')
          .select('twilio_credlist_sid, sip_username')
          .eq('provider', 'twilio')
          .not('twilio_credlist_sid', 'is', null);

        const dbCredListSids = new Set(dbTwilioUsers?.map(u => u.twilio_credlist_sid) || []);

        console.log(`[Twilio] Found ${dbCredListSids.size} CredentialLists in database`);

        // Identificar órfãos
        for (const credList of twilioCredLists) {
          if (!dbCredListSids.has(credList.sid)) {
            orphanedResources.push({
              id: credList.sid,
              name: credList.friendly_name,
              type: 'credential_list',
              provider: 'twilio',
              metadata: {
                date_created: credList.date_created,
                date_updated: credList.date_updated,
              }
            });
          }
        }

        console.log(`[Twilio] Found ${orphanedResources.filter(r => r.provider === 'twilio').length} orphaned CredentialLists`);
      }
    }

    // ========== VONAGE: Detectar Endpoints órfãos ==========
    if (!provider || provider === 'vonage') {
      console.log('[Vonage] Checking for orphaned Endpoints...');
      
      const vonageApiKey = Deno.env.get('VONAGE_API_KEY');
      const vonageApiSecret = Deno.env.get('VONAGE_API_SECRET');

      if (vonageApiKey && vonageApiSecret) {
        // Buscar todas as aplicações Vonage ativas do banco
        const { data: vonageApps } = await supabase
          .from('sip_provider_config')
          .select('config_value')
          .eq('provider', 'vonage')
          .eq('config_key', 'app_id')
          .eq('is_active', true);

        const appIds = vonageApps?.map(a => a.config_value) || [];

        console.log(`[Vonage] Found ${appIds.length} active applications`);

        // Para cada aplicação, verificar endpoints
        for (const appId of appIds) {
          try {
            const vonageResponse = await fetch(
              `https://api.nexmo.com/v1/applications/${appId}?api_key=${vonageApiKey}&api_secret=${vonageApiSecret}`
            );

            if (!vonageResponse.ok) continue;

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
          } catch (error) {
            console.error(`[Vonage] Error checking app ${appId}:`, error);
          }
        }

        console.log(`[Vonage] Found ${orphanedResources.filter(r => r.provider === 'vonage').length} orphaned Endpoints`);
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
            // Deletar CredentialList do Twilio
            const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
            const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');

            const deleteResponse = await fetch(
              `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/SIP/CredentialLists/${resourceId}.json`,
              {
                method: 'DELETE',
                headers: {
                  'Authorization': 'Basic ' + btoa(`${twilioSid}:${twilioToken}`),
                },
              }
            );

            if (deleteResponse.ok || deleteResponse.status === 404) {
              cleanupResults.success.push(resourceId);
              console.log(`✓ Deleted Twilio CredentialList: ${resourceId}`);
            } else {
              const errorText = await deleteResponse.text();
              cleanupResults.failed.push({ id: resourceId, error: errorText });
              console.error(`✗ Failed to delete Twilio CredentialList ${resourceId}:`, errorText);
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
