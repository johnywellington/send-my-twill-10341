import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SetupRequest {
  provider: 'twilio' | 'vonage' | 'both';
  twilioConfig?: {
    friendlyName: string;
    domainName: string;
  };
  vonageConfig?: {
    name: string;
    answerUrl: string;
    eventUrl: string;
  };
}

export function useSIPConfig() {
  const queryClient = useQueryClient();

  const { data: configs, isLoading } = useQuery({
    queryKey: ['sip-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sip_provider_config')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      const grouped: Record<string, Record<string, string>> = {
        twilio: {},
        vonage: {},
      };

      data?.forEach(config => {
        grouped[config.provider][config.config_key] = config.config_value;
      });

      return grouped;
    },
  });

  const setupProviders = useMutation({
    mutationFn: async (params: SetupRequest) => {
      const { data, error } = await supabase.functions.invoke('sip-setup-providers', {
        body: params,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sip-config'] });
      toast.success('Providers configurados com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao configurar: ${error.message}`);
    },
  });

  const isTwilioConfigured = !!configs?.twilio?.sip_domain;
  const isVonageConfigured = !!configs?.vonage?.app_id;

  return {
    configs,
    isLoading,
    isTwilioConfigured,
    isVonageConfigured,
    setupProviders: setupProviders.mutate,
    isSettingUp: setupProviders.isPending,
  };
}