import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  PlayCircle, 
  CalendarDays,
  Ban,
  ChevronDown,
  ChevronUp,
  RefreshCcw,
  Download,
  Eye,
  PauseCircle,
  Play
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";

import type { CampaignRun, FailedNumber } from "@/shared/hooks/use-campaign-runs";

interface CampaignRunCardProps {
  run: CampaignRun;
  onCancel?: (runId: string) => void;
  onRetryFailed?: (run: CampaignRun) => void;
  onViewDetails?: (run: CampaignRun) => void;
  onPause?: (runId: string) => void;
  onResume?: (runId: string) => void;
}

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: 'Pendente', icon: Clock, color: 'bg-muted text-muted-foreground' },
  scheduled: { label: 'Agendado', icon: CalendarDays, color: 'bg-blue-500/10 text-blue-600' },
  running: { label: 'Em andamento', icon: PlayCircle, color: 'bg-amber-500/10 text-amber-600' },
  completed: { label: 'Concluído', icon: CheckCircle2, color: 'bg-green-500/10 text-green-600' },
  failed: { label: 'Falhou', icon: XCircle, color: 'bg-destructive/10 text-destructive' },
  cancelled: { label: 'Cancelado', icon: Ban, color: 'bg-muted text-muted-foreground' },
  paused: { label: 'Pausado', icon: PauseCircle, color: 'bg-yellow-500/10 text-yellow-600' },
};

export function CampaignRunCard({ run, onCancel, onRetryFailed, onViewDetails, onPause, onResume }: CampaignRunCardProps) {
  const [showFailed, setShowFailed] = useState(false);

  const status = statusConfig[run.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  const progress = run.total_contacts > 0 
    ? ((run.successful_sends + run.failed_sends) / run.total_contacts) * 100 
    : 0;

  const hasFailures = run.failed_sends > 0 || (run.failed_numbers && run.failed_numbers.length > 0);
  const failedNumbers = run.failed_numbers || [];

  const exportFailedToCSV = () => {
    const headers = ['Telefone', 'Nome', 'Erro'];
    const rows = failedNumbers.map((f: FailedNumber) => [
      f.phone_number,
      f.contact_name || '',
      f.error || 'Erro desconhecido'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const campaignName = run.campaign?.name || 'campanha';
    link.href = URL.createObjectURL(blob);
    link.download = `falhas_${campaignName}_${format(new Date(run.created_at), 'yyyy-MM-dd_HH-mm')}.csv`;
    link.click();
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              {run.campaign?.name || 'Envio Manual'}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              {run.scheduled_at ? (
                <>Agendado para {format(new Date(run.scheduled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</>
              ) : run.started_at ? (
                <>{formatDistanceToNow(new Date(run.started_at), { addSuffix: true, locale: ptBR })}</>
              ) : (
                <>{formatDistanceToNow(new Date(run.created_at), { addSuffix: true, locale: ptBR })}</>
              )}
            </div>
          </div>
          <Badge className={status.color}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {status.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        {(run.status === 'running' || run.status === 'completed' || run.status === 'failed' || run.status === 'paused') && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{run.successful_sends + run.failed_sends} de {run.total_contacts}</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="p-2 rounded bg-muted/50">
            <div className="font-semibold">{run.total_contacts}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="p-2 rounded bg-green-500/10">
            <div className="font-semibold text-green-600">{run.successful_sends}</div>
            <div className="text-xs text-muted-foreground">Enviados</div>
          </div>
          <div className="p-2 rounded bg-destructive/10">
            <div className="font-semibold text-destructive">{run.failed_sends}</div>
            <div className="text-xs text-muted-foreground">Falhas</div>
          </div>
        </div>

        {/* Provider & Number Info */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-xs">
            {run.provider.toUpperCase()}
          </Badge>
          <span>via {run.from_number}</span>
        </div>

        {/* Failed Numbers Expansion */}
        {hasFailures && failedNumbers.length > 0 && (
          <Collapsible open={showFailed} onOpenChange={setShowFailed}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between text-destructive">
                <span className="flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Ver {failedNumbers.length} falha(s)
                </span>
                {showFailed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ScrollArea className="h-32 rounded border p-2 mt-2">
                <div className="space-y-1">
                  {failedNumbers.map((failed: FailedNumber, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-1">
                      <span className="font-mono">{failed.phone_number}</span>
                      <span className="text-destructive truncate max-w-[150px]">
                        {failed.error || 'Erro'}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Pending indicator for paused campaigns */}
        {run.status === 'paused' && run.pending_sends > 0 && (
          <div className="flex items-center gap-2 text-xs text-yellow-600 bg-yellow-500/10 p-2 rounded">
            <PauseCircle className="h-4 w-4" />
            <span>{run.pending_sends} envios pendentes aguardando retomada</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          {/* Pause button - only for running campaigns */}
          {run.status === 'running' && onPause && (
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 text-yellow-600 border-yellow-300 hover:bg-yellow-50"
              onClick={() => onPause(run.id)}
            >
              <PauseCircle className="h-4 w-4 mr-1" />
              Pausar
            </Button>
          )}

          {/* Resume button - only for paused campaigns */}
          {run.status === 'paused' && onResume && (
            <Button 
              size="sm" 
              className="flex-1"
              onClick={() => onResume(run.id)}
            >
              <Play className="h-4 w-4 mr-1" />
              Retomar
            </Button>
          )}

          {/* Cancel button - for scheduled or paused campaigns */}
          {(run.status === 'scheduled' || run.status === 'paused') && onCancel && (
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 text-destructive"
              onClick={() => onCancel(run.id)}
            >
              <Ban className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
          )}
          
          {hasFailures && run.status !== 'running' && run.status !== 'paused' && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={exportFailedToCSV}
              >
                <Download className="h-4 w-4 mr-1" />
                Exportar
              </Button>
              {onRetryFailed && (
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => onRetryFailed(run)}
                >
                  <RefreshCcw className="h-4 w-4 mr-1" />
                  Reenviar
                </Button>
              )}
            </>
          )}

          {onViewDetails && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewDetails(run)}
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
