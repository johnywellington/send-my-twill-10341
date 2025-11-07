import { useState, useMemo } from "react";
import { useRealtimeMonitoring } from "@/hooks/use-realtime-monitoring";
import { ActiveCallsTable } from "@/components/monitoring/ActiveCallsTable";
import { CallDetailsDialog } from "@/components/monitoring/CallDetailsDialog";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, Search } from "lucide-react";

export default function ActiveCalls() {
  const { activeCalls, loading, refetch } = useRealtimeMonitoring('1hour');
  
  const [providerFilter, setProviderFilter] = useState<'all' | 'twilio' | 'vonage'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'initiated' | 'ringing' | 'answered' | 'in-progress'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'duration' | 'created_at' | 'cost'>('duration');
  const [selectedCall, setSelectedCall] = useState<any>(null);

  const filteredCalls = useMemo(() => {
    let result = [...activeCalls];
    
    if (providerFilter !== 'all') {
      result = result.filter(c => c.provider === providerFilter);
    }
    
    if (statusFilter !== 'all') {
      result = result.filter(c => c.status === statusFilter);
    }
    
    if (searchQuery) {
      result = result.filter(c => 
        c.from_number.includes(searchQuery) || 
        c.to_number.includes(searchQuery)
      );
    }
    
    result.sort((a, b) => {
      if (sortBy === 'duration') {
        return (b.duration || 0) - (a.duration || 0);
      } else if (sortBy === 'created_at') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else {
        return (b.cost || 0) - (a.cost || 0);
      }
    });
    
    return result;
  }, [activeCalls, providerFilter, statusFilter, searchQuery, sortBy]);

  const stats = useMemo(() => ({
    totalActive: activeCalls.length,
    avgDuration: activeCalls.reduce((sum, c) => sum + (c.duration || 0), 0) / (activeCalls.length || 1),
    twilioCount: activeCalls.filter(c => c.provider === 'twilio').length,
    vonageCount: activeCalls.filter(c => c.provider === 'vonage').length,
  }), [activeCalls]);

  const handleExportCSV = () => {
    const csv = [
      ['UUID', 'From', 'To', 'Status', 'Provider', 'Duration', 'Cost', 'Created At'],
      ...filteredCalls.map(call => [
        call.call_uuid || '',
        call.from_number,
        call.to_number,
        call.status,
        call.provider,
        call.duration?.toString() || '0',
        call.cost?.toString() || '0',
        call.created_at
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chamadas-ativas-${new Date().toISOString()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
          <div>
            <h1 className="text-3xl font-bold">Chamadas Ativas</h1>
            <p className="text-muted-foreground">
              Monitoramento em tempo real • {filteredCalls.length} chamadas
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={refetch} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" onClick={handleExportCSV} disabled={filteredCalls.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Ativas</p>
          <p className="text-3xl font-bold text-green-500">{stats.totalActive}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Duração Média</p>
          <p className="text-3xl font-bold">{Math.floor(stats.avgDuration)}s</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Twilio</p>
          <p className="text-3xl font-bold text-blue-500">{stats.twilioCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Vonage</p>
          <p className="text-3xl font-bold text-purple-500">{stats.vonageCount}</p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Select value={providerFilter} onValueChange={(v: any) => setProviderFilter(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Providers</SelectItem>
              <SelectItem value="twilio">Twilio</SelectItem>
              <SelectItem value="vonage">Vonage</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              <SelectItem value="initiated">Iniciando</SelectItem>
              <SelectItem value="ringing">Tocando</SelectItem>
              <SelectItem value="answered">Atendida</SelectItem>
              <SelectItem value="in-progress">Em Progresso</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="duration">Maior Duração</SelectItem>
              <SelectItem value="created_at">Mais Recente</SelectItem>
              <SelectItem value="cost">Maior Custo</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar número..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </Card>

      <ActiveCallsTable
        calls={filteredCalls}
        onViewDetails={(call) => setSelectedCall(call)}
      />

      {selectedCall && (
        <CallDetailsDialog
          call={selectedCall}
          open={!!selectedCall}
          onOpenChange={(open) => !open && setSelectedCall(null)}
        />
      )}
    </div>
  );
}
