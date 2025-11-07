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
      // Determinar qual edge function chamar baseado no provider e tipo
      const functionName = params.call_type === 'internal'
        ? (params.provider === 'twilio' ? 'sip-twilio-call-sip' : 'sip-vonage-call-sip')
        : (params.provider === 'twilio' ? 'sip-twilio-call-pstn' : 'sip-vonage-call-pstn');

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          destination: params.destination,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sip-call-logs'] });
      toast.success('Chamada iniciada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao fazer chamada: ${error.message}`);
    },
  });

  return {
    makeCall: makeCall.mutate,
    isCalling: makeCall.isPending,
  };
}
