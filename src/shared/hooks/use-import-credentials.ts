import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ImportResult {
  success: boolean;
  imported: Array<{
    provider: string;
    credential_name: string;
    account_identifier: string;
  }>;
  skipped: Array<{
    provider: string;
    reason: string;
  }>;
  errors: string[];
}

export function useImportCredentials() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase.functions.invoke<ImportResult>(
        'import-provider-credentials',
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['provider-credentials'] });
      queryClient.invalidateQueries({ queryKey: ['phone-numbers'] });

      if (data.imported.length > 0) {
        toast.success(
          `${data.imported.length} credencial(is) importada(s) com sucesso`,
          {
            description: data.imported
              .map((c) => `${c.provider}: ${c.credential_name}`)
              .join(', '),
          }
        );
      }

      if (data.skipped.length > 0) {
        toast.info(
          `${data.skipped.length} credencial(is) ignorada(s)`,
          {
            description: data.skipped
              .map((s) => `${s.provider}: ${s.reason}`)
              .join('\n'),
          }
        );
      }

      if (data.errors.length > 0) {
        toast.error('Alguns erros ocorreram durante a importação', {
          description: data.errors.join('\n'),
        });
      }

      if (data.imported.length === 0 && data.errors.length === 0) {
        toast.info('Nenhuma credencial nova para importar');
      }
    },
    onError: (error: any) => {
      console.error('Erro ao importar credenciais:', error);
      toast.error('Erro ao importar credenciais: ' + error.message);
    },
  });
}
