import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface OrphanedNumber {
  id: string;
  phone_number: string;
  friendly_name: string | null;
  provider: 'twilio' | 'vonage';
  detected_at: string;
}

export function useOrphanedNumbers() {
  return useQuery({
    queryKey: ['orphaned-numbers'],
    queryFn: async () => {
      // Buscar última sincronização bem-sucedida para cada provider
      const { data: twilioLogs } = await supabase
        .from('sync_logs')
        .select('*')
        .eq('sync_type', 'phone_numbers')
        .eq('provider', 'twilio')
        .eq('status', 'success')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: vonageLogs } = await supabase
        .from('sync_logs')
        .select('*')
        .eq('sync_type', 'phone_numbers')
        .eq('provider', 'vonage')
        .eq('status', 'success')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const orphanedNumbers: OrphanedNumber[] = [];
      const orphanedIds = new Set<string>();

      // Extrair órfãos do Twilio
      if (twilioLogs?.metadata) {
        const metadata = twilioLogs.metadata as any;
        const orphanedItems = metadata.orphaned_items || [];
        
        orphanedItems.forEach((item: any) => {
          if (item.id) {
            orphanedIds.add(item.id);
            orphanedNumbers.push({
              id: item.id,
              phone_number: item.phone_number,
              friendly_name: item.friendly_name,
              provider: 'twilio',
              detected_at: twilioLogs.created_at,
            });
          }
        });
      }

      // Extrair órfãos do Vonage
      if (vonageLogs?.metadata) {
        const metadata = vonageLogs.metadata as any;
        const orphanedItems = metadata.orphaned_items || [];
        
        orphanedItems.forEach((item: any) => {
          if (item.id) {
            orphanedIds.add(item.id);
            orphanedNumbers.push({
              id: item.id,
              phone_number: item.phone_number,
              friendly_name: item.friendly_name,
              provider: 'vonage',
              detected_at: vonageLogs.created_at,
            });
          }
        });
      }

      return {
        orphanedNumbers,
        orphanedIds,
        lastSyncTwilio: twilioLogs?.created_at,
        lastSyncVonage: vonageLogs?.created_at,
      };
    },
    refetchInterval: 30000, // Atualizar a cada 30s
  });
}
