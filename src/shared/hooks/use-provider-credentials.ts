import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ProviderCredential {
  id: string;
  user_id: string;
  provider: 'twilio' | 'vonage';
  credential_name: string;
  account_identifier: string;
  secret_key?: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useProviderCredentials(provider?: 'twilio' | 'vonage') {
  return useQuery({
    queryKey: ['provider-credentials', provider],
    queryFn: async () => {
      let query = supabase
        .from('provider_credentials')
        .select('*')
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('credential_name');

      if (provider) {
        query = query.eq('provider', provider);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ProviderCredential[];
    },
  });
}

export function useCreateProviderCredential() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credential: Omit<ProviderCredential, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('provider_credentials')
        .insert({
          ...credential,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-credentials'] });
      toast.success('Credencial adicionada com sucesso');
    },
    onError: (error: any) => {
      console.error('Erro ao adicionar credencial:', error);
      toast.error('Erro ao adicionar credencial: ' + error.message);
    },
  });
}

export function useUpdateProviderCredential() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProviderCredential> & { id: string }) => {
      const { data, error } = await supabase
        .from('provider_credentials')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-credentials'] });
      toast.success('Credencial atualizada com sucesso');
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar credencial:', error);
      toast.error('Erro ao atualizar credencial: ' + error.message);
    },
  });
}

export function useDeleteProviderCredential() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('provider_credentials')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-credentials'] });
      queryClient.invalidateQueries({ queryKey: ['phone-numbers'] });
      toast.success('Credencial removida com sucesso');
    },
    onError: (error: any) => {
      console.error('Erro ao remover credencial:', error);
      toast.error('Erro ao remover credencial: ' + error.message);
    },
  });
}
