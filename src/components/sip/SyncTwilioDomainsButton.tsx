import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useSyncTwilioSIPDomains } from "@/hooks/use-sync-twilio-sip-domains";

interface OrphanedDomain {
  domain_group_id: string;
  domain_name: string;
  domain_sid: string;
  friendly_name: string;
}

interface SyncTwilioDomainsButtonProps {
  onOrphansDetected?: (orphaned: OrphanedDomain[]) => void;
}

export const SyncTwilioDomainsButton = ({ onOrphansDetected }: SyncTwilioDomainsButtonProps) => {
  const { mutate: syncDomains, isPending } = useSyncTwilioSIPDomains(onOrphansDetected);

  return (
    <Button
      onClick={() => syncDomains()}
      disabled={isPending}
      variant="outline"
      size="sm"
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${isPending ? 'animate-spin' : ''}`} />
      {isPending ? 'Sincronizando...' : 'Sincronizar'}
    </Button>
  );
};
