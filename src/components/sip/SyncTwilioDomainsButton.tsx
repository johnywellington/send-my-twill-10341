import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useSyncTwilioSIPDomains } from "@/hooks/use-sync-twilio-sip-domains";

export const SyncTwilioDomainsButton = () => {
  const { mutate: syncDomains, isPending } = useSyncTwilioSIPDomains();

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
