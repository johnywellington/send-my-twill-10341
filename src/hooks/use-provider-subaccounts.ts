import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ProviderSubaccount {
  id: string;
  parent_credential_id: string;
  user_id: string;
  provider: 'twilio' | 'vonage';
  subaccount_name: string;
  subaccount_sid?: string;
  subaccount_api_key?: string;
  subaccount_api_secret?: string;
  use_parent_balance: boolean;
  is_active: boolean;
  api_metadata?: any;
  created_at: string;
  updated_at: string;
}

export const useSubaccounts = (parentCredentialId?: string) => {
  return useQuery({
    queryKey: ['provider-subaccounts', parentCredentialId],
    queryFn: async () => {
      let query = supabase
        .from('provider_subaccounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (parentCredentialId) {
        query = query.eq('parent_credential_id', parentCredentialId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ProviderSubaccount[];
    },
  });
};

export const useCreateSubaccount = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      parentCredentialId: string;
      subaccountName: string;
      useParentBalance?: boolean;
      secret?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('create-provider-subaccount', {
        body: params,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-subaccounts'] });
      toast({
        title: "Subconta criada",
        description: "A subconta foi criada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar subconta",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateSubaccount = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProviderSubaccount> & { id: string }) => {
      const { data, error } = await supabase
        .from('provider_subaccounts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-subaccounts'] });
      toast({
        title: "Subconta atualizada",
        description: "A subconta foi atualizada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar subconta",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useDeleteSubaccount = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (subaccountId: string) => {
      const { data, error } = await supabase.functions.invoke('delete-provider-subaccount', {
        body: { subaccountId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-subaccounts'] });
      toast({
        title: "Subconta deletada",
        description: "A subconta foi deletada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao deletar subconta",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};