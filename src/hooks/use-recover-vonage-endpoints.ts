import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RecoveryResult {
  success: boolean;
  message: string;
  recovered: number;
  failed: number;
  errors: string[];
}

export function useRecoverVonageEndpoints() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (): Promise<RecoveryResult> => {
      const { data, error } = await supabase.functions.invoke('sip-vonage-recover-endpoints');

      if (error) throw error;
      return data as RecoveryResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sip-users'] });
      
      if (data.recovered > 0) {
        toast.success(`✅ ${data.recovered} ID(s) recuperado(s)!`, {
          description: data.message,
          duration: 5000,
        });
      } else {
        toast.info(data.message);
      }

      if (data.failed > 0 && data.errors.length > 0) {
        toast.warning(`⚠️ ${data.failed} usuário(s) não recuperado(s)`, {
          description: data.errors.slice(0, 3).join('\n'),
          duration: 7000,
        });
      }
    },
    onError: (error: Error) => {
      toast.error('Erro ao recuperar IDs', {
        description: error.message,
      });
    },
  });

  return {
    recoverEndpoints: mutation.mutate,
    recoverEndpointsAsync: mutation.mutateAsync,
    isRecovering: mutation.isPending,
    lastRecovery: mutation.data,
  };
}
