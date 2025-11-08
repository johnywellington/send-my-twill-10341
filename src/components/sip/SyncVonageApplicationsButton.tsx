import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useSyncVonageSIPApplications } from "@/hooks/use-sync-vonage-sip-applications";

interface OrphanedApplication {
  domain_group_id: string;
  domain_name: string;
  domain_sid: string;
  friendly_name: string;
}

interface SyncVonageApplicationsButtonProps {
  onOrphansDetected?: (orphaned: OrphanedApplication[]) => void;
}

export const SyncVonageApplicationsButton = ({ onOrphansDetected }: SyncVonageApplicationsButtonProps) => {
  const { mutate: syncApps, isPending } = useSyncVonageSIPApplications(onOrphansDetected);

  return (
    <Button
      onClick={() => syncApps()}
      disabled={isPending}
      variant="outline"
      size="sm"
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${isPending ? 'animate-spin' : ''}`} />
      {isPending ? 'Sincronizando...' : 'Sincronizar'}
    </Button>
  );
};
