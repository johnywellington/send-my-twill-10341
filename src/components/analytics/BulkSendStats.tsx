import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Zap, Clock, Activity, CheckCircle, XCircle, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BulkSendLog {
  id: string;
  type: 'sms' | 'voice';
  provider: string;
  total_contacts: number;
  successful_sends: number;
  failed_sends: number;
  throttle_percentage: number;
  avg_delay_ms: number;
  total_duration_seconds: number;
  created_at: string;
}

interface BulkSendStatsProps {
  logs: BulkSendLog[];
}

export function BulkSendStats({ logs }: BulkSendStatsProps) {
  const [fallbackStats, setFallbackStats] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchFallbackStats = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('voice_logs')
        .select('used_fallback, original_voice')
        .eq('user_id', user.id)
        .eq('used_fallback', true);

      setFallbackStats(data || []);
    };

    fetchFallbackStats();
  }, []);

  // Calculate aggregate metrics
  const totalSends = logs.length;
  const totalContacts = logs.reduce((sum, log) => sum + log.total_contacts, 0);
  const totalSuccessful = logs.reduce((sum, log) => sum + log.successful_sends, 0);
  const totalFailed = logs.reduce((sum, log) => sum + log.failed_sends, 0);
  const avgSuccessRate = totalContacts > 0 ? (totalSuccessful / totalContacts) * 100 : 0;
  const avgSpeed = logs.length > 0 
    ? logs.reduce((sum, log) => sum + (log.total_contacts / log.total_duration_seconds), 0) / logs.length 
    : 0;

  // Provider comparison
  const providerStats = logs.reduce((acc, log) => {
    const key = `${log.provider}-${log.type}`;
    if (!acc[key]) {
      acc[key] = {
        provider: log.provider.charAt(0).toUpperCase() + log.provider.slice(1),
        type: log.type.toUpperCase(),
        total: 0,
        successful: 0,
        failed: 0,
        avgSpeed: 0,
        count: 0
      };
    }
    acc[key].total += log.total_contacts;
    acc[key].successful += log.successful_sends;
    acc[key].failed += log.failed_sends;
    acc[key].avgSpeed += (log.total_contacts / log.total_duration_seconds);
    acc[key].count++;
    return acc;
  }, {} as Record<string, any>);

  const providerData = Object.values(providerStats).map((stat: any) => ({
    name: `${stat.provider} ${stat.type}`,
    'Taxa de Sucesso': ((stat.successful / stat.total) * 100).toFixed(1),
    'Velocidade Média': (stat.avgSpeed / stat.count).toFixed(2)
  }));

  // Volume over time
  const volumeByDate = logs.reduce((acc, log) => {
    const date = new Date(log.created_at).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' });
    if (!acc[date]) {
      acc[date] = { date, sms: 0, voice: 0, total: 0 };
    }
    if (log.type === 'sms') acc[date].sms += log.total_contacts;
    if (log.type === 'voice') acc[date].voice += log.total_contacts;
    acc[date].total += log.total_contacts;
    return acc;
  }, {} as Record<string, any>);

  const volumeData = Object.values(volumeByDate);

  // Throttle usage distribution
  const throttleDistribution = logs.reduce((acc, log) => {
    const throttle = `${(log.throttle_percentage * 100).toFixed(0)}%`;
    if (!acc[throttle]) {
      acc[throttle] = 0;
    }
    acc[throttle]++;
    return acc;
  }, {} as Record<string, number>);

  const throttleData = Object.entries(throttleDistribution).map(([name, value]) => ({
    name,
    value
  }));

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-effect">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Total de Envios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalSends}</p>
            <p className="text-xs text-muted-foreground mt-1">{totalContacts.toLocaleString()} contatos processados</p>
          </CardContent>
        </Card>

        <Card className="glass-effect">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Taxa de Sucesso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-500">{avgSuccessRate.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground mt-1">{totalSuccessful.toLocaleString()} enviados com sucesso</p>
          </CardContent>
        </Card>

        <Card className="glass-effect">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="w-4 h-4 text-destructive" />
              Falhas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">{totalFailed}</p>
            <p className="text-xs text-muted-foreground mt-1">{((totalFailed / totalContacts) * 100).toFixed(1)}% de falha</p>
          </CardContent>
        </Card>

        <Card className="glass-effect">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-500" />
              Velocidade Média
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-500">{avgSpeed.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">mensagens/seg</p>
          </CardContent>
        </Card>
      </div>

      {/* Fallback Analytics Card */}
      {fallbackStats.length > 0 && (
        <Card className="glass-effect">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-500" />
              Fallback de Vozes
            </CardTitle>
            <CardDescription>Chamadas que usaram voz alternativa automaticamente</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600">{fallbackStats.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {totalContacts > 0 
                ? `${(Number(fallbackStats.length) / Number(totalContacts) * 100).toFixed(1)}% das chamadas`
                : 'Nenhuma chamada ainda'
              }
            </p>
            
            {fallbackStats.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium">Vozes que mais falharam:</p>
                {Object.entries(
                  fallbackStats.reduce((acc: Record<string, number>, item: any) => {
                    const voice = item.original_voice || 'Desconhecida';
                    acc[voice] = (acc[voice] || 0) + 1;
                    return acc;
                  }, {})
                )
                .sort((a, b) => Number(b[1]) - Number(a[1]))
                .slice(0, 3)
                .map(([voice, count]: [string, unknown]) => (
                  <div key={voice} className="flex justify-between text-xs">
                    <span>{voice}</span>
                    <Badge variant="outline">{String(count)}x</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Volume Over Time */}
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle>Volume de Envios em Massa</CardTitle>
            <CardDescription>Contatos processados por dia</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="sms" stroke="hsl(var(--primary))" name="SMS" />
                <Line type="monotone" dataKey="voice" stroke="hsl(var(--destructive))" name="Voice" />
                <Line type="monotone" dataKey="total" stroke="hsl(var(--chart-3))" name="Total" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Provider Comparison */}
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle>Comparação de Providers</CardTitle>
            <CardDescription>Taxa de sucesso e velocidade por provider</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={providerData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="Taxa de Sucesso" fill="hsl(var(--primary))" name="Taxa de Sucesso (%)" />
                <Bar dataKey="Velocidade Média" fill="hsl(var(--chart-2))" name="Velocidade (msg/s)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Throttle Usage */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Distribuição de Velocidade Configurada
          </CardTitle>
          <CardDescription>Porcentagem de throttle mais utilizada</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {throttleData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1">
                  {item.name}
                </Badge>
                <span className="text-sm text-muted-foreground">{item.value} vezes</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Sends Table */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle>Envios Recentes</CardTitle>
          <CardDescription>Últimos 10 envios em massa</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {logs.slice(0, 10).map((log) => (
              <div key={log.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <Badge variant={log.type === 'sms' ? 'default' : 'secondary'}>
                    {log.type.toUpperCase()}
                  </Badge>
                  <Badge variant="outline">
                    {log.provider.charAt(0).toUpperCase() + log.provider.slice(1)}
                  </Badge>
                  <div>
                    <p className="text-sm font-medium">{log.total_contacts} contatos</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <p className="text-sm font-medium text-green-500">{log.successful_sends} ✓</p>
                    <p className="text-xs text-muted-foreground">sucesso</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-destructive">{log.failed_sends} ✗</p>
                    <p className="text-xs text-muted-foreground">falhas</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {log.total_duration_seconds}s
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(log.total_contacts / log.total_duration_seconds).toFixed(2)} msg/s
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
