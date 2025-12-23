import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper para logging estruturado
const logWithTimestamp = (level: string, message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  if (data) {
    console.log(`${prefix} ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`${prefix} ${message}`);
  }
};

interface VonageInboundCall {
  from: string;
  to: string;
  uuid: string;
  conversation_uuid: string;
}

const handler = async (req: Request): Promise<Response> => {
  const startTime = Date.now();
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ℹ️ Vonage Call Inbound não usa JWT por padrão
    // A validação seria pela origem/IP ou assinatura customizada
    
    logWithTimestamp('info', '🔔 === CHAMADA RECEBIDA ===');
    logWithTimestamp('info', `Método: ${req.method}`);
    logWithTimestamp('info', `URL: ${req.url}`);
    logWithTimestamp('info', 'Headers:', {
      'content-type': req.headers.get('content-type'),
      'user-agent': req.headers.get('user-agent'),
      'x-forwarded-for': req.headers.get('x-forwarded-for'),
    });

    const callData: VonageInboundCall = await req.json();

    // Detect if this is a test webhook
    const isTest = req.headers.get('X-Test-Webhook') === 'true' ||
      callData.uuid?.startsWith('TEST_');
    
    if (isTest) {
      logWithTimestamp('info', '🧪 Test webhook detected - returning test NCCO');
      const testNcco = [
        {
          action: 'talk',
          text: 'Test webhook response'
        }
      ];
      return new Response(JSON.stringify(testNcco), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    logWithTimestamp('info', '📞 Dados da chamada:', {
      uuid: callData.uuid,
      conversation_uuid: callData.conversation_uuid,
      from: callData.from,
      to: callData.to,
      timestamp: new Date().toISOString(),
    });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    logWithTimestamp('info', `🔍 Buscando user_id para número: ${callData.to}`);

    // Descobrir user_id
    const { data: voiceLog, error: lookupError } = await supabase
      .from('voice_logs')
      .select('user_id')
      .eq('from_number', callData.to)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (lookupError) {
      logWithTimestamp('warn', '⚠️ Erro ao buscar user_id:', lookupError);
      logWithTimestamp('info', '➡️ Prosseguindo com user_id = null');
    } else if (voiceLog) {
      logWithTimestamp('info', `✅ User ID encontrado: ${voiceLog.user_id}`);
    } else {
      logWithTimestamp('info', '📝 Nenhum user_id encontrado - primeira chamada para este número');
    }

    const insertData = {
      call_uuid: callData.uuid,
      conversation_uuid: callData.conversation_uuid,
      from_number: callData.from,
      to_number: callData.to,
      status: 'ringing',
      provider: 'vonage',
      user_id: voiceLog?.user_id || null,
      started_at: new Date().toISOString(),
    };

    logWithTimestamp('info', '💾 Inserindo chamada no banco:', insertData);

    const { error } = await supabase
      .from('received_calls')
      .insert(insertData);

    if (error) {
      logWithTimestamp('error', '❌ Erro ao inserir received_call:', error);
    } else {
      logWithTimestamp('info', '✅ Chamada registrada com sucesso');
    }

    const projectId = Deno.env.get('SUPABASE_PROJECT_ID') || 'baowfhikujfppwmmhwcn';

    logWithTimestamp('info', `🔧 Project ID: ${projectId}`);

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

    logWithTimestamp('info', '📋 NCCO gerado:', ncco);

    const processingTime = Date.now() - startTime;

    logWithTimestamp('info', '✅ === CHAMADA PROCESSADA COM SUCESSO ===');
    logWithTimestamp('info', `⏱️ Tempo de processamento: ${processingTime}ms`);
    logWithTimestamp('info', `🎯 UUID: ${callData.uuid}`);
    logWithTimestamp('info', `📞 De: ${callData.from} → Para: ${callData.to}`);

    return new Response(JSON.stringify(ncco), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    
    logWithTimestamp('error', '❌ === ERRO AO PROCESSAR CHAMADA ===');
    logWithTimestamp('error', `Mensagem: ${error.message}`);
    logWithTimestamp('error', `Stack: ${error.stack}`);
    logWithTimestamp('error', `Tempo até erro: ${processingTime}ms`);
    
    // Log do request body se disponível
    try {
      const bodyText = await req.clone().text();
      logWithTimestamp('error', 'Request body:', bodyText);
    } catch {
      logWithTimestamp('error', 'Não foi possível ler request body');
    }
    
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString(),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);
