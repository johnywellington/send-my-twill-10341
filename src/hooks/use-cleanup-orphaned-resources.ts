import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OrphanedResource {
  id: string;
  name: string;
  type: 'credential_list' | 'endpoint';
  provider: 'twilio' | 'vonage';
  metadata?: any;
}

interface DetectResponse {
  action: 'detect';
  count: number;
  orphaned: OrphanedResource[];
  summary: {
    twilio: number;
    vonage: number;
  };
}

interface CleanupResponse {
  action: 'cleanup';
  results: {
    success: string[];
    failed: { id: string; error: string }[];
  };
  orphaned: OrphanedResource[];
}

export function useCleanupOrphanedResources() {
  const queryClient = useQueryClient();

  // Detectar recursos órfãos
  const detectOrphans = useMutation({
    mutationFn: async (provider?: 'twilio' | 'vonage') => {
      const { data, error } = await supabase.functions.invoke('cleanup-orphaned-sip-resources', {
        body: { action: 'detect', provider },
      });

      if (error) throw error;
      return data as DetectResponse;
    },
    onSuccess: (data) => {
      if (data.count === 0) {
        toast.success('✅ Nenhum recurso órfão encontrado', {
          description: 'Todos os recursos SIP estão sincronizados',
        });
      } else {
        toast.info(`🔍 ${data.count} recurso(s) órfão(s) detectado(s)`, {
          description: `Twilio: ${data.summary.twilio} | Vonage: ${data.summary.vonage}`,
          duration: 5000,
        });
      }
    },
    onError: (error: Error) => {
      toast.error('Erro ao detectar recursos órfãos', {
        description: error.message,
      });
    },
  });

  // Limpar recursos órfãos selecionados
  const cleanupOrphans = useMutation({
    mutationFn: async (params: { orphanedIds: string[]; provider?: 'twilio' | 'vonage' }) => {
      const { data, error } = await supabase.functions.invoke('cleanup-orphaned-sip-resources', {
        body: { 
          action: 'cleanup', 
          orphanedIds: params.orphanedIds,
          provider: params.provider 
        },
      });

      if (error) throw error;
      return data as CleanupResponse;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sip-users'] });
      
      const successCount = data.results.success.length;
      const failedCount = data.results.failed.length;

      if (failedCount === 0) {
        toast.success(`✅ ${successCount} recurso(s) limpo(s) com sucesso!`);
      } else {
        toast.warning(`⚠️ Limpeza parcial`, {
          description: `Sucesso: ${successCount} | Falhas: ${failedCount}`,
          duration: 5000,
        });
      }
    },
    onError: (error: Error) => {
      toast.error('Erro ao limpar recursos órfãos', {
        description: error.message,
      });
    },
  });

  return {
    detectOrphans: detectOrphans.mutate,
    detectOrphansAsync: detectOrphans.mutateAsync,
    cleanupOrphans: cleanupOrphans.mutate,
    isDetecting: detectOrphans.isPending,
    isCleaning: cleanupOrphans.isPending,
    lastDetection: detectOrphans.data,
  };
}
