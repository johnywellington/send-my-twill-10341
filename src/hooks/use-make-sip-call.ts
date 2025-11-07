import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MakeCallParams {
  provider: 'twilio' | 'vonage';
  call_type: 'internal' | 'external';
  destination: string;
}

export function useMakeSIPCall() {
  const queryClient = useQueryClient();

  const makeCall = useMutation({
    mutationFn: async (params: MakeCallParams) => {
      // NOVO: Verificar conectividade antes de fazer a chamada
      const { data: testResult, error: testError } = await supabase.functions.invoke(
        'sip-test-connectivity',
        { body: { provider: params.provider, test_type: 'registration' } }
      );
      
      if (testError || testResult?.status === 'failed') {
        throw new Error(testResult?.error_message || 'Sistema SIP indisponível. Execute o diagnóstico na aba correspondente.');
      }
      
      // Se passou nos testes, prosseguir com a chamada
      const functionName = params.call_type === 'internal'
        ? (params.provider === 'twilio' ? 'sip-twilio-call-sip' : 'sip-vonage-call-sip')
        : (params.provider === 'twilio' ? 'sip-twilio-call-pstn' : 'sip-vonage-call-pstn');

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          destination: params.destination,
        },
      });

      if (error) throw error;
      
      // Verificar se há erro na resposta da API
      if (data?.error) {
        throw new Error(data.error);
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sip-call-logs'] });
      toast.success('Chamada iniciada com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Call error:', error);
      
      let userMessage = 'Erro ao fazer chamada';
      
      // Tratar erros específicos da API
      const errorMsg = error.message.toLowerCase();
      
      if (errorMsg.includes('voice calling has been disabled')) {
        userMessage = 'Chamadas de voz estão desabilitadas na sua conta do provedor. Entre em contato com o suporte.';
      } else if (errorMsg.includes('insufficient funds') || errorMsg.includes('saldo insuficiente')) {
        userMessage = 'Saldo insuficiente na conta do provedor para realizar a chamada.';
      } else if (errorMsg.includes('invalid number') || errorMsg.includes('número inválido')) {
        userMessage = 'Número de destino inválido. Verifique o formato (ex: +5511999999999).';
      } else if (errorMsg.includes('authentication') || errorMsg.includes('credentials')) {
        userMessage = 'Erro de autenticação com o provedor. Verifique suas credenciais SIP.';
      } else if (errorMsg.includes('not found') || errorMsg.includes('ramal não encontrado')) {
        userMessage = 'Ramal não encontrado ou não configurado.';
      } else if (errorMsg.includes('timeout')) {
        userMessage = 'Tempo de conexão esgotado. Tente novamente.';
      } else {
        userMessage = `Erro ao fazer chamada: ${error.message}`;
      }
      
      toast.error(userMessage, {
        duration: 5000,
      });
    },
  });

  return {
    makeCall: makeCall.mutate,
    isCalling: makeCall.isPending,
  };
}
