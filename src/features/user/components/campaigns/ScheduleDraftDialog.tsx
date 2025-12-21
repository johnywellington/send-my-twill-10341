import { useState, useMemo, useEffect } from "react";
import { format, addMinutes, setHours, setMinutes, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Clock, Loader2, Settings, MessageSquare } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { useCreateCampaignRun } from "@/shared/hooks/use-campaign-runs";
import { useProviderCredentials } from "@/shared/hooks/use-provider-credentials";
import { usePhoneNumbers } from "@/shared/hooks/use-phone-numbers";
import { useUpdateCampaign, type Campaign } from "@/shared/hooks/use-campaigns";

interface ScheduleDraftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: Campaign;
  onScheduled?: () => void;
}

export function ScheduleDraftDialog({
  open,
  onOpenChange,
  campaign,
  onScheduled,
}: ScheduleDraftDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState("09:00");
  const [selectedCredentialId, setSelectedCredentialId] = useState<string>("");
  const [selectedFromNumber, setSelectedFromNumber] = useState<string>("");
  const [editedMessage, setEditedMessage] = useState<string>("");

  const createRun = useCreateCampaignRun();
  const updateCampaign = useUpdateCampaign();
  const { data: credentials } = useProviderCredentials();
  const { data: phoneNumbers } = usePhoneNumbers();

  // Initialize message when dialog opens
  useEffect(() => {
    if (open && campaign) {
      setEditedMessage(campaign.message_template);
    }
  }, [open, campaign]);

  const defaultCredential = credentials?.find(c => c.is_default) || credentials?.[0];

  const activeCredential = useMemo(() => {
    if (selectedCredentialId && credentials) {
      return credentials.find(c => c.id === selectedCredentialId);
    }
    return defaultCredential;
  }, [selectedCredentialId, credentials, defaultCredential]);

  const availablePhoneNumbers = useMemo(() => {
    if (!phoneNumbers || !activeCredential) return [];
    return phoneNumbers.filter(p => p.provider === activeCredential.provider && p.is_active);
  }, [phoneNumbers, activeCredential]);

  const activeFromNumber = useMemo(() => {
    if (selectedFromNumber && availablePhoneNumbers.some(p => p.phone_number === selectedFromNumber)) {
      return selectedFromNumber;
    }
    return availablePhoneNumbers[0]?.phone_number || "";
  }, [selectedFromNumber, availablePhoneNumbers]);

  const handleCredentialChange = (credentialId: string) => {
    setSelectedCredentialId(credentialId);
    setSelectedFromNumber("");
  };

  const isValidSchedule = () => {
    if (!selectedDate) return false;
    const [hours, minutes] = selectedTime.split(":").map(Number);
    const scheduledAt = setMinutes(setHours(selectedDate, hours), minutes);
    return !isBefore(scheduledAt, addMinutes(new Date(), 5));
  };

  const getScheduledDate = () => {
    if (!selectedDate) return null;
    const [hours, minutes] = selectedTime.split(":").map(Number);
    return setMinutes(setHours(selectedDate, hours), minutes);
  };

  const handleSchedule = async () => {
    const scheduledAt = getScheduledDate();
    if (!scheduledAt || !activeCredential || !activeFromNumber) {
      toast.error("Configure todos os campos corretamente");
      return;
    }

    const messageToSend = editedMessage.trim() || campaign.message_template;

    try {
      // Update campaign message if it was edited
      if (editedMessage.trim() && editedMessage !== campaign.message_template) {
        await updateCampaign.mutateAsync({
          id: campaign.id,
          message_template: editedMessage.trim(),
        });
      }

      await createRun.mutateAsync({
        campaign_id: campaign.id,
        status: "scheduled",
        scheduled_at: scheduledAt.toISOString(),
        total_contacts: campaign.contact_count || 0,
        provider: activeCredential.provider,
        from_number: activeFromNumber,
        metadata: {
          campaign_name: campaign.name,
          message_template: messageToSend,
          lead_list_id: campaign.lead_list_id,
          credential_id: activeCredential.id,
        }
      });

      toast.success("Campanha agendada!", {
        description: `Envio programado para ${format(scheduledAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`
      });

      onOpenChange(false);
      onScheduled?.();
    } catch (error) {
      console.error("Erro ao agendar:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Agendar Campanha
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="font-medium text-sm">{campaign.name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {campaign.contact_count || 0} contatos
            </p>
          </div>

          {/* Editable Message */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Mensagem
            </Label>
            <Textarea
              value={editedMessage}
              onChange={(e) => setEditedMessage(e.target.value)}
              placeholder="Digite a mensagem..."
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Use {"{{variavel}}"} para personalização
            </p>
          </div>

          {/* API/Credential Selection */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Settings className="h-4 w-4" />
              Configuração de Envio
            </div>

            <div className="space-y-2">
              <Label>Provedor / API</Label>
              <Select value={selectedCredentialId || activeCredential?.id || ""} onValueChange={handleCredentialChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma API" />
                </SelectTrigger>
                <SelectContent>
                  {credentials?.map((cred) => (
                    <SelectItem key={cred.id} value={cred.id}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{cred.provider}</Badge>
                        {cred.credential_name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Número de Origem</Label>
              <Select value={activeFromNumber} onValueChange={setSelectedFromNumber} disabled={availablePhoneNumbers.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um número" />
                </SelectTrigger>
                <SelectContent>
                  {availablePhoneNumbers.map((phone) => (
                    <SelectItem key={phone.id} value={phone.phone_number}>{phone.phone_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date/Time */}
          <div className="grid grid-cols-1 gap-4 border-t pt-4">
            <div className="space-y-2">
              <Label>Data do Envio</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP", { locale: ptBR }) : "Selecione uma data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} disabled={(date) => isBefore(startOfDay(date), startOfDay(new Date()))} initialFocus locale={ptBR} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Horário</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="time" type="time" value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)} className="pl-10" />
              </div>
            </div>
          </div>

          {!isValidSchedule() && selectedDate && (
            <p className="text-sm text-destructive">O agendamento deve ser para pelo menos 5 minutos no futuro.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSchedule} disabled={!isValidSchedule() || !activeCredential || !activeFromNumber || createRun.isPending}>
            {createRun.isPending ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Agendando...</>) : (<><CalendarDays className="h-4 w-4 mr-2" />Agendar</>)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}