import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TwilioDomain {
  domain_group_id: string;
  sip_domain: string;
  sip_domain_sid: string;
  friendly_name: string;
}

interface OrphanedDomain {
  domain_group_id: string;
  domain_name: string;
  domain_sid: string;
  friendly_name: string;
}

interface SyncResponse {
  success: boolean;
  domains: TwilioDomain[];
  count: number;
  updated?: number;
  orphaned?: OrphanedDomain[];
  orphaned_count?: number;
  error?: string;
}

export const useSyncTwilioSIPDomains = (
  onOrphansDetected?: (orphaned: OrphanedDomain[]) => void
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      console.log('[Twilio SIP Sync] Invoking sync function...');
      
      const { data, error } = await supabase.functions.invoke<SyncResponse>(
        'sync-twilio-sip-domains'
      );

      if (error) {
        console.error('[Twilio SIP Sync] Invocation error:', error);
        throw new Error(error.message || 'Erro ao conectar com Twilio');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Erro ao sincronizar domínios SIP');
      }

      console.log('[Twilio SIP Sync] Success:', data);
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
          description: "Todos os domínios SIP já estão sincronizados.",
        });
      } else {
        toast.success("Sincronização concluída!", {
          description: `${newCount} domínio(s) adicionado(s), ${updatedCount} atualizado(s).`,
        });
      }

      console.log('[Twilio SIP Sync] Sync completed:', { newCount, updatedCount, orphanedCount });
    },
    onError: (error: Error) => {
      console.error('[Twilio SIP Sync] Mutation error:', error);
      
      let errorMessage = 'Erro ao sincronizar domínios SIP Twilio';
      
      if (error.message.includes('credenciais') || error.message.includes('Unauthorized')) {
        errorMessage = 'Credenciais Twilio inválidas. Verifique suas configurações.';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Erro ao conectar com Twilio. Tente novamente.';
      }
      
      toast.error("Erro na sincronização", {
        description: errorMessage,
      });
    },
  });
};
