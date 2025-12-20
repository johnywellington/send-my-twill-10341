import { useState } from "react";
import { format, addMinutes, setHours, setMinutes, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Clock, Loader2 } from "lucide-react";

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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { useCreateCampaignRun } from "@/shared/hooks/use-campaign-runs";
import type { Campaign } from "@/shared/hooks/use-campaigns";

interface ScheduleDraftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: Campaign;
  provider: string;
  fromNumber: string;
  credentialId: string;
  onScheduled?: () => void;
}

export function ScheduleDraftDialog({
  open,
  onOpenChange,
  campaign,
  provider,
  fromNumber,
  credentialId,
  onScheduled,
}: ScheduleDraftDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState("09:00");

  const createRun = useCreateCampaignRun();

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
    if (!scheduledAt) {
      toast.error("Selecione uma data e horário válidos");
      return;
    }

    try {
      await createRun.mutateAsync({
        campaign_id: campaign.id,
        status: "scheduled",
        scheduled_at: scheduledAt.toISOString(),
        total_contacts: campaign.contact_count || 0,
        provider,
        from_number: fromNumber,
        metadata: {
          campaign_name: campaign.name,
          message_template: campaign.message_template,
          lead_list_id: campaign.lead_list_id,
          credential_id: credentialId,
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

          <div className="grid grid-cols-1 gap-4">
            {/* Date Picker */}
            <div className="space-y-2">
              <Label>Data do Envio</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {selectedDate ? (
                      format(selectedDate, "PPP", { locale: ptBR })
                    ) : (
                      "Selecione uma data"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => isBefore(startOfDay(date), startOfDay(new Date()))}
                    initialFocus
                    locale={ptBR}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time Picker */}
            <div className="space-y-2">
              <Label htmlFor="time">Horário</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="time"
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {!isValidSchedule() && selectedDate && (
            <p className="text-sm text-destructive">
              O agendamento deve ser para pelo menos 5 minutos no futuro.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSchedule}
            disabled={!isValidSchedule() || createRun.isPending}
          >
            {createRun.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Agendando...
              </>
            ) : (
              <>
                <CalendarDays className="h-4 w-4 mr-2" />
                Agendar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}