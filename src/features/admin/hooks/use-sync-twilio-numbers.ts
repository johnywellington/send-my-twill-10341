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
  numbers: TwilioNumber[];
  count: number;
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
      // 1. Chamar edge function para buscar números do Twilio
      const { data, error } = await supabase.functions.invoke<SyncResponse>('sync-twilio-numbers');

      if (error) {
        throw new Error(error.message || 'Erro ao conectar com Twilio');
      }

      if (!data?.success || !data.numbers) {
        throw new Error(data?.error || 'Nenhum número retornado do Twilio');
      }

      console.log('Twilio numbers fetched:', data.numbers.length);

      // 2. Buscar números existentes do usuário
      const { data: user } = await supabase.auth.getUser();
      
      if (!user.user) {
        throw new Error('Usuário não autenticado');
      }

      const { data: existingNumbers, error: fetchError } = await supabase
        .from('phone_numbers')
        .select('phone_number, id')
        .eq('user_id', user.user.id)
        .eq('provider', 'twilio');

      if (fetchError) {
        throw new Error('Erro ao buscar números existentes');
      }

      const existingPhoneNumbers = new Set(
        existingNumbers?.map(n => n.phone_number) || []
      );

      // 3. Filtrar apenas números novos
      const newNumbers = data.numbers.filter(
        num => !existingPhoneNumbers.has(num.phone_number)
      );

      console.log(`New numbers to insert: ${newNumbers.length}`);

      // 4. Inserir apenas números novos em lote
      if (newNumbers.length > 0) {
        const numbersToInsert = newNumbers.map(num => ({
          ...num,
          user_id: user.user.id,
        }));

        const { error: insertError } = await supabase
          .from('phone_numbers')
          .insert(numbersToInsert);

        if (insertError) {
          console.error('Insert error:', insertError);
          throw new Error('Erro ao salvar números no banco de dados');
        }
      }

      // 5. Atualizar capabilities de números existentes do Twilio
      const existingTwilioNumbers = data.numbers.filter(
        num => existingPhoneNumbers.has(num.phone_number)
      );

      if (existingTwilioNumbers.length > 0) {
        console.log(`Updating ${existingTwilioNumbers.length} existing numbers`);
        
        for (const num of existingTwilioNumbers) {
          await supabase
            .from('phone_numbers')
            .update({
              supports_sms: num.supports_sms,
              supports_voice: num.supports_voice,
              supports_mms: num.supports_mms,
              sync_source: 'twilio',
              updated_at: new Date().toISOString(),
            })
            .eq('phone_number', num.phone_number);
        }
      }

      const result = {
        total: data.numbers.length,
        new: newNumbers.length,
        updated: existingTwilioNumbers.length,
      };

      // Passar órfãos para o context
      if (data.orphaned_count && data.orphaned_count > 0) {
        (result as any).orphaned_count = data.orphaned_count;
        (result as any).orphaned = data.orphaned;
      }

      return result;
    },
    mutationKey: ['sync-twilio-numbers'],
    onMutate: async () => {
      // Buscar orphaned info e passar para onSuccess via context
      const { data } = await supabase.functions.invoke<SyncResponse>('sync-twilio-numbers');
      return {
        orphaned_count: data?.orphaned_count || 0,
        orphaned: data?.orphaned || [],
      };
    },
    onSuccess: (result, variables, context: any) => {
      queryClient.invalidateQueries({ queryKey: ['phone-numbers'] });
      
      // Verificar se há órfãos detectados
      const orphanedCount = context?.orphaned_count || 0;
      const orphaned = context?.orphaned || [];
      
      if (orphanedCount > 0 && onOrphansDetected) {
        onOrphansDetected(orphaned);
        toast({
          title: "⚠️ Números órfãos detectados",
          description: `${orphanedCount} número(s) órfão(s) detectado(s). Clique em Revisar para remover.`,
          variant: "destructive",
        });
      } else if (result.new === 0 && result.updated === 0) {
        toast({
          title: "Sincronização concluída",
          description: "Todos os números já estão sincronizados.",
        });
      } else {
        toast({
          title: "Sincronização concluída com sucesso!",
          description: `${result.new} número(s) adicionado(s), ${result.updated} atualizado(s).`,
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
