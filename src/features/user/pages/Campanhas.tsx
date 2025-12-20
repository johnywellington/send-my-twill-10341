import { useState } from "react";
import { Megaphone, Plus, Send, Trash2, Loader2, FileText, History, CalendarDays } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
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

export default function Campanhas() {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [selectedLeadListId, setSelectedLeadListId] = useState<string>("");
  const [customMessage, setCustomMessage] = useState("");

  const { data: campaigns, isLoading: loadingCampaigns } = useCampaigns();
  const { data: leadLists, isLoading: loadingLists } = useLeadLists();
  
  const createCampaign = useCreateCampaign();
  const deleteCampaign = useDeleteCampaign();

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

  const handleUseCampaign = (campaign: typeof campaigns extends (infer T)[] | undefined ? T : never) => {
    toast.info(`Campanha "${campaign.name}" selecionada`, {
      description: `${campaign.contact_count} contatos serão carregados`,
    });
    // Futuro: navegar para /comunicacao com os dados pré-carregados
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
            campaigns.map((campaign) => (
              <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{campaign.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <FileText className="h-3 w-3" />
                        {campaign.lead_list_name || "Lista removida"}
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

                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      <Badge variant="secondary">
                        {campaign.contact_count} contatos
                      </Badge>
                      {campaign.sends_count > 0 && (
                        <Badge variant="outline">
                          {campaign.sends_count}x enviado
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(campaign.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>

                  <Button
                    className="w-full gap-2"
                    onClick={() => handleUseCampaign(campaign)}
                  >
                    <Send className="h-4 w-4" />
                    Usar Campanha
                  </Button>
                </CardContent>
              </Card>
            ))
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
                Ao clicar em "Usar Campanha", os dados serão carregados automaticamente na Central de Comunicação.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
