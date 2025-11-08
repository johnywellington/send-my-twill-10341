import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Star, Lightbulb } from "lucide-react";
import { useSIPUsers } from "@/hooks/use-sip-users";
import { useSIPConfig } from "@/hooks/use-sip-config";
import { useExtensionAvailability } from "@/hooks/use-extension-availability";
import { useProvider } from "@/contexts/ProviderContext";
import { ExtensionAvailability } from "./ExtensionAvailability";
import { toast } from "sonner";

interface SIPUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function generatePassword(length = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export function SIPUserDialog({ open, onOpenChange }: SIPUserDialogProps) {
  const [provider, setProvider] = useState<'twilio' | 'vonage'>('twilio');
  const [domainGroupId, setDomainGroupId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState(generatePassword());
  const [extension, setExtension] = useState('');
  const [displayName, setDisplayName] = useState('');

  const { selectedCredentialId } = useProvider();
  const { createUser, isCreating } = useSIPUsers(selectedCredentialId);
  const { configs } = useSIPConfig();
  const { analysis, isExtensionAvailable } = useExtensionAvailability(provider);

  // Filtrar domínios ativos do provider selecionado
  const availableDomains = useMemo(() => {
    const domains = provider === 'twilio' 
      ? (configs?.twilio?.filter(d => d.is_active) || [])
      : (configs?.vonage?.filter(d => d.is_active) || []);
    return domains;
  }, [configs, provider]);

  // Auto-selecionar domínio padrão ou único
  useEffect(() => {
    if (availableDomains.length === 1) {
      setDomainGroupId(availableDomains[0].domain_group_id);
    } else {
      const defaultDomain = availableDomains.find(d => d.is_default);
      if (defaultDomain) {
        setDomainGroupId(defaultDomain.domain_group_id);
      }
    }
  }, [availableDomains]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password || !extension) {
      return;
    }
    
    // Validar disponibilidade da extensão
    if (!isExtensionAvailable(extension)) {
      toast.error("Extensão já em uso", {
        description: `A extensão ${extension} já está cadastrada. Use a sugerida: ${analysis?.nextAvailable}`,
      });
      return;
    }

    createUser({
      provider,
      username,
      password,
      extension,
      display_name: displayName || undefined,
      domain_group_id: domainGroupId || undefined,
      credentialId: selectedCredentialId || undefined,
    });

    onOpenChange(false);
    // Reset form
    setUsername('');
    setPassword(generatePassword());
    setExtension('');
    setDisplayName('');
    setDomainGroupId('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Criar Usuário SIP</DialogTitle>
          <DialogDescription>
            Configure um novo usuário/ramal SIP no provedor selecionado
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="provider">Provedor</Label>
            <Select value={provider} onValueChange={(v) => setProvider(v as 'twilio' | 'vonage')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="twilio">Twilio</SelectItem>
                <SelectItem value="vonage">Vonage</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {availableDomains.length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="domain">Domínio SIP</Label>
              <Select value={domainGroupId} onValueChange={setDomainGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o domínio" />
                </SelectTrigger>
                <SelectContent>
                  {availableDomains.map(domain => (
                    <SelectItem 
                      key={domain.domain_group_id} 
                      value={domain.domain_group_id}
                    >
                      {domain.is_default && <Star className="inline h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />}
                      {domain.friendly_name}
                      {domain.is_default && ' (padrão)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {availableDomains.length === 0 && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              ⚠️ Nenhum domínio {provider === 'twilio' ? 'Twilio' : 'Vonage'} ativo encontrado. 
              Configure um domínio primeiro na aba Config.
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="username">Username SIP *</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="user1001"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <div className="flex gap-2">
              <Input
                id="password"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setPassword(generatePassword())}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="extension">Ramal (Extension) *</Label>
              {analysis && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setExtension(analysis.nextAvailable)}
                  className="h-7 text-xs"
                >
                  <Lightbulb className="h-3 w-3 mr-1" />
                  Usar Sugerida ({analysis.nextAvailable})
                </Button>
              )}
            </div>
            <Input
              id="extension"
              value={extension}
              onChange={(e) => setExtension(e.target.value)}
              placeholder={analysis?.nextAvailable || "1001"}
              required
              className={
                extension && !isExtensionAvailable(extension)
                  ? "border-red-500 focus-visible:ring-red-500"
                  : extension && isExtensionAvailable(extension)
                  ? "border-green-500 focus-visible:ring-green-500"
                  : ""
              }
            />
            {extension && !isExtensionAvailable(extension) && (
              <p className="text-xs text-red-600 dark:text-red-400">
                ⚠️ Esta extensão já está em uso
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Nome de Exibição</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="João Silva"
            />
          </div>

          {/* Visualizador de Extensões */}
          <ExtensionAvailability 
            provider={provider} 
            currentExtension={extension}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreating || availableDomains.length === 0}>
              {isCreating ? "Criando..." : "Criar Usuário"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}