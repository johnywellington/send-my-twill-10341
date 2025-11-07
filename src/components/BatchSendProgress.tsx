import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  X, 
  Download 
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface PhoneStatus {
  number: string;
  status: 'pending' | 'sending' | 'success' | 'error';
  message?: string;
  timestamp?: Date;
}

interface BatchSendProgressProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phoneStatuses: PhoneStatus[];
  currentIndex: number;
  total: number;
  onCancel?: () => void;
  title?: string;
  showExport?: boolean;
}

export function BatchSendProgress({
  open,
  onOpenChange,
  phoneStatuses,
  currentIndex,
  total,
  onCancel,
  title = "Enviando em Lote",
  showExport = true,
}: BatchSendProgressProps) {
  const progress = total > 0 ? (currentIndex / total) * 100 : 0;
  const successCount = phoneStatuses.filter(p => p.status === 'success').length;
  const errorCount = phoneStatuses.filter(p => p.status === 'error').length;
  const isComplete = currentIndex >= total;

  const getStatusIcon = (status: PhoneStatus['status']) => {
    switch (status) {
      case 'sending':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusText = (phone: PhoneStatus) => {
    switch (phone.status) {
      case 'sending':
        return 'Enviando...';
      case 'success':
        return phone.message || 'Enviado com sucesso';
      case 'error':
        return phone.message || 'Erro ao enviar';
      default:
        return 'Aguardando...';
    }
  };

  const exportLog = () => {
    const log = phoneStatuses.map(p => ({
      numero: p.number,
      status: p.status === 'success' ? 'Sucesso' : p.status === 'error' ? 'Erro' : 'Pendente',
      mensagem: p.message || '',
      horario: p.timestamp?.toLocaleString() || '',
    }));

    const csv = [
      'Número,Status,Mensagem,Horário',
      ...log.map(l => `${l.numero},${l.status},"${l.mensagem}",${l.horario}`)
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `envio-lote-${new Date().getTime()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-8">
            <span>{title}</span>
            {!isComplete && onCancel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progresso Geral */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                Progresso: {currentIndex} de {total} ({Math.round(progress)}%)
              </span>
              <div className="flex gap-3 text-xs font-medium">
                <span className="text-green-600 dark:text-green-400">✅ {successCount}</span>
                <span className="text-destructive">❌ {errorCount}</span>
              </div>
            </div>
            <Progress value={progress} className="h-3" />
          </div>

          {/* Lista de Status Individual */}
          <ScrollArea className="h-[400px] rounded-lg border">
            <div className="p-4 space-y-2">
              {phoneStatuses.map((phone, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border transition-all",
                    phone.status === 'sending' && "bg-primary/5 border-primary/20",
                    phone.status === 'success' && "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800/30",
                    phone.status === 'error' && "bg-destructive/5 border-destructive/20",
                    phone.status === 'pending' && "bg-muted/30 border-muted"
                  )}
                >
                  <div className="mt-0.5 flex-shrink-0">{getStatusIcon(phone.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm font-medium break-all">
                      {phone.number}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {getStatusText(phone)}
                    </div>
                  </div>
                  {phone.timestamp && (
                    <div className="text-xs text-muted-foreground flex-shrink-0">
                      {phone.timestamp.toLocaleTimeString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Resumo Final (quando completo) */}
          {isComplete && (
            <div className="p-4 rounded-lg bg-muted/50 border space-y-3">
              <div className="font-semibold text-lg">📊 Resumo do Envio</div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Total</div>
                  <div className="text-2xl font-bold">{total}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Sucesso</div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{successCount}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Erros</div>
                  <div className="text-2xl font-bold text-destructive">{errorCount}</div>
                </div>
              </div>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex gap-2 justify-end">
            {showExport && phoneStatuses.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={exportLog}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar Relatório CSV
              </Button>
            )}
            {isComplete && (
              <Button onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
