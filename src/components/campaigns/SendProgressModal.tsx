import { useState, useEffect, useMemo } from "react";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2, 
  Download, 
  RefreshCcw,
  X,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export interface SendStatus {
  phone_number: string;
  contact_name?: string;
  status: 'pending' | 'sending' | 'success' | 'error';
  error_message?: string;
  message?: string; // alias for error_message for compatibility
  provider?: string;
  sent_at?: string;
  timestamp?: Date;
}

interface SendProgressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  statuses: SendStatus[];
  currentIndex: number;
  totalCount: number;
  isComplete: boolean;
  onCancel?: () => void;
  onRetryFailed?: (failedNumbers: SendStatus[]) => void;
  onExportFailed?: () => void;
  onClose?: () => void;
}

export function SendProgressModal({
  open,
  onOpenChange,
  title = "Enviando Mensagens",
  statuses,
  currentIndex,
  totalCount,
  isComplete,
  onCancel,
  onRetryFailed,
  onExportFailed,
  onClose,
}: SendProgressModalProps) {
  const [showFailed, setShowFailed] = useState(false);

  const { successCount, errorCount, pendingCount, progress } = useMemo(() => {
    const success = statuses.filter(s => s.status === 'success').length;
    const error = statuses.filter(s => s.status === 'error').length;
    const pending = statuses.filter(s => s.status === 'pending' || s.status === 'sending').length;
    const prog = totalCount > 0 ? (currentIndex / totalCount) * 100 : 0;
    return { successCount: success, errorCount: error, pendingCount: pending, progress: prog };
  }, [statuses, currentIndex, totalCount]);

  const failedStatuses = useMemo(() => 
    statuses.filter(s => s.status === 'error'),
    [statuses]
  );

  const getStatusIcon = (status: SendStatus['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'sending':
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const exportFailedToCSV = () => {
    const headers = ['Telefone', 'Nome', 'Erro', 'Provider'];
    const rows = failedStatuses.map(s => [
      s.phone_number,
      s.contact_name || '',
      s.error_message || 'Erro desconhecido',
      s.provider || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `falhas_envio_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    onExportFailed?.();
  };

  const handleClose = () => {
    onClose?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && isComplete && handleClose()}>
      <DialogContent className="max-w-lg" onInteractOutside={(e) => !isComplete && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {!isComplete && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
            {isComplete && errorCount === 0 && <CheckCircle2 className="h-5 w-5 text-green-500" />}
            {isComplete && errorCount > 0 && <XCircle className="h-5 w-5 text-amber-500" />}
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {isComplete ? 'Concluído' : `Enviando ${currentIndex} de ${totalCount}`}
              </span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="text-2xl font-bold text-green-600">{successCount}</div>
              <div className="text-xs text-muted-foreground">Enviados</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <div className="text-2xl font-bold text-destructive">{errorCount}</div>
              <div className="text-xs text-muted-foreground">Falhas</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50 border border-border">
              <div className="text-2xl font-bold text-muted-foreground">{pendingCount}</div>
              <div className="text-xs text-muted-foreground">Pendentes</div>
            </div>
          </div>

          {/* Failed Numbers List */}
          {failedStatuses.length > 0 && (
            <Collapsible open={showFailed} onOpenChange={setShowFailed}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive" />
                    {failedStatuses.length} número(s) com falha
                  </span>
                  {showFailed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ScrollArea className="h-48 mt-2 rounded-lg border p-2">
                  <div className="space-y-2">
                    {failedStatuses.map((status, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-2 rounded bg-destructive/5">
                        <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">{status.phone_number}</span>
                            {status.contact_name && (
                              <span className="text-muted-foreground text-sm truncate">
                                ({status.contact_name})
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-destructive truncate">
                            {status.error_message || 'Erro desconhecido'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Live Feed (Recent 5) */}
          {!isComplete && statuses.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Últimos envios:</p>
              <div className="space-y-1 max-h-32 overflow-hidden">
                {statuses.slice(-5).reverse().map((status, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    {getStatusIcon(status.status)}
                    <span className="font-mono">{status.phone_number}</span>
                    {status.status === 'error' && (
                      <span className="text-xs text-destructive truncate">
                        - {status.error_message}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            {!isComplete ? (
              <Button variant="outline" className="w-full" onClick={onCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancelar Envio
              </Button>
            ) : (
              <>
                {errorCount > 0 && (
                  <>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={exportFailedToCSV}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Exportar Falhas
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => onRetryFailed?.(failedStatuses)}
                    >
                      <RefreshCcw className="h-4 w-4 mr-2" />
                      Reenviar Falhas
                    </Button>
                  </>
                )}
                {errorCount === 0 && (
                  <Button className="w-full" onClick={handleClose}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Concluído
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
