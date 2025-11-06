import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VonageInboundSms {
  messageId: string;
  msisdn: string;
  to: string;
  text: string;
  type: string;
  'message-timestamp': string;
  keyword?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const inboundData: VonageInboundSms = {
      messageId: url.searchParams.get('messageId') || '',
      msisdn: url.searchParams.get('msisdn') || '',
      to: url.searchParams.get('to') || '',
      text: url.searchParams.get('text') || '',
      type: url.searchParams.get('type') || '',
      'message-timestamp': url.searchParams.get('message-timestamp') || '',
      keyword: url.searchParams.get('keyword') || undefined,
    };

    console.log('Vonage Inbound SMS received:', inboundData);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Descobrir o user_id baseado no número de destino
    const { data: smsLog } = await supabase
      .from('sms_logs')
      .select('user_id')
      .eq('from_number', inboundData.to)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const { error } = await supabase
      .from('received_sms')
      .insert({
        external_id: inboundData.messageId,
        from_number: inboundData.msisdn,
        to_number: inboundData.to,
        message: inboundData.text,
        provider: 'vonage',
        user_id: smsLog?.user_id || null,
        metadata: {
          type: inboundData.type,
          keyword: inboundData.keyword,
          timestamp: inboundData['message-timestamp'],
        },
      });

    if (error) {
      console.error('Error inserting received SMS:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`SMS recebido de ${inboundData.msisdn} salvo com sucesso`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in vonage-sms-inbound:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);
