import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { History, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export default function SIPCalls() {
  const { data: calls, isLoading } = useQuery({
    queryKey: ['sip-call-logs'],
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
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <History className="h-8 w-8" />
        <h1 className="text-3xl font-bold">Histórico de Chamadas SIP</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Chamadas Recentes</CardTitle>
          <CardDescription>Últimas 50 chamadas realizadas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Data/Hora</th>
                  <th className="text-left p-2">De</th>
                  <th className="text-left p-2">Para</th>
                  <th className="text-left p-2">Tipo</th>
                  <th className="text-left p-2">Duração</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Provider</th>
                </tr>
              </thead>
              <tbody>
                {calls && calls.length > 0 ? (
                  calls.map((call) => (
                    <tr key={call.id} className="border-b hover:bg-muted/50">
                      <td className="p-2 text-sm">
                        {new Date(call.created_at).toLocaleString('pt-BR')}
                      </td>
                      <td className="p-2 font-mono text-sm">{call.from_uri}</td>
                      <td className="p-2 font-mono text-sm">{call.to_uri}</td>
                      <td className="p-2">
                        <Badge variant="outline">{call.call_type}</Badge>
                      </td>
                      <td className="p-2">{call.duration ? `${call.duration}s` : '-'}</td>
                      <td className="p-2">
                        <Badge className={
                          call.status === 'completed' ? 'bg-green-500' : 
                          call.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                        }>
                          {call.status}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <Badge variant={call.provider === 'twilio' ? 'default' : 'secondary'}>
                          {call.provider}
                        </Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-muted-foreground">
                      Nenhuma chamada encontrada
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}