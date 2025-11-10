import { useState } from "react";
import { useSyncLogs } from "@/features/admin/hooks/use-sync-logs";
import { useSyncAll } from "@/features/admin/hooks/use-sync-all";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, CheckCircle2, XCircle, Filter, RefreshCw, TrendingUp, Activity, Loader2, Eye, AlertCircle, Phone, Globe, Smartphone, Database as DatabaseIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Database } from "@/integrations/supabase/types";

type SyncLog = Database["public"]["Tables"]["sync_logs"]["Row"];

export default function SyncLogs() {
  const [syncTypeFilter, setSyncTypeFilter] = useState<string>("all");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<SyncLog | null>(null);

  const { data: logs, isLoading, refetch } = useSyncLogs({
    syncType: syncTypeFilter === "all" ? undefined : syncTypeFilter,
    provider: providerFilter === "all" ? undefined : providerFilter,
    status: statusFilter === "all" ? undefined : (statusFilter as "success" | "error" | undefined),
  });

  const { syncAll, isLoading: isSyncing, progress } = useSyncAll();

  const handleSyncAll = async () => {
    await syncAll();
    // Aguardar um pouco e recarregar os logs
    setTimeout(() => {
      refetch();
    }, 1000);
  };

  // Estatísticas
  const totalSyncs = logs?.length || 0;
  const successfulSyncs = logs?.filter(log => log.status === 'success').length || 0;
  const failedSyncs = logs?.filter(log => log.status === 'error').length || 0;
  const totalItemsAdded = logs?.reduce((sum, log) => sum + (log.items_added || 0), 0) || 0;
  const totalItemsUpdated = logs?.reduce((sum, log) => sum + (log.items_updated || 0), 0) || 0;
  const avgExecutionTime = logs?.length 
    ? Math.round(logs.reduce((sum, log) => sum + (log.execution_time_ms || 0), 0) / logs.length)
    : 0;

  const syncTypeLabels: Record<string, string> = {
    phone_numbers: "Números de Telefone",
    sip_domains: "Domínios SIP",
    sip_applications: "Aplicações SIP",
    sip_endpoints: "Endpoints SIP",
  };

  const getSyncTypeLabel = (type: string) => syncTypeLabels[type] || type;

  const clearFilters = () => {
    setSyncTypeFilter("all");
    setProviderFilter("all");
    setStatusFilter("all");
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Logs de Sincronização</h1>
          <p className="text-muted-foreground mt-1">
            Histórico completo de todas as operações de sincronização
          </p>
        </div>
        <Button 
          onClick={handleSyncAll} 
          variant="outline" 
          size="sm"
          disabled={isSyncing}
        >
          {isSyncing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Atualizar
        </Button>
      </div>

      {/* Dialog de Progresso */}
      <Dialog open={progress !== null} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Sincronizando APIs
            </DialogTitle>
            <DialogDescription>
              Consultando todas as operações de sincronização...
            </DialogDescription>
          </DialogHeader>
          
          {progress && (
            <div className="space-y-4">
              {/* Barra de Progresso */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {progress.completed} de {progress.total} concluídas
                  </span>
                  <span className="font-medium">
                    {Math.round((progress.completed / progress.total) * 100)}%
                  </span>
                </div>
                <Progress value={(progress.completed / progress.total) * 100} />
              </div>

              {/* Lista de Operações */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {progress.results.map((result, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      {result.status === "pending" && (
                        <div className="h-5 w-5 rounded-full border-2 border-muted" />
                      )}
                      {result.status === "running" && (
                        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                      )}
                      {result.status === "success" && (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                      {result.status === "error" && (
                        <XCircle className="h-5 w-5 text-destructive" />
                      )}
                      
                      <div>
                        <p className="font-medium text-sm">{result.name}</p>
                        {result.message && (
                          <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                            {result.message}
                          </p>
                        )}
                      </div>
                    </div>

                    {result.status === "pending" && (
                      <Badge variant="secondary" className="text-xs">
                        Pendente
                      </Badge>
                    )}
                    {result.status === "running" && (
                      <Badge variant="default" className="text-xs bg-blue-500">
                        Em execução
                      </Badge>
                    )}
                    {result.status === "success" && (
                      <Badge variant="default" className="text-xs bg-green-500">
                        Sucesso
                      </Badge>
                    )}
                    {result.status === "error" && (
                      <Badge variant="destructive" className="text-xs">
                        Erro
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Sincronizações</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSyncs}</div>
            <p className="text-xs text-muted-foreground">
              {successfulSyncs} bem-sucedidas, {failedSyncs} falharam
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Itens Processados</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItemsAdded + totalItemsUpdated}</div>
            <p className="text-xs text-muted-foreground">
              {totalItemsAdded} adicionados, {totalItemsUpdated} atualizados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgExecutionTime}ms</div>
            <p className="text-xs text-muted-foreground">
              Por operação de sincronização
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
          <CardDescription>
            Filtre os logs por tipo, provedor ou status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Select value={syncTypeFilter} onValueChange={setSyncTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tipo de Sincronização" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="phone_numbers">Números de Telefone</SelectItem>
                <SelectItem value="sip_domains">Domínios SIP</SelectItem>
                <SelectItem value="sip_applications">Aplicações SIP</SelectItem>
                <SelectItem value="sip_endpoints">Endpoints SIP</SelectItem>
              </SelectContent>
            </Select>

            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Provedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os provedores</SelectItem>
                <SelectItem value="twilio">Twilio</SelectItem>
                <SelectItem value="vonage">Vonage</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="success">Sucesso</SelectItem>
                <SelectItem value="error">Erro</SelectItem>
              </SelectContent>
            </Select>

            {(syncTypeFilter !== "all" || providerFilter !== "all" || statusFilter !== "all") && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Limpar Filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Sincronizações</CardTitle>
          <CardDescription>
            {totalSyncs} registro(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : logs && logs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Provedor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Adicionados</TableHead>
                  <TableHead className="text-right">Atualizados</TableHead>
                  <TableHead className="text-right">Tempo</TableHead>
                  <TableHead>Erro</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">
                      {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{getSyncTypeLabel(log.sync_type)}</span>
                    </TableCell>
                    <TableCell>
                      {log.provider ? (
                        <Badge variant="outline" className="capitalize">
                          {log.provider}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.status === 'success' ? (
                        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Sucesso
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          Erro
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {log.items_added > 0 ? (
                        <span className="text-green-600 dark:text-green-400">+{log.items_added}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {log.items_updated > 0 ? (
                        <span className="text-blue-600 dark:text-blue-400">~{log.items_updated}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {log.execution_time_ms ? `${log.execution_time_ms}ms` : '-'}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                      {log.error_message || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum log de sincronização encontrado</p>
              <p className="text-sm mt-2">
                Execute uma sincronização para ver os logs aqui
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Detalhes do Log */}
      <Dialog open={selectedLog !== null} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Detalhes da Sincronização
            </DialogTitle>
            <DialogDescription>
              Informações completas sobre a operação de sincronização
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-6">
              {/* Cabeçalho com Status */}
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">
                    {getSyncTypeLabel(selectedLog.sync_type)}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedLog.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                  </p>
                </div>
                {selectedLog.status === 'success' ? (
                  <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Sucesso
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    Erro
                  </Badge>
                )}
              </div>

              <Separator />

              {/* Informações Básicas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Provedor</p>
                  {selectedLog.provider ? (
                    <Badge variant="outline" className="capitalize">
                      {selectedLog.provider}
                    </Badge>
                  ) : (
                    <p className="text-sm">-</p>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Tempo de Execução</p>
                  <p className="text-sm font-mono">
                    {selectedLog.execution_time_ms ? `${selectedLog.execution_time_ms}ms` : '-'}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Estatísticas de Itens */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Estatísticas
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                          {selectedLog.items_added || 0}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Itens Adicionados
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                          {selectedLog.items_updated || 0}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Itens Atualizados
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Itens Adicionados */}
              {selectedLog.metadata && 
               (selectedLog.metadata as any).items_added && 
               Array.isArray((selectedLog.metadata as any).items_added) &&
               (selectedLog.metadata as any).items_added.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      Itens Adicionados ({(selectedLog.metadata as any).items_added.length})
                    </h4>
                    <ScrollArea className="h-[250px] w-full rounded-md border p-4">
                      {renderSyncItems(selectedLog.sync_type, (selectedLog.metadata as any).items_added, 'added')}
                    </ScrollArea>
                  </div>
                </>
              )}

              {/* Itens Atualizados */}
              {selectedLog.metadata && 
               (selectedLog.metadata as any).items_updated && 
               Array.isArray((selectedLog.metadata as any).items_updated) &&
               (selectedLog.metadata as any).items_updated.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2 text-blue-600">
                      <RefreshCw className="h-4 w-4" />
                      Itens Atualizados ({(selectedLog.metadata as any).items_updated.length})
                    </h4>
                    <ScrollArea className="h-[250px] w-full rounded-md border p-4">
                      {renderSyncItems(selectedLog.sync_type, (selectedLog.metadata as any).items_updated, 'updated')}
                    </ScrollArea>
                  </div>
                </>
              )}

              {/* Mensagem de Erro */}
              {selectedLog.error_message && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      Mensagem de Erro
                    </h4>
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                      <p className="text-sm font-mono text-destructive break-words">
                        {selectedLog.error_message}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Metadata */}
              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Metadados Adicionais
                    </h4>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <pre className="text-xs font-mono overflow-x-auto">
                        {JSON.stringify(selectedLog.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                </>
              )}

              {/* ID do Log */}
              <Separator />
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">ID do Log</p>
                <p className="text-xs font-mono text-muted-foreground break-all">
                  {selectedLog.id}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Função auxiliar para renderizar itens sincronizados
const renderSyncItems = (syncType: string, items: any[], type: 'added' | 'updated') => {
  switch(syncType) {
    case 'phone_numbers':
      return items.map((item, idx) => (
        <Card key={idx} className="p-3 mb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">{item.phone_number}</p>
                {item.friendly_name && (
                  <p className="text-sm text-muted-foreground">
                    {item.friendly_name}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {item.country_code}
                </p>
              </div>
            </div>
            <div className="flex gap-1 flex-wrap justify-end">
              {item.supports_sms && <Badge variant="secondary" className="text-xs">SMS</Badge>}
              {item.supports_voice && <Badge variant="secondary" className="text-xs">Voice</Badge>}
              {item.supports_mms && <Badge variant="secondary" className="text-xs">MMS</Badge>}
            </div>
          </div>
        </Card>
      ));
    
    case 'sip_domains':
      return items.map((item, idx) => (
        <Card key={idx} className="p-3 mb-2">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="font-medium">{item.domain_name}</p>
              <p className="text-sm text-muted-foreground">
                {item.friendly_name}
              </p>
              {item.domain_sid && (
                <p className="text-xs text-muted-foreground mt-1">
                  SID: {item.domain_sid}
                </p>
              )}
            </div>
          </div>
        </Card>
      ));
    
    case 'sip_applications':
      return items.map((item, idx) => (
        <Card key={idx} className="p-3 mb-2">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="font-medium">{item.name}</p>
              <p className="text-xs text-muted-foreground">
                ID: {item.application_id}
              </p>
            </div>
          </div>
        </Card>
      ));
    
    case 'sip_endpoints':
      return items.map((item, idx) => (
        <Card key={idx} className="p-3 mb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DatabaseIcon className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">Extension: {item.extension}</p>
                {item.display_name && (
                  <p className="text-sm text-muted-foreground">
                    {item.display_name}
                  </p>
                )}
                {item.user_agent && (
                  <p className="text-xs text-muted-foreground">
                    {item.user_agent}
                  </p>
                )}
                {item.expired_at && (
                  <p className="text-xs text-muted-foreground">
                    Expirou: {format(new Date(item.expired_at), 'dd/MM/yyyy HH:mm')}
                  </p>
                )}
              </div>
            </div>
            <Badge variant={
              item.status === 'registered' ? 'default' : 'secondary'
            }>
              {item.status}
            </Badge>
          </div>
        </Card>
      ));
    
    default:
      return (
        <pre className="text-xs overflow-auto">
          {JSON.stringify(items, null, 2)}
        </pre>
      );
  }
};
