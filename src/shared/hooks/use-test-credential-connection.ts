import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TestConnectionResult {
  success: boolean;
  message?: string;
  error?: string;
}

export function useTestCredentialConnection() {
  return useMutation({
    mutationFn: async (credentialId: string): Promise<TestConnectionResult> => {
      const { data, error } = await supabase.functions.invoke('test-credential-connection', {
        body: { credentialId }
      });
      
      if (error) {
        throw new Error(error.message || 'Erro ao testar conexão');
      }
      
      return data as TestConnectionResult;
    }
  });
}
