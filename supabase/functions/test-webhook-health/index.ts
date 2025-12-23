import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestRequest {
  phoneNumber: string;
  provider: 'vonage' | 'twilio';
  testType: 'sms' | 'voice';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { phoneNumber, provider, testType }: TestRequest = await req.json();
    
    console.log(`Testing ${testType} webhook for ${phoneNumber} (${provider})`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let lastActivity = null;
    let isWorking = false;

    if (testType === 'sms') {
      const { data } = await supabase
        .from('received_sms')
        .select('*')
        .eq('to_number', phoneNumber)
        .eq('provider', provider)
        .order('received_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        lastActivity = data.received_at;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        isWorking = new Date(data.received_at) > thirtyDaysAgo;
      }
    } else {
      const { data } = await supabase
        .from('received_calls')
        .select('*')
        .eq('to_number', phoneNumber)
        .eq('provider', provider)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        lastActivity = data.started_at;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        isWorking = new Date(data.started_at) > thirtyDaysAgo;
      }
    }

    console.log(`Webhook status: ${isWorking ? 'healthy' : 'inactive'}, last activity: ${lastActivity}`);

    return new Response(
      JSON.stringify({
        success: true,
        status: isWorking ? 'healthy' : 'inactive',
        lastActivity,
        message: isWorking 
          ? `Webhook funcionando! Última atividade: ${new Date(lastActivity!).toLocaleString('pt-BR')}`
          : lastActivity
          ? `Nenhuma atividade recente. Última: ${new Date(lastActivity).toLocaleString('pt-BR')}`
          : 'Nenhuma atividade registrada. Envie um SMS/chamada de teste para verificar.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error testing webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
