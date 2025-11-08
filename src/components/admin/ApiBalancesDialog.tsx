import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiBalances } from "@/hooks/use-api-balances";
import { BalanceCard } from "./BalanceCard";
import { formatCurrency } from "@/lib/currency-converter";
import { RefreshCw, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface ApiBalancesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApiBalancesDialog({ open, onOpenChange }: ApiBalancesDialogProps) {
  const { balances, totalByProvider, grandTotal, isLoading, refresh, lastUpdated } = useApiBalances();

  const handleRefresh = async () => {
    toast.info("Atualizando saldos...");
    await refresh();
    toast.success("Saldos atualizados!");
  };

  const twilioBalances = balances.filter(b => b.provider === 'twilio');
  const vonageBalances = balances.filter(b => b.provider === 'vonage');

  const formatTimeSince = (date: Date | null) => {
    if (!date) return 'nunca';
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'agora mesmo';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `há ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    const hours = Math.floor(minutes / 60);
    return `há ${hours} hora${hours > 1 ? 's' : ''}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <DollarSign className="h-6 w-6" />
                Saldo das APIs
              </DialogTitle>
              <DialogDescription>
                Visualize os saldos de todas as suas contas configuradas em múltiplas moedas
              </DialogDescription>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={isLoading}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {isLoading ? (
            <div className="space-y-6">
              <div className="space-y-3">
                <Skeleton className="h-6 w-32" />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Skeleton className="h-64" />
                  <Skeleton className="h-64" />
                </div>
              </div>
            </div>
          ) : balances.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Nenhuma credencial ativa encontrada</p>
            </div>
          ) : (
            <>
              {/* Twilio Section */}
              {twilioBalances.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <h3 className="text-lg font-semibold">
                      Twilio {twilioBalances.length > 1 && `(${twilioBalances.length} contas)`}
                    </h3>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {twilioBalances.map((balance) => (
                      <BalanceCard
                        key={balance.credentialId}
                        credentialName={balance.credentialName}
                        provider={balance.provider}
                        accountType={balance.accountType}
                        balance={balance.balance}
                        originalCurrency={balance.originalCurrency}
                        conversions={balance.conversions}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Vonage Section */}
              {vonageBalances.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <h3 className="text-lg font-semibold">
                      Vonage {vonageBalances.length > 1 && `(${vonageBalances.length} contas)`}
                    </h3>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {vonageBalances.map((balance) => (
                      <BalanceCard
                        key={balance.credentialId}
                        credentialName={balance.credentialName}
                        provider={balance.provider}
                        accountType={balance.accountType}
                        balance={balance.balance}
                        originalCurrency={balance.originalCurrency}
                        conversions={balance.conversions}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Consolidated Total */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">📊 Total Consolidado</h3>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                    <p className="text-sm text-muted-foreground mb-1">USD</p>
                    <p className="text-2xl font-bold">{formatCurrency(grandTotal.USD, 'USD')}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                    <p className="text-sm text-muted-foreground mb-1">EUR</p>
                    <p className="text-2xl font-bold">{formatCurrency(grandTotal.EUR, 'EUR')}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                    <p className="text-sm text-muted-foreground mb-1">BRL</p>
                    <p className="text-2xl font-bold">{formatCurrency(grandTotal.BRL, 'BRL')}</p>
                  </div>
                  {grandTotal.BTC > 0 && (
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                      <p className="text-sm text-muted-foreground mb-1">BTC</p>
                      <p className="text-2xl font-bold">{formatCurrency(grandTotal.BTC, 'BTC')}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Last Updated */}
              <div className="text-center pt-2">
                <p className="text-xs text-muted-foreground">
                  ⏱️ Última atualização: {formatTimeSince(lastUpdated)}
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
