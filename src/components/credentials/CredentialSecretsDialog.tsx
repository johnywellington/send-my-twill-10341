import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Info, Key } from "lucide-react";
import { useState, useEffect } from "react";
import { ProviderCredential } from "@/hooks/use-provider-credentials";
import { useStoreCredentialSecrets } from "@/hooks/use-store-credential-secrets";
import { SecretsResultDialog } from "./SecretsResultDialog";

interface CredentialSecretsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credential: ProviderCredential | null;
}

export function CredentialSecretsDialog({ open, onOpenChange, credential }: CredentialSecretsDialogProps) {
  const [showAuthToken, setShowAuthToken] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [secretsResult, setSecretsResult] = useState<any>(null);

  const [formData, setFormData] = useState({
    authToken: '',
    apiSecret: '',
    applicationId: '',
    privateKey: '',
  });

  const storeSecrets = useStoreCredentialSecrets();

  useEffect(() => {
    if (open) {
      // Reset form when dialog opens
      setFormData({
        authToken: '',
        apiSecret: '',
        applicationId: '',
        privateKey: '',
      });
      setShowAuthToken(false);
      setShowApiSecret(false);
      setShowPrivateKey(false);
    }
  }, [open]);

  const handleSave = async () => {
    if (!credential) return;

    const params = {
      credentialId: credential.id,
      provider: credential.provider,
      credentials: credential.provider === 'twilio' 
        ? {
            accountSid: credential.account_identifier,
            authToken: formData.authToken,
          }
        : {
            apiKey: credential.account_identifier,
            apiSecret: formData.apiSecret,
            applicationId: formData.applicationId || undefined,
            privateKey: formData.privateKey || undefined,
          }
    };

    try {
      const result = await storeSecrets.mutateAsync(params);
      setSecretsResult(result);
      onOpenChange(false);
      setResultDialogOpen(true);
    } catch (error) {
      console.error('Error storing secrets:', error);
    }
  };

  const isFormValid = () => {
    if (!credential) return false;
    
    if (credential.provider === 'twilio') {
      return formData.authToken.trim().length > 0;
    } else {
      return formData.apiSecret.trim().length > 0;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Configurar Secrets da Credencial
            </DialogTitle>
            <DialogDescription>
              {credential?.credential_name} ({credential?.provider === 'twilio' ? 'Twilio' : 'Vonage'})
            </DialogDescription>
          </DialogHeader>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Importante:</strong> Os secrets serão processados e você receberá um <code>secret_key</code> único. 
              Guarde os nomes dos secrets gerados para configurá-los no Lovable Cloud.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 py-4">
            {credential?.provider === 'twilio' ? (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="accountSid">Account SID (somente leitura)</Label>
                  <Input
                    id="accountSid"
                    value={credential.account_identifier}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="authToken">Auth Token *</Label>
                  <div className="relative">
                    <Input
                      id="authToken"
                      type={showAuthToken ? "text" : "password"}
                      placeholder="Digite o Auth Token da Twilio"
                      value={formData.authToken}
                      onChange={(e) => setFormData({ ...formData, authToken: e.target.value })}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowAuthToken(!showAuthToken)}
                    >
                      {showAuthToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Encontre em: Twilio Console → Account Info → Auth Token
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="apiKey">API Key (somente leitura)</Label>
                  <Input
                    id="apiKey"
                    value={credential?.account_identifier}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="apiSecret">API Secret *</Label>
                  <div className="relative">
                    <Input
                      id="apiSecret"
                      type={showApiSecret ? "text" : "password"}
                      placeholder="Digite o API Secret da Vonage"
                      value={formData.apiSecret}
                      onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowApiSecret(!showApiSecret)}
                    >
                      {showApiSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="applicationId">Application ID (opcional)</Label>
                  <Input
                    id="applicationId"
                    placeholder="Ex: 12345678-1234-1234-1234-123456789abc"
                    value={formData.applicationId}
                    onChange={(e) => setFormData({ ...formData, applicationId: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Necessário para funcionalidades SIP/Voice
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="privateKey">Private Key (opcional)</Label>
                  <div className="relative">
                    <Textarea
                      id="privateKey"
                      placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
                      value={formData.privateKey}
                      onChange={(e) => setFormData({ ...formData, privateKey: e.target.value })}
                      className="font-mono text-xs min-h-[120px]"
                      style={{ filter: showPrivateKey ? 'none' : 'blur(4px)' }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2"
                      onClick={() => setShowPrivateKey(!showPrivateKey)}
                    >
                      {showPrivateKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Necessário para autenticação JWT em algumas APIs
                  </p>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!isFormValid() || storeSecrets.isPending}
            >
              {storeSecrets.isPending ? 'Salvando...' : 'Salvar Secrets'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SecretsResultDialog
        open={resultDialogOpen}
        onOpenChange={setResultDialogOpen}
        result={secretsResult}
      />
    </>
  );
}
