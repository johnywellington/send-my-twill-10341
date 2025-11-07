import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useSIPEvents } from "@/hooks/use-sip-events";
import { Activity, User, Route, Server, Phone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function EventsContent() {
  const { data: events, isLoading } = useSIPEvents();

  const getEventIcon = (category: string) => {
    switch (category) {
      case 'domain': return <Server className="h-4 w-4" />;
      case 'user': return <User className="h-4 w-4" />;
      case 'route': return <Route className="h-4 w-4" />;
      case 'endpoint': return <Activity className="h-4 w-4" />;
      case 'call': return <Phone className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getEventBadge = (type: string) => {
    if (type.includes('created')) return <Badge variant="default">Criado</Badge>;
    if (type.includes('deleted')) return <Badge variant="destructive">Deletado</Badge>;
    if (type.includes('updated')) return <Badge variant="outline">Atualizado</Badge>;
    if (type.includes('registered')) return <Badge className="bg-green-500">Registrado</Badge>;
    if (type.includes('unregistered')) return <Badge variant="secondary">Desregistrado</Badge>;
    if (type.includes('completed')) return <Badge className="bg-blue-500">Completo</Badge>;
    if (type.includes('failed')) return <Badge variant="destructive">Falha</Badge>;
    return <Badge variant="outline">{type}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Log de Eventos SIP</h2>

      <Card>
        <CardHeader>
          <CardTitle>Eventos Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {events && events.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="text-sm">
                      {new Date(event.created_at).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getEventIcon(event.event_category)}
                        <span className="capitalize">{event.event_category}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getEventBadge(event.event_type)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {event.provider === 'twilio' ? '📞 Twilio' : '📱 Vonage'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                      {JSON.stringify(event.event_data)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhum evento registrado
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
