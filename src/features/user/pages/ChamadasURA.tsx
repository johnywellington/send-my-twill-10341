import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhoneForwarded, RefreshCw, Phone, CheckCircle2, Clock, Hash, TrendingUp, AlertTriangle } from "lucide-react";
import { useURAMonitoring } from "@/features/user/hooks/use-ura-monitoring";
import { Progress } from "@/components/ui/progress";
import { IVRAnalytics } from "@/components/analytics/IVRAnalytics";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function ChamadasURA() {
  const [liveTimeWindow, setLiveTimeWindow] = useState<'5min' | '1hour' | '24hours'>('24hours');
  const [historyDateRange, setHistoryDateRange] = useState("30");
  const [selectedCall, setSelectedCall] = useState<any>(null);
  const { activeCalls, metrics, alerts, loading, refetch } = useURAMonitoring(liveTimeWindow);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com Status Live */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Chamadas URA</h1>
            <p className="text-muted-foreground">
              Monitoramento em tempo real • Atualização automática
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={refetch}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Select value={liveTimeWindow} onValueChange={(v: any) => setLiveTimeWindow(v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5min">Últimos 5 minutos</SelectItem>
              <SelectItem value="1hour">Última hora</SelectItem>
              <SelectItem value="24hours">Últimas 24 horas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Alertas em Tempo Real */}
      {alerts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {alerts.length} alerta(s) ativo(s) - Verifique as chamadas em andamento
          </AlertDescription>
        </Alert>
      )}

      {/* KPIs em Tempo Real */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Chamadas Ativas */}
          <Card className="glass-effect border-green-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Phone className="h-4 w-4 text-green-500 animate-pulse" />
                Chamadas Ativas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-500">{metrics.activeCalls}</p>
              <p className="text-xs text-muted-foreground">em andamento agora</p>
            </CardContent>
          </Card>

          {/* Taxa de Sucesso */}
          <Card className="glass-effect">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Taxa de Sucesso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${metrics.successRate >= 70 ? 'text-green-500' : 'text-red-500'}`}>
                {metrics.successRate.toFixed(1)}%
              </p>
              <Progress 
                value={metrics.successRate} 
                className="mt-2 h-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.totalCalls} chamadas
              </p>
            </CardContent>
          </Card>

          {/* Duração Média */}
          <Card className="glass-effect">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                Duração Média
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-500">
                {metrics.avgDuration.toFixed(0)}s
              </p>
              <p className="text-xs text-muted-foreground">tempo médio de chamada</p>
            </CardContent>
          </Card>

          {/* Taxa de Resposta DTMF */}
          <Card className="glass-effect">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Hash className="h-4 w-4 text-purple-500" />
                Resposta DTMF
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-500">
                {metrics.dtmfResponseRate.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">
                usuários interagiram
              </p>
              {metrics.mostChosenOption !== 'N/A' && (
                <p className="text-xs text-muted-foreground mt-1">
                  Opção mais escolhida: <span className="font-semibold">{metrics.mostChosenOption}</span>
                </p>
              )}
            </CardContent>
          </Card>

          {/* Taxa de Transferência */}
          <Card className="glass-effect">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <PhoneForwarded className="h-4 w-4 text-orange-500" />
                Transferências
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-500">
                {metrics.transferRate.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">chamadas transferidas</p>
              {metrics.avgTransferDuration > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Duração: {metrics.avgTransferDuration.toFixed(0)}s
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabela de Chamadas URA Ativas */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
            Chamadas URA Ativas ({activeCalls.length})
          </CardTitle>
          <CardDescription>
            Monitoramento em tempo real de chamadas URA em andamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeCalls.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>De</TableHead>
                  <TableHead>Para</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeCalls.map((call: any) => (
                  <TableRow key={call.id}>
                    <TableCell className="font-mono text-sm">{call.from_number}</TableCell>
                    <TableCell className="font-mono text-sm">{call.to_number}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{call.status}</Badge>
                    </TableCell>
                    <TableCell>{call.duration || 0}s</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedCall(call)}
                      >
                        Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma chamada URA ativa no momento
            </p>
          )}
        </CardContent>
      </Card>

      {/* Analytics Históricas */}
      <Card className="glass-effect">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Analytics Histórico
              </CardTitle>
              <CardDescription>
                Análise detalhada de performance URA
              </CardDescription>
            </div>
            <Select value={historyDateRange} onValueChange={setHistoryDateRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <IVRAnalytics dateRange={parseInt(historyDateRange)} />
        </CardContent>
      </Card>

      {/* Call Details Dialog */}
      <Dialog open={!!selectedCall} onOpenChange={(open) => !open && setSelectedCall(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Chamada</DialogTitle>
            <DialogDescription>
              Informações detalhadas sobre a chamada URA
            </DialogDescription>
          </DialogHeader>
          {selectedCall && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">De</p>
                  <p className="font-mono">{selectedCall.from_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Para</p>
                  <p className="font-mono">{selectedCall.to_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge>{selectedCall.status}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Duração</p>
                  <p>{selectedCall.duration || 0} segundos</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Criado em</p>
                  <p>{new Date(selectedCall.created_at).toLocaleString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Provider</p>
                  <p>{selectedCall.provider}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
