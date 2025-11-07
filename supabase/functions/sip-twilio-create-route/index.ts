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

    const { name, route_type, from_pattern, to_pattern, forward_to, priority } = await req.json();

    console.log(`[Twilio Route] Creating route: ${name} (${route_type})`);

    // Gerar TwiML baseado no tipo de rota
    let twiml = '';
    
    switch (route_type) {
      case 'sip_to_sip':
        // Ramal para Ramal
        twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Sip>sip:${forward_to}@${Deno.env.get('TWILIO_SIP_DOMAIN') || 'sip.twilio.com'}</Sip>
  </Dial>
</Response>`;
        break;
      
      case 'sip_to_pstn':
        // Ramal para Telefone
        twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Number>${forward_to}</Number>
  </Dial>
</Response>`;
        break;
      
      case 'pstn_to_sip':
        // Telefone para Ramal
        twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Sip>sip:${forward_to}@${Deno.env.get('TWILIO_SIP_DOMAIN') || 'sip.twilio.com'}</Sip>
  </Dial>
</Response>`;
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
        provider: 'twilio',
        route_type,
        from_pattern,
        to_pattern,
        forward_to,
        priority: priority || 0,
        is_active: true,
        metadata: { twiml },
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Twilio Route] Insert error:', insertError);
      throw insertError;
    }

    console.log(`[Twilio Route] Route created successfully: ${route.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        route,
        twiml 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('[Twilio Route] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
