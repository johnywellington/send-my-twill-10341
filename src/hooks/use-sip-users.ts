import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useSIPUsers(credentialId?: string) {
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['sip-users', credentialId],
    queryFn: async () => {
      let query = supabase
        .from('sip_users')
        .select(`
          *,
          credential:provider_credentials(
            id,
            credential_name,
            provider
          )
        `)
        .order('created_at', { ascending: false });

      // Se credentialId for fornecido, filtrar por ele OU registros legacy (NULL)
      if (credentialId) {
        query = query.or(`credential_id.eq.${credentialId},credential_id.is.null`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });

  const createUser = useMutation({
    mutationFn: async (params: {
      provider: 'twilio' | 'vonage';
      username: string;
      password: string;
      extension: string;
      display_name?: string;
      domain_group_id?: string;
      credentialId?: string;
    }) => {
      const functionName = params.provider === 'twilio' 
        ? 'sip-twilio-create-user' 
        : 'sip-vonage-create-endpoint';

      console.log(`[SIP User Creation] Calling ${functionName} with:`, {
        provider: params.provider,
        username: params.username,
        extension: params.extension,
        credentialId: params.credentialId || credentialId,
        domain_group_id: params.domain_group_id
      });

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          username: params.username,
          password: params.password,
          extension: params.extension,
          display_name: params.display_name,
          domain_group_id: params.domain_group_id,
          credentialId: params.credentialId || credentialId,
        },
      });

      if (error) {
        console.error(`[SIP User Creation] Error from ${functionName}:`, error);
        throw error;
      }
      
      console.log(`[SIP User Creation] Success from ${functionName}:`, data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sip-users'] });
      toast.success('Usuário SIP criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar usuário: ${error.message}`);
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sip_users')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sip-users'] });
      toast.success('Usuário removido');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });

  return {
    users,
    isLoading,
    createUser: createUser.mutate,
    deleteUser: deleteUser.mutate,
    isCreating: createUser.isPending,
  };
}