import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';

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
    console.log('🔔 Twilio IVR Webhook V2 received');

    // Twilio envia dados via application/x-www-form-urlencoded
    const formData = await req.formData();
    
    const digits = formData.get('Digits')?.toString();
    const from = formData.get('From')?.toString();
    const to = formData.get('To')?.toString();
    const callSid = formData.get('CallSid')?.toString();
    const callStatus = formData.get('CallStatus')?.toString();

    console.log('Twilio Webhook Data:', { digits, from, to, callSid, callStatus });

    // Extrair parâmetros da URL (passados pelo generate-twiml-ivr)
    const url = new URL(req.url);
    const assistantNumber = url.searchParams.get('assistant_number');
    const transferTimeout = url.searchParams.get('transfer_timeout') || '30';
    const fromNumber = url.searchParams.get('from_number');
    const language = url.searchParams.get('language') || 'pt-PT';
    const voice = url.searchParams.get('voice') || 'Polly.Cristiano';
    const action1 = url.searchParams.get('action1') || 'hangup';
    const action1Message = url.searchParams.get('action1_message') || '';
    const action2 = url.searchParams.get('action2') || 'transfer';
    const action2Message = url.searchParams.get('action2_message') || '';

    console.log('IVR Parameters:', { 
      assistantNumber, 
      transferTimeout, 
      fromNumber, 
      language, 
      voice,
      action1,
      action2
    });

    // Armazenar resposta no Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (supabaseUrl && supabaseServiceKey && callSid && from) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { error: insertError } = await supabase
        .from('ivr_responses')
        .insert({
          conversation_uuid: callSid,
          phone_number: from,
          dtmf_digits: digits || null,
          provider: 'twilio',
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error storing IVR response:', insertError);
      } else {
        console.log(`✅ DTMF response stored: ${digits} from ${from}`);
      }
    }

    // Gerar resposta TwiML baseada no DTMF
    let twiml = '';

    if (!digits) {
      // Timeout ou sem input
      twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}" language="${language}">Não recebemos resposta. Encerrando a chamada.</Say>
  <Hangup/>
</Response>`;
    } else if (digits === '1') {
      // Opção 1
      if (action1 === 'transfer' && assistantNumber) {
        const transferMessage = action1Message || 'Transferindo sua chamada para um assistente.';
        twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}" language="${language}">${escapeXml(transferMessage)}</Say>
  <Dial callerId="${escapeXml(fromNumber || from || '')}" timeout="${transferTimeout}">
    <Number>${escapeXml(assistantNumber)}</Number>
  </Dial>
  <Say voice="${voice}" language="${language}">O assistente não está disponível no momento. Por favor, tente novamente mais tarde.</Say>
</Response>`;
      } else if (action1 === 'talk' && action1Message) {
        twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}" language="${language}">${escapeXml(action1Message)}</Say>
  <Hangup/>
</Response>`;
      } else {
        // Default hangup
        twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}" language="${language}">Obrigado pela confirmação. Encerrando a chamada.</Say>
  <Hangup/>
</Response>`;
      }
    } else if (digits === '2') {
      // Opção 2
      if (action2 === 'transfer' && assistantNumber) {
        const transferMessage = action2Message || 'Estamos a transferir a sua chamada para um assistente. Aguarde, por favor.';
        twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}" language="${language}">${escapeXml(transferMessage)}</Say>
  <Dial callerId="${escapeXml(fromNumber || from || '')}" timeout="${transferTimeout}">
    <Number>${escapeXml(assistantNumber)}</Number>
  </Dial>
  <Say voice="${voice}" language="${language}">O assistente não está disponível no momento. Por favor, tente novamente mais tarde.</Say>
</Response>`;
      } else if (action2 === 'talk' && action2Message) {
        twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}" language="${language}">${escapeXml(action2Message)}</Say>
  <Hangup/>
</Response>`;
      } else {
        // Default hangup
        twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}" language="${language}">Obrigado. Encerrando a chamada.</Say>
  <Hangup/>
</Response>`;
      }
    } else {
      // Opção inválida
      twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}" language="${language}">Opção inválida. Por favor, pressione 1 ou 2.</Say>
  <Hangup/>
</Response>`;
    }

    console.log('Generated TwiML:', twiml);

    return new Response(twiml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml'
      }
    });

  } catch (error) {
    console.error('Error in ivr-webhook-v2-twilio:', error);
    
    // Retornar TwiML de erro
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Cristiano" language="pt-PT">Ocorreu um erro no sistema. Por favor, tente novamente mais tarde.</Say>
  <Hangup/>
</Response>`;

    return new Response(errorTwiml, {
      status: 200, // Twilio espera 200 mesmo em erro
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml'
      }
    });
  }
});
