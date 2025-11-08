import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { AlertTriangle, Trash2, X, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { getProviderIcon } from "@/lib/sip-utils";

interface OrphanedUser {
  id: string;
  sip_username: string;
  display_name: string | null;
  extension: string;
  provider: string;
}

interface OrphanedUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orphanedUsers: OrphanedUser[];
  onCleanup: (selectedIds: string[]) => void;
  isLoading?: boolean;
}

export function OrphanedUsersDialog({
  open,
  onOpenChange,
  orphanedUsers,
  onCleanup,
  isLoading = false,
}: OrphanedUsersDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = (userId: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedIds(newSelection);
  };

  const selectAll = () => {
    setSelectedIds(new Set(orphanedUsers.map(u => u.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleCleanup = () => {
    onCleanup(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Usuários Órfãos Detectados
          </DialogTitle>
          <DialogDescription>
            Os seguintes usuários SIP existem no banco de dados mas foram deletados das APIs dos providers.
            Selecione quais deseja remover.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {orphanedUsers.length} usuário(s) órfão(s) encontrado(s)
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={selectAll}
                disabled={isLoading}
              >
                Selecionar Todos
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={deselectAll}
                disabled={isLoading}
              >
                Desmarcar Todos
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[300px] w-full rounded-md border p-4">
            <div className="space-y-2">
              {orphanedUsers.map((user) => (
                <Card 
                  key={user.id}
                  className={`p-3 cursor-pointer transition-colors ${
                    selectedIds.has(user.id) 
                      ? 'bg-destructive/10 border-destructive' 
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => toggleSelection(user.id)}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedIds.has(user.id)}
                      onCheckedChange={() => toggleSelection(user.id)}
                      disabled={isLoading}
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">
                          {user.display_name || user.sip_username}
                        </p>
                        <div className="flex gap-2">
                          <Badge variant="destructive" className="text-xs">
                            Órfão
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {getProviderIcon(user.provider as 'twilio' | 'vonage')} {user.provider}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>Ramal: <span className="font-mono">{user.extension}</span></span>
                        <span className="font-mono">{user.sip_username}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⚠️ <strong>Atenção:</strong> Esta ação removerá permanentemente os usuários 
              selecionados do banco de dados local.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button 
            variant="destructive"
            onClick={handleCleanup}
            disabled={isLoading || selectedIds.size === 0}
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Trash2 className="h-4 w-4 mr-2" />
            Remover {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
