import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { AlertTriangle, Trash2, X, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface OrphanedNumber {
  id: string;
  phone_number: string;
  friendly_name: string | null;
  provider: string;
}

interface OrphanedNumbersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: 'twilio' | 'vonage';
  orphanedNumbers: OrphanedNumber[];
  onCleanup: (selectedIds: string[]) => void;
  isLoading?: boolean;
}

export function OrphanedNumbersDialog({
  open,
  onOpenChange,
  provider,
  orphanedNumbers,
  onCleanup,
  isLoading = false,
}: OrphanedNumbersDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = (numberId: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(numberId)) {
      newSelection.delete(numberId);
    } else {
      newSelection.add(numberId);
    }
    setSelectedIds(newSelection);
  };

  const selectAll = () => {
    setSelectedIds(new Set(orphanedNumbers.map(n => n.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleCleanup = () => {
    onCleanup(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const providerName = provider === 'twilio' ? 'Twilio' : 'Vonage';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Números Órfãos Detectados
          </DialogTitle>
          <DialogDescription>
            Os seguintes números existem no banco de dados mas foram deletados do {providerName}.
            Selecione quais deseja remover.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {orphanedNumbers.length} número(s) órfão(s) encontrado(s)
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
              {orphanedNumbers.map((number) => (
                <Card 
                  key={number.id}
                  className={`p-3 cursor-pointer transition-colors ${
                    selectedIds.has(number.id) 
                      ? 'bg-destructive/10 border-destructive' 
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => toggleSelection(number.id)}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedIds.has(number.id)}
                      onCheckedChange={() => toggleSelection(number.id)}
                      disabled={isLoading}
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium font-mono">{number.phone_number}</p>
                        <Badge variant="destructive" className="text-xs">
                          Órfão
                        </Badge>
                      </div>
                      {number.friendly_name && (
                        <p className="text-sm text-muted-foreground">
                          {number.friendly_name}
                        </p>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {provider.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⚠️ <strong>Atenção:</strong> Esta ação removerá permanentemente os números 
              selecionados do banco de dados.
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
