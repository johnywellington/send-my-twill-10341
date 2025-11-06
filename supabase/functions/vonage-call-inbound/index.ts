import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VonageInboundCall {
  from: string;
  to: string;
  uuid: string;
  conversation_uuid: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const callData: VonageInboundCall = await req.json();

    console.log('Vonage Inbound Call received:', callData);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Descobrir user_id
    const { data: voiceLog } = await supabase
      .from('voice_logs')
      .select('user_id')
      .eq('from_number', callData.to)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const { error } = await supabase
      .from('received_calls')
      .insert({
        call_uuid: callData.uuid,
        conversation_uuid: callData.conversation_uuid,
        from_number: callData.from,
        to_number: callData.to,
        status: 'ringing',
        provider: 'vonage',
        user_id: voiceLog?.user_id || null,
        started_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error inserting received call:', error);
    }

    const projectId = Deno.env.get('SUPABASE_PROJECT_ID') || 'baowfhikujfppwmmhwcn';

    // NCCO para atender e gravar
    const ncco = [
      {
        action: 'talk',
        text: 'Olá, você ligou para nosso sistema. Sua chamada está sendo gravada.',
        language: 'pt-BR',
      },
      {
        action: 'record',
        eventUrl: [`https://${projectId}.supabase.co/functions/v1/vonage-call-recording`],
        endOnSilence: 3,
        format: 'mp3',
      },
    ];

    return new Response(JSON.stringify(ncco), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in vonage-call-inbound:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);
