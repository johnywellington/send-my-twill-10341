import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TwilioNumber {
  phone_number: string;
  friendly_name: string | null;
  country_code: string;
  provider: string;
  supports_sms: boolean;
  supports_voice: boolean;
  supports_mms: boolean;
  is_active: boolean;
  is_verified: boolean;
  sync_source: string;
  notes: string;
}

interface OrphanedNumber {
  id: string;
  phone_number: string;
  friendly_name: string | null;
  provider: string;
}

interface SyncResponse {
  success: boolean;
  inserted: number;
  updated: number;
  total: number;
  conflicts?: string[];
  orphaned?: OrphanedNumber[];
  orphaned_count?: number;
  error?: string;
}

export const useSyncTwilioNumbers = (
  onOrphansDetected?: (orphaned: OrphanedNumber[]) => void
) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke<SyncResponse>('sync-twilio-numbers-v2');

      if (error) {
        throw new Error(error.message || 'Erro ao conectar com Twilio');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Erro na sincronização do Twilio');
      }

      return {
        inserted: data.inserted || 0,
        updated: data.updated || 0,
        total: data.total || 0,
        orphaned_count: data.orphaned_count || 0,
        orphaned: data.orphaned || [],
        conflicts: data.conflicts || [],
      } as any;
    },
    mutationKey: ['sync-twilio-numbers'],
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['phone-numbers'] });

      if (result.orphaned_count > 0 && onOrphansDetected) {
        onOrphansDetected(result.orphaned);
        toast({
          title: "⚠️ Números órfãos detectados",
          description: `${result.orphaned_count} número(s) órfão(s) detectado(s). Clique em Revisar para remover.`,
          variant: "destructive",
        });
      }

      if (result.conflicts && result.conflicts.length > 0) {
        toast({
          title: "Conflitos detectados",
          description: `${result.conflicts.length} número(s) já pertencem a outra conta e foram ignorados.`,
          variant: "destructive",
        });
      }

      if (result.inserted === 0 && result.updated === 0 && (!result.conflicts || result.conflicts.length === 0)) {
        toast({
          title: "Sincronização concluída",
          description: "Todos os números Twilio já estão sincronizados.",
        });
      } else {
        toast({
          title: "Sincronização concluída com sucesso!",
          description: `${result.inserted} número(s) adicionado(s), ${result.updated} atualizado(s).`,
        });
      }

      console.log('Sync completed:', result);
    },
    onError: (error: Error) => {
      console.error('Sync error:', error);
      let errorMessage = 'Erro ao sincronizar números do Twilio';
      if (error.message.includes('credenciais') || error.message.includes('credentials')) {
        errorMessage = 'Credenciais Twilio inválidas. Verifique suas configurações.';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Erro ao conectar com Twilio. Tente novamente.';
      }
      toast({
        title: "Erro na sincronização",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
};
