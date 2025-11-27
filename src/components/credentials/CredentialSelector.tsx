import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, Star, Building2 } from "lucide-react";
import { useProviderCredentials } from "@/hooks/use-provider-credentials";
import { useSubaccounts } from "@/hooks/use-provider-subaccounts";

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
  const { data: credentials, isLoading: isLoadingCreds } = useProviderCredentials(provider);
  const { data: subaccounts, isLoading: isLoadingSubs } = useSubaccounts();

  const activeCredentials = credentials?.filter(c => c.is_active) || [];
  const activeSubaccounts = subaccounts?.filter(s => s.is_active && s.provider === provider) || [];

  const isLoading = isLoadingCreds || isLoadingSubs;

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="h-10 border rounded-md animate-pulse bg-muted"></div>
      </div>
    );
  }

  // Get selected account name for display
  const getSelectedName = () => {
    if (!value || value === 'legacy') return null;
    
    // Check if it's a credential
    const credential = activeCredentials.find(c => c.id === value);
    if (credential) return credential.credential_name;
    
    // Check if it's a subaccount
    const subaccount = activeSubaccounts.find(s => s.id === value);
    if (subaccount) return subaccount.subaccount_name;
    
    return null;
  };

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
                <SelectContent className="z-[100] bg-card border shadow-lg max-h-[400px]">
                  {showLegacyOption && (
                    <SelectItem value="legacy">
                      <div className="flex items-center gap-2">
                        <span>Credenciais Globais (Legacy)</span>
                        <Badge variant="outline" className="text-xs">Padrão</Badge>
                      </div>
                    </SelectItem>
                  )}
                  
                  {activeCredentials.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">
                        Contas Principais
                      </SelectLabel>
                      {activeCredentials.map((cred) => {
                        const providerLabel = cred.provider === 'twilio' ? 'Twilio' : 'Vonage';
                        const accountType = (cred as any).account_type || 'full';
                        const isTrialAccount = accountType === 'trial';
                        
                        return (
                          <SelectItem key={cred.id} value={cred.id}>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-3 w-3 text-success" />
                              <span className="font-medium">{providerLabel}</span>
                              <span className="text-muted-foreground">-</span>
                              <span>{cred.credential_name}</span>
                              {cred.is_default && <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />}
                              <Badge 
                                variant={isTrialAccount ? "destructive" : "secondary"} 
                                className="text-[10px] px-1.5 py-0"
                              >
                                {isTrialAccount ? 'Trial' : 'Padrão'}
                              </Badge>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectGroup>
                  )}
                  
                  {activeSubaccounts.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">
                        Subcontas
                      </SelectLabel>
                      {activeSubaccounts.map((sub) => {
                        const parentCred = credentials?.find(c => c.id === sub.parent_credential_id);
                        const providerLabel = sub.provider === 'twilio' ? 'Twilio' : 'Vonage';
                        
                        return (
                          <SelectItem key={sub.id} value={sub.id}>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3 w-3 text-primary" />
                              <span className="font-medium">{providerLabel}</span>
                              <span className="text-muted-foreground">-</span>
                              <span>{sub.subaccount_name}</span>
                              {parentCred && (
                                <span className="text-xs text-muted-foreground">
                                  (via {parentCred.credential_name})
                                </span>
                              )}
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                Subconta
                              </Badge>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
            </div>
          </TooltipTrigger>
          {compact && value && value !== 'legacy' && (
            <TooltipContent side="bottom">
              <p className="text-xs">
                Usando conta: {getSelectedName()}
              </p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
      
      {!compact && value && value !== 'legacy' && (
        <p className="text-xs text-muted-foreground">
          Usando conta: {getSelectedName()}
        </p>
      )}
    </div>
  );
}
