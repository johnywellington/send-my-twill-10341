import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Star } from "lucide-react";
import { useProviderCredentials } from "@/hooks/use-provider-credentials";

interface CredentialSelectorProps {
  provider: 'twilio' | 'vonage';
  value?: string;
  onChange: (credentialId: string | undefined) => void;
  label?: string;
  showLegacyOption?: boolean;
}

export function CredentialSelector({ 
  provider, 
  value, 
  onChange, 
  label = "Conta",
  showLegacyOption = true 
}: CredentialSelectorProps) {
  const { data: credentials, isLoading } = useProviderCredentials(provider);

  const activeCredentials = credentials?.filter(c => c.is_active) || [];
  const defaultCredential = activeCredentials.find(c => c.is_default);

  // Se não tiver valor e tiver uma credencial padrão, usar ela
  if (!value && defaultCredential && onChange) {
    onChange(defaultCredential.id);
  }

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
    <div className="space-y-2">
      <Label htmlFor="credential-selector">{label}</Label>
      <Select
        value={value || (showLegacyOption ? 'legacy' : undefined)}
        onValueChange={(val) => onChange(val === 'legacy' ? undefined : val)}
      >
        <SelectTrigger id="credential-selector">
          <SelectValue placeholder="Selecione uma conta" />
        </SelectTrigger>
        <SelectContent>
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
      
      {value && value !== 'legacy' && (
        <p className="text-xs text-muted-foreground">
          Usando conta: {activeCredentials.find(c => c.id === value)?.credential_name}
        </p>
      )}
    </div>
  );
}
