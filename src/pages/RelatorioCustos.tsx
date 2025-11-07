import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, DollarSign, TrendingDown, TrendingUp } from "lucide-react";
import { DateRangePicker } from "@/components/DateRangePicker";
import { useSmsHistory } from "@/hooks/use-sms-history";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ['#3b82f6', '#10b981'];

const RelatorioCustos = () => {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date()
  });

  // Buscar custos de SMS
  const { data: smsLogs, isLoading: smsLoading } = useQuery({
    queryKey: ['sms-costs', dateRange.from, dateRange.to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sms_logs')
        .select('*')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Buscar custos de Voice
  const { data: voiceLogs, isLoading: voiceLoading } = useQuery({
    queryKey: ['voice-costs', dateRange.from, dateRange.to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('voice_logs')
        .select('*')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Buscar custos de IVR
  const { data: ivrLogs, isLoading: ivrLoading } = useQuery({
    queryKey: ['ivr-costs', dateRange.from, dateRange.to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ivr_logs')
        .select('*')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const loading = smsLoading || voiceLoading || ivrLoading;

  // Calcular totais
  const smsCost = smsLogs?.reduce((sum, log) => sum + parseFloat(String(log.cost || '0')), 0) || 0;
  const voiceCost = voiceLogs?.reduce((sum, log) => sum + parseFloat(String(log.cost || '0')), 0) || 0;
  const ivrCost = ivrLogs?.reduce((sum, log) => sum + parseFloat(String(log.cost || '0')), 0) || 0;
  const totalCost = smsCost + voiceCost + ivrCost;

  // Agrupar por provider
  const costsByProvider = {
    twilio: {
      sms: smsLogs?.filter(l => l.provider === 'twilio').reduce((sum, l) => sum + parseFloat(String(l.cost || '0')), 0) || 0,
      voice: voiceLogs?.filter(l => l.provider === 'twilio').reduce((sum, l) => sum + parseFloat(String(l.cost || '0')), 0) || 0,
      ivr: ivrLogs?.filter(l => l.provider === 'twilio').reduce((sum, l) => sum + parseFloat(String(l.cost || '0')), 0) || 0
    },
    vonage: {
      sms: smsLogs?.filter(l => l.provider === 'vonage').reduce((sum, l) => sum + parseFloat(String(l.cost || '0')), 0) || 0,
      voice: voiceLogs?.filter(l => l.provider === 'vonage').reduce((sum, l) => sum + parseFloat(String(l.cost || '0')), 0) || 0,
      ivr: ivrLogs?.filter(l => l.provider === 'vonage').reduce((sum, l) => sum + parseFloat(String(l.cost || '0')), 0) || 0
    }
  };

  const twilioTotal = costsByProvider.twilio.sms + costsByProvider.twilio.voice + costsByProvider.twilio.ivr;
  const vonageTotal = costsByProvider.vonage.sms + costsByProvider.vonage.voice + costsByProvider.vonage.ivr;

  // Dados para gráficos
  const providerData = [
    { name: 'Twilio', value: twilioTotal },
    { name: 'Vonage', value: vonageTotal }
  ];

  const serviceData = [
    { name: 'SMS', Twilio: costsByProvider.twilio.sms, Vonage: costsByProvider.vonage.sms },
    { name: 'Voice', Twilio: costsByProvider.twilio.voice, Vonage: costsByProvider.vonage.voice },
    { name: 'IVR', Twilio: costsByProvider.twilio.ivr, Vonage: costsByProvider.vonage.ivr }
  ];

  const exportCSV = () => {
    const csv = [
      ['Tipo', 'Provider', 'Data', 'De', 'Para', 'Custo'],
      ...(smsLogs || []).map(l => ['SMS', l.provider, format(new Date(l.created_at), 'dd/MM/yyyy HH:mm'), l.from_number, l.to_number, l.cost]),
      ...(voiceLogs || []).map(l => ['Voice', l.provider, format(new Date(l.created_at), 'dd/MM/yyyy HH:mm'), l.from_number, l.to_number, l.cost]),
      ...(ivrLogs || []).map(l => ['IVR', l.provider, format(new Date(l.created_at), 'dd/MM/yyyy HH:mm'), l.from_number, l.to_number, l.cost])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-custos-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Relatório de Custos</h1>
              <p className="text-muted-foreground">
                Análise detalhada de gastos por serviço e provider
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <DateRangePicker value={dateRange} onChange={(range) => range && setDateRange(range as { from: Date; to: Date })} />
            <Button onClick={exportCSV} disabled={loading}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Custo Total</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalCost.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">No período</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">SMS</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${smsCost.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">{smsLogs?.length || 0} mensagens</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Voice</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${voiceCost.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">{voiceLogs?.length || 0} chamadas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">IVR</CardTitle>
                <TrendingUp className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${ivrCost.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">{ivrLogs?.length || 0} interações</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Custos por Provider</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[300px]" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={providerData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {providerData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Breakdown por Serviço</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[300px]" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={serviceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                    <Legend />
                    <Bar dataKey="Twilio" fill="#3b82f6" />
                    <Bar dataKey="Vonage" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Comparison Table */}
        <Card>
          <CardHeader>
            <CardTitle>Comparação Detalhada</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Twilio</TableHead>
                  <TableHead>Vonage</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Mais Barato</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">SMS</TableCell>
                  <TableCell>${costsByProvider.twilio.sms.toFixed(4)}</TableCell>
                  <TableCell>${costsByProvider.vonage.sms.toFixed(4)}</TableCell>
                  <TableCell>${smsCost.toFixed(4)}</TableCell>
                  <TableCell>
                    <Badge variant={costsByProvider.twilio.sms < costsByProvider.vonage.sms ? 'default' : 'secondary'}>
                      {costsByProvider.twilio.sms < costsByProvider.vonage.sms ? 'Twilio' : 'Vonage'}
                    </Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Voice</TableCell>
                  <TableCell>${costsByProvider.twilio.voice.toFixed(4)}</TableCell>
                  <TableCell>${costsByProvider.vonage.voice.toFixed(4)}</TableCell>
                  <TableCell>${voiceCost.toFixed(4)}</TableCell>
                  <TableCell>
                    <Badge variant={costsByProvider.twilio.voice < costsByProvider.vonage.voice ? 'default' : 'secondary'}>
                      {costsByProvider.twilio.voice < costsByProvider.vonage.voice ? 'Twilio' : 'Vonage'}
                    </Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">IVR</TableCell>
                  <TableCell>${costsByProvider.twilio.ivr.toFixed(4)}</TableCell>
                  <TableCell>${costsByProvider.vonage.ivr.toFixed(4)}</TableCell>
                  <TableCell>${ivrCost.toFixed(4)}</TableCell>
                  <TableCell>
                    <Badge variant={costsByProvider.twilio.ivr < costsByProvider.vonage.ivr ? 'default' : 'secondary'}>
                      {costsByProvider.twilio.ivr < costsByProvider.vonage.ivr ? 'Twilio' : 'Vonage'}
                    </Badge>
                  </TableCell>
                </TableRow>
                <TableRow className="font-bold">
                  <TableCell>TOTAL</TableCell>
                  <TableCell>${twilioTotal.toFixed(2)}</TableCell>
                  <TableCell>${vonageTotal.toFixed(2)}</TableCell>
                  <TableCell>${totalCost.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={twilioTotal < vonageTotal ? 'default' : 'secondary'}>
                      {twilioTotal < vonageTotal ? 'Twilio' : 'Vonage'}
                    </Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RelatorioCustos;