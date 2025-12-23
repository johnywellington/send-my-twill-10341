import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useValidationHistory } from "@/hooks/use-validation-history";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle, XCircle, AlertCircle, Clock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ValidationHistoryProps {
  provider?: 'twilio' | 'vonage';
  credentialId?: string;
  limit?: number;
}

export function ValidationHistory({ provider, credentialId, limit = 10 }: ValidationHistoryProps) {
  const { history, isLoading } = useValidationHistory(provider, credentialId, limit);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-warning" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      success: "default",
      error: "destructive",
      warning: "secondary",
    };

    return (
      <Badge variant={variants[status] || "outline"} className="text-xs">
        {status}
      </Badge>
    );
  };

  const getValidationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      credential_test: "Teste de Credenciais",
      account_check: "Verificação de Conta",
      sync: "Sincronização",
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Histórico de Validações</CardTitle>
        <CardDescription>
          Últimas {history.length} validações realizadas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          {history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma validação realizada ainda</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="mt-0.5">{getStatusIcon(log.status)}</div>
                  
                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">
                        {getValidationTypeLabel(log.validation_type)}
                      </span>
                      {getStatusBadge(log.status)}
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        {log.provider}
                      </Badge>
                      {log.account_type && (
                        <Badge variant="secondary" className="text-xs">
                          {log.account_type}
                        </Badge>
                      )}
                      {log.latency_ms && (
                        <span>{log.latency_ms}ms</span>
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(log.tested_at), {
                        addSuffix: true,
                        locale: ptBR
                      })}
                    </p>
                    
                    {log.error_message && (
                      <p className="text-xs text-destructive mt-1">
                        {log.error_message}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}