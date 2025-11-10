import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Phone, Clock, DollarSign } from "lucide-react";
import { DateRangePicker } from "@/components/DateRangePicker";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const ChamadasRecebidas = () => {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [selectedCall, setSelectedCall] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data: calls, isLoading } = useQuery({
    queryKey: ['received-calls', dateRange.from, dateRange.to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('received_calls')
        .select('*')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const totalCalls = calls?.length || 0;
  const answeredCalls = calls?.filter(c => c.answered)?.length || 0;
  const totalDuration = calls?.reduce((sum, c) => sum + (c.duration || 0), 0) || 0;
  const totalCost = calls?.reduce((sum, c) => sum + parseFloat(String(c.cost || '0')), 0) || 0;

  const openDetails = (call: any) => {
    setSelectedCall(call);
    setDetailsOpen(true);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'answered': return 'default';
      case 'busy': return 'secondary';
      case 'failed': return 'destructive';
      case 'no-answer': return 'secondary';
      default: return 'outline';
    }
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
              <h1 className="text-3xl font-bold">Chamadas Recebidas</h1>
              <p className="text-muted-foreground">
                Histórico de chamadas inbound recebidas
              </p>
            </div>
          </div>

          <DateRangePicker value={dateRange} onChange={(range) => range && setDateRange(range as { from: Date; to: Date })} />
        </div>

        {/* KPI Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total de Chamadas</CardTitle>
                <Phone className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalCalls}</div>
                <p className="text-xs text-muted-foreground">Recebidas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Atendidas</CardTitle>
                <Phone className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{answeredCalls}</div>
                <p className="text-xs text-muted-foreground">
                  {totalCalls > 0 ? ((answeredCalls / totalCalls) * 100).toFixed(0) : 0}% taxa de atendimento
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Duração Total</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.ceil(totalDuration / 60)}min</div>
                <p className="text-xs text-muted-foreground">{totalDuration}s total</p>
              </CardContent>
            </Card>

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
          </div>
        )}

        {/* Calls Table */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Chamadas</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : calls && calls.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>De</TableHead>
                    <TableHead>Para</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Custo</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calls.map((call) => (
                    <TableRow key={call.id}>
                      <TableCell className="text-sm">
                        {format(new Date(call.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {call.from_number}
                        {call.caller_name && (
                          <p className="text-muted-foreground">{call.caller_name}</p>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{call.to_number}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(call.status)}>
                          {call.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {call.duration ? `${call.duration}s` : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{call.provider}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        ${parseFloat(String(call.cost || '0')).toFixed(4)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDetails(call)}
                        >
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Phone className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Nenhuma chamada recebida no período</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes da Chamada</DialogTitle>
            </DialogHeader>
            {selectedCall && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Data/Hora</Label>
                    <p className="font-medium">
                      {format(new Date(selectedCall.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="mt-1">
                      <Badge variant={getStatusVariant(selectedCall.status)}>
                        {selectedCall.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">De</Label>
                    <p className="font-mono text-sm">{selectedCall.from_number}</p>
                    {selectedCall.caller_name && (
                      <p className="text-sm text-muted-foreground">{selectedCall.caller_name}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Para</Label>
                    <p className="font-mono text-sm">{selectedCall.to_number}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Provider</Label>
                    <p>{selectedCall.provider}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Duração</Label>
                    <p>{selectedCall.duration ? `${selectedCall.duration}s` : 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Custo</Label>
                    <p>${parseFloat(selectedCall.cost || '0').toFixed(4)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Atendida</Label>
                    <Badge variant={selectedCall.answered ? 'default' : 'secondary'}>
                      {selectedCall.answered ? 'Sim' : 'Não'}
                    </Badge>
                  </div>
                  {selectedCall.call_uuid && (
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">Call UUID</Label>
                      <p className="font-mono text-xs">{selectedCall.call_uuid}</p>
                    </div>
                  )}
                  {selectedCall.conversation_uuid && (
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">Conversation UUID</Label>
                      <p className="font-mono text-xs">{selectedCall.conversation_uuid}</p>
                    </div>
                  )}
                  {selectedCall.hangup_cause && (
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">Motivo do Encerramento</Label>
                      <p>{selectedCall.hangup_cause}</p>
                    </div>
                  )}
                  {selectedCall.recording_url && (
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">Gravação</Label>
                      <audio controls className="w-full mt-2">
                        <source src={selectedCall.recording_url} />
                      </audio>
                    </div>
                  )}
                  {selectedCall.transcription_text && (
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">Transcrição</Label>
                      <div className="mt-2 p-4 bg-muted rounded-lg">
                        <p className="text-sm whitespace-pre-wrap">{selectedCall.transcription_text}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ChamadasRecebidas;