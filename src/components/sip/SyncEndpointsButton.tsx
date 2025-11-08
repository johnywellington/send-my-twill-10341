import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useSyncSIPEndpoints } from "@/hooks/use-sync-sip-endpoints";

export const SyncEndpointsButton = () => {
  const { mutate: syncEndpoints, isPending } = useSyncSIPEndpoints();

  return (
    <Button
      onClick={() => syncEndpoints()}
      disabled={isPending}
      variant="outline"
      size="sm"
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${isPending ? 'animate-spin' : ''}`} />
      {isPending ? 'Sincronizando...' : 'Atualizar Status'}
    </Button>
  );
};
