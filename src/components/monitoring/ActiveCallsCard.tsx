import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Phone } from "lucide-react";
import { useEffect, useState } from "react";

interface ActiveCall {
  id: string;
  call_uuid: string;
  from_number: string;
  to_number: string;
  status: 'initiated' | 'ringing' | 'answered' | 'in-progress' | 'completed' | 'failed';
  provider: 'twilio' | 'vonage';
  created_at: string;
  duration: number | null;
  cost: number | null;
}

interface Props {
  calls: ActiveCall[];
}

export const ActiveCallsCard = ({ calls }: Props) => {
  const [durations, setDurations] = useState<Record<string, number>>({});

  useEffect(() => {
    const timer = setInterval(() => {
      const newDurations: Record<string, number> = {};
      calls.forEach(call => {
        if (call.status === 'answered' || call.status === 'ringing' || call.status === 'in-progress') {
          const elapsed = Math.floor((Date.now() - new Date(call.created_at).getTime()) / 1000);
          newDurations[call.id] = elapsed;
        }
      });
      setDurations(newDurations);
    }, 1000);

    return () => clearInterval(timer);
  }, [calls]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'answered':
      case 'in-progress':
        return <Badge className="bg-green-500 hover:bg-green-600">🟢 Ativa</Badge>;
      case 'ringing':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">🟡 Tocando</Badge>;
      case 'initiated':
        return <Badge variant="secondary">⚪ Iniciando</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
          Chamadas Ativas
          <Badge variant="secondary" className="ml-auto">{calls.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {calls.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Phone className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="font-medium">Nenhuma chamada ativa no momento</p>
            <p className="text-sm">As chamadas em andamento aparecerão aqui automaticamente</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>De</TableHead>
                  <TableHead>Para</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>UUID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calls.map(call => (
                  <TableRow key={call.id}>
                    <TableCell>
                      {getStatusBadge(call.status)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{call.from_number}</TableCell>
                    <TableCell className="font-mono text-sm">{call.to_number}</TableCell>
                    <TableCell className="font-mono text-lg font-bold tabular-nums">
                      {formatDuration(durations[call.id] || 0)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={call.provider === 'twilio' ? 'default' : 'secondary'}>
                        {call.provider.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {call.call_uuid?.substring(0, 8)}...
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
