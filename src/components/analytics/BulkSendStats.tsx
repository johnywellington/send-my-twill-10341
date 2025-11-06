import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Zap, Clock, Activity, CheckCircle, XCircle, RefreshCw, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  retry_count?: number;
  created_at: string;
}

interface BulkSendStatsProps {
  logs: BulkSendLog[];
}

export function BulkSendStats({ logs }: BulkSendStatsProps) {

  // Calculate aggregate metrics
  const totalSends = logs.length;
  const totalContacts = logs.reduce((sum, log) => sum + log.total_contacts, 0);
  const totalSuccessful = logs.reduce((sum, log) => sum + log.successful_sends, 0);
  const totalFailed = logs.reduce((sum, log) => sum + log.failed_sends, 0);
  const avgSuccessRate = totalContacts > 0 ? (totalSuccessful / totalContacts) * 100 : 0;
  const avgSpeed = logs.length > 0 
    ? logs.reduce((sum, log) => sum + (log.total_contacts / log.total_duration_seconds), 0) / logs.length 
    : 0;
  const totalRetries = logs.reduce((sum, log) => sum + (log.retry_count || 0), 0);
  const avgRetriesPerSend = totalSends > 0 ? totalRetries / totalSends : 0;

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

  // Success rate over time
  const successRateOverTime = logs.map(log => {
    const successRate = log.total_contacts > 0 ? (log.successful_sends / log.total_contacts) * 100 : 0;
    const retryRate = log.total_contacts > 0 ? ((log.retry_count || 0) / log.total_contacts) * 100 : 0;
    return {
      date: new Date(log.created_at).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }),
      successRate: parseFloat(successRate.toFixed(1)),
      retryRate: parseFloat(retryRate.toFixed(1))
    };
  }).reverse();

  return (
    <div className="space-y-6">
      {/* Performance Alerts */}
      {avgSuccessRate < 80 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Taxa de Sucesso Baixa</AlertTitle>
          <AlertDescription>
            Sua taxa de sucesso está em {avgSuccessRate.toFixed(1)}%. 
            Considere reduzir o throttle ou verificar suas credenciais.
          </AlertDescription>
        </Alert>
      )}
      
      {avgRetriesPerSend > 0.5 && (
        <Alert className="border-orange-500/50 text-orange-500 [&>svg]:text-orange-500">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Alto Número de Retries</AlertTitle>
          <AlertDescription>
            Média de {avgRetriesPerSend.toFixed(1)} retries por envio. Reduza a velocidade de envio para melhor performance.
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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

        <Card className="glass-effect">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-orange-500" />
              Retries Automáticos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-500">{totalRetries}</p>
            <p className="text-xs text-muted-foreground mt-1">média {avgRetriesPerSend.toFixed(1)} por envio</p>
          </CardContent>
        </Card>
      </div>


      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Success Rate Over Time */}
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle>Taxa de Sucesso ao Longo do Tempo</CardTitle>
            <CardDescription>Evolução da performance dos envios</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={successRateOverTime}>
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
                <Line type="monotone" dataKey="successRate" stroke="hsl(var(--primary))" name="Taxa de Sucesso (%)" strokeWidth={2} />
                <Line type="monotone" dataKey="retryRate" stroke="#f97316" name="Taxa de Retry (%)" strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

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
