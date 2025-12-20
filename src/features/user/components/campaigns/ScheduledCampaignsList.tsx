import { useState } from "react";
import { 
  Clock, 
  CalendarDays, 
  X, 
  Loader2, 
  Calendar, 
  Send, 
  Trash2, 
  FileText,
  Play
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  useAllScheduledRuns, 
  useCancelScheduledRun, 
  useCreateCampaignRun,
  type CampaignRun 
} from "@/shared/hooks/use-campaign-runs";
import { useDraftCampaigns, useDeleteCampaign, type Campaign } from "@/shared/hooks/use-campaigns";
import { useProviderCredentials } from "@/shared/hooks/use-provider-credentials";
import { usePhoneNumbers } from "@/shared/hooks/use-phone-numbers";
import { ScheduleDraftDialog } from "./ScheduleDraftDialog";
import { CampaignSendProgressModal } from "./CampaignSendProgressModal";
import { toast } from "sonner";

export function ScheduledCampaignsList() {
  const { data: scheduledRuns, isLoading: loadingScheduled } = useAllScheduledRuns();
  const { data: drafts, isLoading: loadingDrafts, refetch: refetchDrafts } = useDraftCampaigns();
  const { data: credentials } = useProviderCredentials();
  const { data: phoneNumbers } = usePhoneNumbers();
  
  const cancelRun = useCancelScheduledRun();
  const deleteCampaign = useDeleteCampaign();
  const createRun = useCreateCampaignRun();

  // Dialogs state
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<Campaign | null>(null);
  const [sendProgressOpen, setSendProgressOpen] = useState(false);
  const [sendingCampaign, setSendingCampaign] = useState<{
    campaignId: string;
    runId: string;
    leadListId: string;
    messageTemplate: string;
  } | null>(null);

  const defaultCredential = credentials?.find(c => c.is_default) || credentials?.[0];
  const defaultPhoneNumber = phoneNumbers?.find(p => p.is_active);

  const handleCancel = (runId: string) => {
    cancelRun.mutate(runId);
  };

  const handleDeleteDraft = (campaignId: string) => {
    deleteCampaign.mutate(campaignId);
  };

  const handleScheduleDraft = (draft: Campaign) => {
    setSelectedDraft(draft);
    setScheduleDialogOpen(true);
  };

  const handleSendNowDraft = async (draft: Campaign) => {
    if (!defaultCredential || !defaultPhoneNumber) {
      toast.error("Configure uma credencial e número de telefone padrão");
      return;
    }

    if (!draft.lead_list_id) {
      toast.error("Esta campanha não possui uma lista de leads associada");
      return;
    }

    try {
      // Create campaign run
      const run = await createRun.mutateAsync({
        campaign_id: draft.id,
        status: "pending",
        scheduled_at: new Date().toISOString(),
        total_contacts: draft.contact_count || 0,
        provider: defaultCredential.provider,
        from_number: defaultPhoneNumber.phone_number,
        metadata: {
          campaign_name: draft.name,
          message_template: draft.message_template,
          lead_list_id: draft.lead_list_id,
          credential_id: defaultCredential.id,
        }
      });

      // Open progress modal
      setSendingCampaign({
        campaignId: draft.id,
        runId: run.id,
        leadListId: draft.lead_list_id,
        messageTemplate: draft.message_template,
      });
      setSendProgressOpen(true);
    } catch (error) {
      console.error("Erro ao iniciar envio:", error);
    }
  };

  const handleSendComplete = () => {
    refetchDrafts();
  };

  const isLoading = loadingScheduled || loadingDrafts;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasScheduled = scheduledRuns && scheduledRuns.length > 0;
  const hasDrafts = drafts && drafts.length > 0;
  const isEmpty = !hasScheduled && !hasDrafts;

  if (isEmpty) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground">
            Nenhum envio agendado ou rascunho
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Crie uma nova campanha na aba "Nova Campanha"
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalScheduled = scheduledRuns?.length || 0;
  const totalDrafts = drafts?.length || 0;
  const totalContacts = (scheduledRuns?.reduce((acc, run) => acc + run.total_contacts, 0) || 0) +
    (drafts?.reduce((acc, d) => acc + (d.contact_count || 0), 0) || 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{totalScheduled}</div>
            <div className="text-sm text-muted-foreground">Agendados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{totalDrafts}</div>
            <div className="text-sm text-muted-foreground">Rascunhos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{totalContacts}</div>
            <div className="text-sm text-muted-foreground">Total Contatos</div>
          </CardContent>
        </Card>
      </div>

      {/* Scheduled Runs */}
      {hasScheduled && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Calendar className="h-4 w-4" />
            AGENDADOS ({totalScheduled})
          </div>
          {scheduledRuns!.map((run) => (
            <Card key={run.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">
                        {run.campaign?.name || "Campanha sem nome"}
                      </h3>
                      <Badge className="shrink-0 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20">
                        <Clock className="h-3 w-3 mr-1" />
                        Agendado
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                      {run.campaign?.message_template || run.metadata?.message_template || ""}
                    </p>

                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <div className="flex items-center gap-1.5 text-primary">
                        <Calendar className="h-4 w-4" />
                        <span className="font-medium">
                          {format(new Date(run.scheduled_at!), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        {formatDistanceToNow(new Date(run.scheduled_at!), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary">
                        {run.total_contacts} contatos
                      </Badge>
                      <Badge variant="outline">
                        {run.provider}
                      </Badge>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={() => handleCancel(run.id)}
                    disabled={cancelRun.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Drafts */}
      {hasDrafts && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <FileText className="h-4 w-4" />
            RASCUNHOS ({totalDrafts})
          </div>
          {drafts!.map((draft) => (
            <Card key={draft.id} className="hover:shadow-md transition-shadow border-dashed">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{draft.name}</h3>
                      <Badge variant="secondary" className="shrink-0">
                        <FileText className="h-3 w-3 mr-1" />
                        Rascunho
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                      {draft.message_template}
                    </p>

                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant="outline">
                        {draft.contact_count || 0} contatos
                      </Badge>
                      {draft.lead_list_name && (
                        <span className="text-xs text-muted-foreground">
                          Lista: {draft.lead_list_name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleSendNowDraft(draft)}
                      disabled={createRun.isPending || !draft.lead_list_id}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Enviar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleScheduleDraft(draft)}
                      disabled={!draft.lead_list_id}
                    >
                      <CalendarDays className="h-4 w-4 mr-1" />
                      Agendar
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteDraft(draft.id)}
                      disabled={deleteCampaign.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Schedule Dialog */}
      {selectedDraft && defaultCredential && defaultPhoneNumber && (
        <ScheduleDraftDialog
          open={scheduleDialogOpen}
          onOpenChange={setScheduleDialogOpen}
          campaign={selectedDraft}
          provider={defaultCredential.provider}
          fromNumber={defaultPhoneNumber.phone_number}
          credentialId={defaultCredential.id}
          onScheduled={() => {
            setScheduleDialogOpen(false);
            setSelectedDraft(null);
            refetchDrafts();
          }}
        />
      )}

      {/* Send Progress Modal */}
      {sendingCampaign && defaultCredential && defaultPhoneNumber && (
        <CampaignSendProgressModal
          open={sendProgressOpen}
          onOpenChange={setSendProgressOpen}
          campaignId={sendingCampaign.campaignId}
          runId={sendingCampaign.runId}
          leadListId={sendingCampaign.leadListId}
          messageTemplate={sendingCampaign.messageTemplate}
          fromNumber={defaultPhoneNumber.phone_number}
          provider={defaultCredential.provider}
          credentialId={defaultCredential.id}
          onComplete={handleSendComplete}
        />
      )}
    </div>
  );
}