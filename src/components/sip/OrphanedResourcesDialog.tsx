import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface OrphanedResource {
  id: string;
  name: string;
  type: 'credential_list' | 'endpoint';
  provider: 'twilio' | 'vonage';
  metadata?: any;
}

interface OrphanedResourcesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orphanedResources: OrphanedResource[];
  onCleanup: (selectedIds: string[]) => void;
  isLoading: boolean;
}

export function OrphanedResourcesDialog({
  open,
  onOpenChange,
  orphanedResources,
  onCleanup,
  isLoading,
}: OrphanedResourcesDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleToggle = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === orphanedResources.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(orphanedResources.map(r => r.id)));
    }
  };

  const handleCleanup = () => {
    onCleanup(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const twilioCount = orphanedResources.filter(r => r.provider === 'twilio').length;
  const vonageCount = orphanedResources.filter(r => r.provider === 'vonage').length;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Recursos SIP Órfãos Detectados
          </AlertDialogTitle>
          <AlertDialogDescription>
            Encontramos {orphanedResources.length} recurso(s) nas APIs dos provedores que não têm registro correspondente no banco de dados.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Resumo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <p className="text-sm text-muted-foreground">Twilio CredentialLists</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{twilioCount}</p>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
              <p className="text-sm text-muted-foreground">Vonage Endpoints</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{vonageCount}</p>
            </div>
          </div>

          {/* Alerta Vonage */}
          {vonageCount > 0 && (
            <Alert>
              <AlertDescription className="text-sm">
                ⚠️ <strong>Nota:</strong> Endpoints Vonage não podem ser deletados individualmente via API. 
                Para removê-los, é necessário recriar a aplicação SIP no Vonage.
              </AlertDescription>
            </Alert>
          )}

          {/* Tabela de recursos */}
          <div className="border rounded-lg">
            <div className="p-3 bg-muted/50 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedIds.size === orphanedResources.length && orphanedResources.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm font-medium">
                  Selecionar todos ({selectedIds.size}/{orphanedResources.length})
                </span>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Nome/ID</TableHead>
                  <TableHead>Metadados</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orphanedResources.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhum recurso órfão encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  orphanedResources.map((resource) => (
                    <TableRow key={resource.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(resource.id)}
                          onCheckedChange={() => handleToggle(resource.id)}
                          disabled={resource.provider === 'vonage'} 
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant={resource.provider === 'twilio' ? 'default' : 'secondary'}>
                          {resource.provider}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {resource.type === 'credential_list' ? 'CredentialList' : 'Endpoint'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {resource.name}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {resource.metadata?.date_created && (
                          <div>Criado: {new Date(resource.metadata.date_created).toLocaleDateString()}</div>
                        )}
                        {resource.metadata?.app_id && (
                          <div className="truncate max-w-[200px]">App: {resource.metadata.app_id}</div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Informações adicionais */}
          <Alert>
            <AlertDescription className="text-sm space-y-2">
              <p>
                <strong>O que são recursos órfãos?</strong>
              </p>
              <p>
                São recursos (CredentialLists no Twilio ou Endpoints no Vonage) que existem nas APIs dos provedores 
                mas não têm um registro correspondente no banco de dados da aplicação.
              </p>
              <p className="text-muted-foreground">
                Isso geralmente acontece quando um usuário SIP é deletado do banco mas o recurso não foi removido da API.
              </p>
            </AlertDescription>
          </Alert>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button
            onClick={handleCleanup}
            disabled={selectedIds.size === 0 || isLoading}
            variant="destructive"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Limpando...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar Selecionados ({selectedIds.size})
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
