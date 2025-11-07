import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UsageAnalytics {
  id: string;
  user_id: string;
  report_date: string;
  provider: string;
  sms_sent: number;
  sms_delivered: number;
  sms_failed: number;
  sms_cost: number;
  voice_calls: number;
  voice_minutes: number;
  voice_cost: number;
  ivr_calls: number;
  ivr_minutes: number;
  ivr_cost: number;
  total_cost: number;
  synced_at: string;
}

export const useUsageAnalytics = (startDate?: Date, endDate?: Date) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['usage-analytics', startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from('usage_analytics')
        .select('*')
        .order('report_date', { ascending: false });

      if (startDate) {
        query = query.gte('report_date', startDate.toISOString().split('T')[0]);
      }
      if (endDate) {
        query = query.lte('report_date', endDate.toISOString().split('T')[0]);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as UsageAnalytics[];
    }
  });

  const syncMutation = useMutation({
    mutationFn: async ({ startDate, endDate }: { startDate?: Date; endDate?: Date }) => {
      const { data, error } = await supabase.functions.invoke('sync-usage-analytics', {
        body: { startDate, endDate }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['usage-analytics'] });
      toast.success(`${data.recordsSynced} registros sincronizados com sucesso`);
    },
    onError: (error: any) => {
      console.error('Sync error:', error);
      toast.error('Erro ao sincronizar analytics', {
        description: error.message
      });
    }
  });

  return {
    analytics: query.data || [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    syncAnalytics: syncMutation.mutate,
    syncing: syncMutation.isPending
  };
};