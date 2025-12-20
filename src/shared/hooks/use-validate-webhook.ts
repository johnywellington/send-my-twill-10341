import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ValidateWebhookParams {
  phoneNumberId: string;
  phoneNumber: string;
  provider: 'vonage' | 'twilio';
  testType: 'sms' | 'voice';
  webhookUrl: string;
}

interface ValidationResult {
  success: boolean;
  responseTime: number;
  statusCode: number;
  validFormat: boolean;
  errorMessage?: string;
  responseBody?: any;
  remainingSeconds?: number;
}

export const useValidateWebhook = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: ValidateWebhookParams) => {
      const { data, error } = await supabase.functions.invoke('validate-webhook', {
        body: params
      });

      if (error) throw error;
      return data as ValidationResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['webhook-health-checks'] });
      
      if (data.success && data.validFormat) {
        toast.success("✅ Webhook Validado!", {
          description: `Resposta em ${data.responseTime}ms. Status: ${data.statusCode}`,
        });
      } else if (data.success && !data.validFormat) {
        toast.warning("⚠️ Webhook responde, mas formato incorreto", {
          description: "O webhook está online mas não retorna o formato esperado.",
        });
      } else {
        toast.error("❌ Webhook não está funcionando", {
          description: data.errorMessage || `Status: ${data.statusCode}`,
        });
      }
    },
    onError: (error: any) => {
      if (error.message?.includes('Rate limit')) {
        toast.error("⏱️ Aguarde antes de testar novamente", {
          description: "Limite de testes atingido. Aguarde 60 segundos.",
        });
      } else {
        toast.error("Erro ao validar webhook", {
          description: error.message,
        });
      }
    }
  });
};
