import { useState } from "react";
import { Calendar, Clock, CalendarDays } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, addMinutes, setHours, setMinutes, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ScheduleCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignName?: string;
  contactCount: number;
  onSchedule: (scheduledAt: Date) => void;
}

export function ScheduleCampaignDialog({
  open,
  onOpenChange,
  campaignName,
  contactCount,
  onSchedule,
}: ScheduleCampaignDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState("09:00");

  const handleSchedule = () => {
    if (!selectedDate) return;

    const [hours, minutes] = selectedTime.split(":").map(Number);
    const scheduledAt = setMinutes(setHours(selectedDate, hours), minutes);

    // Validar se a data é futura
    if (isBefore(scheduledAt, addMinutes(new Date(), 5))) {
      return;
    }

    onSchedule(scheduledAt);
    onOpenChange(false);
    setSelectedDate(undefined);
    setSelectedTime("09:00");
  };

  const isValidSchedule = () => {
    if (!selectedDate) return false;
    const [hours, minutes] = selectedTime.split(":").map(Number);
    const scheduledAt = setMinutes(setHours(selectedDate, hours), minutes);
    return !isBefore(scheduledAt, addMinutes(new Date(), 5));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Agendar Envio
          </DialogTitle>
          <DialogDescription>
            {campaignName ? (
              <>Agendar envio da campanha "{campaignName}" para {contactCount} contatos</>
            ) : (
              <>Agendar envio para {contactCount} contatos</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
                  <Calendar className="mr-2 h-4 w-4" />
                  {selectedDate ? (
                    format(selectedDate, "PPP", { locale: ptBR })
                  ) : (
                    "Selecione uma data"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => isBefore(startOfDay(date), startOfDay(new Date()))}
                  initialFocus
                  locale={ptBR}
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

          {/* Preview */}
          {selectedDate && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm font-medium">Resumo do Agendamento:</p>
              <p className="text-sm text-muted-foreground mt-1">
                {contactCount} mensagens serão enviadas em{" "}
                <span className="font-medium text-foreground">
                  {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })} às {selectedTime}
                </span>
              </p>
            </div>
          )}

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
          <Button onClick={handleSchedule} disabled={!isValidSchedule()}>
            <CalendarDays className="h-4 w-4 mr-2" />
            Agendar Envio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
