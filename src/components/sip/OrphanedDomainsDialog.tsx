import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { AlertTriangle, Trash2, X, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface OrphanedDomain {
  domain_group_id: string;
  domain_name: string;
  domain_sid?: string;
  friendly_name: string;
}

interface OrphanedDomainsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: 'twilio' | 'vonage';
  orphanedDomains: OrphanedDomain[];
  onCleanup: (selectedIds: string[]) => void;
  isLoading?: boolean;
}

export function OrphanedDomainsDialog({
  open,
  onOpenChange,
  provider,
  orphanedDomains,
  onCleanup,
  isLoading = false,
}: OrphanedDomainsDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = (domainGroupId: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(domainGroupId)) {
      newSelection.delete(domainGroupId);
    } else {
      newSelection.add(domainGroupId);
    }
    setSelectedIds(newSelection);
  };

  const selectAll = () => {
    setSelectedIds(new Set(orphanedDomains.map(d => d.domain_group_id)));
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
            Registros Órfãos Detectados
          </DialogTitle>
          <DialogDescription>
            Os seguintes {provider === 'twilio' ? 'domínios' : 'aplicações'} 
            existem no banco de dados mas foram deletados do {provider === 'twilio' ? 'Twilio' : 'Vonage'}.
            Selecione quais deseja remover.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {orphanedDomains.length} registro(s) órfão(s) encontrado(s)
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
              {orphanedDomains.map((domain) => (
                <Card 
                  key={domain.domain_group_id}
                  className={`p-3 cursor-pointer transition-colors ${
                    selectedIds.has(domain.domain_group_id) 
                      ? 'bg-destructive/10 border-destructive' 
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => toggleSelection(domain.domain_group_id)}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedIds.has(domain.domain_group_id)}
                      onCheckedChange={() => toggleSelection(domain.domain_group_id)}
                      disabled={isLoading}
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{domain.friendly_name}</p>
                        <Badge variant="destructive" className="text-xs">
                          Órfão
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {domain.domain_name}
                      </p>
                      {domain.domain_sid && (
                        <p className="text-xs text-muted-foreground">
                          {provider === 'twilio' ? 'SID' : 'App ID'}: {domain.domain_sid}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⚠️ <strong>Atenção:</strong> Esta ação removerá permanentemente os registros 
              selecionados e todos os usuários/rotas associados.
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
