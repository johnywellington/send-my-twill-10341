import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TestCallParams {
  sip_user_id: string;
  provider: 'twilio' | 'vonage';
}

interface TestCallResult {
  success: boolean;
  message: string;
  call_id: string;
  duration: number;
}

export function useSIPTestCall() {
  const mutation = useMutation({
    mutationFn: async (params: TestCallParams): Promise<TestCallResult> => {
      const { data, error } = await supabase.functions.invoke('sip-test-call', {
        body: params,
      });

      if (error) throw error;
      return data as TestCallResult;
    },
    onSuccess: (data) => {
      toast.success('🎧 Chamada de teste iniciada!', {
        description: data.message,
        duration: 5000,
      });
    },
    onError: (error: Error) => {
      toast.error('Erro ao iniciar chamada de teste', {
        description: error.message,
      });
    },
  });

  return {
    startTestCall: mutation.mutate,
    startTestCallAsync: mutation.mutateAsync,
    isTestingCall: mutation.isPending,
    lastTestCall: mutation.data,
  };
}
