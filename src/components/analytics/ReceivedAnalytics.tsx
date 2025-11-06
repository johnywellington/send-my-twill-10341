import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Inbox, PhoneIncoming, Clock, TrendingUp, MessageCircleReply, PhoneCall, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ReceivedSms {
  id: string;
  from_number: string;
  to_number: string;
  message: string;
  provider: string;
  received_at: string;
}

interface ReceivedCall {
  id: string;
  from_number: string;
  to_number: string;
  status: string;
  provider: string;
  duration?: number;
  started_at: string;
}

interface ReceivedAnalyticsProps {
  dateRange: number;
}

const STATUS_COLORS: Record<string, string> = {
  'ringing': 'hsl(45, 93%, 47%)',
  'answered': 'hsl(142, 71%, 45%)',
  'completed': 'hsl(217, 91%, 60%)',
  'missed': 'hsl(0, 72%, 51%)',
  'failed': 'hsl(215, 16%, 47%)',
  'busy': 'hsl(25, 95%, 53%)',
  'no-answer': 'hsl(258, 90%, 66%)'
};

export function ReceivedAnalytics({ dateRange }: ReceivedAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [smsData, setSmsData] = useState<ReceivedSms[]>([]);
  const [callsData, setCallsData] = useState<ReceivedCall[]>([]);

  useEffect(() => {
    fetchReceivedData();
  }, [dateRange]);

  const fetchReceivedData = async () => {
    setLoading(true);
    try {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - dateRange);

      // Fetch received SMS
      const { data: sms } = await supabase
        .from("received_sms")
        .select("*")
        .gte("received_at", daysAgo.toISOString())
        .order("received_at", { ascending: true });

      // Fetch received calls
      const { data: calls } = await supabase
        .from("received_calls")
        .select("*")
        .gte("started_at", daysAgo.toISOString())
        .order("started_at", { ascending: true });

      setSmsData(sms || []);
      setCallsData(calls || []);
    } catch (error) {
      console.error("Error fetching received data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate KPIs
  const totalSmsReceived = smsData.length;
  const totalCallsReceived = callsData.length;
  
  const callsWithDuration = callsData.filter(c => c.duration && c.duration > 0);
  const avgCallDuration = callsWithDuration.length > 0
    ? callsWithDuration.reduce((sum, c) => sum + (c.duration || 0), 0) / callsWithDuration.length
    : 0;

  const answeredCalls = callsData.filter(c => c.status === 'answered' || c.status === 'completed').length;
  const missedCalls = callsData.filter(c => c.status === 'missed' || c.status === 'no-answer').length;
  const answeredRate = totalCallsReceived > 0 ? (answeredCalls / totalCallsReceived) * 100 : 0;

  // Calculate response rate (simplified: compare sent vs received counts)
  const [responseRate, setResponseRate] = useState(0);
  useEffect(() => {
    const calculateResponseRate = async () => {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - dateRange);
      
      const { data: sentSms } = await supabase
        .from("sms_logs")
        .select("id")
        .gte("created_at", daysAgo.toISOString());
      
      const sentCount = sentSms?.length || 0;
      const receivedCount = smsData.length;
      const rate = sentCount > 0 ? (receivedCount / sentCount) * 100 : 0;
      setResponseRate(rate);
    };
    calculateResponseRate();
  }, [smsData, dateRange]);

  // Hourly peaks
  const hourlyPeaks = Array.from({ length: 24 }, (_, hour) => {
    const smsCount = smsData.filter(s => new Date(s.received_at).getHours() === hour).length;
    const callsCount = callsData.filter(c => new Date(c.started_at).getHours() === hour).length;
    return { hour, sms: smsCount, calls: callsCount };
  });

  // Volume by date
  const dateMap = new Map<string, { sms: number; calls: number }>();
  smsData.forEach(s => {
    const date = new Date(s.received_at).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' });
    if (!dateMap.has(date)) dateMap.set(date, { sms: 0, calls: 0 });
    dateMap.get(date)!.sms++;
  });
  callsData.forEach(c => {
    const date = new Date(c.started_at).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' });
    if (!dateMap.has(date)) dateMap.set(date, { sms: 0, calls: 0 });
    dateMap.get(date)!.calls++;
  });
  const volumeByDate = Array.from(dateMap.entries()).map(([date, stats]) => ({ date, ...stats }));

  // Call status distribution
  const statusMap = new Map<string, number>();
  callsData.forEach(c => {
    statusMap.set(c.status, (statusMap.get(c.status) || 0) + 1);
  });
  const callStatusDistribution = Array.from(statusMap.entries()).map(([status, count]) => ({
    status: status.charAt(0).toUpperCase() + status.slice(1),
    count
  }));

  // Duration by status
  const durationByStatus = Array.from(statusMap.keys()).map(status => {
    const statusCalls = callsData.filter(c => c.status === status && c.duration);
    const avgDur = statusCalls.length > 0
      ? statusCalls.reduce((sum, c) => sum + (c.duration || 0), 0) / statusCalls.length
      : 0;
    return {
      status: status.charAt(0).toUpperCase() + status.slice(1),
      avgDuration: avgDur,
      count: statusCalls.length
    };
  }).filter(s => s.count > 0);

  // Provider distribution
  const providerMap = new Map<string, number>();
  [...smsData, ...callsData].forEach((item: any) => {
    providerMap.set(item.provider, (providerMap.get(item.provider) || 0) + 1);
  });
  const providerDistribution = Array.from(providerMap.entries()).map(([provider, total]) => ({
    provider: provider.charAt(0).toUpperCase() + provider.slice(1),
    total
  }));

  // Top contacts
  const contactMap = new Map<string, { total: number; lastContact: string; types: Set<string> }>();
  smsData.forEach(s => {
    if (!contactMap.has(s.from_number)) {
      contactMap.set(s.from_number, { total: 0, lastContact: s.received_at, types: new Set() });
    }
    const contact = contactMap.get(s.from_number)!;
    contact.total++;
    contact.types.add('sms');
    if (new Date(s.received_at) > new Date(contact.lastContact)) {
      contact.lastContact = s.received_at;
    }
  });
  callsData.forEach(c => {
    if (!contactMap.has(c.from_number)) {
      contactMap.set(c.from_number, { total: 0, lastContact: c.started_at, types: new Set() });
    }
    const contact = contactMap.get(c.from_number)!;
    contact.total++;
    contact.types.add('call');
    if (new Date(c.started_at) > new Date(contact.lastContact)) {
      contact.lastContact = c.started_at;
    }
  });
  
  const topContacts = Array.from(contactMap.entries())
    .map(([number, data]) => ({
      fromNumber: number,
      total: data.total,
      type: data.types.size > 1 ? 'both' : Array.from(data.types)[0],
      lastContact: data.lastContact
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Card key={i} className="glass-effect animate-pulse">
              <CardContent className="h-32" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (totalSmsReceived === 0 && totalCallsReceived === 0) {
    return (
      <Card className="glass-effect">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Inbox className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum recebimento ainda</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Configure os webhooks nos dashboards Twilio e Vonage para começar a receber SMS e chamadas.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="glass-effect">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Inbox className="w-4 h-4 text-primary" />
              SMS Recebidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalSmsReceived}</p>
            <p className="text-xs text-muted-foreground mt-1">últimos {dateRange} dias</p>
          </CardContent>
        </Card>

        <Card className="glass-effect">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PhoneIncoming className="w-4 h-4 text-primary" />
              Chamadas Recebidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalCallsReceived}</p>
            <p className="text-xs text-muted-foreground mt-1">últimos {dateRange} dias</p>
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
            <p className="text-3xl font-bold text-blue-500">{avgCallDuration.toFixed(0)}s</p>
            <p className="text-xs text-muted-foreground mt-1">de chamadas</p>
          </CardContent>
        </Card>

        <Card className="glass-effect">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageCircleReply className="w-4 h-4 text-purple-500" />
              Taxa de Resposta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-500">{responseRate.toFixed(1)}%</p>
            <Progress value={Math.min(responseRate, 100)} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="glass-effect">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-green-500" />
              Taxa de Atendimento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-500">{answeredRate.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {answeredCalls} atendidas / {missedCalls} perdidas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1: Peak Hours & Volume Over Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle>📈 Horário de Pico</CardTitle>
            <CardDescription>Volume de SMS e chamadas por hora do dia</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={hourlyPeaks}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="hour" 
                  tickFormatter={(hour) => `${hour}h`}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="sms" 
                  stroke="hsl(var(--primary))" 
                  name="SMS Recebidos"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="calls" 
                  stroke="hsl(142, 71%, 45%)" 
                  name="Chamadas Recebidas"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-effect">
          <CardHeader>
            <CardTitle>📊 Volume por Dia</CardTitle>
            <CardDescription>Recebimentos diários</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={volumeByDate}>
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
                <Line type="monotone" dataKey="sms" stroke="hsl(var(--primary))" name="SMS" strokeWidth={2} />
                <Line type="monotone" dataKey="calls" stroke="hsl(142, 71%, 45%)" name="Chamadas" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Call Status & Duration by Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle>📞 Status das Chamadas</CardTitle>
            <CardDescription>Distribuição por status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={callStatusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ status, percent }) => `${status}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  dataKey="count"
                >
                  {callStatusDistribution.map((entry) => (
                    <Cell 
                      key={entry.status} 
                      fill={STATUS_COLORS[entry.status.toLowerCase()] || 'hsl(var(--muted))'} 
                    />
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

        <Card className="glass-effect">
          <CardHeader>
            <CardTitle>⏱️ Duração Média por Status</CardTitle>
            <CardDescription>Tempo médio de chamadas em segundos</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={durationByStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="status" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: any) => `${value.toFixed(0)}s`}
                />
                <Bar dataKey="avgDuration" fill="hsl(var(--primary))" name="Duração Média (s)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Provider Distribution */}
      {providerDistribution.length > 0 && (
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle>📡 Distribuição por Provider</CardTitle>
            <CardDescription>Total de recebimentos por provider</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={providerDistribution}>
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
                <Bar dataKey="total" fill="hsl(var(--primary))" name="Total" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top Contacts Table */}
      {topContacts.length > 0 && (
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle>👥 Top 10 Contatos Mais Ativos</CardTitle>
            <CardDescription>Números que mais entraram em contato</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Último Contato</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topContacts.map((contact) => (
                  <TableRow key={contact.fromNumber}>
                    <TableCell className="font-mono">{contact.fromNumber}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{contact.total}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={contact.type === 'sms' ? 'default' : contact.type === 'call' ? 'outline' : 'secondary'}>
                        {contact.type === 'both' ? 'SMS + Call' : contact.type.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(contact.lastContact).toLocaleString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
