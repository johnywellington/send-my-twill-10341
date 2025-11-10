import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useSyncSIPEndpoints } from "@/features/admin/hooks/use-sync-sip-endpoints";

interface OrphanedUser {
  id: string;
  sip_username: string;
  display_name: string | null;
  extension: string;
  provider: string;
}

interface SyncEndpointsButtonProps {
  onOrphansDetected?: (orphaned: OrphanedUser[]) => void;
}

export const SyncEndpointsButton = ({ onOrphansDetected }: SyncEndpointsButtonProps) => {
  const { mutate: syncEndpoints, isPending } = useSyncSIPEndpoints(onOrphansDetected);

  return (
    <Button
      onClick={() => syncEndpoints()}
      disabled={isPending}
      variant="outline"
      size="sm"
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${isPending ? 'animate-spin' : ''}`} />
      {isPending ? 'Sincronizando...' : 'Sincronizar com API'}
    </Button>
  );
};
