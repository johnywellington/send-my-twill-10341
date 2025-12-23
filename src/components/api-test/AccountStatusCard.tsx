import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, XCircle, RefreshCw, ExternalLink } from "lucide-react";
import { useAccountStatus } from "@/hooks/use-account-status";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AccountStatusCardProps {
  provider: 'twilio' | 'vonage';
  credentialId?: string;
}

export function AccountStatusCard({ provider, credentialId }: AccountStatusCardProps) {
  const {
    accountType,
    status,
    balance,
    currency,
    friendlyName,
    accountId,
    limitations,
    recommendations,
    lastChecked,
    latency,
    isLoading,
    refresh
  } = useAccountStatus(provider, credentialId);

  const providerName = provider === 'twilio' ? 'Twilio' : 'Vonage';

  const getStatusIcon = () => {
    switch (accountType) {
      case 'trial':
        return <AlertCircle className="h-5 w-5 text-warning" />;
      case 'active':
        return <CheckCircle className="h-5 w-5 text-success" />;
      case 'suspended':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = () => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      trial: "secondary",
      active: "default",
      suspended: "destructive",
      unknown: "outline"
    };

    const labels = {
      trial: "Conta Trial",
      active: "Conta Ativa",
      suspended: "Suspensa",
      unknown: "Desconhecido"
    };

    return (
      <Badge variant={variants[accountType]}>
        {labels[accountType] || accountType}
      </Badge>
    );
  };

  const getUpgradeLink = () => {
    return provider === 'twilio' 
      ? 'https://www.twilio.com/console/billing'
      : 'https://dashboard.nexmo.com/billing-and-payments';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <CardTitle className="text-lg">Status da Conta {providerName}</CardTitle>
          </div>
          {getStatusBadge()}
        </div>
        <CardDescription>
          {friendlyName && <span className="font-medium">{friendlyName}</span>}
          {accountId && <span className="text-xs ml-2">({accountId})</span>}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Last Check Info */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Última verificação: {lastChecked ? formatDistanceToNow(new Date(lastChecked), { 
              addSuffix: true,
              locale: ptBR 
            }) : 'nunca'}
          </span>
          {latency && <span>{latency}ms</span>}
        </div>

        {/* Balance (for Vonage) */}
        {balance !== undefined && (
          <div className="flex items-center justify-between p-2 bg-muted rounded-md">
            <span className="text-sm font-medium">Saldo:</span>
            <span className="text-sm font-bold">
              {balance.toFixed(2)} {currency}
            </span>
          </div>
        )}

        {/* Limitations */}
        {limitations && limitations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Limitações:</h4>
            <ul className="space-y-1">
              {limitations.map((limitation, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-destructive mt-0.5">❌</span>
                  <span>{limitation}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {recommendations && recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Recomendações:</h4>
            <ul className="space-y-1">
              {recommendations.map((recommendation, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className={accountType === 'active' ? 'text-success' : 'text-warning'}>
                    {accountType === 'active' ? '✅' : '⚠️'}
                  </span>
                  <span>{recommendation}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refresh()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar Status
          </Button>
          
          {accountType === 'trial' && (
            <Button
              variant="default"
              size="sm"
              onClick={() => window.open(getUpgradeLink(), '_blank')}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Fazer Upgrade
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}