import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getProviderIcon } from "@/lib/sip-utils";

interface CredentialBadgeProps {
  credential?: {
    id: string;
    credential_name: string;
    provider: string;
  } | null;
  size?: "sm" | "default";
}

export function CredentialBadge({ credential, size = "default" }: CredentialBadgeProps) {
  if (!credential) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={size === "sm" ? "text-xs" : ""}>
              🌐 Global
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Usando credenciais globais (legacy)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const providerIcon = getProviderIcon(credential.provider as 'twilio' | 'vonage');
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="secondary" 
            className={`gap-1 ${size === "sm" ? "text-xs" : ""}`}
          >
            {providerIcon} {credential.credential_name}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="text-xs font-semibold">Credencial: {credential.credential_name}</p>
            <p className="text-xs text-muted-foreground">Provider: {credential.provider}</p>
            <p className="text-xs text-muted-foreground">ID: {credential.id.slice(0, 8)}...</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
