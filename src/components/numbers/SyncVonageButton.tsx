import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useSyncVonageNumbers } from "@/hooks/use-sync-vonage-numbers";

export const SyncVonageButton = () => {
  const { mutate: syncNumbers, isPending } = useSyncVonageNumbers();

  return (
    <Button
      onClick={() => syncNumbers()}
      disabled={isPending}
      variant="outline"
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${isPending ? 'animate-spin' : ''}`} />
      {isPending ? 'Sincronizando...' : 'Sincronizar Vonage'}
    </Button>
  );
};
