import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useVonageUsers } from "@/features/admin/hooks/use-vonage-users";
import { useSIPUsers } from "@/hooks/use-sip-users";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVonageApplications } from "@/features/admin/hooks/use-vonage-applications";

interface VonageUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: {
    id: string;
    sip_username: string;
    extension: string;
    display_name?: string;
    is_active: boolean;
    domain_group_id?: string;
  };
}

export function VonageUserDialog({ open, onOpenChange, user }: VonageUserDialogProps) {
  const { updateUser } = useVonageUsers();
  const { createUser, isCreating } = useSIPUsers();
  const { applications } = useVonageApplications();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [extension, setExtension] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [domainGroupId, setDomainGroupId] = useState('');
  const [isActive, setIsActive] = useState(true);

  const isEditMode = !!user;

  useEffect(() => {
    if (user) {
      setUsername(user.sip_username);
      setExtension(user.extension);
      setDisplayName(user.display_name || '');
      setDomainGroupId(user.domain_group_id || '');
      setIsActive(user.is_active);
    } else {
      setUsername('');
      setPassword('');
      setExtension('');
      setDisplayName('');
      setDomainGroupId('');
      setIsActive(true);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditMode) {
      // Only update display_name and is_active (Vonage doesn't allow editing username/password)
      updateUser.mutate({
        sip_user_id: user!.id,
        display_name: displayName,
        is_active: isActive,
      }, {
        onSuccess: () => onOpenChange(false)
      });
    } else {
      if (!username || !password || !extension || !domainGroupId) return;
      
      createUser({
        provider: 'vonage',
        username,
        password,
        extension,
        display_name: displayName,
        domain_group_id: domainGroupId,
      }, {
        onSuccess: () => onOpenChange(false)
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Editar Usuário' : 'Novo Usuário Vonage'}</DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? 'Atualize o nome e status do usuário. Username e senha não podem ser editados após criação.'
              : 'Crie um novo usuário SIP na Vonage.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {!isEditMode && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="application">Application *</Label>
                  <Select value={domainGroupId} onValueChange={setDomainGroupId} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma application" />
                    </SelectTrigger>
                    <SelectContent>
                      {applications?.filter(app => app.is_active).map((app) => (
                        <SelectItem key={app.domain_group_id} value={app.domain_group_id}>
                          {app.friendly_name} {app.is_default && '(Default)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="username">Username SIP *</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="user123"
                    required
                    disabled={isEditMode}
                  />
                  <p className="text-xs text-muted-foreground">
                    Apenas letras, números e hífens. Não pode ser editado depois.
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Senha SIP *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 10 caracteres"
                    required
                    disabled={isEditMode}
                    minLength={10}
                  />
                  <p className="text-xs text-muted-foreground">
                    Mínimo 10 caracteres. Não pode ser editada depois.
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="extension">Ramal *</Label>
                  <Input
                    id="extension"
                    value={extension}
                    onChange={(e) => setExtension(e.target.value)}
                    placeholder="1001"
                    required
                    disabled={isEditMode}
                  />
                </div>
              </>
            )}
            <div className="grid gap-2">
              <Label htmlFor="display_name">Nome de Exibição</Label>
              <Input
                id="display_name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="João Silva"
              />
            </div>
            {isEditMode && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={isActive}
                  onCheckedChange={(checked) => setIsActive(checked as boolean)}
                />
                <Label htmlFor="is_active" className="cursor-pointer">
                  Ativo
                </Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateUser.isPending || isCreating}>
              {(updateUser.isPending || isCreating) ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
