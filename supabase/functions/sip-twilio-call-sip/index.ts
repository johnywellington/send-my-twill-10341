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

    console.log(`[Twilio SIP Call] Initiating SIP to SIP call to: ${destination}`);

    // Buscar SIP user do usuário
    const { data: sipUser, error: sipError } = await supabase
      .from('sip_users')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'twilio')
      .single();

    if (sipError || !sipUser) {
      throw new Error('Usuário SIP não encontrado');
    }

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const sipDomain = sipUser.sip_domain;

    // Iniciar chamada via Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`;
    
    const callParams = new URLSearchParams({
      From: `sip:${sipUser.sip_username}@${sipDomain}`,
      To: `sip:${destination}@${sipDomain}`,
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
      console.error('[Twilio SIP Call] Error:', error);
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
        call_type: 'internal',
        from_uri: `sip:${sipUser.sip_username}@${sipDomain}`,
        to_uri: `sip:${destination}@${sipDomain}`,
        call_uuid: callData.sid,
        status: 'initiated',
      });

    if (logError) {
      console.error('[Twilio SIP Call] Log error:', logError);
    }

    console.log(`[Twilio SIP Call] Call initiated: ${callData.sid}`);

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
    console.error('[Twilio SIP Call] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
