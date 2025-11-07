import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SIPEventPayload {
  event_type: string;
  event_category: string;
  user_id?: string;
  domain_group_id?: string;
  sip_user_id?: string;
  route_id?: string;
  provider: 'twilio' | 'vonage';
  event_data?: Record<string, any>;
  metadata?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: SIPEventPayload = await req.json();

    console.log(`[SIP Event] Logging: ${payload.event_type}`, payload);

    // Inserir evento
    const { error } = await supabase
      .from('sip_events')
      .insert({
        event_type: payload.event_type,
        event_category: payload.event_category,
        user_id: payload.user_id,
        domain_group_id: payload.domain_group_id,
        sip_user_id: payload.sip_user_id,
        route_id: payload.route_id,
        provider: payload.provider,
        event_data: payload.event_data || {},
        metadata: payload.metadata || {},
        triggered_by: payload.user_id,
      });

    if (error) {
      console.error('[SIP Event] Error:', error);
      throw error;
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[SIP Event] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
