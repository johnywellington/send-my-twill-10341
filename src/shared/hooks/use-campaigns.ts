import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Campaign {
  id: string;
  user_id: string;
  name: string;
  message_template: string;
  lead_list_id: string | null;
  lead_list_name: string | null;
  contact_count: number;
  sends_count: number;
  last_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useCampaigns() {
  return useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Campaign[];
    },
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      message_template: string;
      lead_list_id?: string;
      lead_list_name?: string;
      contact_count?: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data: campaign, error } = await supabase
        .from("campaigns")
        .insert({
          user_id: user.id,
          name: data.name,
          message_template: data.message_template,
          lead_list_id: data.lead_list_id || null,
          lead_list_name: data.lead_list_name || null,
          contact_count: data.contact_count || 0,
        })
        .select()
        .single();

      if (error) throw error;
      return campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campanha criada com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao criar campanha", { description: error.message });
    },
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Campaign> & { id: string }) => {
      const { error } = await supabase
        .from("campaigns")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", campaignId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campanha removida!");
    },
    onError: (error: any) => {
      toast.error("Erro ao remover campanha", { description: error.message });
    },
  });
}

export function useIncrementCampaignSends() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId: string) => {
      // Buscar campanha atual
      const { data: campaign, error: fetchError } = await supabase
        .from("campaigns")
        .select("sends_count")
        .eq("id", campaignId)
        .single();

      if (fetchError) throw fetchError;

      // Incrementar envios
      const { error } = await supabase
        .from("campaigns")
        .update({
          sends_count: (campaign?.sends_count || 0) + 1,
          last_sent_at: new Date().toISOString(),
        })
        .eq("id", campaignId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}
