import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreateRouteParams {
  name: string;
  provider: 'twilio' | 'vonage';
  route_type: 'sip_to_sip' | 'sip_to_pstn' | 'pstn_to_sip';
  from_pattern: string;
  to_pattern: string;
  forward_to: string;
  priority: number;
  domain_group_id?: string;
}

export function useSIPRoutes(credentialId?: string) {
  const queryClient = useQueryClient();

  const { data: routes, isLoading } = useQuery({
    queryKey: ['sip-routes', credentialId],
    queryFn: async () => {
      let query = supabase
        .from('sip_routes')
        .select(`
          *,
          credential:provider_credentials(
            id,
            credential_name,
            provider
          )
        `)
        .order('priority', { ascending: false });

      // Se credentialId for fornecido, filtrar por ele OU registros legacy (NULL)
      if (credentialId) {
        query = query.or(`credential_id.eq.${credentialId},credential_id.is.null`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });

  const createRoute = useMutation({
    mutationFn: async (params: CreateRouteParams & { credentialId?: string }) => {
      const functionName = params.provider === 'twilio' 
        ? 'sip-twilio-create-route' 
        : 'sip-vonage-create-route';

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
      queryClient.invalidateQueries({ queryKey: ['sip-routes'] });
      toast.success('Rota SIP criada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar rota: ${error.message}`);
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('sip_routes')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sip-routes'] });
      toast.success('Status da rota atualizado');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  const deleteRoute = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sip_routes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sip-routes'] });
      toast.success('Rota removida');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });

  return {
    routes,
    isLoading,
    createRoute: createRoute.mutate,
    toggleActive: toggleActive.mutate,
    deleteRoute: deleteRoute.mutate,
    isCreating: createRoute.isPending,
  };
}
