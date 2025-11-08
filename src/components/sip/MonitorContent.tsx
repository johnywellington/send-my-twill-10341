import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity } from "lucide-react";
import { formatSIPUri } from "@/lib/sip-utils";
import { SyncEndpointsButton } from "./SyncEndpointsButton";

export function MonitorContent() {
  // Buscar endpoints registrados com polling inteligente
  const { data: onlineEndpoints, isLoading: loadingEndpoints } = useQuery({
    queryKey: ['sip-endpoints-online'],
    queryFn: async () => {
      const { data } = await supabase
        .from('sip_endpoints')
        .select('*, sip_users(sip_username, extension, display_name, sip_domain)')
        .eq('status', 'registered')
        .order('last_seen', { ascending: false });

      return data || [];
    },
    // Polling inteligente: 10s se há endpoints online, 30s se não há
    refetchInterval: (query) => {
      const hasOnlineEndpoints = query.state.data && query.state.data.length > 0;
      return hasOnlineEndpoints ? 10000 : 30000;
    },
  });

  // Buscar chamadas ativas
  const { data: activeCalls, isLoading: loadingCalls } = useQuery({
    queryKey: ['sip-active-calls'],
    queryFn: async () => {
      const { data } = await supabase
        .from('sip_call_logs')
        .select('*')
        .in('status', ['initiated', 'ringing', 'in-progress'])
        .order('created_at', { ascending: false });

      return data || [];
    },
    refetchInterval: 5000, // Atualizar a cada 5 segundos
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Monitor SIP</h2>
        <SyncEndpointsButton />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Chamadas Ativas</CardTitle>
            <CardDescription>Em tempo real</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingCalls ? (
              <Skeleton className="h-12 w-24" />
            ) : (
              <>
                <p className="text-3xl font-bold">{activeCalls?.length || 0}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {activeCalls && activeCalls.length > 0 
                    ? `${activeCalls.length} chamada${activeCalls.length > 1 ? 's' : ''} em andamento`
                    : 'Nenhuma chamada ativa'}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Endpoints Online</CardTitle>
            <CardDescription>Usuários conectados</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingEndpoints ? (
              <Skeleton className="h-12 w-24" />
            ) : (
              <>
                <p className="text-3xl font-bold">{onlineEndpoints?.length || 0}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {onlineEndpoints && onlineEndpoints.length > 0
                    ? `${onlineEndpoints.length} endpoint${onlineEndpoints.length > 1 ? 's' : ''} conectado${onlineEndpoints.length > 1 ? 's' : ''}`
                    : 'Nenhum endpoint online'}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Endpoints Ativos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingEndpoints ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : onlineEndpoints && onlineEndpoints.length > 0 ? (
            <div className="space-y-2">
              {onlineEndpoints.map((endpoint: any) => (
                <div key={endpoint.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <div>
                      <p className="font-medium">
                        {endpoint.sip_users?.display_name || 'Usuário'}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {formatSIPUri(
                          endpoint.sip_users?.sip_username, 
                          endpoint.sip_users?.sip_domain
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        IP: {endpoint.ip_address || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      Ext {endpoint.sip_users?.extension}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {endpoint.provider === 'twilio' ? '📞 Twilio' : '📱 Vonage'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhum endpoint conectado no momento
            </p>
          )}
        </CardContent>
      </Card>

      {activeCalls && activeCalls.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Chamadas em Andamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeCalls.map((call: any) => (
                <div key={call.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div>
                    <p className="font-medium">{call.from_uri} → {call.to_uri}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(call.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <Badge variant="secondary">{call.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
