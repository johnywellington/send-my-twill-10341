import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { logSyncOperation } from '../_shared/sync-logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VonageApplication {
  id: string;
  name: string;
  capabilities?: {
    voice?: any;
  };
}

interface SyncResponse {
  success: boolean;
  applications: Array<{
    domain_group_id: string;
    app_id: string;
    app_name: string;
    friendly_name: string;
  }>;
  count: number;
  updated?: number;
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Credenciais Vonage
    const vonageKey = Deno.env.get('VONAGE_API_KEY');
    const vonageSecret = Deno.env.get('VONAGE_API_SECRET');

    if (!vonageKey || !vonageSecret) {
      throw new Error('Credenciais Vonage não configuradas');
    }

    console.log('[Vonage SIP Sync] Fetching applications from Vonage API...');

    // 1. Consultar API Vonage
    const vonageResponse = await fetch(
      'https://api.nexmo.com/v2/applications',
      {
        headers: {
          'Authorization': 'Basic ' + btoa(`${vonageKey}:${vonageSecret}`),
        },
      }
    );

    if (!vonageResponse.ok) {
      const errorText = await vonageResponse.text();
      throw new Error(`Vonage API error: ${errorText}`);
    }

    const vonageData = await vonageResponse.json();
    const allApps: VonageApplication[] = vonageData._embedded?.applications || [];
    
    // Filtrar apenas apps com capability voice (SIP)
    const voiceApps = allApps.filter(app => app.capabilities?.voice);

    console.log(`[Vonage SIP Sync] Found ${voiceApps.length} voice applications in Vonage`);

    if (voiceApps.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          applications: [], 
          count: 0 
        } as SyncResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Buscar applications existentes no banco (por app_id e app_name)
    // Buscar tanto por app_id quanto por app_name para evitar duplicatas
    const existingAppIds = voiceApps.map(app => app.id);
    const existingAppNames = voiceApps.map(app => app.name);
    
    const { data: existingConfigsById, error: fetchError } = await supabase
      .from('sip_provider_config')
      .select('config_value, domain_group_id')
      .eq('provider', 'vonage')
      .eq('config_key', 'app_id')
      .eq('is_active', true)
      .in('config_value', existingAppIds);

    const { data: existingConfigsByName, error: fetchError2 } = await supabase
      .from('sip_provider_config')
      .select('config_value, domain_group_id')
      .eq('provider', 'vonage')
      .eq('config_key', 'app_name')
      .eq('is_active', true)
      .in('config_value', existingAppNames);

    if (fetchError || fetchError2) {
      console.error('[Vonage SIP Sync] Error fetching existing configs:', fetchError || fetchError2);
      throw new Error('Erro ao buscar configurações existentes');
    }

    // Criar mapa combinado de app_ids e app_names existentes
    const existingAppIdMap = new Map(
      existingConfigsById?.map(c => [c.config_value, c.domain_group_id]) || []
    );
    
    const existingAppNameMap = new Map(
      existingConfigsByName?.map(c => [c.config_value, c.domain_group_id]) || []
    );

    console.log(`[Vonage SIP Sync] Found ${existingAppIdMap.size} existing app IDs and ${existingAppNameMap.size} existing app names in DB`);

    // 3. Separar novos e existentes (verificar tanto app_id quanto app_name)
    const newApps = voiceApps.filter(app => 
      !existingAppIdMap.has(app.id) && !existingAppNameMap.has(app.name)
    );
    const existingApps = voiceApps.filter(app => 
      existingAppIdMap.has(app.id) || existingAppNameMap.has(app.name)
    );

    console.log(`[Vonage SIP Sync] New: ${newApps.length}, Existing: ${existingApps.length}`);

    const results = [];

    // 4. Inserir novas applications
    for (const app of newApps) {
      const domainGroupId = crypto.randomUUID();
      
      const { error: insertError } = await supabase
        .from('sip_provider_config')
        .insert([
          {
            domain_group_id: domainGroupId,
            provider: 'vonage',
            config_key: 'app_id',
            config_value: app.id,
            friendly_name: app.name,
            is_default: false,
            is_active: true,
            created_by: user.id,
          },
          {
            domain_group_id: domainGroupId,
            provider: 'vonage',
            config_key: 'app_name',
            config_value: app.name,
            friendly_name: app.name,
            is_default: false,
            is_active: true,
            created_by: user.id,
          },
          {
            domain_group_id: domainGroupId,
            provider: 'vonage',
            config_key: 'sip_domain',
            config_value: 'sip.nexmo.com',
            friendly_name: app.name,
            is_default: false,
            is_active: true,
            created_by: user.id,
          },
        ]);

      if (insertError) {
        console.error(`[Vonage SIP Sync] Error inserting app ${app.id}:`, insertError);
      } else {
        console.log(`[Vonage SIP Sync] ✓ Inserted app ${app.id}`);
        results.push({
          domain_group_id: domainGroupId,
          app_id: app.id,
          app_name: app.name,
          friendly_name: app.name,
        });
      }
    }

    // 5. Atualizar applications existentes
    for (const app of existingApps) {
      // Buscar domain_group_id pelo app_id ou pelo app_name
      const domainGroupId = existingAppIdMap.get(app.id) || existingAppNameMap.get(app.name);
      
      if (!domainGroupId) {
        console.warn(`[Vonage SIP Sync] Could not find domain_group_id for ${app.id}`);
        continue;
      }
      
      const { error: updateError } = await supabase
        .from('sip_provider_config')
        .update({
          friendly_name: app.name,
          updated_at: new Date().toISOString(),
        })
        .eq('domain_group_id', domainGroupId)
        .eq('provider', 'vonage')
        .eq('is_active', true);

      if (updateError) {
        console.error(`[Vonage SIP Sync] Error updating app ${app.id}:`, updateError);
      } else {
        console.log(`[Vonage SIP Sync] ✓ Updated app ${app.id}`);
      }
    }

    // Log success
    await logSyncOperation({
      userId: user.id,
      syncType: 'sip_applications',
      provider: 'vonage',
      status: 'success',
      itemsAdded: results.length,
      itemsUpdated: existingApps.length,
      executionTimeMs: Date.now() - startTime,
      metadata: {
        items_added: results.slice(0, 100).map(app => ({
          application_id: app.app_id,
          name: app.app_name,
        })),
        items_updated: existingApps.slice(0, 100).map(app => ({
          application_id: app.id,
          name: app.name,
        })),
      },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        applications: results, 
        count: results.length,
        updated: existingApps.length,
      } as SyncResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Vonage SIP Sync] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Log error (try to get user from request)
    try {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const payload = JSON.parse(atob(token.split('.')[1]));
        await logSyncOperation({
          userId: payload.sub,
          syncType: 'sip_applications',
          provider: 'vonage',
          status: 'error',
          errorMessage,
          executionTimeMs: Date.now() - startTime,
        });
      }
    } catch (e) {
      console.warn('Could not log error');
    }

    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        applications: [],
        count: 0,
      } as SyncResponse),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
