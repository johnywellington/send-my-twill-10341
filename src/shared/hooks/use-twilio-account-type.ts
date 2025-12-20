import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TwilioAccountInfo {
  trial: boolean;
  status: string;
  friendlyName?: string;
  accountSid?: string;
}

export function useTwilioAccountType(credentialId?: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['twilio-account-type', credentialId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('check-twilio-account-type', {
        body: { credentialId }
      });
      
      if (error) {
        console.error('[Twilio Account Hook] Error:', error);
        // Em caso de erro, não assume trial
        return { trial: false, status: 'unknown' } as TwilioAccountInfo;
      }
      
      return data as TwilioAccountInfo;
    },
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
    retry: 1,
  });

  return {
    isTrial: data?.trial ?? false, // Não assume trial durante loading
    status: data?.status,
    friendlyName: data?.friendlyName,
    accountSid: data?.accountSid,
    isLoading,
    error,
  };
}
