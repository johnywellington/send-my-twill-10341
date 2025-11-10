import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SyncResult {
  success: boolean;
  provider: string;
  routes: any[];
  count: number;
  error?: string;
}

interface SyncResponse {
  success: boolean;
  results: SyncResult[];
  logs: string;
  timestamp: string;
}

export function useSyncSIPRoutes(credentialId?: string) {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-sip-routes', {
        body: { credentialId },
      });

      if (error) throw error;
      return data as SyncResponse;
    },
    onSuccess: (data) => {
      const totalRoutes = data.results.reduce((sum, r) => sum + r.count, 0);
      toast.success(`Consulta concluída! ${totalRoutes} rota(s) encontrada(s)`);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao consultar rotas: ${error.message}`);
    },
  });
}