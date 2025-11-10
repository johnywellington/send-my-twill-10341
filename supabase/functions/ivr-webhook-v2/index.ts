import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DTMFEvent {
  dtmf?: {
    digits: string;
    timed_out: boolean;
  };
  from?: string;
  to?: string;
  conversation_uuid?: string;
  uuid?: string;
  timestamp?: string;
  // Parâmetros customizados passados pela chamada
  assistant_number?: string;
  transfer_timeout?: number;
  from_number?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const event: DTMFEvent = await req.json();
    
    console.log('IVR Webhook V2 received event:', JSON.stringify(event, null, 2));

    // Extrair parâmetros da URL se disponíveis
    const url = new URL(req.url);
    const assistantNumber = url.searchParams.get('assistant_number') || event.assistant_number;
    const transferTimeoutParam = url.searchParams.get('transfer_timeout') || '30';
    const transferTimeout = Math.min(Math.max(parseInt(transferTimeoutParam), 1), 600); // 1-600 seconds
    const fromNumber = url.searchParams.get('from_number') || event.from_number;
    
    // Validate assistant_number if provided (for option 2)
    if (assistantNumber && !/^\+?[0-9]{8,20}$/.test(assistantNumber.replace(/[^0-9]/g, ''))) {
      console.error('Invalid assistant number format:', assistantNumber);
    }

    // Se houver DTMF, processar e armazenar
    if (event.dtmf) {
      console.log(`DTMF V2 captured: ${event.dtmf.digits} from ${event.from} to ${event.to}`);
      console.log(`Conversation UUID: ${event.conversation_uuid}`);
      console.log(`Assistant Number: ${assistantNumber}`);

      // Criar cliente Supabase para armazenar dados
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Armazenar resposta DTMF com informações V2
      try {
        const { error: insertError } = await supabase
          .from('ivr_responses')
          .insert({
            conversation_uuid: event.conversation_uuid,
            phone_number: event.from,
            dtmf_digits: event.dtmf.digits,
            timed_out: event.dtmf.timed_out,
            template_used: 'v2-bank-security',
            event_data: {
              ...event,
              assistant_number: assistantNumber,
              transfer_timeout: transferTimeout
            }
          });

        if (insertError) {
          console.error('Error storing IVR V2 response:', insertError);
        } else {
          console.log('IVR V2 response stored successfully');
        }
      } catch (dbError) {
        console.error('Database error:', dbError);
      }

      // Gerar resposta baseada no DTMF
      let responseNCCO = [];

      switch (event.dtmf.digits) {
        case '1':
          // Opção 1: Cliente reconhece a operação
          responseNCCO = [{
            action: 'talk',
            text: 'Obrigado pela confirmação. A operação foi validada com sucesso. Tenha um bom dia.',
            language: 'pt-PT',
            style: 2
          }];
          break;

        case '2':
          // Opção 2: Cliente não reconhece - Transferir para assistente
          if (!assistantNumber) {
            console.error('Assistant number not provided for transfer');
            responseNCCO = [{
              action: 'talk',
              text: 'Desculpe, não foi possível conectar ao assistente. Por favor, ligue novamente.',
              language: 'pt-PT',
              style: 2
            }];
          } else {
            console.log(`Transferring call to assistant: ${assistantNumber}`);
            
            // Limpar número (remover caracteres não numéricos)
            const cleanAssistantNumber = assistantNumber.replace(/[^0-9]/g, '');
            const cleanFromNumber = fromNumber ? fromNumber.replace(/[^0-9]/g, '') : '447418373268';

            responseNCCO = [
              {
                action: 'talk',
                text: 'Um momento, por favor. Estamos a transferir a sua chamada para um assistente do serviço de segurança.',
                language: 'pt-PT',
                style: 2,
                bargeIn: false
              },
              {
                action: 'connect',
                eventUrl: [`${supabaseUrl}/functions/v1/ivr-webhook-v2-events?conversation_uuid=${event.conversation_uuid}`],
                eventMethod: 'POST',
                timeout: transferTimeout,
                from: cleanFromNumber,
                endpoint: [{
                  type: 'phone',
                  number: cleanAssistantNumber
                }]
              }
            ];
          }
          break;

        default:
          // Opção inválida
          responseNCCO = [{
            action: 'talk',
            text: 'Opção inválida. Prima 1 se reconhece a operação, ou prima 2 para falar com um assistente.',
            language: 'pt-PT',
            style: 2
          }];
      }

      return new Response(
        JSON.stringify(responseNCCO),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Se não houver DTMF, apenas retornar OK
    return new Response(
      JSON.stringify({ status: 'received' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ivr-webhook-v2:', error);
    
    // Retornar resposta de fallback para não interromper a chamada
    return new Response(
      JSON.stringify([{
        action: 'talk',
        text: 'Desculpe, ocorreu um erro técnico. Por favor, contacte o serviço de apoio ao cliente.',
        language: 'pt-PT',
        style: 2
      }]),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});