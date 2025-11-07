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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Não autorizado');
    }

    const { name, route_type, from_pattern, to_pattern, forward_to, priority, domain_group_id } = await req.json();

    console.log(`[Vonage Route] Creating route: ${name} (${route_type})`);

    // Buscar domínio SIP da config
    const { data: config } = await supabase
      .from('sip_provider_config')
      .select('config_value')
      .eq('provider', 'vonage')
      .eq('config_key', 'sip_domain')
      .single();

    const sipDomain = config?.config_value || 'sip.nexmo.com';

    // Gerar NCCO baseado no tipo de rota
    let ncco = [];
    
    switch (route_type) {
      case 'sip_to_sip':
        // Ramal para Ramal
        ncco = [{
          action: 'connect',
          endpoint: [{
            type: 'sip',
            uri: `sip:${forward_to}@${sipDomain}`
          }]
        }];
        break;
      
      case 'sip_to_pstn':
        // Ramal para Telefone
        ncco = [{
          action: 'connect',
          endpoint: [{
            type: 'phone',
            number: forward_to
          }]
        }];
        break;
      
      case 'pstn_to_sip':
        // Telefone para Ramal
        ncco = [{
          action: 'connect',
          endpoint: [{
            type: 'sip',
            uri: `sip:${forward_to}@${sipDomain}`
          }]
        }];
        break;
      
      default:
        throw new Error(`Tipo de rota inválido: ${route_type}`);
    }

    // Salvar rota no banco
    const { data: route, error: insertError } = await supabase
      .from('sip_routes')
      .insert({
        user_id: user.id,
        name,
        provider: 'vonage',
        route_type,
        from_pattern,
        to_pattern,
        forward_to,
        priority: priority || 0,
        is_active: true,
        domain_group_id: domain_group_id || null,
        metadata: { ncco },
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Vonage Route] Insert error:', insertError);
      throw insertError;
    }

    console.log(`[Vonage Route] Route created successfully: ${route.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        route,
        ncco 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('[Vonage Route] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
