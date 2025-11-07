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

    console.log(`[Twilio PSTN Call] Initiating SIP to PSTN call to: ${destination}`);

    // Buscar SIP user e número do usuário
    const { data: sipUser, error: sipError } = await supabase
      .from('sip_users')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'twilio')
      .single();

    if (sipError || !sipUser) {
      throw new Error('Usuário SIP não encontrado');
    }

    const { data: phoneNumber } = await supabase
      .from('phone_numbers')
      .select('phone_number')
      .eq('user_id', user.id)
      .eq('provider', 'twilio')
      .eq('is_active', true)
      .limit(1)
      .single();

    const fromNumber = phoneNumber?.phone_number;
    if (!fromNumber) {
      throw new Error('Nenhum número Twilio ativo encontrado');
    }

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');

    // Iniciar chamada via Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`;
    
    const callParams = new URLSearchParams({
      From: fromNumber,
      To: destination,
      Url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/twilio-voice-webhook`,
    });

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: callParams,
    });

    if (!twilioResponse.ok) {
      const error = await twilioResponse.text();
      console.error('[Twilio PSTN Call] Error:', error);
      throw new Error(`Twilio API error: ${error}`);
    }

    const callData = await twilioResponse.json();

    // Registrar chamada no log
    const { error: logError } = await supabase
      .from('sip_call_logs')
      .insert({
        user_id: user.id,
        sip_user_id: sipUser.id,
        provider: 'twilio',
        call_type: 'external',
        from_uri: fromNumber,
        to_uri: destination,
        call_uuid: callData.sid,
        status: 'initiated',
      });

    if (logError) {
      console.error('[Twilio PSTN Call] Log error:', logError);
    }

    console.log(`[Twilio PSTN Call] Call initiated: ${callData.sid}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        call_sid: callData.sid,
        status: callData.status 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('[Twilio PSTN Call] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
