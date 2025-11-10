import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VonageApplication {
  domain_group_id: string;
  app_id: string;
  app_name: string;
  friendly_name: string;
}

interface OrphanedApplication {
  domain_group_id: string;
  domain_name: string;
  domain_sid: string;
  friendly_name: string;
}

interface SyncResponse {
  success: boolean;
  applications: VonageApplication[];
  count: number;
  updated?: number;
  orphaned?: OrphanedApplication[];
  orphaned_count?: number;
  error?: string;
}

export const useSyncVonageSIPApplications = (
  onOrphansDetected?: (orphaned: OrphanedApplication[]) => void
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      console.log('[Vonage SIP Sync] Invoking sync function...');
      
      const { data, error } = await supabase.functions.invoke<SyncResponse>(
        'sync-vonage-sip-applications'
      );

      if (error) {
        console.error('[Vonage SIP Sync] Invocation error:', error);
        throw new Error(error.message || 'Erro ao conectar com Vonage');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Erro ao sincronizar aplicações SIP');
      }

      console.log('[Vonage SIP Sync] Success:', data);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sip-config'] });

      const newCount = data.count || 0;
      const updatedCount = data.updated || 0;
      const orphanedCount = data.orphaned_count || 0;

      // Se houver órfãos detectados, notificar
      if (orphanedCount > 0 && onOrphansDetected && data.orphaned) {
        onOrphansDetected(data.orphaned);
        toast.warning(`${orphanedCount} registro(s) órfão(s) detectado(s)`, {
          description: 'Clique em "Revisar Órfãos" para gerenciar.',
        });
      } else if (newCount === 0 && updatedCount === 0) {
        toast.success("Sincronização concluída", {
          description: "Todas as aplicações SIP já estão sincronizadas.",
        });
      } else {
        toast.success("Sincronização concluída!", {
          description: `${newCount} aplicação(ões) adicionada(s), ${updatedCount} atualizada(s).`,
        });
      }

      console.log('[Vonage SIP Sync] Sync completed:', { newCount, updatedCount, orphanedCount });
    },
    onError: (error: Error) => {
      console.error('[Vonage SIP Sync] Mutation error:', error);
      
      let errorMessage = 'Erro ao sincronizar aplicações SIP Vonage';
      
      if (error.message.includes('credenciais') || error.message.includes('Unauthorized')) {
        errorMessage = 'Credenciais Vonage inválidas. Verifique suas configurações.';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Erro ao conectar com Vonage. Tente novamente.';
      }
      
      toast.error("Erro na sincronização", {
        description: errorMessage,
      });
    },
  });
};
