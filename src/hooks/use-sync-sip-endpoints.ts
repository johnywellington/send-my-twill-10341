import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OrphanedUser {
  id: string;
  sip_username: string;
  display_name: string | null;
  extension: string;
  provider: string;
}

export function useSyncSIPEndpoints(onOrphansDetected?: (orphaned: OrphanedUser[]) => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-sip-endpoints-status', {
        body: {},
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sip-users'] });
      queryClient.invalidateQueries({ queryKey: ['sip-endpoints'] });
      
      const orphanedUsers = data?.orphaned || [];
      
      if (orphanedUsers.length > 0 && onOrphansDetected) {
        onOrphansDetected(orphanedUsers);
      } else {
        toast.success(`Sincronização concluída! ${data?.synced || 0} endpoint(s) atualizado(s)`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Erro ao sincronizar: ${error.message}`);
    },
  });
}
