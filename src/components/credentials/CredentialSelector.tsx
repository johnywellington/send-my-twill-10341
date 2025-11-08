import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertCircle, CheckCircle2, Star } from "lucide-react";
import { useProviderCredentials } from "@/hooks/use-provider-credentials";

interface CredentialSelectorProps {
  provider: 'twilio' | 'vonage';
  value?: string;
  onChange: (credentialId: string | undefined) => void;
  label?: string;
  showLegacyOption?: boolean;
  compact?: boolean;
}

export function CredentialSelector({ 
  provider, 
  value, 
  onChange, 
  label = "Conta",
  showLegacyOption = true,
  compact = false
}: CredentialSelectorProps) {
  const { data: credentials, isLoading } = useProviderCredentials(provider);

  const activeCredentials = credentials?.filter(c => c.is_active) || [];
  const defaultCredential = activeCredentials.find(c => c.is_default);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="h-10 border rounded-md animate-pulse bg-muted"></div>
      </div>
    );
  }

  if (activeCredentials.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Nenhuma conta {provider === 'twilio' ? 'Twilio' : 'Vonage'} configurada.
          {showLegacyOption && ' Usando credenciais globais.'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      {!compact && <Label htmlFor="credential-selector">{label}</Label>}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Select
                value={value || (showLegacyOption ? 'legacy' : undefined)}
                onValueChange={(val) => onChange(val === 'legacy' ? undefined : val)}
              >
                <SelectTrigger id="credential-selector" className={compact ? "h-9 text-sm" : ""}>
                  <SelectValue placeholder="Selecione uma conta" />
                </SelectTrigger>
                <SelectContent className="z-[100] bg-card border shadow-lg">
                  {showLegacyOption && (
                    <SelectItem value="legacy">
                      <div className="flex items-center gap-2">
                        <span>Credenciais Globais (Legacy)</span>
                        <Badge variant="outline" className="text-xs">Padrão</Badge>
                      </div>
                    </SelectItem>
                  )}
                  
                  {activeCredentials.map((cred) => (
                    <SelectItem key={cred.id} value={cred.id}>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 text-success" />
                        <span>{cred.credential_name}</span>
                        {cred.is_default && <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />}
                        <span className="text-xs text-muted-foreground">({cred.account_identifier.substring(0, 10)}...)</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TooltipTrigger>
          {compact && value && value !== 'legacy' && (
            <TooltipContent side="bottom">
              <p className="text-xs">
                Usando conta: {activeCredentials.find(c => c.id === value)?.credential_name}
              </p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
      
      {!compact && value && value !== 'legacy' && (
        <p className="text-xs text-muted-foreground">
          Usando conta: {activeCredentials.find(c => c.id === value)?.credential_name}
        </p>
      )}
    </div>
  );
}
