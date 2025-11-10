import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface OrphanedDomain {
  domain_group_id: string;
  domain_name: string;
  domain_sid?: string;
  friendly_name: string;
  detected_at: string;
  provider: 'twilio' | 'vonage';
}

export function useOrphanedDomains() {
  return useQuery({
    queryKey: ['orphaned-domains'],
    queryFn: async () => {
      // Buscar última sincronização bem-sucedida para cada tipo
      const { data: twilioLogs } = await supabase
        .from('sync_logs')
        .select('*')
        .eq('sync_type', 'sip_domains')
        .eq('provider', 'twilio')
        .eq('status', 'success')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: vonageLogs } = await supabase
        .from('sync_logs')
        .select('*')
        .eq('sync_type', 'sip_applications')
        .eq('provider', 'vonage')
        .eq('status', 'success')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const orphanedDomains: OrphanedDomain[] = [];
      const orphanedIds = new Set<string>();

      // Extrair órfãos do Twilio
      if (twilioLogs?.metadata) {
        const metadata = twilioLogs.metadata as any;
        const orphanedItems = metadata.orphaned_items || [];
        
        orphanedItems.forEach((item: any) => {
          if (item.domain_group_id) {
            orphanedIds.add(item.domain_group_id);
            orphanedDomains.push({
              domain_group_id: item.domain_group_id,
              domain_name: item.domain_name,
              domain_sid: item.domain_sid,
              friendly_name: item.friendly_name,
              detected_at: twilioLogs.created_at,
              provider: 'twilio',
            });
          }
        });
      }

      // Extrair órfãos do Vonage
      if (vonageLogs?.metadata) {
        const metadata = vonageLogs.metadata as any;
        const orphanedItems = metadata.orphaned_items || [];
        
        orphanedItems.forEach((item: any) => {
          if (item.domain_group_id) {
            orphanedIds.add(item.domain_group_id);
            orphanedDomains.push({
              domain_group_id: item.domain_group_id,
              domain_name: item.domain_name,
              domain_sid: item.domain_sid,
              friendly_name: item.friendly_name,
              detected_at: vonageLogs.created_at,
              provider: 'vonage',
            });
          }
        });
      }

      return {
        orphanedDomains,
        orphanedIds,
        lastSyncTwilio: twilioLogs?.created_at,
        lastSyncVonage: vonageLogs?.created_at,
      };
    },
    refetchInterval: 30000, // Atualizar a cada 30s
  });
}
