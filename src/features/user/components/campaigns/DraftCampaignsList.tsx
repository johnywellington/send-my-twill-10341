import { useState, useMemo } from "react";
import { 
  CalendarDays, 
  Loader2, 
  Trash2, 
  FileText,
  Play,
  Inbox,
  Settings,
  MessageSquare,
  Eye
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateCampaignRun } from "@/shared/hooks/use-campaign-runs";
import { useDraftCampaigns, useDeleteCampaign, useUpdateCampaign, type Campaign } from "@/shared/hooks/use-campaigns";
import { useProviderCredentials } from "@/shared/hooks/use-provider-credentials";
import { usePhoneNumbers } from "@/shared/hooks/use-phone-numbers";
import { ScheduleDraftDialog } from "./ScheduleDraftDialog";
import { CampaignSendProgressModal } from "./CampaignSendProgressModal";
import { MessageEditorWithPreview } from "./MessageEditorWithPreview";
import { toast } from "sonner";

export function DraftCampaignsList() {
  const { data: drafts, isLoading, refetch } = useDraftCampaigns();
  const { data: credentials } = useProviderCredentials();
  const { data: phoneNumbers } = usePhoneNumbers();
  
  const deleteCampaign = useDeleteCampaign();
  const updateCampaign = useUpdateCampaign();
  const createRun = useCreateCampaignRun();

  // Dialog states
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<Campaign | null>(null);
  const [sendProgressOpen, setSendProgressOpen] = useState(false);
  const [sendingCampaign, setSendingCampaign] = useState<{
    campaignId: string;
    runId: string;
    leadListId: string;
    messageTemplate: string;
  } | null>(null);

  // Send config dialog state
  const [sendConfigOpen, setSendConfigOpen] = useState(false);
  const [configDraft, setConfigDraft] = useState<Campaign | null>(null);
  const [selectedCredentialId, setSelectedCredentialId] = useState<string>("");
  const [selectedFromNumber, setSelectedFromNumber] = useState<string>("");
  const [editedMessage, setEditedMessage] = useState<string>("");

  const defaultCredential = credentials?.find(c => c.is_default) || credentials?.[0];
  const defaultPhoneNumber = phoneNumbers?.find(p => p.is_active);

  // Get active credential based on selection
  const activeCredential = useMemo(() => {
    if (selectedCredentialId && credentials) {
      return credentials.find(c => c.id === selectedCredentialId);
    }
    return defaultCredential;
  }, [selectedCredentialId, credentials, defaultCredential]);

  // Filter phone numbers by selected provider
  const availablePhoneNumbers = useMemo(() => {
    if (!phoneNumbers || !activeCredential) return [];
    return phoneNumbers.filter(p => 
      p.provider === activeCredential.provider && p.is_active
    );
  }, [phoneNumbers, activeCredential]);

  // Get active phone number
  const activeFromNumber = useMemo(() => {
    if (selectedFromNumber && availablePhoneNumbers.some(p => p.phone_number === selectedFromNumber)) {
      return selectedFromNumber;
    }
    return availablePhoneNumbers[0]?.phone_number || "";
  }, [selectedFromNumber, availablePhoneNumbers]);

  const handleCredentialChange = (credentialId: string) => {
    setSelectedCredentialId(credentialId);
    setSelectedFromNumber(""); // Reset phone number when changing provider
  };

  const handleDeleteDraft = (campaignId: string) => {
    deleteCampaign.mutate(campaignId);
  };

  const handleScheduleDraft = (draft: Campaign) => {
    // Open config dialog first, then schedule dialog
    setConfigDraft(draft);
    setSelectedCredentialId(defaultCredential?.id || "");
    setSelectedFromNumber(defaultPhoneNumber?.phone_number || "");
    setSelectedDraft(draft);
    setScheduleDialogOpen(true);
  };

  const openSendConfigDialog = (draft: Campaign) => {
    setConfigDraft(draft);
    setSelectedCredentialId(defaultCredential?.id || "");
    setSelectedFromNumber(defaultPhoneNumber?.phone_number || "");
    setEditedMessage(draft.message_template);
    setSendConfigOpen(true);
  };

  const handleConfirmSendNow = async () => {
    if (!configDraft || !activeCredential || !activeFromNumber) {
      toast.error("Configure uma credencial e número de telefone");
      return;
    }

    if (!configDraft.lead_list_id) {
      toast.error("Esta campanha não possui uma lista de leads associada");
      return;
    }

    const messageToSend = editedMessage.trim() || configDraft.message_template;

    try {
      // Update campaign message if it was edited
      if (editedMessage.trim() && editedMessage !== configDraft.message_template) {
        await updateCampaign.mutateAsync({
          id: configDraft.id,
          message_template: editedMessage.trim(),
        });
      }

      const run = await createRun.mutateAsync({
        campaign_id: configDraft.id,
        status: "pending",
        scheduled_at: new Date().toISOString(),
        total_contacts: configDraft.contact_count || 0,
        provider: activeCredential.provider,
        from_number: activeFromNumber,
        metadata: {
          campaign_name: configDraft.name,
          message_template: messageToSend,
          lead_list_id: configDraft.lead_list_id,
          credential_id: activeCredential.id,
        }
      });

      setSendConfigOpen(false);
      setSendingCampaign({
        campaignId: configDraft.id,
        runId: run.id,
        leadListId: configDraft.lead_list_id,
        messageTemplate: messageToSend,
      });
      setSendProgressOpen(true);
    } catch (error) {
      console.error("Erro ao iniciar envio:", error);
    }
  };

  const handleSendComplete = () => {
    refetch();
    setConfigDraft(null);
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
                    onClick={() => openSendConfigDialog(draft)}
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

      {/* Send Config Dialog */}
      <Dialog open={sendConfigOpen} onOpenChange={setSendConfigOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurar Envio
            </DialogTitle>
            <DialogDescription>
              Selecione a API e o número de origem para enviar a campanha.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {configDraft && (
              <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="font-medium text-sm">{configDraft.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {configDraft.contact_count || 0} contatos
                </p>
              </div>
            )}

            {/* Editable Message */}
            <MessageEditorWithPreview
              value={editedMessage}
              onChange={setEditedMessage}
            />

            <div className="space-y-4 border-t pt-4">
              {/* Credential/API Selector */}
              <div className="space-y-2">
                <Label>Provedor / API</Label>
                <Select
                  value={selectedCredentialId}
                  onValueChange={handleCredentialChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma API" />
                  </SelectTrigger>
                  <SelectContent>
                    {credentials?.map((cred) => (
                      <SelectItem key={cred.id} value={cred.id}>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {cred.provider}
                          </Badge>
                          {cred.credential_name}
                          {cred.is_default && (
                            <Badge variant="secondary" className="text-xs ml-1">
                              Padrão
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Phone Number Selector */}
              <div className="space-y-2">
                <Label>Número de Origem / Sender ID</Label>
                <Select
                  value={activeFromNumber}
                  onValueChange={setSelectedFromNumber}
                  disabled={availablePhoneNumbers.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      availablePhoneNumbers.length === 0 
                        ? "Nenhum número disponível" 
                        : "Selecione um número"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePhoneNumbers.map((phone) => (
                      <SelectItem key={phone.id} value={phone.phone_number}>
                        {phone.phone_number}
                        {phone.friendly_name && (
                          <span className="text-muted-foreground ml-2">
                            ({phone.friendly_name})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {availablePhoneNumbers.length === 0 && activeCredential && (
                  <p className="text-xs text-muted-foreground">
                    Nenhum número encontrado para {activeCredential.provider}
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSendConfigOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmSendNow}
              disabled={!activeCredential || !activeFromNumber || createRun.isPending}
            >
              {createRun.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Enviar Agora
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Dialog */}
      {selectedDraft && (
        <ScheduleDraftDialog
          open={scheduleDialogOpen}
          onOpenChange={setScheduleDialogOpen}
          campaign={selectedDraft}
          onScheduled={() => {
            setScheduleDialogOpen(false);
            setSelectedDraft(null);
            refetch();
          }}
        />
      )}

      {/* Send Progress Modal */}
      {sendingCampaign && activeCredential && activeFromNumber && (
        <CampaignSendProgressModal
          open={sendProgressOpen}
          onOpenChange={setSendProgressOpen}
          campaignId={sendingCampaign.campaignId}
          runId={sendingCampaign.runId}
          leadListId={sendingCampaign.leadListId}
          messageTemplate={sendingCampaign.messageTemplate}
          fromNumber={activeFromNumber}
          provider={activeCredential.provider}
          credentialId={activeCredential.id}
          onComplete={handleSendComplete}
        />
      )}
    </div>
  );
}