import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useVonageApplications } from "@/features/admin/hooks/use-vonage-applications";

interface VonageApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application?: {
    domain_group_id: string;
    app_id?: string;
    app_name?: string;
    friendly_name: string;
    is_default: boolean;
    is_active: boolean;
  };
}

export function VonageApplicationDialog({ open, onOpenChange, application }: VonageApplicationDialogProps) {
  const { createApplication, updateApplication } = useVonageApplications();
  const [appId, setAppId] = useState('');
  const [appName, setAppName] = useState('');
  const [friendlyName, setFriendlyName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const isEditMode = !!application;

  useEffect(() => {
    if (application) {
      setAppId(application.app_id || '');
      setAppName(application.app_name || '');
      setFriendlyName(application.friendly_name || '');
      setIsDefault(application.is_default);
      setIsActive(application.is_active);
    } else {
      setAppId('');
      setAppName('');
      setFriendlyName('');
      setIsDefault(false);
      setIsActive(true);
    }
  }, [application]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditMode) {
      updateApplication.mutate({
        domain_group_id: application!.domain_group_id,
        friendly_name: friendlyName,
        is_default: isDefault,
        is_active: isActive,
      }, {
        onSuccess: () => onOpenChange(false)
      });
    } else {
      if (!appId || !appName) return;
      
      createApplication.mutate({
        app_id: appId,
        app_name: appName,
        friendly_name: friendlyName || appName,
        is_default: isDefault,
      }, {
        onSuccess: () => onOpenChange(false)
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Editar Application' : 'Nova Application Vonage'}</DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? 'Atualize as informações da application.' 
              : 'Crie uma nova application Vonage manualmente. Alternativamente, use o botão "Sync" para importar da API.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {!isEditMode && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="app_id">Application ID *</Label>
                  <Input
                    id="app_id"
                    value={appId}
                    onChange={(e) => setAppId(e.target.value)}
                    placeholder="abc12345-def6-7890-ghij-klmnopqrstuv"
                    required
                    disabled={isEditMode}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="app_name">Application Name *</Label>
                  <Input
                    id="app_name"
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    placeholder="my-sip-app"
                    required
                    disabled={isEditMode}
                  />
                </div>
              </>
            )}
            <div className="grid gap-2">
              <Label htmlFor="friendly_name">Nome Amigável</Label>
              <Input
                id="friendly_name"
                value={friendlyName}
                onChange={(e) => setFriendlyName(e.target.value)}
                placeholder="Minha Aplicação SIP"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_default"
                checked={isDefault}
                onCheckedChange={(checked) => setIsDefault(checked as boolean)}
              />
              <Label htmlFor="is_default" className="cursor-pointer">
                Marcar como padrão
              </Label>
            </div>
            {isEditMode && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={isActive}
                  onCheckedChange={(checked) => setIsActive(checked as boolean)}
                />
                <Label htmlFor="is_active" className="cursor-pointer">
                  Ativa
                </Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createApplication.isPending || updateApplication.isPending}>
              {createApplication.isPending || updateApplication.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
