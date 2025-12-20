import { useState } from "react";
import { Megaphone, Plus, Send, Trash2, Loader2, FileText, History, CalendarDays, Clock, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

import { useLeadLists, useLeadListContacts } from "@/shared/hooks/use-lead-lists";
import { useCampaigns, useCreateCampaign, useDeleteCampaign } from "@/shared/hooks/use-campaigns";
import { useAllScheduledRuns, useCreateCampaignRun, useCancelScheduledRun } from "@/shared/hooks/use-campaign-runs";
import { useProviderCredentials } from "@/shared/hooks/use-provider-credentials";
import { usePhoneNumbers } from "@/shared/hooks/use-phone-numbers";
import { ScheduleCampaignDialog } from "@/components/campaigns/ScheduleCampaignDialog";

interface Campaign {
  id: string;
  name: string;
  message_template: string;
  lead_list_id: string | null;
  lead_list_name: string | null;
  contact_count: number;
  sends_count: number;
  created_at: string;
}

export default function Campanhas() {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [selectedLeadListId, setSelectedLeadListId] = useState<string>("");
  const [customMessage, setCustomMessage] = useState("");
  
  // Estado para agendamento
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedCampaignForSchedule, setSelectedCampaignForSchedule] = useState<Campaign | null>(null);

  const { data: campaigns, isLoading: loadingCampaigns } = useCampaigns();
  const { data: leadLists, isLoading: loadingLists } = useLeadLists();
  const { data: scheduledRuns } = useAllScheduledRuns();
  const { data: credentials } = useProviderCredentials();
  const { data: phoneNumbers } = usePhoneNumbers();
  
  const createCampaign = useCreateCampaign();
  const deleteCampaign = useDeleteCampaign();
  const createCampaignRun = useCreateCampaignRun();
  const cancelScheduledRun = useCancelScheduledRun();

  // Obter configuração padrão do usuário
  const defaultCredential = credentials?.find(c => c.is_default) || credentials?.[0];
  const defaultPhoneNumber = phoneNumbers?.find(p => p.is_active);

  // Função para obter agendamentos de uma campanha
  const getScheduledRunsForCampaign = (campaignId: string) => {
    return scheduledRuns?.filter(run => run.campaign_id === campaignId) || [];
  };

  const handleCreateCampaign = () => {
    if (!newCampaignName.trim()) {
      toast.error("Digite um nome para a campanha");
      return;
    }

    if (!customMessage.trim()) {
      toast.error("Digite uma mensagem para a campanha");
      return;
    }

    const selectedList = selectedLeadListId ? leadLists?.find(l => l.id === selectedLeadListId) : null;

    createCampaign.mutate({
      name: newCampaignName,
      message_template: customMessage,
      lead_list_id: selectedLeadListId || null,
      lead_list_name: selectedList?.name || null,
      contact_count: selectedList?.total_contacts || 0,
    }, {
      onSuccess: () => {
        setDialogOpen(false);
        setNewCampaignName("");
        setSelectedLeadListId("");
        setCustomMessage("");
      }
    });
  };

  const handleSendNow = (campaign: Campaign) => {
    // Navegar para /comunicacao com dados pré-carregados
    const params = new URLSearchParams({
      campaign_id: campaign.id,
      campaign_name: campaign.name,
      message: campaign.message_template,
      lead_list_id: campaign.lead_list_id || "",
    });
    navigate(`/comunicacao?${params.toString()}`);
  };

  const handleOpenScheduleDialog = (campaign: Campaign) => {
    if (!campaign.lead_list_id) {
      toast.error("Campanha sem lista de leads", {
        description: "Associe uma lista de leads à campanha para agendar envios."
      });
      return;
    }

    if (!campaign.contact_count || campaign.contact_count === 0) {
      toast.error("Lista sem contatos", {
        description: "A lista de leads não possui contatos."
      });
      return;
    }

    if (!defaultCredential) {
      toast.error("Credenciais não configuradas", {
        description: "Configure suas credenciais de provedor antes de agendar."
      });
      navigate("/credenciais");
      return;
    }

    if (!defaultPhoneNumber) {
      toast.error("Número de origem não configurado", {
        description: "Configure um número de telefone antes de agendar."
      });
      navigate("/credenciais");
      return;
    }

    setSelectedCampaignForSchedule(campaign);
    setScheduleDialogOpen(true);
  };

  const handleScheduleCampaign = async (scheduledAt: Date) => {
    if (!selectedCampaignForSchedule || !defaultCredential || !defaultPhoneNumber) return;

    try {
      await createCampaignRun.mutateAsync({
        campaign_id: selectedCampaignForSchedule.id,
        status: "scheduled",
        scheduled_at: scheduledAt.toISOString(),
        total_contacts: selectedCampaignForSchedule.contact_count || 0,
        provider: defaultCredential.provider,
        from_number: defaultPhoneNumber.phone_number,
        metadata: {
          campaign_name: selectedCampaignForSchedule.name,
          message_template: selectedCampaignForSchedule.message_template,
          lead_list_id: selectedCampaignForSchedule.lead_list_id,
          credential_id: defaultCredential.id,
        }
      });

      toast.success("Campanha agendada!", {
        description: `Envio programado para ${format(scheduledAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`
      });
    } catch (error) {
      console.error("Erro ao agendar campanha:", error);
    }
  };

  const handleCancelScheduledRun = (runId: string) => {
    cancelScheduledRun.mutate(runId);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Megaphone className="h-8 w-8 text-primary" />
            Campanhas SMS
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure e salve campanhas prontas para envio rápido
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/campanhas/historico")} className="gap-2">
            <History className="h-4 w-4" />
            Histórico
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Campanha
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Criar Nova Campanha</DialogTitle>
              <DialogDescription>
                Configure uma campanha com mensagem e opcionalmente uma lista de leads
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Nome da Campanha */}
              <div className="space-y-2">
                <Label htmlFor="campaignName">Nome da Campanha *</Label>
                <Input
                  id="campaignName"
                  placeholder="Ex: Black Friday 2024"
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                />
              </div>

              {/* Mensagem */}
              <div className="space-y-2">
                <Label htmlFor="customMessage">Mensagem *</Label>
                <Textarea
                  id="customMessage"
                  placeholder="Digite a mensagem da campanha..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  {customMessage.length}/160 caracteres
                </p>
              </div>

              {/* Seletor de Lista de Leads (Opcional) */}
              <div className="space-y-2">
                <Label>Lista de Leads <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                {loadingLists ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando listas...
                  </div>
                ) : !leadLists?.length ? (
                  <div className="text-sm text-muted-foreground">
                    Nenhuma lista disponível.{" "}
                    <Button
                      variant="link"
                      className="p-0 h-auto"
                      onClick={() => navigate("/leads")}
                    >
                      Criar uma lista
                    </Button>
                  </div>
                ) : (
                  <Select
                    value={selectedLeadListId}
                    onValueChange={setSelectedLeadListId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma lista..." />
                    </SelectTrigger>
                    <SelectContent>
                      {leadLists.map((list) => (
                        <SelectItem key={list.id} value={list.id}>
                          {list.name} ({list.total_contacts} contatos)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {selectedLeadListId && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium">
                    {leadLists?.find(l => l.id === selectedLeadListId)?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {leadLists?.find(l => l.id === selectedLeadListId)?.total_contacts} contatos serão enviados
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateCampaign} disabled={createCampaign.isPending}>
                {createCampaign.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Criar Campanha
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Lista de Campanhas */}
      {loadingCampaigns ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {!campaigns?.length ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center">
                <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Nenhuma campanha criada ainda.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Clique em "Nova Campanha" para começar.
                </p>
              </CardContent>
            </Card>
          ) : (
            campaigns.map((campaign) => {
              const scheduledRunsForCampaign = getScheduledRunsForCampaign(campaign.id);
              const hasScheduledRuns = scheduledRunsForCampaign.length > 0;
              
              return (
                <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{campaign.name}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <FileText className="h-3 w-3" />
                          {campaign.lead_list_name || "Sem lista associada"}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteCampaign.mutate(campaign.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-sm line-clamp-3">{campaign.message_template}</p>
                    </div>

                    {/* Agendamentos da campanha */}
                    {hasScheduledRuns && (
                      <div className="space-y-2">
                        {scheduledRunsForCampaign.map((run) => (
                          <div 
                            key={run.id} 
                            className="flex items-center justify-between p-2 rounded-lg bg-primary/5 border border-primary/20"
                          >
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-primary" />
                              <span className="text-sm font-medium">
                                {format(new Date(run.scheduled_at!), "dd/MM 'às' HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={() => handleCancelScheduledRun(run.id)}
                              disabled={cancelScheduledRun.isPending}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex gap-1 flex-wrap">
                        <Badge variant="secondary">
                          {campaign.contact_count} contatos
                        </Badge>
                        {campaign.sends_count > 0 && (
                          <Badge variant="outline">
                            {campaign.sends_count}x enviado
                          </Badge>
                        )}
                        {hasScheduledRuns && (
                          <Badge className="bg-primary/20 text-primary hover:bg-primary/30">
                            <CalendarDays className="h-3 w-3 mr-1" />
                            Agendado
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(campaign.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>

                    {/* Botões de ação */}
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 gap-2"
                        onClick={() => handleSendNow(campaign)}
                      >
                        <Send className="h-4 w-4" />
                        Enviar Agora
                      </Button>
                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => handleOpenScheduleDialog(campaign)}
                      >
                        <CalendarDays className="h-4 w-4" />
                        Agendar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Info Card */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Megaphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Dica: Campanhas Rápidas</p>
              <p className="text-sm text-muted-foreground">
                Crie campanhas pré-configuradas com templates e listas de leads. 
                Use "Enviar Agora" para envio imediato ou "Agendar" para programar o envio.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Agendamento */}
      <ScheduleCampaignDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        campaignName={selectedCampaignForSchedule?.name}
        contactCount={selectedCampaignForSchedule?.contact_count || 0}
        onSchedule={handleScheduleCampaign}
      />
    </div>
  );
}
