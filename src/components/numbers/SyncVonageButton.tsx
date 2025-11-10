import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useSyncVonageNumbers } from "@/features/admin/hooks/use-sync-vonage-numbers";

interface OrphanedNumber {
  id: string;
  phone_number: string;
  friendly_name: string | null;
  provider: string;
}

interface SyncVonageButtonProps {
  onOrphansDetected?: (orphaned: OrphanedNumber[]) => void;
}

export const SyncVonageButton = ({ onOrphansDetected }: SyncVonageButtonProps) => {
  const { mutate: syncNumbers, isPending } = useSyncVonageNumbers(onOrphansDetected);

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
