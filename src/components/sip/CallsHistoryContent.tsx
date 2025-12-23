import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

export function CallsHistoryContent() {
  const { data: calls, isLoading } = useQuery({
    queryKey: ['sip-calls'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sip_call_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chamadas Recentes</CardTitle>
        <CardDescription>Últimas 50 chamadas realizadas</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>De</TableHead>
                <TableHead>Para</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Provider</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calls && calls.length > 0 ? (
                calls.map((call) => (
                  <TableRow key={call.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(call.created_at), 'dd/MM/yyyy HH:mm:ss')}
                    </TableCell>
                    <TableCell>{call.from_uri}</TableCell>
                    <TableCell>{call.to_uri}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{call.call_type}</Badge>
                    </TableCell>
                    <TableCell>{call.duration || '-'}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={call.status === 'completed' ? 'default' : call.status === 'failed' ? 'destructive' : 'secondary'}
                      >
                        {call.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{call.provider}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Nenhuma chamada encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
