import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SyncLog {
  id: string;
  user_id: string;
  sync_type: string;
  provider: string | null;
  status: 'success' | 'error';
  items_added: number;
  items_updated: number;
  error_message: string | null;
  execution_time_ms: number | null;
  metadata: Record<string, any>;
  created_at: string;
}

interface UseSyncLogsParams {
  syncType?: string;
  provider?: string;
  status?: 'success' | 'error';
  limit?: number;
}

export const useSyncLogs = (params: UseSyncLogsParams = {}) => {
  return useQuery({
    queryKey: ['sync-logs', params],
    queryFn: async () => {
      console.log('[Sync Logs] Fetching with params:', params);

      let query = supabase
        .from('sync_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (params.syncType) {
        query = query.eq('sync_type', params.syncType);
      }

      if (params.provider) {
        query = query.eq('provider', params.provider);
      }

      if (params.status) {
        query = query.eq('status', params.status);
      }

      if (params.limit) {
        query = query.limit(params.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[Sync Logs] Error fetching logs:', error);
        throw error;
      }

      console.log('[Sync Logs] Fetched logs:', data?.length);
      return data as SyncLog[];
    },
  });
};
