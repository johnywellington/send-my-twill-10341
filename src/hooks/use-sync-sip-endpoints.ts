import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SyncResult {
  success: boolean;
  expired_count: number;
  total_checked: number;
  error?: string;
}

export const useSyncSIPEndpoints = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      console.log('[SIP Endpoint Sync] Invoking sync function...');
      
      const { data, error } = await supabase.functions.invoke<SyncResult>(
        'sync-sip-endpoints-status'
      );

      if (error) {
        console.error('[SIP Endpoint Sync] Invocation error:', error);
        throw new Error(error.message || 'Erro ao sincronizar endpoints');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Erro ao sincronizar status dos endpoints');
      }

      console.log('[SIP Endpoint Sync] Success:', data);
      return data;
    },
    onSuccess: (data) => {
      // Invalidar múltiplos caches relacionados
      queryClient.invalidateQueries({ queryKey: ['sip-endpoints-online'] });
      queryClient.invalidateQueries({ queryKey: ['sip-users'] });
      queryClient.invalidateQueries({ queryKey: ['sip-events'] });

      if (data.expired_count === 0) {
        toast.success('Sincronização concluída', {
          description: 'Todos os endpoints estão atualizados.',
        });
      } else {
        toast.success('Sincronização concluída!', {
          description: `${data.expired_count} endpoint(s) marcado(s) como desregistrado(s).`,
        });
      }

      console.log('[SIP Endpoint Sync] Sync completed:', data);
    },
    onError: (error: Error) => {
      console.error('[SIP Endpoint Sync] Mutation error:', error);
      
      toast.error('Erro na sincronização', {
        description: error.message || 'Erro ao sincronizar status dos endpoints',
      });
    },
  });
};
