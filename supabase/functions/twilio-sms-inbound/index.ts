import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TwilioInboundSms {
  MessageSid: string;
  From: string;
  To: string;
  Body: string;
  FromCountry?: string;
  FromCity?: string;
  FromState?: string;
  FromZip?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const inboundData: TwilioInboundSms = {
      MessageSid: formData.get('MessageSid') as string,
      From: formData.get('From') as string,
      To: formData.get('To') as string,
      Body: formData.get('Body') as string,
      FromCountry: formData.get('FromCountry') as string || undefined,
      FromCity: formData.get('FromCity') as string || undefined,
      FromState: formData.get('FromState') as string || undefined,
      FromZip: formData.get('FromZip') as string || undefined,
    };

    // Detect if this is a test webhook
    const isTest = req.headers.get('X-Test-Webhook') === 'true' ||
      inboundData.Body?.includes('WEBHOOK_TEST_IGNORE');
    
    if (isTest) {
      console.log('🧪 Test webhook detected - skipping database insert');
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
      });
    }

    console.log('Twilio Inbound SMS received:', inboundData);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Descobrir o user_id baseado no número de destino
    const { data: smsLog } = await supabase
      .from('sms_logs')
      .select('user_id')
      .eq('from_number', inboundData.To)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const metadata = {
      country: inboundData.FromCountry,
      city: inboundData.FromCity,
      state: inboundData.FromState,
      zip: inboundData.FromZip,
    };

    const { error } = await supabase
      .from('received_sms')
      .insert({
        external_id: inboundData.MessageSid,
        from_number: inboundData.From,
        to_number: inboundData.To,
        message: inboundData.Body,
        provider: 'twilio',
        user_id: smsLog?.user_id || null,
        metadata,
      });

    if (error) {
      console.error('Error inserting received SMS:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`SMS recebido de ${inboundData.From} salvo com sucesso`);

    // Resposta TwiML vazia (não auto-responde)
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      }
    );
  } catch (error: any) {
    console.error('Error in twilio-sms-inbound:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);
