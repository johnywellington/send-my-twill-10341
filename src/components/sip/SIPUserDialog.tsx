import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Star, Lightbulb, Eye, EyeOff, Copy, Check, X, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSIPUsers } from "@/hooks/use-sip-users";
import { useSIPConfig } from "@/hooks/use-sip-config";
import { useExtensionAvailability } from "@/hooks/use-extension-availability";
import { useSIPConnectivityTest } from "@/hooks/use-sip-connectivity-test";
import { useProvider } from "@/contexts/ProviderContext";
import { ExtensionAvailability } from "./ExtensionAvailability";
import { toast } from "sonner";

interface SIPUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function generatePassword(length = 16): string {
  // Twilio requires: min 12 chars, at least 1 number, 1 uppercase, 1 lowercase
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  
  // Ensure minimum requirements are met
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)]; // At least 1 uppercase
  password += lowercase[Math.floor(Math.random() * lowercase.length)]; // At least 1 lowercase
  password += numbers[Math.floor(Math.random() * numbers.length)];     // At least 1 number
  password += special[Math.floor(Math.random() * special.length)];     // At least 1 special
  
  // Fill the rest with random characters
  const allChars = lowercase + uppercase + numbers + special;
  for (let i = password.length; i < Math.max(length, 12); i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle to avoid predictable pattern
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 12) {
    return { valid: false, message: 'Senha deve ter no mínimo 12 caracteres' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Senha deve conter pelo menos uma letra maiúscula' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Senha deve conter pelo menos uma letra minúscula' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Senha deve conter pelo menos um número' };
  }
  return { valid: true };
}

function getPasswordStrength(password: string): { strength: number; label: string; color: string } {
  let strength = 0;
  const checks = {
    length: password.length >= 12,
    hasLower: /[a-z]/.test(password),
    hasUpper: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*]/.test(password),
    longEnough: password.length >= 16,
  };

  // Calculate strength
  if (checks.length) strength += 20;
  if (checks.hasLower) strength += 20;
  if (checks.hasUpper) strength += 20;
  if (checks.hasNumber) strength += 20;
  if (checks.hasSpecial) strength += 10;
  if (checks.longEnough) strength += 10;

  // Determine label and color
  if (strength < 60) return { strength, label: 'Fraca', color: 'bg-red-500' };
  if (strength < 80) return { strength, label: 'Média', color: 'bg-yellow-500' };
  if (strength < 100) return { strength, label: 'Forte', color: 'bg-green-500' };
  return { strength, label: 'Muito Forte', color: 'bg-green-600' };
}

