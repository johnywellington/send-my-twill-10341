import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SetupRequest {
  provider: 'twilio' | 'vonage' | 'both';
  setAsDefault?: boolean;
  credentialId?: string;
  twilioConfig?: {
    friendlyName: string;
    domainName: string;
    displayName?: string;
  };
  vonageConfig?: {
    name: string;
    displayName?: string;
    answerUrl: string;
    eventUrl: string;
  };
}

interface DomainConfig {
  domain_group_id: string;
  friendly_name: string;
  is_default: boolean;
  is_active: boolean;
  [key: string]: any;
}

export function useSIPConfig(credentialId?: string) {
  const queryClient = useQueryClient();

  const { data: configs, isLoading } = useQuery({
    queryKey: ['sip-config', credentialId],
    queryFn: async () => {
      let query = supabase
        .from('sip_provider_config')
        .select(`
          *,
          credential:provider_credentials(
            id,
            credential_name,
            provider
          )
        `)
        .order('created_at', { ascending: false });

      if (credentialId) {
        query = query.eq('credential_id', credentialId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Agrupar por domain_group_id
      const groupedByDomain: Record<string, any[]> = {};
      data?.forEach(config => {
        if (!groupedByDomain[config.domain_group_id]) {
          groupedByDomain[config.domain_group_id] = [];
        }
        groupedByDomain[config.domain_group_id].push(config);
      });

      // Transformar em arrays de domínios por provider
      const twilioConfigs: DomainConfig[] = Object.values(groupedByDomain)
        .filter(group => group[0].provider === 'twilio')
        .map(group => {
          const configMap: Record<string, string> = {};
          group.forEach(c => { configMap[c.config_key] = c.config_value; });
          return {
            domain_group_id: group[0].domain_group_id,
            friendly_name: group[0].friendly_name,
            is_default: group[0].is_default,
            is_active: group[0].is_active,
            ...configMap,
          };
        });

      const vonageConfigs: DomainConfig[] = Object.values(groupedByDomain)
        .filter(group => group[0].provider === 'vonage')
        .map(group => {
          const configMap: Record<string, string> = {};
          group.forEach(c => { configMap[c.config_key] = c.config_value; });
          return {
            domain_group_id: group[0].domain_group_id,
            friendly_name: group[0].friendly_name,
            is_default: group[0].is_default,
            is_active: group[0].is_active,
            ...configMap,
          };
        });

      return {
        twilio: twilioConfigs,
        vonage: vonageConfigs,
      };
    },
  });

  const createDomain = useMutation({
    mutationFn: async (params: SetupRequest) => {
      const { data, error } = await supabase.functions.invoke('sip-setup-providers', {
        body: {
          ...params,
          credentialId: params.credentialId || credentialId,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sip-config'] });
      const displayName = variables.twilioConfig?.displayName || variables.vonageConfig?.displayName;
      toast.success(`Domínio "${displayName}" criado com sucesso!`);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar domínio: ${error.message}`);
    },
  });

  const deleteDomain = useMutation({
    mutationFn: async (domainGroupId: string) => {
      const { error } = await supabase
        .from('sip_provider_config')
        .delete()
        .eq('domain_group_id', domainGroupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sip-config'] });
      toast.success('Domínio deletado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao deletar: ${error.message}`);
    },
  });

  const setAsDefault = useMutation({
    mutationFn: async ({ provider, domainGroupId }: { provider: string, domainGroupId: string }) => {
      // Desmarcar todos
      await supabase
        .from('sip_provider_config')
        .update({ is_default: false })
        .eq('provider', provider);
      
      // Marcar o selecionado
      const { error } = await supabase
        .from('sip_provider_config')
        .update({ is_default: true })
        .eq('domain_group_id', domainGroupId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sip-config'] });
      toast.success('Domínio padrão atualizado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ domainGroupId, isActive }: { domainGroupId: string, isActive: boolean }) => {
      const { error } = await supabase
        .from('sip_provider_config')
        .update({ is_active: !isActive })
        .eq('domain_group_id', domainGroupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sip-config'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao alterar status: ${error.message}`);
    },
  });

  const updateDomain = useMutation({
    mutationFn: async ({ domainGroupId, friendlyName }: { domainGroupId: string, friendlyName: string }) => {
      const { error } = await supabase
        .from('sip_provider_config')
        .update({ friendly_name: friendlyName })
        .eq('domain_group_id', domainGroupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sip-config'] });
      toast.success('Domínio atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  return {
    configs,
    isLoading,
    hasTwilioConfigs: (configs?.twilio?.length || 0) > 0,
    hasVonageConfigs: (configs?.vonage?.length || 0) > 0,
    createDomain: createDomain.mutate,
    deleteDomain: deleteDomain.mutate,
    setAsDefault: setAsDefault.mutate,
    toggleActive: toggleActive.mutate,
    updateDomain: updateDomain.mutate,
    isCreating: createDomain.isPending,
    isUpdating: updateDomain.isPending,
  };
}