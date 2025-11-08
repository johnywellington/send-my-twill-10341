import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Phone, PhoneForwarded, TrendingUp, Calendar, DollarSign } from "lucide-react";
import { CredentialStats } from "@/hooks/use-credential-stats";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface CredentialStatsCardProps {
  stats: CredentialStats;
}

export function CredentialStatsCard({ stats }: CredentialStatsCardProps) {
  const getProviderColor = (provider: string) => {
    return provider === 'twilio' 
      ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' 
      : 'bg-green-500/10 text-green-500 border-green-500/20';
  };

  const totalMessages = stats.smsCount + stats.voiceCount + stats.ivrCount;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{stats.credentialName}</CardTitle>
            <Badge variant="outline" className={getProviderColor(stats.provider)}>
              {stats.provider === 'twilio' ? 'Twilio' : 'Vonage'}
            </Badge>
          </div>
          {stats.lastUsed && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {formatDistanceToNow(new Date(stats.lastUsed), { 
                addSuffix: true,
                locale: ptBR 
              })}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Estatísticas principais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              <span>SMS</span>
            </div>
            <p className="text-2xl font-bold">{stats.smsCount}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span>Chamadas</span>
            </div>
            <p className="text-2xl font-bold">{stats.voiceCount}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <PhoneForwarded className="h-3 w-3" />
              <span>IVR</span>
            </div>
            <p className="text-2xl font-bold">{stats.ivrCount}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              <span>Custo Total</span>
            </div>
            <p className="text-2xl font-bold">€{stats.totalCost.toFixed(2)}</p>
          </div>
        </div>

        {/* Gráfico de uso ao longo do tempo (últimos 30 dias) */}
        {totalMessages > 0 && stats.usageByDay.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold">Uso nos Últimos 30 Dias</h4>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={stats.usageByDay}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  fontSize={10}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getDate()}/${date.getMonth() + 1}`;
                  }}
                />
                <YAxis fontSize={10} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  labelFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString('pt-BR');
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="sms" 
                  stroke="hsl(var(--chart-1))" 
                  name="SMS"
                  strokeWidth={2}
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="voice" 
                  stroke="hsl(var(--chart-2))" 
                  name="Chamadas"
                  strokeWidth={2}
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="ivr" 
                  stroke="hsl(var(--chart-3))" 
                  name="IVR"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {totalMessages === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhum uso registrado ainda
          </div>
        )}
      </CardContent>
    </Card>
  );
}
