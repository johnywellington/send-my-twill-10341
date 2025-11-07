import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Phone,
  CheckCircle2,
  Clock,
  Hash,
  PhoneForwarded,
  AlertCircle,
  DollarSign,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface IVRAnalyticsProps {
  dateRange: number;
}

interface IVRLog {
  id: string;
  status: string;
  duration: number | null;
  cost: number | null;
  template_used: string | null;
  created_at: string;
  provider: string;
  dtmf_response: string | null;
}

interface IVRResponse {
  id: string;
  dtmf_digits: string | null;
  timed_out: boolean;
  conversation_uuid: string;
  template_used: string | null;
  event_data: any;
  created_at: string;
}

interface TemplatePerformance {
  template: string;
  totalCalls: number;
  successRate: number;
  avgDuration: number;
  avgCost: number;
  mostCommonOption: string;
}

export function IVRAnalytics({ dateRange }: IVRAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [ivrLogs, setIvrLogs] = useState<IVRLog[]>([]);
  const [ivrResponses, setIvrResponses] = useState<IVRResponse[]>([]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - dateRange);

      // Fetch IVR logs
      const { data: logs, error: logsError } = await supabase
        .from("ivr_logs")
        .select("*")
        .gte("created_at", dateThreshold.toISOString())
        .neq("status", "dry-run")
        .order("created_at", { ascending: true });

      if (logsError) throw logsError;

      // Fetch IVR responses
      const { data: responses, error: responsesError } = await supabase
        .from("ivr_responses")
        .select("*")
        .gte("created_at", dateThreshold.toISOString())
        .order("created_at", { ascending: true });

      if (responsesError) throw responsesError;

      setIvrLogs(logs || []);
      setIvrResponses(responses || []);
    } catch (error) {
      console.error("Error fetching IVR analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate KPIs
  const totalCalls = ivrLogs.length;
  const completedCalls = ivrLogs.filter((log) => log.status === "completed").length;
  const failedCalls = ivrLogs.filter((log) => log.status === "failed").length;
  const successRate = totalCalls > 0 ? (completedCalls / totalCalls) * 100 : 0;

  const callsWithDuration = ivrLogs.filter((log) => log.duration !== null);
  const avgDuration =
    callsWithDuration.length > 0
      ? callsWithDuration.reduce((sum, log) => sum + (log.duration || 0), 0) / callsWithDuration.length
      : 0;

  const responsesWithDtmf = ivrResponses.filter((r) => r.dtmf_digits !== null && !r.timed_out);
  const dtmfResponseRate = totalCalls > 0 ? (responsesWithDtmf.length / totalCalls) * 100 : 0;

  const transferEvents = ivrResponses.filter(
    (r) => r.event_data?.transfer_events && Array.isArray(r.event_data.transfer_events)
  );
  const totalTransferAttempts = transferEvents.length;
  const completedTransfers = transferEvents.filter((r) =>
    r.event_data.transfer_events.some((e: any) => e.status === "completed")
  ).length;
  const transferSuccessRate =
    totalTransferAttempts > 0 ? (completedTransfers / totalTransferAttempts) * 100 : 0;

  const callsWithCost = ivrLogs.filter((log) => log.cost !== null && log.cost > 0);
  const avgCost =
    callsWithCost.length > 0
      ? callsWithCost.reduce((sum, log) => sum + (log.cost || 0), 0) / callsWithCost.length
      : 0;

  const timeoutRate =
    ivrResponses.length > 0 ? (ivrResponses.filter((r) => r.timed_out).length / ivrResponses.length) * 100 : 0;

  // DTMF Distribution Data
  const dtmfDistribution: { [key: string]: number } = {};
  responsesWithDtmf.forEach((r) => {
    const digit = r.dtmf_digits || "unknown";
    dtmfDistribution[digit] = (dtmfDistribution[digit] || 0) + 1;
  });
  const timeouts = ivrResponses.filter((r) => r.timed_out).length;
  if (timeouts > 0) {
    dtmfDistribution["timeout"] = timeouts;
  }

  const dtmfChartData = Object.entries(dtmfDistribution).map(([key, value]) => ({
    name: key === "timeout" ? "Sem resposta" : `Opção ${key}`,
    value,
    percentage: ((value / ivrResponses.length) * 100).toFixed(1),
  }));

  const DTMF_COLORS: { [key: string]: string } = {
    "1": "hsl(142, 76%, 36%)",
    "2": "hsl(221, 83%, 53%)",
    "9": "hsl(25, 95%, 53%)",
    timeout: "hsl(0, 84%, 60%)",
  };

  // Success Rate Over Time Data
  const dailyStats: { [date: string]: { total: number; completed: number; failed: number } } = {};
  ivrLogs.forEach((log) => {
    const date = new Date(log.created_at).toLocaleDateString("pt-PT");
    if (!dailyStats[date]) {
      dailyStats[date] = { total: 0, completed: 0, failed: 0 };
    }
    dailyStats[date].total++;
    if (log.status === "completed") dailyStats[date].completed++;
    if (log.status === "failed") dailyStats[date].failed++;
  });

  const successOverTimeData = Object.entries(dailyStats).map(([date, stats]) => ({
    date,
    successRate: stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : 0,
    failureRate: stats.total > 0 ? ((stats.failed / stats.total) * 100).toFixed(1) : 0,
  }));

  // Duration by Status Data
  const statusDuration: { [status: string]: number[] } = {};
  callsWithDuration.forEach((log) => {
    if (!statusDuration[log.status]) {
      statusDuration[log.status] = [];
    }
    statusDuration[log.status].push(log.duration || 0);
  });

  const durationByStatusData = Object.entries(statusDuration)
    .map(([status, durations]) => ({
      status: status === "completed" ? "Completadas" : status === "failed" ? "Falhadas" : status,
      avgDuration: (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(0),
    }))
    .filter((item) => item.status === "Completadas" || item.status === "Falhadas");

  // Template Performance Data
  const templateStats: { [template: string]: any } = {};
  ivrLogs.forEach((log) => {
    const template = log.template_used || "custom";
    if (!templateStats[template]) {
      templateStats[template] = {
        total: 0,
        completed: 0,
        durations: [],
        costs: [],
        dtmfOptions: [],
      };
    }
    templateStats[template].total++;
    if (log.status === "completed") templateStats[template].completed++;
    if (log.duration !== null) templateStats[template].durations.push(log.duration);
    if (log.cost !== null) templateStats[template].costs.push(log.cost);
  });

  // Add DTMF data to templates
  ivrResponses.forEach((r) => {
    const template = r.template_used || "custom";
    if (templateStats[template] && r.dtmf_digits) {
      templateStats[template].dtmfOptions.push(r.dtmf_digits);
    }
  });

  const templatePerformance: TemplatePerformance[] = Object.entries(templateStats).map(([template, stats]) => ({
    template,
    totalCalls: stats.total,
    successRate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0,
    avgDuration:
      stats.durations.length > 0 ? stats.durations.reduce((a: number, b: number) => a + b, 0) / stats.durations.length : 0,
    avgCost: stats.costs.length > 0 ? stats.costs.reduce((a: number, b: number) => a + b, 0) / stats.costs.length : 0,
    mostCommonOption:
      stats.dtmfOptions.length > 0
        ? stats.dtmfOptions.sort(
            (a: string, b: string) =>
              stats.dtmfOptions.filter((v: string) => v === b).length -
              stats.dtmfOptions.filter((v: string) => v === a).length
          )[0]
        : "-",
  }));

  // Hourly Distribution Data
  const hourlyDistribution: { [hour: number]: number } = {};
  ivrLogs.forEach((log) => {
    const hour = new Date(log.created_at).getHours();
    hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
  });

  const hourlyChartData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}h`,
    calls: hourlyDistribution[i] || 0,
  }));

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}min ${remainingSeconds}s` : `${minutes}min`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (totalCalls === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Sem dados</AlertTitle>
        <AlertDescription>
          Nenhuma chamada URA encontrada nos últimos {dateRange} dias. As chamadas em modo teste não são incluídas nas
          estatísticas.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Performance Alerts */}
      {successRate < 70 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Taxa de Sucesso Baixa</AlertTitle>
          <AlertDescription>
            Apenas {successRate.toFixed(1)}% das chamadas URA foram completadas. Verifique configurações de webhooks e
            templates.
          </AlertDescription>
        </Alert>
      )}

      {timeoutRate > 20 && (
        <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-600">Alta Taxa de Timeout</AlertTitle>
          <AlertDescription className="text-orange-600">
            {timeoutRate.toFixed(1)}% dos usuários não respondem à URA. Considere simplificar o menu ou reduzir o
            tempo de espera.
          </AlertDescription>
        </Alert>
      )}

      {avgCost > 0.2 && (
        <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <DollarSign className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-600">Custo Médio Elevado</AlertTitle>
          <AlertDescription className="text-yellow-600">
            Custo médio de ${avgCost.toFixed(2)} por chamada. Considere usar vozes não-premium.
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        {/* Total Calls */}
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Total de Chamadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCalls}</div>
            <p className="text-xs text-muted-foreground mt-1">últimos {dateRange} dias</p>
          </CardContent>
        </Card>

        {/* Success Rate */}
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Taxa de Sucesso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{successRate.toFixed(1)}%</div>
              {successRate >= 80 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </div>
            <Progress value={successRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {completedCalls} completadas / {failedCalls} falhadas
            </p>
          </CardContent>
        </Card>

        {/* Average Duration */}
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Tempo Médio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(Math.round(avgDuration))}</div>
            <p className="text-xs text-muted-foreground mt-1">duração das chamadas</p>
          </CardContent>
        </Card>

        {/* DTMF Response Rate */}
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Taxa DTMF
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dtmfResponseRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">usuários que pressionaram tecla</p>
          </CardContent>
        </Card>

        {/* Transfer Success Rate */}
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <PhoneForwarded className="h-4 w-4" />
              Taxa de Transferência
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalTransferAttempts > 0 ? `${transferSuccessRate.toFixed(1)}%` : "-"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalTransferAttempts > 0 ? `${completedTransfers} de ${totalTransferAttempts}` : "sem transferências"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* DTMF Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Opções Escolhidas pelos Usuários</CardTitle>
            <CardDescription>Distribuição de teclas pressionadas na URA</CardDescription>
          </CardHeader>
          <CardContent>
            {dtmfChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={dtmfChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {dtmfChartData.map((entry, index) => {
                      const digit = entry.name.includes("Sem resposta")
                        ? "timeout"
                        : entry.name.replace("Opção ", "");
                      return <Cell key={`cell-${index}`} fill={DTMF_COLORS[digit] || "#94a3b8"} />;
                    })}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Sem dados de respostas DTMF
              </div>
            )}
          </CardContent>
        </Card>

        {/* Success Rate Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Performance de Chamadas URA</CardTitle>
            <CardDescription>Evolução da taxa de sucesso por dia</CardDescription>
          </CardHeader>
          <CardContent>
            {successOverTimeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={successOverTimeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="successRate" stroke="hsl(142, 76%, 36%)" name="Taxa de Sucesso (%)" />
                  <Line
                    type="monotone"
                    dataKey="failureRate"
                    stroke="hsl(0, 84%, 60%)"
                    strokeDasharray="5 5"
                    name="Taxa de Falha (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">Sem dados históricos</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Duration by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Tempo Médio por Status de Chamada</CardTitle>
            <CardDescription>Duração média em segundos</CardDescription>
          </CardHeader>
          <CardContent>
            {durationByStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={durationByStatusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="avgDuration" fill="hsl(221, 83%, 53%)" name="Duração Média (s)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Sem dados de duração
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hourly Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Horário de Pico da URA</CardTitle>
            <CardDescription>Volume de chamadas por hora</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={hourlyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="calls" stroke="hsl(25, 95%, 53%)" name="Chamadas" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Template Performance Table */}
      {templatePerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance por Template</CardTitle>
            <CardDescription>Comparação de performance entre templates URA</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Taxa de Sucesso</TableHead>
                  <TableHead className="text-right">Duração Média</TableHead>
                  <TableHead className="text-right">Custo Médio</TableHead>
                  <TableHead className="text-right">Opção Popular</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templatePerformance
                  .sort((a, b) => b.totalCalls - a.totalCalls)
                  .map((template) => (
                    <TableRow key={template.template}>
                      <TableCell className="font-medium">
                        {template.template === "custom" ? "Personalizado" : template.template}
                      </TableCell>
                      <TableCell className="text-right">{template.totalCalls}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={template.successRate >= 80 ? "default" : "secondary"}>
                          {template.successRate.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatDuration(Math.round(template.avgDuration))}</TableCell>
                      <TableCell className="text-right">
                        {template.avgCost > 0 ? `$${template.avgCost.toFixed(2)}` : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {template.mostCommonOption !== "-" ? `Opção ${template.mostCommonOption}` : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Transfer Analysis (v2) */}
      {totalTransferAttempts > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Análise de Transferências</CardTitle>
            <CardDescription>Detalhes sobre transferências para assistentes (URA v2)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total de tentativas:</span>
              <Badge variant="outline">{totalTransferAttempts}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Transferências completadas:</span>
              <Badge variant="default">
                {completedTransfers} ({transferSuccessRate.toFixed(1)}%)
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Taxa de abandono:</span>
              <Badge variant="secondary">{(100 - transferSuccessRate).toFixed(1)}%</Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
