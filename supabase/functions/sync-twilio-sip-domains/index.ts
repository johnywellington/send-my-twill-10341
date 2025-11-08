import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { logSyncOperation } from '../_shared/sync-logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TwilioDomain {
  sid: string;
  domain_name: string;
  friendly_name: string;
  date_created: string;
  date_updated: string;
}

interface SyncResponse {
  success: boolean;
  domains: Array<{
    domain_group_id: string;
    sip_domain: string;
    sip_domain_sid: string;
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

    // Credenciais Twilio
    const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');

    if (!twilioSid || !twilioToken) {
      throw new Error('Credenciais Twilio não configuradas');
    }

    console.log('[Twilio SIP Sync] Fetching domains from Twilio API...');

    // 1. Consultar API Twilio
    const twilioResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/SIP/Domains.json`,
      {
        headers: {
          'Authorization': 'Basic ' + btoa(`${twilioSid}:${twilioToken}`),
        },
      }
    );

    if (!twilioResponse.ok) {
      const errorText = await twilioResponse.text();
      throw new Error(`Twilio API error: ${errorText}`);
    }

    const twilioData = await twilioResponse.json();
    const domains: TwilioDomain[] = twilioData.domains || [];

    console.log(`[Twilio SIP Sync] Found ${domains.length} domains in Twilio`);

    if (domains.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          domains: [], 
          count: 0 
        } as SyncResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Buscar domains existentes no banco (por SID)
    const existingSids = domains.map(d => d.sid);
    
    const { data: existingConfigs, error: fetchError } = await supabase
      .from('sip_provider_config')
      .select('config_value, domain_group_id')
      .eq('provider', 'twilio')
      .eq('config_key', 'sip_domain_sid')
      .in('config_value', existingSids);

    if (fetchError) {
      console.error('[Twilio SIP Sync] Error fetching existing configs:', fetchError);
      throw new Error('Erro ao buscar configurações existentes');
    }

    const existingSidMap = new Map(
      existingConfigs?.map(c => [c.config_value, c.domain_group_id]) || []
    );

    console.log(`[Twilio SIP Sync] Found ${existingSidMap.size} existing domains in DB`);

    // 3. Separar novos e existentes
    const newDomains = domains.filter(d => !existingSidMap.has(d.sid));
    const existingDomains = domains.filter(d => existingSidMap.has(d.sid));

    console.log(`[Twilio SIP Sync] New: ${newDomains.length}, Existing: ${existingDomains.length}`);

    const results = [];

    // 4. Inserir novos domains
    for (const domain of newDomains) {
      const domainGroupId = crypto.randomUUID();
      
      const { error: insertError } = await supabase
        .from('sip_provider_config')
        .insert([
          {
            domain_group_id: domainGroupId,
            provider: 'twilio',
            config_key: 'sip_domain',
            config_value: domain.domain_name,
            friendly_name: domain.friendly_name,
            is_default: false,
            is_active: true,
            created_by: user.id,
          },
          {
            domain_group_id: domainGroupId,
            provider: 'twilio',
            config_key: 'sip_domain_sid',
            config_value: domain.sid,
            friendly_name: domain.friendly_name,
            is_default: false,
            is_active: true,
            created_by: user.id,
          },
        ]);

      if (insertError) {
        console.error(`[Twilio SIP Sync] Error inserting domain ${domain.sid}:`, insertError);
      } else {
        console.log(`[Twilio SIP Sync] ✓ Inserted domain ${domain.sid}`);
        results.push({
          domain_group_id: domainGroupId,
          sip_domain: domain.domain_name,
          sip_domain_sid: domain.sid,
          friendly_name: domain.friendly_name,
        });
      }
    }

    // 5. Atualizar domains existentes (friendly_name pode ter mudado)
    for (const domain of existingDomains) {
      const domainGroupId = existingSidMap.get(domain.sid)!;
      
      const { error: updateError } = await supabase
        .from('sip_provider_config')
        .update({
          friendly_name: domain.friendly_name,
          config_value: domain.domain_name,
          updated_at: new Date().toISOString(),
        })
        .eq('domain_group_id', domainGroupId)
        .eq('provider', 'twilio');

      if (updateError) {
        console.error(`[Twilio SIP Sync] Error updating domain ${domain.sid}:`, updateError);
      } else {
        console.log(`[Twilio SIP Sync] ✓ Updated domain ${domain.sid}`);
      }
    }

    // Log success
    await logSyncOperation({
      userId: user.id,
      syncType: 'sip_domains',
      provider: 'twilio',
      status: 'success',
      itemsAdded: results.length,
      itemsUpdated: existingDomains.length,
      executionTimeMs: Date.now() - startTime,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        domains: results, 
        count: results.length,
        updated: existingDomains.length,
      } as SyncResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Twilio SIP Sync] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Log error (try to get user from request)
    try {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const payload = JSON.parse(atob(token.split('.')[1]));
        await logSyncOperation({
          userId: payload.sub,
          syncType: 'sip_domains',
          provider: 'twilio',
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
        domains: [],
        count: 0,
      } as SyncResponse),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
