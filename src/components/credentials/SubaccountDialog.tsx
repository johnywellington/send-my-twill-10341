import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

interface SubaccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentCredentialId: string;
  provider: 'twilio' | 'vonage';
  onSubmit: (data: {
    parentCredentialId: string;
    subaccountName: string;
    useParentBalance?: boolean;
    secret?: string;
  }) => void;
  isLoading?: boolean;
}

export function SubaccountDialog({
  open,
  onOpenChange,
  parentCredentialId,
  provider,
  onSubmit,
  isLoading,
}: SubaccountDialogProps) {
  const [subaccountName, setSubaccountName] = useState("");
  const [useParentBalance, setUseParentBalance] = useState(true);
  const [secret, setSecret] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data: any = {
      parentCredentialId,
      subaccountName,
    };

    if (provider === 'vonage') {
      data.useParentBalance = useParentBalance;
      if (secret) {
        data.secret = secret;
      }
    }

    onSubmit(data);
  };

  const handleClose = () => {
    setSubaccountName("");
    setUseParentBalance(true);
    setSecret("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Criar Subconta {provider === 'twilio' ? 'Twilio' : 'Vonage'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subaccountName">Nome da Subconta *</Label>
            <Input
              id="subaccountName"
              value={subaccountName}
              onChange={(e) => setSubaccountName(e.target.value)}
              placeholder="Ex: Subconta Dev"
              required
            />
          </div>

          {provider === 'vonage' && (
            <>
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5">
                  <Label htmlFor="useParentBalance">Usar Saldo da Conta Principal</Label>
                  <p className="text-sm text-muted-foreground">
                    Compartilhar saldo com a conta principal
                  </p>
                </div>
                <Switch
                  id="useParentBalance"
                  checked={useParentBalance}
                  onCheckedChange={setUseParentBalance}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="secret">Secret (Opcional)</Label>
                <Input
                  id="secret"
                  type="password"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="Deixe vazio para gerar automaticamente"
                />
                <p className="text-xs text-muted-foreground">
                  Se não informado, um secret será gerado automaticamente
                </p>
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Subconta
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}