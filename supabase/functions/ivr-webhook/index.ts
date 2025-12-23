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
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const event: DTMFEvent = await req.json();
    
    console.log('IVR Webhook received event:', JSON.stringify(event, null, 2));

    // Se houver DTMF, processar e armazenar
    if (event.dtmf) {
      console.log(`DTMF captured: ${event.dtmf.digits} from ${event.from} to ${event.to}`);
      console.log(`Conversation UUID: ${event.conversation_uuid}`);
      console.log(`Timed out: ${event.dtmf.timed_out}`);

      // Criar cliente Supabase para armazenar dados
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Armazenar resposta DTMF (a tabela precisa ser criada)
      // Este é um exemplo - você pode querer armazenar em uma tabela diferente
      // ou processar os dados de outra forma
      try {
        const { error: insertError } = await supabase
          .from('ivr_responses')
          .insert({
            conversation_uuid: event.conversation_uuid,
            phone_number: event.from,
            dtmf_digits: event.dtmf.digits,
            timed_out: event.dtmf.timed_out,
            event_data: event
          });

        if (insertError) {
          console.error('Error storing IVR response:', insertError);
        } else {
          console.log('IVR response stored successfully');
        }
      } catch (dbError) {
        console.error('Database error:', dbError);
        // Não retornar erro para não interromper o fluxo da chamada
      }

      // Você pode retornar um NCCO para continuar o fluxo da chamada
      // baseado na opção escolhida
      let responseNCCO = [];

      switch (event.dtmf.digits) {
        case '1':
          responseNCCO = [{
            action: 'talk',
            text: 'Você escolheu a opção 1. Redirecionando para o suporte técnico.',
            language: 'pt-BR'
          }];
          break;
        case '2':
          responseNCCO = [{
            action: 'talk',
            text: 'Você escolheu a opção 2. Redirecionando para vendas.',
            language: 'pt-BR'
          }];
          break;
        case '9':
          responseNCCO = [{
            action: 'talk',
            text: 'Você escolheu falar com um atendente. Aguarde um momento.',
            language: 'pt-BR'
          }];
          break;
        default:
          responseNCCO = [{
            action: 'talk',
            text: 'Opção inválida. Por favor, tente novamente.',
            language: 'pt-BR'
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
    console.error('Error in ivr-webhook:', error);
    
    // Retornar resposta neutra para não interromper a chamada
    return new Response(
      JSON.stringify([{
        action: 'talk',
        text: 'Desculpe, ocorreu um erro. Por favor, tente novamente.',
        language: 'pt-BR'
      }]),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
