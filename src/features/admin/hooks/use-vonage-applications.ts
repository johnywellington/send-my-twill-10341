import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VonageApplication {
  domain_group_id: string;
  friendly_name: string;
  is_default: boolean;
  is_active: boolean;
  app_id?: string;
  app_name?: string;
  sip_domain?: string;
}

export const useVonageApplications = () => {
  const queryClient = useQueryClient();

  const { data: applications, isLoading } = useQuery({
    queryKey: ['vonage-applications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sip_provider_config')
        .select('*')
        .eq('provider', 'vonage')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by domain_group_id
      const grouped = data.reduce((acc: Record<string, any>, item) => {
        const groupId = item.domain_group_id || 'legacy';
        if (!acc[groupId]) {
          acc[groupId] = {
            domain_group_id: groupId,
            friendly_name: item.friendly_name || 'Unnamed Application',
            is_default: item.is_default || false,
            is_active: item.is_active !== false,
            configs: []
          };
        }
        
        acc[groupId].configs.push(item);
        
        if (item.config_key === 'app_id') acc[groupId].app_id = item.config_value;
        if (item.config_key === 'app_name') acc[groupId].app_name = item.config_value;
        if (item.config_key === 'sip_domain') acc[groupId].sip_domain = item.config_value;
        
        return acc;
      }, {});

      return Object.values(grouped) as VonageApplication[];
    },
  });

  const createApplication = useMutation({
    mutationFn: async (data: { app_id: string; app_name: string; friendly_name?: string; is_default?: boolean }) => {
      const { data: result, error } = await supabase.functions.invoke('sip-vonage-create-application', {
        body: data
      });

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vonage-applications'] });
      toast.success('Application criada com sucesso');
    },
    onError: (error: any) => {
      console.error('Error creating application:', error);
      toast.error(error.message || 'Erro ao criar application');
    },
  });

  const updateApplication = useMutation({
    mutationFn: async (data: { domain_group_id: string; friendly_name?: string; is_default?: boolean; is_active?: boolean }) => {
      const { data: result, error } = await supabase.functions.invoke('sip-vonage-update-application', {
        body: data
      });

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vonage-applications'] });
      toast.success('Application atualizada com sucesso');
    },
    onError: (error: any) => {
      console.error('Error updating application:', error);
      toast.error(error.message || 'Erro ao atualizar application');
    },
  });

  const deleteApplication = useMutation({
    mutationFn: async (data: { domain_group_id: string; force?: boolean }) => {
      const { data: result, error } = await supabase.functions.invoke('sip-vonage-delete-application', {
        body: data
      });

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vonage-applications'] });
      toast.success('Application deletada com sucesso');
    },
    onError: (error: any) => {
      console.error('Error deleting application:', error);
      toast.error(error.message || 'Erro ao deletar application');
    },
  });

  return {
    applications,
    isLoading,
    createApplication,
    updateApplication,
    deleteApplication,
  };
};
