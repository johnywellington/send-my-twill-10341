import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AccountStatus {
  provider: string;
  accountType: 'trial' | 'active' | 'suspended' | 'unknown';
  status: string;
  balance?: number;
  currency?: string;
  friendlyName?: string;
  accountId: string;
  limitations?: string[];
  recommendations?: string[];
  lastChecked: string;
  latency?: number;
}

export function useAccountStatus(
  provider: 'twilio' | 'vonage',
  credentialId?: string,
  enabled: boolean = true
) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['account-status', provider, credentialId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('check-account-status', {
        body: { provider, credentialId }
      });
      
      if (error) {
        console.error(`[Account Status Hook] Error for ${provider}:`, error);
        return { 
          provider,
          accountType: 'unknown' as const, 
          status: 'error',
          accountId: '...',
          limitations: ['Erro ao verificar status da conta'],
          recommendations: ['Verifique suas credenciais'],
          lastChecked: new Date().toISOString()
        };
      }
      
      return data as AccountStatus;
    },
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
    enabled,
    retry: 1,
  });

  return {
    accountType: data?.accountType ?? 'unknown',
    status: data?.status ?? 'unknown',
    balance: data?.balance,
    currency: data?.currency,
    friendlyName: data?.friendlyName,
    accountId: data?.accountId,
    limitations: data?.limitations ?? [],
    recommendations: data?.recommendations ?? [],
    lastChecked: data?.lastChecked,
    latency: data?.latency,
    isLoading,
    error,
    refresh: refetch,
  };
}