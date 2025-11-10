import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VonageNumber {
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
  webhook_configured: boolean;
  notes: string;
}

interface OrphanedNumber {
  id: string;
  phone_number: string;
  friendly_name: string | null;
  provider: string;
}

interface SyncResponse {
  numbers: VonageNumber[];
  count: number;
  orphaned?: OrphanedNumber[];
  orphaned_count?: number;
}

export const useSyncVonageNumbers = (
  onOrphansDetected?: (orphaned: OrphanedNumber[]) => void
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      console.log('Starting Vonage numbers sync...');

      // Chamar edge function que faz a sincronização (com service role)
      const { data: syncData, error: syncError } = await supabase.functions.invoke<{
        inserted: number;
        updated: number;
        total: number;
        conflicts?: string[];
        orphaned?: OrphanedNumber[];
        orphaned_count?: number;
        error?: string;
      }>('sync-vonage-numbers');

      if (syncError) {
        console.error('Error calling sync function:', syncError);
        throw new Error(syncError.message || 'Erro ao sincronizar números do Vonage');
      }

      if (!syncData) throw new Error('Resposta inválida da sincronização');

      const result = {
        inserted: syncData.inserted || 0,
        updated: syncData.updated || 0,
        total: syncData.total || 0,
        orphaned_count: syncData.orphaned_count || 0,
        orphaned: syncData.orphaned || [],
        conflicts: syncData.conflicts || [],
      } as any;

      return result;
    },
    onSuccess: (data, _variables, _context: any) => {
      queryClient.invalidateQueries({ queryKey: ['phone-numbers'] });

      if (data.orphaned_count > 0 && onOrphansDetected) {
        onOrphansDetected(data.orphaned);
        toast.error(`⚠️ ${data.orphaned_count} número(s) órfão(s) detectado(s). Clique em Revisar para remover.`);
      }

      if (data.conflicts && data.conflicts.length > 0) {
        toast.error(`🔒 ${data.conflicts.length} número(s) já estão associados a outra conta e foram ignorados.`);
      }

      if (data.inserted === 0 && data.updated === 0 && (!data.conflicts || data.conflicts.length === 0)) {
        toast.info('ℹ️ Todos os números Vonage já estão sincronizados.');
      } else {
        const parts = [] as string[];
        if (data.inserted > 0) parts.push(`${data.inserted} adicionados`);
        if (data.updated > 0) parts.push(`${data.updated} atualizados`);
        toast.success(`✅ Sincronização Vonage concluída! ${parts.join(', ')}.`);
      }
    },
    onError: (error: Error) => {
      console.error('Sync error:', error);
      let errorMessage = 'Erro ao sincronizar números';
      if (error.message.includes('credenciais') || error.message.includes('inválid')) {
        errorMessage = '🔒 Credenciais Vonage inválidas. Verifique suas configurações.';
      } else if (error.message.includes('limite') || error.message.includes('rate')) {
        errorMessage = '⏱️ Limite de requisições atingido. Aguarde alguns segundos.';
      } else if (error.message.includes('rede') || error.message.includes('network')) {
        errorMessage = '🌐 Erro ao conectar com Vonage. Tente novamente.';
      } else {
        errorMessage = `❌ ${error.message}`;
      }
      toast.error(errorMessage);
    },
  });
};
