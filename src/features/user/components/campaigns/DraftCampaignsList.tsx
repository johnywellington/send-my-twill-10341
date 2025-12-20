import { useState } from "react";
import { 
  CalendarDays, 
  Loader2, 
  Trash2, 
  FileText,
  Play,
  Inbox
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCreateCampaignRun } from "@/shared/hooks/use-campaign-runs";
import { useDraftCampaigns, useDeleteCampaign, type Campaign } from "@/shared/hooks/use-campaigns";
import { useProviderCredentials } from "@/shared/hooks/use-provider-credentials";
import { usePhoneNumbers } from "@/shared/hooks/use-phone-numbers";
import { ScheduleDraftDialog } from "./ScheduleDraftDialog";
import { CampaignSendProgressModal } from "./CampaignSendProgressModal";
import { toast } from "sonner";

export function DraftCampaignsList() {
  const { data: drafts, isLoading, refetch } = useDraftCampaigns();
  const { data: credentials } = useProviderCredentials();
  const { data: phoneNumbers } = usePhoneNumbers();
  
  const deleteCampaign = useDeleteCampaign();
  const createRun = useCreateCampaignRun();

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
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasDrafts = drafts && drafts.length > 0;

  if (!hasDrafts) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground">
            Nenhum rascunho salvo
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Crie uma nova campanha e salve como rascunho
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalContacts = drafts.reduce((acc, d) => acc + (d.contact_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{drafts.length}</div>
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

      {/* Draft List */}
      <div className="space-y-3">
        {drafts.map((draft) => (
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
            refetch();
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
