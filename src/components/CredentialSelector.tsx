import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProviderCredentials } from "@/hooks/use-provider-credentials";
import { Badge } from "@/components/ui/badge";
import { Loader2, Key, Building2 } from "lucide-react";

interface CredentialSelectorProps {
  provider: 'twilio' | 'vonage';
  value: string | null;
  onChange: (value: string | null) => void;
  label?: string;
  showLegacyOption?: boolean;
  compact?: boolean;
}

export function CredentialSelector({
  provider,
  value,
  onChange,
  label = "Credencial",
  showLegacyOption = false,
  compact = false
}: CredentialSelectorProps) {
  const { data: credentials, isLoading } = useProviderCredentials();

  const filteredCredentials = credentials?.filter(c => c.provider === provider) || [];

  if (isLoading) {
    return (
      <div className={compact ? "flex items-center gap-2" : "space-y-2"}>
        {!compact && <Label>{label}</Label>}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-xs">Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={compact ? "flex items-center gap-2" : "space-y-2"}>
      {!compact && <Label>{label}</Label>}
      
      <Select
        value={value || 'legacy'}
        onValueChange={(v) => onChange(v === 'legacy' ? null : v)}
      >
        <SelectTrigger className={compact ? "h-9 w-full" : "h-11"}>
          <SelectValue placeholder="Selecione uma credencial">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              <span className="truncate">
                {value 
                  ? filteredCredentials.find(c => c.id === value)?.credential_name || 'Credencial'
                  : 'Credenciais Padrão'
                }
              </span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {showLegacyOption && (
            <SelectItem value="legacy">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span>Credenciais Padrão (Env)</span>
                <Badge variant="secondary" className="text-xs">Legacy</Badge>
              </div>
            </SelectItem>
          )}
          
          {filteredCredentials.length === 0 && !showLegacyOption ? (
            <div className="p-2 text-sm text-muted-foreground text-center">
              Nenhuma credencial disponível
            </div>
          ) : (
            filteredCredentials.map((cred) => (
              <SelectItem key={cred.id} value={cred.id}>
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  <span>{cred.credential_name}</span>
                  {cred.is_default && (
                    <Badge variant="outline" className="text-xs">Padrão</Badge>
                  )}
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
