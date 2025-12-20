import { useState } from "react";
import { 
  FileText, 
  Users, 
  CalendarDays, 
  CheckCircle2, 
  ArrowLeft, 
  ArrowRight,
  Loader2,
  Clock,
  Phone,
  MessageSquare
} from "lucide-react";
import { format, addMinutes, setHours, setMinutes, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { TemplateSelector } from "./TemplateSelector";
import { LeadListSelector } from "./LeadListSelector";
import { useLeadLists, type LeadList } from "@/shared/hooks/use-lead-lists";
import { useCreateCampaign } from "@/shared/hooks/use-campaigns";
import { useCreateCampaignRun } from "@/shared/hooks/use-campaign-runs";
import { useProviderCredentials } from "@/shared/hooks/use-provider-credentials";
import { usePhoneNumbers } from "@/shared/hooks/use-phone-numbers";
import type { MessageTemplate } from "@/features/user/hooks/use-templates";

const STEPS = [
  { id: 1, title: "Mensagem", icon: FileText },
  { id: 2, title: "Lista de Leads", icon: Users },
  { id: 3, title: "Agendamento", icon: CalendarDays },
  { id: 4, title: "Confirmar", icon: CheckCircle2 },
];

interface CampaignWizardProps {
  onComplete?: () => void;
}

export function CampaignWizard({ onComplete }: CampaignWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  
  // Step 1 - Template
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  
  // Step 2 - Lead List
  const [selectedList, setSelectedList] = useState<LeadList | null>(null);
  
  // Step 3 - Schedule
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState("09:00");
  
  // Data
  const { data: credentials } = useProviderCredentials();
  const { data: phoneNumbers } = usePhoneNumbers();
  
  const createCampaign = useCreateCampaign();
  const createCampaignRun = useCreateCampaignRun();
  
  const defaultCredential = credentials?.find(c => c.is_default) || credentials?.[0];
  const defaultPhoneNumber = phoneNumbers?.find(p => p.is_active);

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return customMessage.trim().length > 0;
      case 2:
        return selectedList !== null;
      case 3:
        return isValidSchedule();
      default:
        return true;
    }
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

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleConfirm = async () => {
    if (!selectedList || !customMessage || !defaultCredential || !defaultPhoneNumber) {
      toast.error("Dados incompletos");
      return;
    }

    const scheduledAt = getScheduledDate();
    if (!scheduledAt) {
      toast.error("Data de agendamento inválida");
      return;
    }

    try {
      // 1. Create campaign
      const campaignName = selectedTemplate?.name || `Campanha ${format(new Date(), "dd/MM/yyyy HH:mm")}`;
      
      const campaign = await createCampaign.mutateAsync({
        name: campaignName,
        message_template: customMessage,
        lead_list_id: selectedList.id,
        lead_list_name: selectedList.name,
        contact_count: selectedList.total_contacts,
      });

      // 2. Create scheduled run
      await createCampaignRun.mutateAsync({
        campaign_id: campaign.id,
        status: "scheduled",
        scheduled_at: scheduledAt.toISOString(),
        total_contacts: selectedList.total_contacts,
        provider: defaultCredential.provider,
        from_number: defaultPhoneNumber.phone_number,
        metadata: {
          campaign_name: campaignName,
          message_template: customMessage,
          lead_list_id: selectedList.id,
          credential_id: defaultCredential.id,
        }
      });

      toast.success("Campanha agendada com sucesso!", {
        description: `Envio programado para ${format(scheduledAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`
      });

      // Reset wizard
      setCurrentStep(1);
      setSelectedTemplate(null);
      setCustomMessage("");
      setSelectedList(null);
      setSelectedDate(undefined);
      setSelectedTime("09:00");
      
      onComplete?.();
    } catch (error) {
      console.error("Erro ao criar campanha:", error);
    }
  };

  const isLoading = createCampaign.isPending || createCampaignRun.isPending;

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            <div 
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors",
                currentStep >= step.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted-foreground/30 text-muted-foreground"
              )}
            >
              <step.icon className="h-5 w-5" />
            </div>
            <div className="ml-2 hidden sm:block">
              <p className={cn(
                "text-sm font-medium",
                currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
              )}>
                {step.title}
              </p>
            </div>
            {index < STEPS.length - 1 && (
              <div className={cn(
                "flex-1 h-0.5 mx-4",
                currentStep > step.id ? "bg-primary" : "bg-muted"
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {currentStep === 1 && (
              <>
                <FileText className="h-5 w-5" />
                Passo 1: Selecione a Mensagem
              </>
            )}
            {currentStep === 2 && (
              <>
                <Users className="h-5 w-5" />
                Passo 2: Selecione a Lista de Leads
              </>
            )}
            {currentStep === 3 && (
              <>
                <CalendarDays className="h-5 w-5" />
                Passo 3: Agende Data e Hora
              </>
            )}
            {currentStep === 4 && (
              <>
                <CheckCircle2 className="h-5 w-5" />
                Passo 4: Revisar e Confirmar
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Step 1 - Template */}
          {currentStep === 1 && (
            <TemplateSelector
              selectedTemplateId={selectedTemplate?.id || null}
              customMessage={customMessage}
              onSelectTemplate={setSelectedTemplate}
              onCustomMessageChange={setCustomMessage}
            />
          )}

          {/* Step 2 - Lead List */}
          {currentStep === 2 && (
            <LeadListSelector
              selectedListId={selectedList?.id || null}
              onSelectList={setSelectedList}
            />
          )}

          {/* Step 3 - Schedule */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Date Picker */}
                <div className="space-y-2">
                  <Label>Data do Envio</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-12",
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
                      className="pl-10 h-12"
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              {selectedDate && (
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="font-medium">Resumo do Agendamento:</p>
                  <p className="text-muted-foreground mt-1">
                    {selectedList?.total_contacts || 0} mensagens serão enviadas em{" "}
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
          )}

          {/* Step 4 - Review */}
          {currentStep === 4 && (
            <div className="space-y-4">
              {/* Message */}
              <div className="p-4 rounded-lg border">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                  <MessageSquare className="h-4 w-4" />
                  Mensagem
                </div>
                <p className="text-sm">{customMessage}</p>
                {selectedTemplate && (
                  <Badge variant="secondary" className="mt-2">
                    Template: {selectedTemplate.name}
                  </Badge>
                )}
              </div>

              {/* Lead List */}
              <div className="p-4 rounded-lg border">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                  <Users className="h-4 w-4" />
                  Lista de Leads
                </div>
                <p className="font-medium">{selectedList?.name}</p>
                <Badge variant="secondary" className="mt-1">
                  {selectedList?.total_contacts} contatos
                </Badge>
              </div>

              {/* Schedule */}
              <div className="p-4 rounded-lg border">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                  <CalendarDays className="h-4 w-4" />
                  Data e Hora
                </div>
                <p className="font-medium">
                  {selectedDate && format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} às {selectedTime}
                </p>
              </div>

              {/* Provider Info */}
              <div className="p-4 rounded-lg border">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                  <Phone className="h-4 w-4" />
                  Configuração de Envio
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Número de Origem</p>
                    <p className="font-medium">{defaultPhoneNumber?.phone_number || "Não configurado"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Provedor</p>
                    <Badge>{defaultCredential?.provider || "Não configurado"}</Badge>
                  </div>
                </div>
              </div>

              {(!defaultCredential || !defaultPhoneNumber) && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
                  <p className="font-medium">Configuração incompleta</p>
                  <p className="text-sm mt-1">
                    Configure suas credenciais e número de origem antes de agendar.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1 || isLoading}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        {currentStep < 4 ? (
          <Button onClick={handleNext} disabled={!canProceed()}>
            Próximo
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button 
            onClick={handleConfirm} 
            disabled={!defaultCredential || !defaultPhoneNumber || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Agendando...
              </>
            ) : (
              <>
                <CalendarDays className="h-4 w-4 mr-2" />
                Agendar Campanha
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
