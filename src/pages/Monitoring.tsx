import { useState } from "react";
import { Link } from "react-router-dom";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useRealtimeMonitoring } from "@/hooks/use-realtime-monitoring";
import { SystemHealthCard } from "@/components/monitoring/SystemHealthCard";
import { LiveMetricsCard } from "@/components/monitoring/LiveMetricsCard";
import { ProviderComparisonCard } from "@/components/monitoring/ProviderComparisonCard";
import { RealtimeAlertsCard } from "@/components/monitoring/RealtimeAlertsCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RefreshCw, ArrowRight } from "lucide-react";

export default function Monitoring() {
  const [timeWindow, setTimeWindow] = useState<'5min' | '1hour' | '24hours'>('5min');
  const { activeCalls, metrics, alerts, systemHealth, loading, refetch } = useRealtimeMonitoring(timeWindow);

  if (loading) {
    return (
      <div className="space-y-6 p-4 sm:p-8">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse" />
          <div>
            <h1 className="text-3xl font-bold">Monitoramento em Tempo Real</h1>
            <p className="text-muted-foreground">Atualização automática a cada segundo</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={refetch}
            title="Atualizar dados"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Select value={timeWindow} onValueChange={(v: any) => setTimeWindow(v)}>
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

      {/* System Health */}
      {systemHealth && (
        <SystemHealthCard metrics={systemHealth} />
      )}

      {/* KPIs Grid */}
      {metrics && (
        <LiveMetricsCard
          activeCalls={metrics.activeCalls}
          avgDuration={metrics.avgDuration}
          totalCost={metrics.totalCostPeriod}
          successRate={metrics.successRate}
        />
      )}

      {/* Alertas */}
      {alerts.length > 0 && (
        <RealtimeAlertsCard alerts={alerts} />
      )}

      {/* Provider Comparison */}
      {metrics && (
        <ProviderComparisonCard 
          twilioStats={metrics.twilioStats}
          vonageStats={metrics.vonageStats}
        />
      )}

      {/* Link para Página Dedicada */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
            <div>
              <h3 className="text-xl font-semibold">Chamadas Ativas</h3>
              <p className="text-sm text-muted-foreground">
                {activeCalls.length} {activeCalls.length === 1 ? 'chamada' : 'chamadas'} em andamento
              </p>
            </div>
          </div>
          <Button asChild>
            <Link to="/active-calls">
              Ver Todas
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
