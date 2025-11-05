import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConnectEvent {
  status?: 'started' | 'ringing' | 'answered' | 'completed' | 'timeout' | 'failed' | 'busy' | 'unanswered' | 'rejected';
  duration?: number;
  conversation_uuid?: string;
  uuid?: string;
  timestamp?: string;
  from?: string;
  to?: string;
  direction?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const event: ConnectEvent = await req.json();
    
    console.log('IVR V2 Connect Event received:', JSON.stringify(event, null, 2));
    console.log(`Status: ${event.status}, Duration: ${event.duration}s, Conversation: ${event.conversation_uuid}`);

    // Extrair conversation_uuid da URL se disponível
    const url = new URL(req.url);
    const conversationUuid = url.searchParams.get('conversation_uuid') || event.conversation_uuid;

    // Criar cliente Supabase para atualizar status
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Mapear status de conexão para mensagens amigáveis
    const statusMessages: Record<string, string> = {
      'started': 'Iniciando conexão com assistente',
      'ringing': 'Chamando assistente',
      'answered': 'Assistente atendeu a chamada',
      'completed': 'Chamada com assistente finalizada',
      'timeout': 'Tempo de espera esgotado',
      'failed': 'Falha ao conectar com assistente',
      'busy': 'Assistente ocupado',
      'unanswered': 'Assistente não atendeu',
      'rejected': 'Chamada rejeitada'
    };

    const statusMessage = statusMessages[event.status || 'unknown'] || 'Status desconhecido';
    console.log(`Event status message: ${statusMessage}`);

    // Atualizar ou inserir dados do evento de conexão
    try {
      if (conversationUuid) {
        // Buscar registro existente
        const { data: existingRecord } = await supabase
          .from('ivr_responses')
          .select('id, event_data')
          .eq('conversation_uuid', conversationUuid)
          .single();

        if (existingRecord) {
          // Atualizar registro existente com status de transferência
          const updatedEventData = {
            ...(existingRecord.event_data as object || {}),
            transfer_events: [
              ...((existingRecord.event_data as any)?.transfer_events || []),
              {
                status: event.status,
                timestamp: event.timestamp || new Date().toISOString(),
                duration: event.duration,
                message: statusMessage
              }
            ]
          };

          const { error: updateError } = await supabase
            .from('ivr_responses')
            .update({
              event_data: updatedEventData
            })
            .eq('id', existingRecord.id);

          if (updateError) {
            console.error('Error updating transfer status:', updateError);
          } else {
            console.log('Transfer status updated successfully');
          }
        } else {
          // Se não encontrar registro, criar um novo
          const { error: insertError } = await supabase
            .from('ivr_responses')
            .insert({
              conversation_uuid: conversationUuid,
              phone_number: event.from || 'unknown',
              template_used: 'v2-transfer-event',
              event_data: {
                transfer_event: event,
                status_message: statusMessage
              }
            });

          if (insertError) {
            console.error('Error inserting transfer event:', insertError);
          } else {
            console.log('Transfer event stored successfully');
          }
        }
      }
    } catch (dbError) {
      console.error('Database error in events webhook:', dbError);
    }

    // Retornar NCCO baseado no status para controlar o fluxo da chamada
    let responseNCCO: any[] = [];

    switch (event.status) {
      case 'answered':
        // Assistente atendeu - não precisa fazer nada, deixar a chamada continuar
        console.log('Assistant answered - call in progress');
        break;

      case 'timeout':
      case 'failed':
      case 'busy':
      case 'unanswered':
      case 'rejected':
        // Falha na transferência - informar o cliente
        responseNCCO = [{
          action: 'talk',
          text: 'Desculpe, não conseguimos contactar um assistente neste momento. Por favor, ligue novamente mais tarde ou contacte o serviço de apoio ao cliente através do número indicado no website.',
          language: 'pt-PT',
          style: 2
        }];
        break;

      case 'completed':
        // Chamada finalizada
        console.log('Call with assistant completed');
        break;

      default:
        // Outros status - apenas log
        console.log(`Connection event: ${event.status}`);
    }

    return new Response(
      JSON.stringify(responseNCCO.length > 0 ? responseNCCO : { status: 'ok' }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in ivr-webhook-v2-events:', error);
    
    return new Response(
      JSON.stringify({ error: 'Internal server error', status: 'error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});