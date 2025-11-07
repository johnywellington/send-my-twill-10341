import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📞 Generating TwiML for IVR call');

    const url = new URL(req.url);
    
    // Parâmetros principais
    const text = url.searchParams.get('text') || 'Bem-vindo ao sistema IVR.';
    const language = url.searchParams.get('language') || 'pt-PT';
    const voice = url.searchParams.get('voice') || 'Polly.Cristiano';
    
    // Parâmetros de captura
    const captureInput = url.searchParams.get('capture_input') !== 'false';
    const maxDigits = url.searchParams.get('max_digits') || '1';
    const timeout = url.searchParams.get('timeout') || '10';
    
    // Parâmetros de webhook
    const supabaseUrl = url.searchParams.get('supabase_url') || Deno.env.get('SUPABASE_URL');
    const assistantNumber = url.searchParams.get('assistant_number');
    const transferTimeout = url.searchParams.get('transfer_timeout') || '30';
    const fromNumber = url.searchParams.get('from_number');
    
    // Parâmetros de ações
    const action1 = url.searchParams.get('action1') || 'hangup';
    const action1Message = url.searchParams.get('action1_message') || '';
    const action2 = url.searchParams.get('action2') || 'transfer';
    const action2Message = url.searchParams.get('action2_message') || '';

    console.log('TwiML Parameters:', {
      text: text.substring(0, 50) + '...',
      language,
      voice,
      captureInput,
      maxDigits,
      timeout,
      assistantNumber,
      action1,
      action2
    });

    // Construir URL do webhook com todos os parâmetros necessários
    const webhookUrl = new URL(`${supabaseUrl}/functions/v1/ivr-webhook-v2-twilio`);
    if (assistantNumber) webhookUrl.searchParams.set('assistant_number', assistantNumber);
    webhookUrl.searchParams.set('transfer_timeout', transferTimeout);
    if (fromNumber) webhookUrl.searchParams.set('from_number', fromNumber);
    webhookUrl.searchParams.set('language', language);
    webhookUrl.searchParams.set('voice', voice);
    webhookUrl.searchParams.set('action1', action1);
    if (action1Message) webhookUrl.searchParams.set('action1_message', action1Message);
    webhookUrl.searchParams.set('action2', action2);
    if (action2Message) webhookUrl.searchParams.set('action2_message', action2Message);

    // Gerar TwiML
    let twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}" language="${language}">${escapeXml(text)}</Say>`;

    if (captureInput) {
      twiml += `
  <Gather numDigits="${maxDigits}" timeout="${timeout}" action="${escapeXml(webhookUrl.toString())}" method="POST">
  </Gather>
  <Say voice="${voice}" language="${language}">Não recebemos resposta. Encerrando a chamada.</Say>
  <Hangup/>`;
    } else {
      twiml += `
  <Hangup/>`;
    }

    twiml += `
</Response>`;

    console.log('✅ TwiML generated successfully');
    console.log('Webhook URL:', webhookUrl.toString());

    return new Response(twiml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml'
      }
    });

  } catch (error) {
    console.error('Error generating TwiML:', error);
    
    // Retornar TwiML de erro básico
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Cristiano" language="pt-PT">Ocorreu um erro ao gerar a chamada. Por favor, tente novamente.</Say>
  <Hangup/>
</Response>`;

    return new Response(errorTwiml, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml'
      }
    });
  }
});
