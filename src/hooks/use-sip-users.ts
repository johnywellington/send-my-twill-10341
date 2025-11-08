import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useSIPUsers(credentialId?: string) {
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['sip-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sip_users')
        .select('*')
        .order('created_at', { ascending: false });

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

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          ...params,
          credentialId: params.credentialId || credentialId,
        },
      });

      if (error) throw error;
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