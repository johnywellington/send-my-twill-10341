import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ArrowLeft, TrendingUp, TrendingDown, Activity, DollarSign, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BulkSendStats } from "@/components/analytics/BulkSendStats";

interface AnalyticsData {
  totalSent: number;
  successRate: number;
  failureRate: number;
  avgDeliveryTime: number;
  totalCost: number;
  providerStats: { provider: string; total: number; success: number; failed: number }[];
  volumeByDate: { date: string; sms: number; voice: number; ivr: number }[];
  statusDistribution: { name: string; value: number }[];
  commonErrors: { error: string; count: number; type: string }[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(var(--warning))', 'hsl(var(--muted))'];

export default function Analytics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [dateRange, setDateRange] = useState<"7" | "30" | "90">("7");
  const [activeTab, setActiveTab] = useState<"overview" | "sms" | "voice" | "ivr" | "bulk">("overview");
  const [bulkSendLogs, setBulkSendLogs] = useState<any[]>([]);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchAnalytics();
    }
  }, [dateRange, activeTab]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setLoading(false);
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(dateRange));

      // Fetch bulk send logs
      const { data: bulkLogs } = await supabase
        .from("bulk_send_logs")
        .select("*")
        .gte("created_at", daysAgo.toISOString())
        .order("created_at", { ascending: false });
      
      setBulkSendLogs(bulkLogs || []);

      // Fetch SMS logs
      const { data: smsLogs } = await supabase
        .from("sms_logs")
        .select("*")
        .gte("created_at", daysAgo.toISOString())
        .order("created_at", { ascending: true });

      // Fetch Voice logs
      const { data: voiceLogs } = await supabase
        .from("voice_logs")
        .select("*")
        .gte("created_at", daysAgo.toISOString())
        .order("created_at", { ascending: true });

      // Fetch IVR logs
      const { data: ivrLogs } = await supabase
        .from("ivr_logs")
        .select("*")
        .gte("created_at", daysAgo.toISOString())
        .order("created_at", { ascending: true });

      const allLogs = [
        ...(smsLogs || []).map(l => ({ ...l, type: 'sms' })),
        ...(voiceLogs || []).map(l => ({ ...l, type: 'voice' })),
        ...(ivrLogs || []).map(l => ({ ...l, type: 'ivr' }))
      ];

      // Filter by active tab
      const filteredLogs = activeTab === "overview" 
        ? allLogs 
        : allLogs.filter(l => l.type === activeTab);

      // Calculate metrics
      const totalSent = filteredLogs.length;
      const successCount = filteredLogs.filter(l => 
        l.status === 'sent' || l.status === 'delivered' || l.status === 'completed'
      ).length;
      const failedCount = filteredLogs.filter(l => l.status === 'failed').length;
      const successRate = totalSent > 0 ? (successCount / totalSent) * 100 : 0;
      const failureRate = totalSent > 0 ? (failedCount / totalSent) * 100 : 0;

      // Total cost
      const totalCost = filteredLogs.reduce((sum, l) => sum + (parseFloat(String(l.cost || '0'))), 0);

      // Avg delivery time (for voice/ivr with duration)
      const logsWithDuration = filteredLogs.filter(l => 'duration' in l && l.duration);
      const avgDeliveryTime = logsWithDuration.length > 0
        ? logsWithDuration.reduce((sum, l) => sum + (('duration' in l ? l.duration : 0) || 0), 0) / logsWithDuration.length
        : 0;

      // Provider stats (SMS only)
      const smsOnlyLogs = filteredLogs.filter(l => l.type === 'sms' && 'provider' in l);
      const providerMap = new Map<string, { total: number; success: number; failed: number }>();
      
      smsOnlyLogs.forEach(log => {
        const provider = (log as any).provider || 'unknown';
        if (!providerMap.has(provider)) {
          providerMap.set(provider, { total: 0, success: 0, failed: 0 });
        }
        const stats = providerMap.get(provider)!;
        stats.total++;
        if (log.status === 'sent' || log.status === 'delivered') stats.success++;
        if (log.status === 'failed') stats.failed++;
      });

      const providerStats = Array.from(providerMap.entries()).map(([provider, stats]) => ({
        provider: provider.charAt(0).toUpperCase() + provider.slice(1),
        ...stats
      }));

      // Volume by date
      const dateMap = new Map<string, { sms: number; voice: number; ivr: number }>();
      filteredLogs.forEach(log => {
        const date = new Date(log.created_at).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' });
        if (!dateMap.has(date)) {
          dateMap.set(date, { sms: 0, voice: 0, ivr: 0 });
        }
        const stats = dateMap.get(date)!;
        if (log.type === 'sms') stats.sms++;
        if (log.type === 'voice') stats.voice++;
        if (log.type === 'ivr') stats.ivr++;
      });

      const volumeByDate = Array.from(dateMap.entries()).map(([date, stats]) => ({
        date,
        ...stats
      }));

      // Status distribution
      const statusMap = new Map<string, number>();
      filteredLogs.forEach(log => {
        const status = log.status || 'unknown';
        statusMap.set(status, (statusMap.get(status) || 0) + 1);
      });

      const statusDistribution = Array.from(statusMap.entries()).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value
      }));

      // Common errors
      const errorMap = new Map<string, { count: number; type: string }>();
      filteredLogs.filter(l => l.error_message).forEach(log => {
        const error = log.error_message || 'Unknown error';
        const shortError = error.length > 50 ? error.substring(0, 50) + '...' : error;
        if (!errorMap.has(shortError)) {
          errorMap.set(shortError, { count: 0, type: log.type });
        }
        errorMap.get(shortError)!.count++;
      });

      const commonErrors = Array.from(errorMap.entries())
        .map(([error, data]) => ({ error, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setAnalytics({
        totalSent,
        successRate,
        failureRate,
        avgDeliveryTime,
        totalCost,
        providerStats,
        volumeByDate,
        statusDistribution,
        commonErrors
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Erro ao carregar analytics");
    } finally {
      setLoading(false);
    }
  };

  if (loading || !analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                Analytics
              </h1>
              <p className="text-muted-foreground mt-1">Métricas e insights de comunicação</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="90">90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Geral</TabsTrigger>
            <TabsTrigger value="sms">SMS</TabsTrigger>
            <TabsTrigger value="voice">Voice</TabsTrigger>
            <TabsTrigger value="ivr">IVR</TabsTrigger>
            <TabsTrigger value="bulk">Envio em Massa</TabsTrigger>
          </TabsList>

          <TabsContent value="bulk" className="space-y-6 mt-6">
            <BulkSendStats logs={bulkSendLogs} />
          </TabsContent>

          {activeTab !== 'bulk' && (
            <TabsContent value={activeTab} className="space-y-6 mt-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="glass-effect">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    Total Enviado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{analytics.totalSent}</p>
                  <p className="text-xs text-muted-foreground mt-1">mensagens/chamadas</p>
                </CardContent>
              </Card>

              <Card className="glass-effect">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    Taxa de Sucesso
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-500">{analytics.successRate.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground mt-1">entregas bem sucedidas</p>
                </CardContent>
              </Card>

              <Card className="glass-effect">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-destructive" />
                    Taxa de Falha
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-destructive">{analytics.failureRate.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground mt-1">falhas de entrega</p>
                </CardContent>
              </Card>

              <Card className="glass-effect">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    Duração Média
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-blue-500">{analytics.avgDeliveryTime.toFixed(0)}s</p>
                  <p className="text-xs text-muted-foreground mt-1">tempo de chamadas</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Volume Over Time */}
              <Card className="glass-effect">
                <CardHeader>
                  <CardTitle>Volume ao Longo do Tempo</CardTitle>
                  <CardDescription>Mensagens e chamadas por dia</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analytics.volumeByDate}>
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
                      {activeTab === "overview" && (
                        <>
                          <Line type="monotone" dataKey="sms" stroke="hsl(var(--primary))" name="SMS" />
                          <Line type="monotone" dataKey="voice" stroke="hsl(var(--destructive))" name="Voice" />
                          <Line type="monotone" dataKey="ivr" stroke="hsl(var(--warning))" name="IVR" />
                        </>
                      )}
                      {activeTab === "sms" && <Line type="monotone" dataKey="sms" stroke="hsl(var(--primary))" name="SMS" />}
                      {activeTab === "voice" && <Line type="monotone" dataKey="voice" stroke="hsl(var(--destructive))" name="Voice" />}
                      {activeTab === "ivr" && <Line type="monotone" dataKey="ivr" stroke="hsl(var(--warning))" name="IVR" />}
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Status Distribution */}
              <Card className="glass-effect">
                <CardHeader>
                  <CardTitle>Distribuição de Status</CardTitle>
                  <CardDescription>Status das mensagens/chamadas</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analytics.statusDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="hsl(var(--primary))"
                        dataKey="value"
                      >
                        {analytics.statusDistribution.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 2 */}
            {activeTab === "sms" && analytics.providerStats.length > 0 && (
              <Card className="glass-effect">
                <CardHeader>
                  <CardTitle>Comparação de Providers</CardTitle>
                  <CardDescription>Performance Twilio vs Vonage</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.providerStats}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="provider" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Bar dataKey="success" fill="hsl(var(--primary))" name="Sucesso" />
                      <Bar dataKey="failed" fill="hsl(var(--destructive))" name="Falhas" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Common Errors Table */}
            {analytics.commonErrors.length > 0 && (
              <Card className="glass-effect">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-destructive" />
                    Erros Mais Comuns
                  </CardTitle>
                  <CardDescription>Top 10 erros de entrega</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Erro</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Ocorrências</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.commonErrors.map((error, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-sm">{error.error}</TableCell>
                          <TableCell>
                            <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                              {error.type.toUpperCase()}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-bold">{error.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
