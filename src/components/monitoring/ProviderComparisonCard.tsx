import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Clock, Activity, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ProviderStats {
  totalCalls: number;
  successRate: number;
  avgCost: number;
  avgDuration: number;
  activeCalls: number;
  failedCalls: number;
}

interface Props {
  twilioStats: ProviderStats;
  vonageStats: ProviderStats;
}

export const ProviderComparisonCard = ({ twilioStats, vonageStats }: Props) => {
  const StatRow = ({ 
    icon: Icon, 
    label, 
    twilioValue, 
    vonageValue, 
    suffix = '',
    isCurrency = false 
  }: { 
    icon: any; 
    label: string; 
    twilioValue: number; 
    vonageValue: number; 
    suffix?: string;
    isCurrency?: boolean;
  }) => {
    const twilioDisplay = isCurrency ? `$${twilioValue.toFixed(2)}` : `${twilioValue.toFixed(1)}${suffix}`;
    const vonageDisplay = isCurrency ? `$${vonageValue.toFixed(2)}` : `${vonageValue.toFixed(1)}${suffix}`;
    const twilioWins = twilioValue > vonageValue;

    return (
      <div className="flex items-center justify-between py-2 border-b last:border-0">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon className="h-4 w-4" />
          <span>{label}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className={`text-sm font-mono ${twilioWins && twilioValue > 0 ? 'font-bold' : ''}`}>
            {twilioDisplay}
          </div>
          <div className="text-xs text-muted-foreground">vs</div>
          <div className={`text-sm font-mono ${!twilioWins && vonageValue > 0 ? 'font-bold' : ''}`}>
            {vonageDisplay}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Twilio Card */}
      <Card className="border-blue-200 dark:border-blue-900">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Badge className="bg-blue-500 hover:bg-blue-600">TWILIO</Badge>
              </CardTitle>
              <CardDescription className="mt-2">Performance e estatísticas</CardDescription>
            </div>
            {twilioStats.activeCalls > 0 && (
              <Badge variant="secondary" className="animate-pulse">
                <Activity className="h-3 w-3 mr-1" />
                {twilioStats.activeCalls} ativas
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Taxa de Sucesso</span>
              <span className="text-2xl font-bold text-green-500">
                {twilioStats.successRate.toFixed(1)}%
              </span>
            </div>
            <Progress value={twilioStats.successRate} className="h-2" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Activity className="h-3 w-3" />
                Total
              </div>
              <p className="text-2xl font-bold">{twilioStats.totalCalls}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <AlertTriangle className="h-3 w-3" />
                Falhas
              </div>
              <p className="text-2xl font-bold text-destructive">{twilioStats.failedCalls}</p>
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                Custo Médio
              </div>
              <span className="font-mono font-semibold">${twilioStats.avgCost.toFixed(3)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Duração Média
              </div>
              <span className="font-mono font-semibold">{twilioStats.avgDuration.toFixed(0)}s</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vonage Card */}
      <Card className="border-purple-200 dark:border-purple-900">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Badge className="bg-purple-500 hover:bg-purple-600">VONAGE</Badge>
              </CardTitle>
              <CardDescription className="mt-2">Performance e estatísticas</CardDescription>
            </div>
            {vonageStats.activeCalls > 0 && (
              <Badge variant="secondary" className="animate-pulse">
                <Activity className="h-3 w-3 mr-1" />
                {vonageStats.activeCalls} ativas
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Taxa de Sucesso</span>
              <span className="text-2xl font-bold text-green-500">
                {vonageStats.successRate.toFixed(1)}%
              </span>
            </div>
            <Progress value={vonageStats.successRate} className="h-2" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Activity className="h-3 w-3" />
                Total
              </div>
              <p className="text-2xl font-bold">{vonageStats.totalCalls}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <AlertTriangle className="h-3 w-3" />
                Falhas
              </div>
              <p className="text-2xl font-bold text-destructive">{vonageStats.failedCalls}</p>
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                Custo Médio
              </div>
              <span className="font-mono font-semibold">${vonageStats.avgCost.toFixed(3)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Duração Média
              </div>
              <span className="font-mono font-semibold">{vonageStats.avgDuration.toFixed(0)}s</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Summary */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Comparação Direta</CardTitle>
          <CardDescription>Twilio vs Vonage - Métricas lado a lado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <StatRow 
              icon={Activity} 
              label="Total de Chamadas" 
              twilioValue={twilioStats.totalCalls} 
              vonageValue={vonageStats.totalCalls} 
            />
            <StatRow 
              icon={TrendingUp} 
              label="Taxa de Sucesso" 
              twilioValue={twilioStats.successRate} 
              vonageValue={vonageStats.successRate}
              suffix="%"
            />
            <StatRow 
              icon={DollarSign} 
              label="Custo Médio" 
              twilioValue={twilioStats.avgCost} 
              vonageValue={vonageStats.avgCost}
              isCurrency
            />
            <StatRow 
              icon={Clock} 
              label="Duração Média" 
              twilioValue={twilioStats.avgDuration} 
              vonageValue={vonageStats.avgDuration}
              suffix="s"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
