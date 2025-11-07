import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";

interface AlertItem {
  level: 'critical' | 'warning' | 'info';
  message: string;
  details: string;
  timestamp: Date;
}

interface Props {
  alerts: AlertItem[];
}

export const RealtimeAlertsCard = ({ alerts }: Props) => {
  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'critical':
        return <AlertCircle className="h-5 w-5" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      case 'info':
        return <Info className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getAlertVariant = (level: string): "default" | "destructive" => {
    switch (level) {
      case 'critical':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'text-destructive';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-500';
      case 'info':
        return 'text-blue-600 dark:text-blue-500';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Alertas e Problemas
          {alerts.length > 0 && (
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              {alerts.length} {alerts.length === 1 ? 'alerta ativo' : 'alertas ativos'}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Info className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="font-medium">Tudo funcionando normalmente</p>
            <p className="text-sm">Nenhum alerta detectado no momento</p>
          </div>
        ) : (
          alerts.map((alert, index) => (
            <Alert key={index} variant={getAlertVariant(alert.level)}>
              <div className={getAlertColor(alert.level)}>
                {getAlertIcon(alert.level)}
              </div>
              <AlertTitle className="ml-2">
                {alert.level === 'critical' && '🔴 CRITICAL: '}
                {alert.level === 'warning' && '🟡 WARNING: '}
                {alert.level === 'info' && '🟢 INFO: '}
                {alert.message}
              </AlertTitle>
              <AlertDescription className="ml-2">
                {alert.details}
                <span className="block text-xs text-muted-foreground mt-1">
                  {alert.timestamp.toLocaleTimeString('pt-BR')}
                </span>
              </AlertDescription>
            </Alert>
          ))
        )}
      </CardContent>
    </Card>
  );
};
