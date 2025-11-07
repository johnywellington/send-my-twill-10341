import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Copy, Phone, Clock, DollarSign, MessageSquare, Mic } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CallDetailsDialogProps {
  call: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CallDetailsDialog = ({ call, open, onOpenChange }: CallDetailsDialogProps) => {
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado para a área de transferência`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'answered':
      case 'in-progress':
        return <Badge className="bg-green-500">Ativa</Badge>;
      case 'ringing':
        return <Badge className="bg-yellow-500">Tocando</Badge>;
      case 'initiated':
        return <Badge variant="secondary">Iniciando</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500">Completada</Badge>;
      case 'failed':
        return <Badge variant="destructive">Falhou</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "0s";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Detalhes da Chamada
          </DialogTitle>
          <DialogDescription>
            Informações completas sobre a chamada em andamento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status e Provider */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Status:</span>
              {getStatusBadge(call.status)}
            </div>
            <Badge variant={call.provider === 'twilio' ? 'default' : 'secondary'} className="text-lg px-4 py-1">
              {call.provider?.toUpperCase()}
            </Badge>
          </div>

          <Separator />

          {/* Informações Básicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Número de Origem
              </label>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-lg font-mono">{call.from_number}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleCopy(call.from_number, "Número de origem")}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Número de Destino
              </label>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-lg font-mono">{call.to_number}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleCopy(call.to_number, "Número de destino")}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Duração</p>
                <p className="text-xl font-bold">{formatDuration(call.duration)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <DollarSign className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Custo</p>
                <p className="text-xl font-bold">
                  {call.cost ? `$${Number(call.cost).toFixed(4)}` : '$0.00'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Clock className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">Iniciada</p>
                <p className="text-sm font-medium">
                  {format(new Date(call.created_at), "HH:mm:ss", { locale: ptBR })}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* UUID */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">Call UUID</label>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 text-sm font-mono bg-muted p-2 rounded">
                {call.call_uuid || 'N/A'}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(call.call_uuid || '', "UUID")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Mensagem/Conteúdo (se for voice_logs) */}
          {call.message && (
            <>
              <Separator />
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Mensagem Enviada
                </label>
                <div className="mt-2 p-3 bg-muted rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{call.message}</p>
                </div>
              </div>
            </>
          )}

          {/* Configurações de Voz */}
          {(call.language || call.voice_name) && (
            <>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {call.language && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Mic className="h-4 w-4" />
                      Idioma
                    </label>
                    <p className="text-sm mt-1">{call.language}</p>
                  </div>
                )}
                {call.voice_name && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Mic className="h-4 w-4" />
                      Voz
                    </label>
                    <p className="text-sm mt-1">{call.voice_name}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Erro (se houver) */}
          {call.error_message && (
            <>
              <Separator />
              <div>
                <label className="text-sm font-medium text-destructive">Mensagem de Erro</label>
                <div className="mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">{call.error_message}</p>
                </div>
              </div>
            </>
          )}

          {/* Timestamps */}
          <Separator />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground">
            <div>
              <span className="font-medium">Criada em:</span>{" "}
              {format(new Date(call.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
            </div>
            {call.updated_at && (
              <div>
                <span className="font-medium">Atualizada em:</span>{" "}
                {format(new Date(call.updated_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
