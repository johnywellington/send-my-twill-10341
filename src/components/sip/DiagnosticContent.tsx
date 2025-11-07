import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ConnectivityStatus } from "./ConnectivityStatus";
import { useSIPConnectivityTest } from "@/hooks/use-sip-connectivity-test";
import { Activity, History, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function DiagnosticContent() {
  const { testHistory, loadingHistory } = useSIPConnectivityTest();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'passed':
        return <Badge className="bg-green-500">Passou</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500">Aviso</Badge>;
      case 'failed':
        return <Badge className="bg-red-500">Falhou</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Diagnóstico do Sistema SIP</h2>
        <p className="text-muted-foreground">
          Verificação completa da conectividade e status do seu ramal
        </p>
      </div>

      <Tabs defaultValue="twilio" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="twilio">
            <Activity className="h-4 w-4 mr-2" />
            Twilio
          </TabsTrigger>
          <TabsTrigger value="vonage">
            <Activity className="h-4 w-4 mr-2" />
            Vonage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="twilio" className="space-y-4">
          <ConnectivityStatus provider="twilio" autoTest={true} />
        </TabsContent>

        <TabsContent value="vonage" className="space-y-4">
          <ConnectivityStatus provider="vonage" autoTest={true} />
        </TabsContent>
      </Tabs>

      {/* Histórico de Testes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Testes
          </CardTitle>
          <CardDescription>
            Últimos 10 testes de conectividade realizados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <p className="text-sm text-muted-foreground">Carregando histórico...</p>
          ) : testHistory && testHistory.length > 0 ? (
            <div className="space-y-3">
              {testHistory.map((test) => (
                <div
                  key={test.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusBadge(test.status)}
                      <span className="font-medium capitalize">{test.provider}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {test.test_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Latência: {test.latency_ms}ms</span>
                      <span>Endpoint: {test.endpoint_registered ? '✓' : '✗'}</span>
                      <span>API: {test.api_reachable ? '✓' : '✗'}</span>
                    </div>
                    {test.error_message && (
                      <div className="flex items-start gap-2 mt-2 text-xs text-red-500">
                        <AlertCircle className="h-3 w-3 mt-0.5" />
                        <span>{test.error_message}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(test.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum teste realizado ainda</p>
          )}
        </CardContent>
      </Card>

      {/* Problemas Conhecidos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            ⚠️ Problemas Conhecidos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-4 rounded-lg border-2 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              API Temporariamente Indisponível
            </h4>
            <p className="text-sm text-muted-foreground">
              Se você vê "API não acessível" mas seu ramal está registrado,
              o sistema continuará funcionando normalmente. Este é um problema
              temporário de verificação e não afeta chamadas reais. O sistema
              automaticamente permite chamadas quando o endpoint está registrado,
              mesmo que a verificação da API falhe.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Guia de Solução de Problemas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Guia de Solução de Problemas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">❌ Endpoint não registrado</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Verifique se o softphone está instalado e configurado</li>
              <li>Use o QR Code para configuração automática</li>
              <li>Confirme que as credenciais estão corretas</li>
              <li>Verifique sua conexão com a internet</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">⚠️ Credenciais inválidas</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Reconfigure seu ramal na aba "Meu Ramal"</li>
              <li>Entre em contato com o administrador do sistema</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">☁️ API não acessível</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Verifique sua conexão com a internet</li>
              <li>O provedor pode estar com instabilidade</li>
              <li>Aguarde alguns minutos e teste novamente</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">💳 Problemas com conta</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Verifique se há saldo suficiente na conta</li>
              <li>Confirme que as chamadas de voz estão habilitadas</li>
              <li>Entre em contato com o suporte do provedor</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
