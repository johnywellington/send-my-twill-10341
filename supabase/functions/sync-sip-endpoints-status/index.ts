import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncResult {
  success: boolean;
  expired_count: number;
  total_checked: number;
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[SIP Endpoint Sync] Starting endpoint status synchronization...');

    // 1. Buscar endpoints registrados com expiração no passado
    const now = new Date().toISOString();
    
    const { data: expiredEndpoints, error: fetchError } = await supabase
      .from('sip_endpoints')
      .select('*, sip_users!inner(user_id, display_name, extension)')
      .eq('status', 'registered')
      .lt('expires_at', now);

    if (fetchError) {
      console.error('[SIP Endpoint Sync] Error fetching endpoints:', fetchError);
      throw new Error('Erro ao buscar endpoints');
    }

    console.log(`[SIP Endpoint Sync] Found ${expiredEndpoints?.length || 0} expired endpoints`);

    if (!expiredEndpoints || expiredEndpoints.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          expired_count: 0,
          total_checked: 0
        } as SyncResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Atualizar status para unregistered
    const endpointIds = expiredEndpoints.map(e => e.id);
    
    const { error: updateError } = await supabase
      .from('sip_endpoints')
      .update({
        status: 'unregistered',
        updated_at: now
      })
      .in('id', endpointIds);

    if (updateError) {
      console.error('[SIP Endpoint Sync] Error updating endpoints:', updateError);
      throw new Error('Erro ao atualizar endpoints');
    }

    console.log(`[SIP Endpoint Sync] Updated ${endpointIds.length} endpoints to unregistered`);

    // 3. Registrar eventos de expiração
    const events = expiredEndpoints.map(endpoint => ({
      event_type: 'endpoint_expired',
      event_category: 'endpoint',
      sip_user_id: endpoint.sip_user_id,
      user_id: endpoint.sip_users.user_id,
      provider: endpoint.provider,
      event_data: {
        endpoint_id: endpoint.id,
        expired_at: endpoint.expires_at,
        last_seen: endpoint.last_seen,
        extension: endpoint.sip_users.extension,
      },
      metadata: {
        sync_type: 'automatic',
        display_name: endpoint.sip_users.display_name,
      }
    }));

    const { error: eventsError } = await supabase
      .from('sip_events')
      .insert(events);

    if (eventsError) {
      console.error('[SIP Endpoint Sync] Error inserting events:', eventsError);
      // Não falhar se eventos não forem inseridos
    } else {
      console.log(`[SIP Endpoint Sync] Recorded ${events.length} expiration events`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        expired_count: endpointIds.length,
        total_checked: expiredEndpoints.length
      } as SyncResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[SIP Endpoint Sync] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        expired_count: 0,
        total_checked: 0
      } as SyncResult),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
