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
      
      // 1. Chamar edge function para buscar números do Vonage
      const { data: syncData, error: syncError } = await supabase.functions.invoke<SyncResponse>(
        'sync-vonage-numbers'
      );

      if (syncError) {
        console.error('Error calling sync function:', syncError);
        throw new Error(syncError.message || 'Erro ao buscar números do Vonage');
      }

      if (!syncData || !syncData.numbers) {
        throw new Error('Nenhum número retornado do Vonage');
      }

      console.log(`Received ${syncData.numbers.length} numbers from Vonage`);

      // 2. Buscar números existentes do usuário
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: existingNumbers, error: fetchError } = await supabase
        .from('phone_numbers')
        .select('phone_number, id')
        .eq('user_id', user.id)
        .eq('provider', 'vonage');

      if (fetchError) {
        console.error('Error fetching existing numbers:', fetchError);
        throw fetchError;
      }

      const existingPhoneNumbers = new Set(
        existingNumbers?.map(n => n.phone_number) || []
      );

      console.log(`Found ${existingPhoneNumbers.size} existing Vonage numbers in database`);

      // 3. Separar números novos dos existentes
      const newNumbers = syncData.numbers.filter(
        n => !existingPhoneNumbers.has(n.phone_number)
      );

      const existingToUpdate = syncData.numbers.filter(
        n => existingPhoneNumbers.has(n.phone_number)
      );

      console.log(`New numbers to insert: ${newNumbers.length}`);
      console.log(`Existing numbers to update: ${existingToUpdate.length}`);

      let insertedCount = 0;
      let updatedCount = 0;

      // 4. Inserir ou atualizar números novos (UPSERT)
      if (newNumbers.length > 0) {
        const numbersToUpsert = newNumbers.map(number => ({
          ...number,
          user_id: user.id,
        }));

        const { error: upsertError } = await supabase
          .from('phone_numbers')
          .upsert(numbersToUpsert, {
            onConflict: 'phone_number,provider',
            ignoreDuplicates: false
          });

        if (upsertError) {
          console.error('Error upserting numbers:', upsertError);
          throw upsertError;
        }

        insertedCount = newNumbers.length;
        console.log(`Successfully upserted ${insertedCount} numbers`);
      }

      // 5. Atualizar capabilities de números existentes
      if (existingToUpdate.length > 0) {
        for (const number of existingToUpdate) {
          const existingNumber = existingNumbers?.find(
            n => n.phone_number === number.phone_number
          );

          if (existingNumber) {
            const { error: updateError } = await supabase
              .from('phone_numbers')
              .update({
                supports_sms: number.supports_sms,
                supports_voice: number.supports_voice,
                supports_mms: number.supports_mms,
                webhook_configured: number.webhook_configured,
                is_active: number.is_active,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingNumber.id)
              .eq('user_id', user.id);

            if (!updateError) {
              updatedCount++;
            } else {
              console.error('Error updating number:', updateError);
            }
          }
        }

        console.log(`Successfully updated ${updatedCount} existing numbers`);
      }

      const result = {
        inserted: insertedCount,
        updated: updatedCount,
        total: syncData.count,
      };

      // Passar órfãos para o context
      if (syncData.orphaned_count && syncData.orphaned_count > 0) {
        (result as any).orphaned_count = syncData.orphaned_count;
        (result as any).orphaned = syncData.orphaned;
      }

      return result;
    },
    onSuccess: (data, variables, context: any) => {
      queryClient.invalidateQueries({ queryKey: ['phone-numbers'] });
      
      // Verificar se há órfãos detectados
      const orphanedCount = context?.orphaned_count || 0;
      const orphaned = context?.orphaned || [];
      
      if (orphanedCount > 0 && onOrphansDetected) {
        onOrphansDetected(orphaned);
        toast.error(`⚠️ ${orphanedCount} número(s) órfão(s) detectado(s). Clique em Revisar para remover.`);
      } else if (data.inserted === 0 && data.updated === 0) {
        toast.info('ℹ️ Todos os números Vonage já estão sincronizados.');
      } else {
        const parts = [];
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
