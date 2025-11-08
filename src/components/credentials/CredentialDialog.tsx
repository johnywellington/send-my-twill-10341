import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { ProviderCredential } from "@/hooks/use-provider-credentials";

interface CredentialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credential?: ProviderCredential;
  onSave: (data: Partial<ProviderCredential>) => void;
  isLoading?: boolean;
}

export function CredentialDialog({ open, onOpenChange, credential, onSave, isLoading }: CredentialDialogProps) {
  const [formData, setFormData] = useState({
    provider: credential?.provider || 'twilio' as 'twilio' | 'vonage',
    credential_name: credential?.credential_name || '',
    account_identifier: credential?.account_identifier || '',
    is_default: credential?.is_default || false,
    is_active: credential?.is_active ?? true,
  });

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{credential ? 'Editar Credencial' : 'Adicionar Credencial'}</DialogTitle>
          <DialogDescription>
            {credential 
              ? 'Atualize as informações da credencial do provedor.' 
              : 'Adicione uma nova credencial de provedor para gerenciar múltiplas contas.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="provider">Provedor</Label>
            <Select
              value={formData.provider}
              onValueChange={(value: 'twilio' | 'vonage') => setFormData({ ...formData, provider: value })}
              disabled={!!credential}
            >
              <SelectTrigger id="provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="twilio">Twilio</SelectItem>
                <SelectItem value="vonage">Vonage</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="credential_name">Nome da Conta</Label>
            <Input
              id="credential_name"
              placeholder="Ex: Produção, Testes, Cliente X"
              value={formData.credential_name}
              onChange={(e) => setFormData({ ...formData, credential_name: e.target.value })}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="account_identifier">
              {formData.provider === 'twilio' ? 'Account SID' : 'API Key'}
            </Label>
            <Input
              id="account_identifier"
              placeholder={formData.provider === 'twilio' ? 'AC...' : 'API Key'}
              value={formData.account_identifier}
              onChange={(e) => setFormData({ ...formData, account_identifier: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is_default">Conta Padrão</Label>
              <p className="text-xs text-muted-foreground">
                Usar esta conta por padrão para novos números
              </p>
            </div>
            <Switch
              id="is_default"
              checked={formData.is_default}
              onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is_active">Ativa</Label>
              <p className="text-xs text-muted-foreground">
                Mostrar esta conta na listagem
              </p>
            </div>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !formData.credential_name || !formData.account_identifier}>
            {isLoading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
