import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PhoneNumber {
  id: string;
  user_id: string;
  phone_number: string;
  friendly_name: string | null;
  country_code: string;
  provider: 'vonage' | 'twilio';
  supports_sms: boolean;
  supports_voice: boolean;
  supports_mms: boolean;
  is_active: boolean;
  is_verified: boolean;
  webhook_configured: boolean;
  notes: string | null;
  sync_source?: 'manual' | 'twilio' | 'vonage';
  created_at: string;
  updated_at: string;
}

export const usePhoneNumbers = () => {
  return useQuery({
    queryKey: ['phone-numbers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('phone_numbers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PhoneNumber[];
    }
  });
};

export const useCreatePhoneNumber = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (phoneNumber: Omit<PhoneNumber, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('phone_numbers')
        .insert({
          ...phoneNumber,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phone-numbers'] });
      toast.success("Número adicionado com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao adicionar número", {
        description: error.message,
      });
    }
  });
};

export const useUpdatePhoneNumber = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PhoneNumber> }) => {
      const { data, error } = await supabase
        .from('phone_numbers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phone-numbers'] });
      toast.success("Número atualizado!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar", {
        description: error.message,
      });
    }
  });
};

export const useDeletePhoneNumber = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('phone_numbers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phone-numbers'] });
      toast.success("Número removido!");
    },
    onError: (error: any) => {
      toast.error("Erro ao remover", {
        description: error.message,
      });
    }
  });
};

export const useTestWebhook = () => {
  return useMutation({
    mutationFn: async ({ phoneNumber, provider, testType }: {
      phoneNumber: string;
      provider: 'vonage' | 'twilio';
      testType: 'sms' | 'voice';
    }) => {
      const { data, error } = await supabase.functions.invoke('test-webhook-health', {
        body: { phoneNumber, provider, testType }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.status === 'healthy') {
        toast.success("Webhook funcionando!", {
          description: data.message,
        });
      } else {
        toast.warning("Webhook inativo", {
          description: data.message,
        });
      }
    },
    onError: (error: any) => {
      toast.error("Erro ao testar webhook", {
        description: error.message,
      });
    }
  });
};