function getPasswordRequirements(password: string) {
  return [
    { label: '12+ caracteres', met: password.length >= 12 },
    { label: 'Letra maiúscula (A-Z)', met: /[A-Z]/.test(password) },
    { label: 'Letra minúscula (a-z)', met: /[a-z]/.test(password) },
    { label: 'Número (0-9)', met: /[0-9]/.test(password) },
    { label: 'Caractere especial (!@#$%^&*)', met: /[!@#$%^&*]/.test(password) },
  ];
}

export function SIPUserDialog({ open, onOpenChange }: SIPUserDialogProps) {
  const [provider, setProvider] = useState<'twilio' | 'vonage'>('twilio');
  const [domainGroupId, setDomainGroupId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState(generatePassword());
  const [extension, setExtension] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [lastCreatedUser, setLastCreatedUser] = useState<{
    userId: string;
    provider: 'twilio' | 'vonage';
    username: string;
  } | null>(null);

  const { selectedCredentialId } = useProvider();
  const { createUserAsync, isCreating } = useSIPUsers(selectedCredentialId);
  const { configs } = useSIPConfig();
  const { analysis, isExtensionAvailable } = useExtensionAvailability(provider);
  const { testConnectivity, isTesting, lastTest } = useSIPConnectivityTest();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password || !extension) {
      return;
    }
    
    // Validar senha
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      toast.error("Senha inválida", {
        description: passwordValidation.message,
      });
      return;
    }
    
    // Validar disponibilidade da extensão
    if (!isExtensionAvailable(extension)) {
      toast.error("Extensão já em uso", {
        description: `A extensão ${extension} já está cadastrada. Use a sugerida: ${analysis?.nextAvailable}`,
      });
      return;
    }

    try {
      const result = await createUserAsync({
        provider,
        username,
        password,
        extension,
        display_name: displayName || undefined,
        domain_group_id: domainGroupId || undefined,
        credentialId: selectedCredentialId || undefined,
      });

      // Salvar dados do usuário criado
      setLastCreatedUser({
        userId: result.id,
        provider: provider,
        username: username,
      });

      // Fechar dialog de criação
      onOpenChange(false);

      // Reset form
      setUsername('');
      setPassword(generatePassword());
      setExtension('');
      setDisplayName('');
      setDomainGroupId('');
      setPasswordCopied(false);

      // Aguardar 3 segundos para propagação da API
      toast.info('Iniciando teste de conectividade...', {
        description: 'Aguarde enquanto validamos as credenciais'
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      // Disparar teste automático
      testConnectivity({ provider, test_type: 'post_creation' });

      // Abrir dialog com resultados
      setShowTestDialog(true);

    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(password);
    setPasswordCopied(true);
    toast.success('Senha copiada!');
    setTimeout(() => setPasswordCopied(false), 2000);
  };

  return (
    <>
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
              <div className="flex-1 space-y-3">
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={
                      password && !validatePassword(password).valid
                        ? "border-red-500 pr-20"
                        : password && validatePassword(password).valid
                        ? "border-green-500 pr-20"
                        : "pr-20"
                    }
                  />
                  <div className="absolute right-0 top-0 h-full flex items-center gap-1 pr-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyPassword}
                      className="h-8 w-8 p-0 hover:bg-transparent"
                    >
                      {passwordCopied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPassword(!showPassword)}
                      className="h-8 w-8 p-0 hover:bg-transparent"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                
                {/* Password Strength Indicator */}
                {password && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Força da senha:</span>
                      <span className={`font-medium ${
                        getPasswordStrength(password).strength >= 80 
                          ? 'text-green-600 dark:text-green-400' 
                          : getPasswordStrength(password).strength >= 60
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {getPasswordStrength(password).label}
                      </span>
                    </div>
                    <div className="relative h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${getPasswordStrength(password).color}`}
                        style={{ width: `${getPasswordStrength(password).strength}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Requirements Checklist */}
                {password && (
                  <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Requisitos:</p>
                    {getPasswordRequirements(password).map((req, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        {req.met ? (
                          <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0" />
                        ) : (
                          <X className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                        )}
                        <span className={req.met ? 'text-foreground' : 'text-muted-foreground'}>
                          {req.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setPassword(generatePassword())}
                className="shrink-0"
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

    <AlertDialog open={showTestDialog} onOpenChange={setShowTestDialog}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {lastTest?.status === 'passed' && <CheckCircle className="h-5 w-5 text-green-600" />}
            {lastTest?.status === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-600" />}
            {lastTest?.status === 'failed' && <XCircle className="h-5 w-5 text-red-600" />}
            Teste de Conectividade - {lastCreatedUser?.username}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Validação automática das credenciais SIP criadas
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Status Geral */}
          <div className={`p-4 rounded-lg ${
            lastTest?.status === 'passed' ? 'bg-green-50 dark:bg-green-950/20' :
            lastTest?.status === 'warning' ? 'bg-yellow-50 dark:bg-yellow-950/20' :
            'bg-red-50 dark:bg-red-950/20'
          }`}>
            <p className="font-medium">
              Status: {
                lastTest?.status === 'passed' ? '✅ Aprovado' :
                lastTest?.status === 'warning' ? '⚠️ Aviso' :
                '❌ Falhou'
              }
            </p>
            {lastTest?.latency_ms && (
              <p className="text-sm text-muted-foreground mt-1">
                Latência: {lastTest.latency_ms}ms
              </p>
            )}
          </div>

          {/* Checklist de Testes */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-3 bg-background border rounded-lg">
              {lastTest?.credentials_valid ? 
                <Check className="h-4 w-4 text-green-600" /> : 
                <X className="h-4 w-4 text-red-600" />
              }
              <span className="text-sm">Credenciais Válidas</span>
            </div>
            
            <div className="flex items-center gap-2 p-3 bg-background border rounded-lg">
              {lastTest?.endpoint_registered ? 
                <Check className="h-4 w-4 text-green-600" /> : 
                <X className="h-4 w-4 text-gray-400" />
              }
              <span className="text-sm">Endpoint Registrado</span>
            </div>
            
            <div className="flex items-center gap-2 p-3 bg-background border rounded-lg">
              {lastTest?.api_reachable ? 
                <Check className="h-4 w-4 text-green-600" /> : 
                <X className="h-4 w-4 text-red-600" />
              }
              <span className="text-sm">API Acessível</span>
            </div>
            
            <div className="flex items-center gap-2 p-3 bg-background border rounded-lg">
              {lastTest?.account_status === 'active' ? 
                <Check className="h-4 w-4 text-green-600" /> : 
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              }
              <span className="text-sm">Conta Ativa</span>
            </div>
          </div>

          {/* Recomendações */}
          {lastTest?.recommendations && Array.isArray(lastTest.recommendations) && lastTest.recommendations.length > 0 && (
            <Alert>
              <AlertDescription>
                <h4 className="font-medium text-sm mb-2">Recomendações:</h4>
                <ul className="space-y-1">
                  {(lastTest.recommendations as string[]).map((rec, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Informações Técnicas */}
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Detalhes técnicos
            </summary>
            <div className="mt-2 p-3 bg-muted rounded-lg font-mono">
              <pre className="text-xs overflow-auto">{JSON.stringify(lastTest, null, 2)}</pre>
            </div>
          </details>
        </div>

        <AlertDialogFooter>
          <AlertDialogAction onClick={() => setShowTestDialog(false)}>
            Entendi
          </AlertDialogAction>
          {lastTest?.status !== 'passed' && (
            <Button 
              variant="outline" 
              onClick={() => testConnectivity({ provider: lastCreatedUser!.provider, test_type: 'full' })}
              disabled={isTesting}
            >
              {isTesting ? 'Testando...' : 'Testar Novamente'}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}