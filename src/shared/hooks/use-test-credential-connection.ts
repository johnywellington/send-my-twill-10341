import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface TestConnectionParams {
  credentialId: string;
}

interface TestConnectionResult {
  success: boolean;
  message: string;
  provider: string;
  accountName: string;
  details?: any;
}

export function useTestCredentialConnection() {
  return useMutation({
    mutationFn: async (params: TestConnectionParams): Promise<TestConnectionResult> => {
      const { data, error } = await supabase.functions.invoke<TestConnectionResult>(
        'test-credential-connection',
        { 
          body: params 
        }
      );

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Erro ao testar conexão');
      }

      if (!data) {
        throw new Error('Resposta vazia do servidor');
      }

      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "✅ Conexão OK",
          description: data.message,
        });
      } else {
        toast({
          title: "❌ Falha na Conexão",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      console.error('Test connection error:', error);
      toast({
        title: "❌ Erro ao Testar",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
