import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Activity, Clock, DollarSign, TrendingUp } from "lucide-react";

interface Props {
  activeCalls: number;
  avgDuration: number;
  totalCost: number;
  successRate: number;
}

export const LiveMetricsCard = ({ activeCalls, avgDuration, totalCost, successRate }: Props) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-green-500" />
            Chamadas Ativas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{activeCalls}</p>
          <p className="text-xs text-muted-foreground">em progresso</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            Duração Média
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{avgDuration.toFixed(0)}s</p>
          <p className="text-xs text-muted-foreground">tempo médio</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-yellow-500" />
            Custos (Período)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">${totalCost.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">custo total</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            Taxa de Sucesso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-green-500">{successRate.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground">chamadas completadas</p>
        </CardContent>
      </Card>
    </div>
  );
};
