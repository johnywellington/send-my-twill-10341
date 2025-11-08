import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useSyncTwilioNumbers } from "@/hooks/use-sync-twilio-numbers";

interface OrphanedNumber {
  id: string;
  phone_number: string;
  friendly_name: string | null;
  provider: string;
}

interface SyncTwilioButtonProps {
  onOrphansDetected?: (orphaned: OrphanedNumber[]) => void;
}

export const SyncTwilioButton = ({ onOrphansDetected }: SyncTwilioButtonProps) => {
  const { mutate: syncNumbers, isPending } = useSyncTwilioNumbers(onOrphansDetected);

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
