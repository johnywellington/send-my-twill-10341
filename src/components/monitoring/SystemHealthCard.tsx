import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, 
  Clock, 
  AlertTriangle, 
  CheckCircle2,
  XCircle,
  Wifi 
} from "lucide-react";

interface SystemHealthMetrics {
  status: 'operational' | 'degraded' | 'critical';
  avgLatency: number; // em ms
  uptime: number; // percentual
  errorRate: number; // percentual
  webhookHealth: 'healthy' | 'degraded' | 'failing';
  lastUpdated: Date;
}

interface Props {
  metrics: SystemHealthMetrics;
}

export const SystemHealthCard = ({ metrics }: Props) => {
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'operational': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-muted';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'operational': return <CheckCircle2 className="h-5 w-5" />;
      case 'degraded': return <AlertTriangle className="h-5 w-5" />;
      case 'critical': return <XCircle className="h-5 w-5" />;
      default: return <Activity className="h-5 w-5" />;
    }
  };

  const getStatusText = (status: string) => {
    switch(status) {
      case 'operational': return 'Sistema Operacional';
      case 'degraded': return 'Sistema Degradado';
      case 'critical': return 'Sistema Crítico';
      default: return 'Status Desconhecido';
    }
  };

  const getLatencyColor = (latency: number) => {
    if (latency < 2000) return 'text-green-500';
    if (latency < 5000) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getUptimeColor = (uptime: number) => {
    if (uptime > 99) return 'text-green-500';
    if (uptime > 95) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getErrorRateColor = (errorRate: number) => {
    if (errorRate < 5) return 'text-green-500';
    if (errorRate < 15) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${getStatusColor(metrics.status)} animate-pulse`} />
            System Health
          </CardTitle>
          <Badge variant={metrics.status === 'operational' ? 'default' : 'destructive'}>
            {getStatusIcon(metrics.status)}
            <span className="ml-2">{getStatusText(metrics.status)}</span>
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {metrics.status === 'operational' 
            ? 'Todos os serviços funcionando normalmente' 
            : metrics.status === 'degraded'
            ? 'Alguns problemas detectados, monitorando situação'
            : 'Problemas graves detectados, verificar imediatamente'}
        </p>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Latência */}
          <div className="flex flex-col items-center p-4 border rounded-lg bg-card">
            <Clock className="h-6 w-6 text-blue-500 mb-2" />
            <p className="text-xs text-muted-foreground mb-1">Latência Média</p>
            <p className={`text-2xl font-bold ${getLatencyColor(metrics.avgLatency)}`}>
              {(metrics.avgLatency / 1000).toFixed(2)}s
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.avgLatency < 2000 ? '🟢 Boa' : metrics.avgLatency < 5000 ? '🟡 Média' : '🔴 Alta'}
            </p>
          </div>

          {/* Uptime */}
          <div className="flex flex-col items-center p-4 border rounded-lg bg-card">
            <Activity className="h-6 w-6 text-green-500 mb-2" />
            <p className="text-xs text-muted-foreground mb-1">Uptime</p>
            <p className={`text-2xl font-bold ${getUptimeColor(metrics.uptime)}`}>
              {metrics.uptime.toFixed(2)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.uptime > 99 ? '🟢 Excelente' : metrics.uptime > 95 ? '🟡 Bom' : '🔴 Baixo'}
            </p>
          </div>

          {/* Taxa de Erros */}
          <div className="flex flex-col items-center p-4 border rounded-lg bg-card">
            <AlertTriangle className="h-6 w-6 text-yellow-500 mb-2" />
            <p className="text-xs text-muted-foreground mb-1">Taxa de Erros</p>
            <p className={`text-2xl font-bold ${getErrorRateColor(metrics.errorRate)}`}>
              {metrics.errorRate.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.errorRate < 5 ? '🟢 Baixo' : metrics.errorRate < 15 ? '🟡 Médio' : '🔴 Alto'}
            </p>
          </div>

          {/* Webhook Health */}
          <div className="flex flex-col items-center p-4 border rounded-lg bg-card">
            <Wifi className="h-6 w-6 text-purple-500 mb-2" />
            <p className="text-xs text-muted-foreground mb-1">Webhook Status</p>
            <p className="text-2xl font-bold">
              {metrics.webhookHealth === 'healthy' ? '✅' : metrics.webhookHealth === 'degraded' ? '⚠️' : '❌'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.webhookHealth === 'healthy' ? '🟢 Healthy' : 
               metrics.webhookHealth === 'degraded' ? '🟡 Degraded' : '🔴 Failing'}
            </p>
          </div>
        </div>

        {/* Última Atualização */}
        <div className="mt-4 text-center">
          <p className="text-xs text-muted-foreground">
            Última atualização: {metrics.lastUpdated.toLocaleTimeString('pt-BR')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
