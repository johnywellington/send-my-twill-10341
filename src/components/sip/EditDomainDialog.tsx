import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Pencil } from "lucide-react";

interface EditDomainDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domainGroupId: string;
  currentName: string;
  provider: 'twilio' | 'vonage';
  onSave: (params: { domainGroupId: string; friendlyName: string }) => void;
  isLoading?: boolean;
}

export function EditDomainDialog({
  open,
  onOpenChange,
  domainGroupId,
  currentName,
  provider,
  onSave,
  isLoading = false,
}: EditDomainDialogProps) {
  const [newName, setNewName] = useState(currentName);

  useEffect(() => {
    setNewName(currentName);
  }, [currentName, open]);

  const handleSave = () => {
    if (newName.trim() && newName !== currentName) {
      onSave({ domainGroupId, friendlyName: newName.trim() });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Editar {provider === 'twilio' ? 'Domínio Twilio' : 'Aplicação Vonage'}
          </DialogTitle>
          <DialogDescription>
            Altere o nome de exibição do {provider === 'twilio' ? 'domínio' : 'aplicação'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="domain-name">Nome de Exibição</Label>
            <Input
              id="domain-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex: Domínio Principal"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Este nome aparecerá na listagem de {provider === 'twilio' ? 'domínios' : 'aplicações'}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isLoading || !newName.trim() || newName === currentName}
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
