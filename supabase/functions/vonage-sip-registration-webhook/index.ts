import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const registrationData = await req.json();
    
    console.log('[Vonage SIP Registration]:', registrationData);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Vonage envia: { username, status: 'registered' | 'unregistered', endpoint_id, ... }
    const { data: sipUser, error: userError } = await supabase
      .from('sip_users')
      .select('id, user_id, domain_group_id')
      .eq('sip_username', registrationData.username)
      .eq('provider', 'vonage')
      .single();

    if (userError || !sipUser) {
      console.error('[Vonage SIP Registration] User not found:', registrationData.username);
      return new Response(JSON.stringify({ error: 'User not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      });
    }

    const status = registrationData.status === 'registered' ? 'registered' : 'unregistered';

    // Atualizar ou criar endpoint
    const { error: endpointError } = await supabase
      .from('sip_endpoints')
      .upsert({
        sip_user_id: sipUser.id,
        provider: 'vonage',
        status,
        ip_address: registrationData.ip_address || null,
        user_agent: registrationData.user_agent || null,
        last_seen: new Date().toISOString(),
        expires_at: status === 'registered' 
          ? new Date(Date.now() + 3600000).toISOString()
          : null,
        metadata: registrationData,
      }, {
        onConflict: 'sip_user_id,provider'
      });

    if (endpointError) {
      console.error('[Vonage SIP Registration] Endpoint error:', endpointError);
      throw endpointError;
    }

    console.log(`[Vonage SIP Registration] ${registrationData.username} - ${status}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Vonage SIP Registration] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
