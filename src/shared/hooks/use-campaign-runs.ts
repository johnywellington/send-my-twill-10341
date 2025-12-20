import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CampaignRun {
  id: string;
  user_id: string;
  campaign_id: string | null;
  status: 'pending' | 'scheduled' | 'running' | 'completed' | 'failed' | 'cancelled';
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  total_contacts: number;
  successful_sends: number;
  failed_sends: number;
  pending_sends: number;
  provider: string;
  from_number: string;
  failed_numbers: FailedNumber[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  campaign?: {
    name: string;
    message_template: string;
  };
}

export interface FailedNumber {
  phone_number: string;
  contact_name?: string;
  error: string;
  provider?: string;
}

export interface CampaignRunDetail {
  id: string;
  run_id: string;
  phone_number: string;
  contact_name: string | null;
  status: 'pending' | 'sent' | 'failed' | 'retrying';
  provider: string | null;
  error_message: string | null;
  external_id: string | null;
  sent_at: string | null;
  created_at: string;
}

export function useCampaignRuns(campaignId?: string) {
  return useQuery({
    queryKey: ["campaign-runs", campaignId],
    queryFn: async () => {
      let query = supabase
        .from("campaign_runs")
        .select(`
          *,
          campaign:campaigns(name, message_template)
        `)
        .order("created_at", { ascending: false });

      if (campaignId) {
        query = query.eq("campaign_id", campaignId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as CampaignRun[];
    },
  });
}

export function useCampaignRunDetails(runId: string) {
  return useQuery({
    queryKey: ["campaign-run-details", runId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_run_details")
        .select("*")
        .eq("run_id", runId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as CampaignRunDetail[];
    },
    enabled: !!runId,
  });
}

export function useCreateCampaignRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      campaign_id?: string;
      status?: string;
      scheduled_at?: string;
      total_contacts: number;
      provider: string;
      from_number: string;
      metadata?: Record<string, any>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data: run, error } = await supabase
        .from("campaign_runs")
        .insert({
          user_id: user.id,
          campaign_id: data.campaign_id || null,
          status: data.status || 'pending',
          scheduled_at: data.scheduled_at || null,
          total_contacts: data.total_contacts,
          pending_sends: data.total_contacts,
          provider: data.provider,
          from_number: data.from_number,
          metadata: data.metadata || {},
        })
        .select()
        .single();

      if (error) throw error;
      return run;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-runs"] });
    },
    onError: (error: any) => {
      toast.error("Erro ao criar execução", { description: error.message });
    },
  });
}

export function useUpdateCampaignRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { 
      id: string;
      status?: string;
      started_at?: string;
      completed_at?: string;
      successful_sends?: number;
      failed_sends?: number;
      pending_sends?: number;
      failed_numbers?: FailedNumber[];
      metadata?: Record<string, any>;
    }) => {
      const updateData: Record<string, any> = { ...data };
      // Convert FailedNumber[] to JSON for Supabase
      if (data.failed_numbers) {
        updateData.failed_numbers = JSON.parse(JSON.stringify(data.failed_numbers));
      }

      const { error } = await supabase
        .from("campaign_runs")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-runs"] });
    },
  });
}

export function useCancelScheduledRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (runId: string) => {
      const { error } = await supabase
        .from("campaign_runs")
        .update({ status: 'cancelled' })
        .eq("id", runId)
        .eq("status", "scheduled");

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-runs"] });
      toast.success("Envio agendado cancelado!");
    },
    onError: (error: any) => {
      toast.error("Erro ao cancelar", { description: error.message });
    },
  });
}

export function useInsertRunDetails() {
  return useMutation({
    mutationFn: async (details: Array<{
      run_id: string;
      phone_number: string;
      contact_name?: string;
      status?: string;
    }>) => {
      const { error } = await supabase
        .from("campaign_run_details")
        .insert(details);

      if (error) throw error;
    },
  });
}

export function useUpdateRunDetail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<CampaignRunDetail> & { id: string }) => {
      const { error } = await supabase
        .from("campaign_run_details")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["campaign-run-details"] });
    },
  });
}
