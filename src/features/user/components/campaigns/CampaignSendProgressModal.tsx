import { useState, useEffect, useCallback, useRef } from "react";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2, 
  Download, 
  RefreshCcw,
  X,
  ChevronDown,
  ChevronUp,
  Send
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SendStatus {
  phone_number: string;
  contact_name?: string;
  status: 'pending' | 'sending' | 'success' | 'error';
  error_message?: string;
}

interface CampaignSendProgressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  runId: string;
  leadListId: string;
  messageTemplate: string;
  fromNumber: string;
  provider: string;
  credentialId: string;
  onComplete?: () => void;
}

export function CampaignSendProgressModal({
  open,
  onOpenChange,
  campaignId,
  runId,
  leadListId,
  messageTemplate,
  fromNumber,
  provider,
  credentialId,
  onComplete,
}: CampaignSendProgressModalProps) {
  const [statuses, setStatuses] = useState<SendStatus[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [showFailed, setShowFailed] = useState(false);
  const cancelledRef = useRef(false);

  const totalCount = statuses.length;
  const successCount = statuses.filter(s => s.status === 'success').length;
  const errorCount = statuses.filter(s => s.status === 'error').length;
  const pendingCount = statuses.filter(s => s.status === 'pending' || s.status === 'sending').length;
  const progress = totalCount > 0 ? (currentIndex / totalCount) * 100 : 0;

  const failedStatuses = statuses.filter(s => s.status === 'error');

  const sendSms = useCallback(async (contact: SendStatus, index: number) => {
    if (cancelledRef.current) return false;

    // Update status to sending
    setStatuses(prev => prev.map((s, i) => 
      i === index ? { ...s, status: 'sending' as const } : s
    ));

    try {
      const { data, error } = await supabase.functions.invoke("send-sms", {
        body: {
          to: contact.phone_number,
          from: fromNumber,
          message: messageTemplate,
          provider,
          credentialId,
          campaignName: `Campaign ${campaignId}`,
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Update status to success
      setStatuses(prev => prev.map((s, i) => 
        i === index ? { ...s, status: 'success' as const } : s
      ));

      // Update campaign_run_details
      await supabase.from("campaign_run_details").insert({
        run_id: runId,
        phone_number: contact.phone_number,
        contact_name: contact.contact_name,
        status: 'sent',
        provider,
        external_id: data?.messageId || data?.external_id,
        sent_at: new Date().toISOString(),
      });

      return true;
    } catch (err: any) {
      const errorMessage = err.message || 'Erro desconhecido';
      
      // Update status to error
      setStatuses(prev => prev.map((s, i) => 
        i === index ? { ...s, status: 'error' as const, error_message: errorMessage } : s
      ));

      // Update campaign_run_details
      await supabase.from("campaign_run_details").insert({
        run_id: runId,
        phone_number: contact.phone_number,
        contact_name: contact.contact_name,
        status: 'failed',
        provider,
        error_message: errorMessage,
      });

      return false;
    }
  }, [campaignId, runId, fromNumber, messageTemplate, provider, credentialId]);

  const startSending = useCallback(async () => {
    // Fetch contacts from lead list
    const { data: contacts, error } = await supabase
      .from("lead_list_contacts")
      .select("*")
      .eq("lead_list_id", leadListId);

    if (error || !contacts?.length) {
      toast.error("Erro ao buscar contatos", { description: error?.message || "Nenhum contato encontrado" });
      onOpenChange(false);
      return;
    }

    // Initialize statuses
    const initialStatuses: SendStatus[] = contacts.map(c => ({
      phone_number: c.phone_number,
      contact_name: c.name || undefined,
      status: 'pending' as const,
    }));

    setStatuses(initialStatuses);

    // Update campaign run to running
    await supabase
      .from("campaign_runs")
      .update({ 
        status: 'running', 
        started_at: new Date().toISOString() 
      })
      .eq("id", runId);

    // Send one by one
    let successfulSends = 0;
    let failedSends = 0;

    for (let i = 0; i < initialStatuses.length; i++) {
      if (cancelledRef.current) break;

      setCurrentIndex(i + 1);
      const success = await sendSms(initialStatuses[i], i);
      
      if (success) {
        successfulSends++;
      } else {
        failedSends++;
      }

      // Small delay between sends
      if (i < initialStatuses.length - 1 && !cancelledRef.current) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Mark as complete
    setIsComplete(true);

    // Update campaign run
    await supabase
      .from("campaign_runs")
      .update({
        status: cancelledRef.current ? 'cancelled' : 'completed',
        completed_at: new Date().toISOString(),
        successful_sends: successfulSends,
        failed_sends: failedSends,
        pending_sends: cancelledRef.current ? initialStatuses.length - successfulSends - failedSends : 0,
      })
      .eq("id", runId);

    if (!cancelledRef.current) {
      toast.success("Envio concluído!", {
        description: `${successfulSends} enviados, ${failedSends} falhas`
      });
    }

    onComplete?.();
  }, [leadListId, runId, sendSms, onComplete, onOpenChange]);

  useEffect(() => {
    if (open && statuses.length === 0 && !isComplete) {
      startSending();
    }
  }, [open, statuses.length, isComplete, startSending]);

  const handleCancel = async () => {
    cancelledRef.current = true;
    setIsCancelled(true);
    toast.info("Envio cancelado pelo usuário");
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state
    setStatuses([]);
    setCurrentIndex(0);
    setIsComplete(false);
    setIsCancelled(false);
    cancelledRef.current = false;
  };

  const exportFailedToCSV = () => {
    const headers = ['Telefone', 'Nome', 'Erro'];
    const rows = failedStatuses.map(s => [
      s.phone_number,
      s.contact_name || '',
      s.error_message || 'Erro desconhecido',
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `falhas_campanha_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

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

  return (
    <Dialog open={open} onOpenChange={(v) => !v && isComplete && handleClose()}>
      <DialogContent className="max-w-lg" onInteractOutside={(e) => !isComplete && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {!isComplete && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
            {isComplete && errorCount === 0 && <CheckCircle2 className="h-5 w-5 text-green-500" />}
            {isComplete && errorCount > 0 && <XCircle className="h-5 w-5 text-amber-500" />}
            {isCancelled ? "Envio Cancelado" : isComplete ? "Envio Concluído" : "Enviando Campanha"}
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
                <ScrollArea className="h-32 mt-2 rounded-lg border p-2">
                  <div className="space-y-2">
                    {failedStatuses.map((status, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-2 rounded bg-destructive/5">
                        <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <span className="font-mono text-sm">{status.phone_number}</span>
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

          {/* Live Feed */}
          {!isComplete && statuses.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Últimos envios:</p>
              <div className="space-y-1 max-h-24 overflow-hidden">
                {statuses.slice(Math.max(0, currentIndex - 5), currentIndex).reverse().map((status, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    {getStatusIcon(status.status)}
                    <span className="font-mono text-xs">{status.phone_number}</span>
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
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleCancel}
                disabled={isCancelled}
              >
                <X className="h-4 w-4 mr-2" />
                {isCancelled ? "Cancelando..." : "Cancelar Envio"}
              </Button>
            ) : (
              <>
                {errorCount > 0 && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={exportFailedToCSV}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exportar Falhas
                  </Button>
                )}
                <Button className="flex-1" onClick={handleClose}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Fechar
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}