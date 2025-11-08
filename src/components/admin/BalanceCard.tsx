import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/currency-converter";
import { DollarSign } from "lucide-react";

interface BalanceCardProps {
  credentialName: string;
  provider: 'twilio' | 'vonage';
  accountType: 'trial' | 'active' | 'suspended' | 'unknown';
  balance: number;
  originalCurrency: string;
  conversions: {
    USD: number;
    EUR: number;
    BRL: number;
    BTC: number;
  };
}

const providerColors = {
  twilio: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600',
    border: 'border-blue-500/20',
  },
  vonage: {
    bg: 'bg-green-500/10',
    text: 'text-green-600',
    border: 'border-green-500/20',
  },
};

const accountTypeBadges = {
  trial: { variant: 'secondary' as const, label: '🟡 Trial', className: 'bg-yellow-500/10 text-yellow-600' },
  active: { variant: 'secondary' as const, label: '🟢 Ativa', className: 'bg-green-500/10 text-green-600' },
  suspended: { variant: 'secondary' as const, label: '🔴 Suspensa', className: 'bg-red-500/10 text-red-600' },
  unknown: { variant: 'secondary' as const, label: '⚪ Desconhecido', className: 'bg-muted text-muted-foreground' },
};

export function BalanceCard({
  credentialName,
  provider,
  accountType,
  balance,
  originalCurrency,
  conversions,
}: BalanceCardProps) {
  const colors = providerColors[provider];
  const badge = accountTypeBadges[accountType];

  return (
    <Card className={`${colors.border} border-2`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${colors.bg}`}>
              <DollarSign className={`h-4 w-4 ${colors.text}`} />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">{credentialName}</CardTitle>
              <p className={`text-xs ${colors.text} font-medium capitalize`}>{provider}</p>
            </div>
          </div>
          <Badge variant={badge.variant} className={badge.className}>
            {badge.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
            <span className="text-sm font-medium text-muted-foreground">USD:</span>
            <span className="text-sm font-bold">{formatCurrency(conversions.USD, 'USD')}</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
            <span className="text-sm font-medium text-muted-foreground">EUR:</span>
            <span className="text-sm font-bold">{formatCurrency(conversions.EUR, 'EUR')}</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
            <span className="text-sm font-medium text-muted-foreground">BRL:</span>
            <span className="text-sm font-bold">{formatCurrency(conversions.BRL, 'BRL')}</span>
          </div>
          {conversions.BTC > 0 && (
            <div className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
              <span className="text-sm font-medium text-muted-foreground">BTC:</span>
              <span className="text-sm font-bold">{formatCurrency(conversions.BTC, 'BTC')}</span>
            </div>
          )}
        </div>
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Saldo original: {formatCurrency(balance, originalCurrency)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
