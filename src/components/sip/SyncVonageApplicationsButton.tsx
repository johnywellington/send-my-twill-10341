import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useSyncVonageSIPApplications } from "@/hooks/use-sync-vonage-sip-applications";

export const SyncVonageApplicationsButton = () => {
  const { mutate: syncApps, isPending } = useSyncVonageSIPApplications();

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
