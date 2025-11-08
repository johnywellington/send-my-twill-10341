import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  saveBalanceCache, 
  getBalanceCache, 
  getCacheAge,
  hasCachedData 
} from "@/lib/balance-cache";
import { useEffect, useState } from "react";

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
  const [isUsingCache, setIsUsingCache] = useState(false);
  const cachedData = getBalanceCache();

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['api-balances'],
    queryFn: async () => {
      console.log('[API Balances Hook] Fetching balances...');
      
      try {
        const { data, error } = await supabase.functions.invoke('get-all-balances');
        
        if (error) {
          console.error('[API Balances Hook] Error:', error);
          throw error;
        }
        
        console.log('[API Balances Hook] Success:', data);
        
        // Save to cache on successful fetch
        if (data && data.balances) {
          saveBalanceCache(data);
          setIsUsingCache(false);
        }
        
        return data as { balances: BalanceResponse[]; rates: any };
      } catch (err) {
        console.error('[API Balances Hook] Catch error:', err);
        
        // If fetch fails, try to use cached data
        const cached = getBalanceCache();
        if (cached) {
          console.log('[API Balances Hook] Using cached data due to fetch error');
          setIsUsingCache(true);
          return { balances: cached.balances, rates: cached.rates };
        }
        
        throw err;
      }
    },
    // Use cached data as initial data if available
    initialData: cachedData ? { balances: cachedData.balances, rates: cachedData.rates } : undefined,
    staleTime: 3 * 60 * 1000, // Cache for 3 minutes
    retry: 2,
    retryDelay: 1000,
  });

  // Set isUsingCache on mount if we have cached data
  useEffect(() => {
    if (cachedData && !data) {
      setIsUsingCache(true);
    }
  }, []);

  // Update isUsingCache when we get fresh data
  useEffect(() => {
    if (data && isFetching === false) {
      setIsUsingCache(false);
    }
  }, [data, isFetching]);

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
  const cacheAge = getCacheAge();
  const hasCached = hasCachedData();

  return {
    balances,
    totalByProvider,
    grandTotal,
    isLoading,
    isFetching,
    error,
    refresh: refetch,
    lastUpdated,
    isUsingCache,
    cacheAge,
    hasCached,
  };
}
