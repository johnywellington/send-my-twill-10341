import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Wifi, 
  Key, 
  Cloud, 
  CreditCard,
  Clock
} from "lucide-react";
import { useSIPConnectivityTest } from "@/hooks/use-sip-connectivity-test";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ConnectivityStatusProps {
  provider: 'twilio' | 'vonage';
  autoTest?: boolean;
}

export function ConnectivityStatus({ provider, autoTest = true }: ConnectivityStatusProps) {
  const { testConnectivity, isTesting, lastTest, canMakeCalls } = useSIPConnectivityTest();

  useEffect(() => {
    if (autoTest && !lastTest) {
      testConnectivity({ provider, test_type: 'full' });
    }
  }, [autoTest, provider]);

  const getStatusIcon = (passed: boolean | undefined) => {
    if (passed === undefined) return <Clock className="h-4 w-4 text-muted-foreground" />;
    return passed 
      ? <CheckCircle2 className="h-4 w-4 text-green-500" />
      : <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'passed': return 'Sistema Operacional';
      case 'warning': return 'Funcionando com Avisos';
      case 'failed': return 'Sistema Indisponível';
      default: return 'Aguardando Teste';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              Status de Conectividade
            </CardTitle>
            <CardDescription>
              Verificação automática do ramal SIP
            </CardDescription>
          </div>
          <Button
            onClick={() => testConnectivity({ provider, test_type: 'full' })}
            disabled={isTesting}
            size="sm"
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isTesting ? 'animate-spin' : ''}`} />
            Testar Agora
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Geral */}
        {lastTest && (
          <div className={`p-4 rounded-lg border-2 ${getStatusColor(lastTest.status)}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {lastTest.status === 'passed' && <CheckCircle2 className="h-5 w-5" />}
                {lastTest.status === 'warning' && <AlertTriangle className="h-5 w-5" />}
                {lastTest.status === 'failed' && <XCircle className="h-5 w-5" />}
                <span className="font-semibold">
                  {getStatusText(lastTest.status)}
                </span>
              </div>
              <Badge variant="outline" className="font-mono">
                {lastTest.latency_ms}ms
              </Badge>
            </div>
          </div>
        )}

        {/* Checklist de Testes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              {getStatusIcon(lastTest?.endpoint_registered)}
              <Wifi className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Endpoint Registrado</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              {getStatusIcon(lastTest?.credentials_valid)}
              <Key className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Credenciais Válidas</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              {getStatusIcon(lastTest?.api_reachable)}
              <Cloud className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">API Acessível</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              {getStatusIcon(lastTest?.account_status === 'active')}
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Conta Ativa</span>
            </div>
            {lastTest?.account_status && (
              <Badge variant="secondary" className="text-xs">
                {lastTest.account_status}
              </Badge>
            )}
          </div>
        </div>

        {/* Recomendações */}
        {lastTest?.recommendations && Array.isArray(lastTest.recommendations) && lastTest.recommendations.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {(lastTest.recommendations as string[]).map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Último Teste */}
        {lastTest && (
          <p className="text-xs text-muted-foreground text-center">
            Último teste: {formatDistanceToNow(new Date(lastTest.created_at), { 
              addSuffix: true, 
              locale: ptBR 
            })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
