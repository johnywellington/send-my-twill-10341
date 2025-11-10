import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useVonageUsers = (domainGroupId?: string) => {
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['vonage-users', domainGroupId],
    queryFn: async () => {
      let query = supabase
        .from('sip_users')
        .select('*, provider_credentials(credential_name)')
        .eq('provider', 'vonage')
        .order('created_at', { ascending: false });

      if (domainGroupId && domainGroupId !== 'legacy') {
        query = query.eq('domain_group_id', domainGroupId);
      } else if (domainGroupId === 'legacy') {
        query = query.is('domain_group_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!domainGroupId,
  });

  const updateUser = useMutation({
    mutationFn: async (data: { sip_user_id: string; display_name?: string; is_active?: boolean }) => {
      const { data: result, error } = await supabase.functions.invoke('sip-vonage-update-user', {
        body: data
      });

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vonage-users'] });
      queryClient.invalidateQueries({ queryKey: ['sip-users'] });
      toast.success('Usuário atualizado com sucesso');
    },
    onError: (error: any) => {
      console.error('Error updating user:', error);
      toast.error(error.message || 'Erro ao atualizar usuário');
    },
  });

  return {
    users,
    isLoading,
    updateUser,
  };
};
