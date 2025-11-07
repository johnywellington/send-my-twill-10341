import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TwilioInboundCall {
  CallSid: string;
  From: string;
  To: string;
  CallStatus: string;
  Direction: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const callData: TwilioInboundCall = {
      CallSid: formData.get('CallSid') as string,
      From: formData.get('From') as string,
      To: formData.get('To') as string,
      CallStatus: formData.get('CallStatus') as string,
      Direction: formData.get('Direction') as string,
    };

    // Detect if this is a test webhook
    const isTest = req.headers.get('X-Test-Webhook') === 'true' ||
      callData.CallSid?.startsWith('TEST_');
    
    if (isTest) {
      console.log('🧪 Test webhook detected - returning test TwiML');
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Test webhook response</Say>
</Response>`;
      return new Response(twiml, {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
      });
    }

    console.log('Twilio Inbound Call received:', callData);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Descobrir user_id
    const { data: voiceLog } = await supabase
      .from('voice_logs')
      .select('user_id')
      .eq('from_number', callData.To)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const { error } = await supabase
      .from('received_calls')
      .insert({
        call_uuid: callData.CallSid,
        from_number: callData.From,
        to_number: callData.To,
        status: callData.CallStatus,
        provider: 'twilio',
        user_id: voiceLog?.user_id || null,
        started_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error inserting received call:', error);
    }

    // TwiML para atender a chamada e gravar
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="pt-BR">Olá, você ligou para nosso sistema. Sua chamada está sendo gravada.</Say>
  <Record maxLength="60" playBeep="true" />
</Response>`;

    return new Response(twiml, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
    });
  } catch (error: any) {
    console.error('Error in twilio-call-inbound:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);
