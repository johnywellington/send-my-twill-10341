import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ValidationLog {
  id: string;
  provider: string;
  validation_type: string;
  status: string;
  account_type: string | null;
  error_message: string | null;
  latency_ms: number | null;
  tested_at: string;
  created_at: string;
}

export function useValidationHistory(
  provider?: 'twilio' | 'vonage',
  credentialId?: string,
  limit: number = 10
) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['validation-history', provider, credentialId, limit],
    queryFn: async () => {
      let query = supabase
        .from('api_validation_logs')
        .select('*')
        .order('tested_at', { ascending: false })
        .limit(limit);

      if (provider) {
        query = query.eq('provider', provider);
      }

      if (credentialId) {
        query = query.eq('credential_id', credentialId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[Validation History] Error:', error);
        throw error;
      }

      return data as ValidationLog[];
    },
    staleTime: 1 * 60 * 1000, // Cache por 1 minuto
  });

  return {
    history: data ?? [],
    isLoading,
    error,
    refresh: refetch,
  };
}