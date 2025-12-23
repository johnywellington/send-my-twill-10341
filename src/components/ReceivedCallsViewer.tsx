import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { PhoneIncoming, Search, Filter, Download, Play, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReceivedCall {
  id: string;
  call_uuid: string;
  conversation_uuid?: string;
  from_number: string;
  to_number: string;
  status: string;
  provider: string;
  duration?: number;
  recording_url?: string;
  cost?: number;
  started_at?: string;
  ended_at?: string;
  metadata?: any;
}

export function ReceivedCallsViewer() {
  const [calls, setCalls] = useState<ReceivedCall[]>([]);
  const [filteredCalls, setFilteredCalls] = useState<ReceivedCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchReceivedCalls();
    
    // Setup realtime subscription
    const channel = supabase
      .channel('received-calls-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'received_calls'
        },
        (payload) => {
          console.log('Call update received:', payload);
          
          if (payload.eventType === 'INSERT') {
            setCalls((current) => [payload.new as ReceivedCall, ...current]);
            toast({
              title: "Nova Chamada Recebida!",
              description: `De: ${(payload.new as ReceivedCall).from_number}`,
            });
          } else if (payload.eventType === 'UPDATE') {
            setCalls((current) =>
              current.map((call) =>
                call.id === payload.new.id ? (payload.new as ReceivedCall) : call
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    filterCalls();
  }, [calls, searchQuery, statusFilter, providerFilter]);

  const fetchReceivedCalls = async () => {
    try {
      const { data, error } = await supabase
        .from('received_calls')
        .select('*')
        .order('started_at', { ascending: false });

      if (error) throw error;
      setCalls(data || []);
    } catch (error: any) {
      console.error('Error fetching calls:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar chamadas",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const filterCalls = () => {
    let filtered = calls;

    if (statusFilter !== "all") {
      filtered = filtered.filter(call => call.status === statusFilter);
    }

    if (providerFilter !== "all") {
      filtered = filtered.filter(call => call.provider === providerFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(call => 
        call.from_number.includes(searchQuery) ||
        call.to_number.includes(searchQuery)
      );
    }

    setFilteredCalls(filtered);
  };

  const exportToCSV = () => {
    const headers = ['Data/Hora', 'De', 'Para', 'Status', 'Duração', 'Provider', 'Custo'];
    const rows = filteredCalls.map(call => [
      call.started_at ? format(new Date(call.started_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR }) : '-',
      call.from_number,
      call.to_number,
      call.status,
      call.duration ? `${call.duration}s` : '-',
      call.provider,
      call.cost ? `$${call.cost}` : '-'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `chamadas-recebidas-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();

    toast({
      title: "Exportação Concluída",
      description: `${filteredCalls.length} chamadas exportadas para CSV`,
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'ringing': 'bg-blue-500',
      'answered': 'bg-green-500',
      'in-progress': 'bg-yellow-500',
      'completed': 'bg-green-600',
      'missed': 'bg-red-500',
      'failed': 'bg-red-600',
      'busy': 'bg-orange-500',
      'no-answer': 'bg-gray-500',
    };
    return colors[status] || 'bg-gray-400';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'ringing': 'Tocando',
      'answered': 'Atendida',
      'in-progress': 'Em Progresso',
      'completed': 'Concluída',
      'missed': 'Perdida',
      'failed': 'Falhou',
      'busy': 'Ocupado',
      'no-answer': 'Sem Resposta',
    };
    return labels[status] || status;
  };

  const stats = {
    total: calls.length,
    answered: calls.filter(call => call.status === 'answered' || call.status === 'completed').length,
    missed: calls.filter(call => call.status === 'missed' || call.status === 'no-answer').length,
    avgDuration: calls.filter(call => call.duration).reduce((acc, call) => acc + (call.duration || 0), 0) / 
                 (calls.filter(call => call.duration).length || 1),
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Carregando chamadas recebidas...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total de Chamadas</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Atendidas</CardDescription>
            <CardTitle className="text-3xl text-green-600">{stats.answered}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Perdidas</CardDescription>
            <CardTitle className="text-3xl text-red-600">{stats.missed}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Duração Média</CardDescription>
            <CardTitle className="text-3xl">{Math.round(stats.avgDuration)}s</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <PhoneIncoming className="w-5 h-5" />
                Chamadas Recebidas
              </CardTitle>
              <CardDescription>
                Monitore e grave todas as chamadas recebidas em seus números
              </CardDescription>
            </div>
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar por número..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="completed">Concluída</SelectItem>
                <SelectItem value="answered">Atendida</SelectItem>
                <SelectItem value="missed">Perdida</SelectItem>
                <SelectItem value="failed">Falhou</SelectItem>
              </SelectContent>
            </Select>
            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="twilio">Twilio</SelectItem>
                <SelectItem value="vonage">Vonage</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="h-[500px] pr-4">
            {filteredCalls.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Phone className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma chamada recebida ainda</p>
                <p className="text-sm mt-2">
                  Configure os webhooks no Twilio/Vonage para começar a receber chamadas
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredCalls.map((call) => (
                  <Card key={call.id} className="hover:bg-muted/50 transition-colors">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">{call.from_number}</span>
                            <Badge variant="outline" className="text-xs">
                              {call.provider}
                            </Badge>
                            <div className={`w-2 h-2 rounded-full ${getStatusColor(call.status)}`} />
                            <span className="text-xs text-muted-foreground">
                              {getStatusLabel(call.status)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Para: {call.to_number}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="text-xs text-muted-foreground">
                            {call.started_at && format(new Date(call.started_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </span>
                          {call.duration && (
                            <Badge variant="secondary" className="text-xs">
                              {Math.floor(call.duration / 60)}:{(call.duration % 60).toString().padStart(2, '0')}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Separator className="my-3" />
                      <div className="flex justify-between items-center">
                        <div className="space-y-1">
                          {call.cost && (
                            <p className="text-sm text-muted-foreground">
                              Custo: ${call.cost.toFixed(4)}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            ID: {call.call_uuid}
                          </p>
                        </div>
                        {call.recording_url && (
                          <Button size="sm" variant="outline">
                            <Play className="w-3 h-3 mr-1" />
                            Ouvir Gravação
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
