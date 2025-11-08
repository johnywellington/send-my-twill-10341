import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BalanceResponse {
  credentialId: string;
  provider: 'twilio' | 'vonage';
  credentialName: string;
  accountType: 'trial' | 'active' | 'suspended' | 'unknown';
  balance: number;
  originalCurrency: string;
  conversions: {
    USD: number;
    EUR: number;
    BRL: number;
    BTC: number;
  };
  lastUpdated: string;
}

export interface CurrencyTotals {
  USD: number;
  EUR: number;
  BRL: number;
  BTC: number;
}

export interface BalancesByProvider {
  twilio: CurrencyTotals;
  vonage: CurrencyTotals;
}

export function useApiBalances() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['api-balances'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-all-balances');
      
      if (error) {
        console.error('[API Balances Hook] Error:', error);
        throw error;
      }
      
      return data as { balances: BalanceResponse[]; rates: any };
    },
    staleTime: 3 * 60 * 1000, // Cache for 3 minutes
    retry: 1,
  });

  const balances = data?.balances || [];

  // Calculate totals by provider
  const totalByProvider: BalancesByProvider = {
    twilio: { USD: 0, EUR: 0, BRL: 0, BTC: 0 },
    vonage: { USD: 0, EUR: 0, BRL: 0, BTC: 0 },
  };

  balances.forEach((balance) => {
    if (balance.provider === 'twilio' || balance.provider === 'vonage') {
      totalByProvider[balance.provider].USD += balance.conversions.USD;
      totalByProvider[balance.provider].EUR += balance.conversions.EUR;
      totalByProvider[balance.provider].BRL += balance.conversions.BRL;
      totalByProvider[balance.provider].BTC += balance.conversions.BTC;
    }
  });

  // Calculate grand total
  const grandTotal: CurrencyTotals = {
    USD: totalByProvider.twilio.USD + totalByProvider.vonage.USD,
    EUR: totalByProvider.twilio.EUR + totalByProvider.vonage.EUR,
    BRL: totalByProvider.twilio.BRL + totalByProvider.vonage.BRL,
    BTC: totalByProvider.twilio.BTC + totalByProvider.vonage.BTC,
  };

  const lastUpdated = balances.length > 0 ? new Date(balances[0].lastUpdated) : null;

  return {
    balances,
    totalByProvider,
    grandTotal,
    isLoading,
    error,
    refresh: refetch,
    lastUpdated,
  };
}
