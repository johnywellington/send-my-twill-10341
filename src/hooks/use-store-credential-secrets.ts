import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface StoreSecretsParams {
  credentialId: string;
  provider: 'twilio' | 'vonage';
  credentials: {
    accountSid?: string;
    authToken?: string;
    apiKey?: string;
    apiSecret?: string;
    applicationId?: string;
    privateKey?: string;
  };
}

interface StoreSecretsResponse {
  success: boolean;
  secretKey: string;
  secretsToCreate: string[];
  message: string;
  debug?: any;
}

export function useStoreCredentialSecrets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: StoreSecretsParams): Promise<StoreSecretsResponse> => {
      const { data, error } = await supabase.functions.invoke<StoreSecretsResponse>(
        'store-credential-secrets',
        { 
          body: params 
        }
      );

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Erro ao preparar secrets');
      }

      if (!data?.success) {
        throw new Error(data?.message || 'Erro desconhecido ao preparar secrets');
      }

      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "✅ Secrets Preparados",
        description: `Secret key gerado: ${data.secretKey}. Total de secrets: ${data.secretsToCreate.length}`,
      });
      
      // Invalidate credentials to refresh secret_key status
      queryClient.invalidateQueries({ queryKey: ['provider-credentials'] });
    },
    onError: (error: Error) => {
      console.error('Store secrets error:', error);
      toast({
        title: "❌ Erro ao Preparar Secrets",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
