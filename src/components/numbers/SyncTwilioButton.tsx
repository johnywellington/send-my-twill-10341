import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useSyncTwilioNumbers } from "@/hooks/use-sync-twilio-numbers";

export const SyncTwilioButton = () => {
  const { mutate: syncNumbers, isPending } = useSyncTwilioNumbers();

  return (
    <Button
      onClick={() => syncNumbers()}
      disabled={isPending}
      variant="outline"
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${isPending ? 'animate-spin' : ''}`} />
      {isPending ? 'Sincronizando...' : 'Sincronizar Twilio'}
    </Button>
  );
};
