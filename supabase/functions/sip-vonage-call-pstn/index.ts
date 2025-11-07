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

    const { destination } = await req.json();

    console.log(`[Vonage PSTN Call] Initiating SIP to PSTN call to: ${destination}`);

    // Buscar SIP user e número do usuário
    const { data: sipUser, error: sipError } = await supabase
      .from('sip_users')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'vonage')
      .single();

    if (sipError || !sipUser) {
      throw new Error('Usuário SIP não encontrado');
    }

    const { data: phoneNumber } = await supabase
      .from('phone_numbers')
      .select('phone_number')
      .eq('user_id', user.id)
      .eq('provider', 'vonage')
      .eq('is_active', true)
      .limit(1)
      .single();

    const fromNumber = phoneNumber?.phone_number;
    if (!fromNumber) {
      throw new Error('Nenhum número Vonage ativo encontrado');
    }

    const apiKey = Deno.env.get('VONAGE_API_KEY');
    const apiSecret = Deno.env.get('VONAGE_API_SECRET');

    // Criar NCCO para conectar chamada SIP to PSTN
    const ncco = [{
      action: 'connect',
      endpoint: [{
        type: 'phone',
        number: destination
      }]
    }];

    // Iniciar chamada via Vonage Voice API
    const vonageUrl = 'https://api.nexmo.com/v1/calls';
    
    const callPayload = {
      to: [{
        type: 'phone',
        number: destination
      }],
      from: {
        type: 'phone',
        number: fromNumber
      },
      ncco,
    };

    const vonageResponse = await fetch(vonageUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${apiKey}:${apiSecret}`),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(callPayload),
    });

    if (!vonageResponse.ok) {
      const error = await vonageResponse.text();
      console.error('[Vonage PSTN Call] Error:', error);
      throw new Error(`Vonage API error: ${error}`);
    }

    const callData = await vonageResponse.json();

    // Registrar chamada no log
    const { error: logError } = await supabase
      .from('sip_call_logs')
      .insert({
        user_id: user.id,
        sip_user_id: sipUser.id,
        provider: 'vonage',
        call_type: 'external',
        from_uri: fromNumber,
        to_uri: destination,
        call_uuid: callData.uuid,
        conversation_uuid: callData.conversation_uuid,
        status: 'initiated',
      });

    if (logError) {
      console.error('[Vonage PSTN Call] Log error:', logError);
    }

    console.log(`[Vonage PSTN Call] Call initiated: ${callData.uuid}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        call_uuid: callData.uuid,
        status: callData.status 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('[Vonage PSTN Call] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
