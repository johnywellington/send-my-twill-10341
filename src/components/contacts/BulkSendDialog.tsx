import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { sendBulkSMS, sendBulkVoice, Contact, SMSConfig, VoiceConfig, SendResult } from "@/lib/bulk-sender";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TemplateSelector } from "@/components/templates/TemplateSelector";
import { RateLimitSelector } from "@/components/RateLimitSelector";
import { calculateEstimatedTime } from "@/lib/rate-limits";
import { Clock } from "lucide-react";

interface BulkSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: Contact[];
  type: "sms" | "voice";
}

export function BulkSendDialog({ open, onOpenChange, contacts, type }: BulkSendDialogProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<"config" | "sending" | "results">("config");
  const [results, setResults] = useState<SendResult[]>([]);
  
  const [smsConfig, setSmsConfig] = useState<SMSConfig>({
    from: "",
    message: "",
    provider: "twilio"
  });

  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig>({
    from: "",
    message: "",
    language: "pt-PT",
    style: 0,
    premium: false
  });
  
  const [smsThrottle, setSmsThrottle] = useState<number>(1.00);
  const [voiceThrottle, setVoiceThrottle] = useState<number>(1.00);

  const handleSend = async () => {
    setLoading(true);
    setCurrentStep("sending");
    setProgress(0);

    try {
      let sendResults: SendResult[];

      if (type === "sms") {
        sendResults = await sendBulkSMS(contacts, { ...smsConfig, throttlePercentage: smsThrottle }, (current, total) => {
          setProgress((current / total) * 100);
        });
      } else {
        sendResults = await sendBulkVoice(contacts, { ...voiceConfig, throttlePercentage: voiceThrottle }, (current, total) => {
          setProgress((current / total) * 100);
        });
      }

      setResults(sendResults);
      setCurrentStep("results");

      const success = sendResults.filter(r => r.success).length;
      const failed = sendResults.filter(r => !r.success).length;

      toast({
        title: "Envio concluído",
        description: `${success} enviados com sucesso, ${failed} falharam`
      });
    } catch (error: any) {
      toast({
        title: "Erro no envio em massa",
        description: error.message,
        variant: "destructive"
      });
      setCurrentStep("config");
    } finally {
      setLoading(false);
    }
  };

  const resetDialog = () => {
    setCurrentStep("config");
    setProgress(0);
    setResults([]);
    setSmsConfig({ from: "", message: "", provider: "twilio" });
    setVoiceConfig({ from: "", message: "", language: "pt-PT", style: 0, premium: false });
    setSmsThrottle(1.00);
    setVoiceThrottle(1.00);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(resetDialog, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Envio em Massa de {type === "sms" ? "SMS" : "Voz"} - {contacts.length} contatos
          </DialogTitle>
          <DialogDescription className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            Tempo estimado: {calculateEstimatedTime(
              contacts.length,
              type === "sms" ? smsConfig.provider : 'vonage',
              type,
              type === 'sms' ? smsThrottle : voiceThrottle
            )}
          </DialogDescription>
        </DialogHeader>

        {currentStep === "config" && (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Use variáveis para personalizar: <strong>{"{{nome}}"}</strong>, <strong>{"{{telefone}}"}</strong>
                <br />
                Exemplo: "Olá {"{{nome}}"}, temos uma oferta especial!"
              </AlertDescription>
            </Alert>

            {type === "sms" ? (
              <>
                <div>
                  <Label>Número de Origem</Label>
                  <Input
                    value={smsConfig.from}
                    onChange={(e) => setSmsConfig({ ...smsConfig, from: e.target.value })}
                    placeholder="+5511999999999"
                  />
                </div>

                <div>
                  <Label>Provedor</Label>
                  <Select
                    value={smsConfig.provider}
                    onValueChange={(value: "twilio" | "vonage") => 
                      setSmsConfig({ ...smsConfig, provider: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="twilio">Twilio</SelectItem>
                      <SelectItem value="vonage">Vonage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <RateLimitSelector
                  provider={smsConfig.provider}
                  type="sms"
                  value={smsThrottle}
                  onChange={setSmsThrottle}
                />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Mensagem</Label>
                    <TemplateSelector 
                      type="sms"
                      onSelect={(template) => {
                        setSmsConfig({ ...smsConfig, message: template.content });
                      }}
                    />
                  </div>
                  <Textarea
                    value={smsConfig.message}
                    onChange={(e) => setSmsConfig({ ...smsConfig, message: e.target.value })}
                    rows={4}
                    placeholder="Olá {{nome}}, temos uma oferta especial!"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label>Número de Origem</Label>
                  <Input
                    value={voiceConfig.from}
                    onChange={(e) => setVoiceConfig({ ...voiceConfig, from: e.target.value })}
                    placeholder="+5511999999999"
                  />
                </div>

                <div>
                  <Label>Idioma</Label>
                  <Select
                    value={voiceConfig.language}
                    onValueChange={(value) => setVoiceConfig({ ...voiceConfig, language: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt-PT">Português (Portugal)</SelectItem>
                      <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                      <SelectItem value="en-US">English (US)</SelectItem>
                      <SelectItem value="es-ES">Español</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <RateLimitSelector
                  provider="vonage"
                  type="voice"
                  value={voiceThrottle}
                  onChange={setVoiceThrottle}
                />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Mensagem</Label>
                    <TemplateSelector 
                      type="voice"
                      onSelect={(template) => {
                        setVoiceConfig({ ...voiceConfig, message: template.content });
                      }}
                    />
                  </div>
                  <Textarea
                    value={voiceConfig.message}
                    onChange={(e) => setVoiceConfig({ ...voiceConfig, message: e.target.value })}
                    rows={4}
                    placeholder="Olá {{nome}}, temos uma oferta especial!"
                  />
                </div>
              </>
            )}
          </div>
        )}

        {currentStep === "sending" && (
          <div className="space-y-4 py-8">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">
                Enviando... {Math.round(progress)}%
              </h3>
              <Progress value={progress} className="mt-4" />
              <p className="text-sm text-muted-foreground mt-2">
                Aguarde, estamos processando {contacts.length} contatos
              </p>
            </div>
          </div>
        )}

        {currentStep === "results" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded-md bg-green-50 dark:bg-green-950">
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {results.filter(r => r.success).length}
                </div>
                <div className="text-sm text-green-600 dark:text-green-400">Enviados</div>
              </div>
              <div className="p-4 border rounded-md bg-red-50 dark:bg-red-950">
                <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                  {results.filter(r => !r.success).length}
                </div>
                <div className="text-sm text-red-600 dark:text-red-400">Falharam</div>
              </div>
            </div>

            {results.some(r => !r.success) && (
              <div>
                <Label>Erros:</Label>
                <ScrollArea className="h-48 border rounded-md p-4 mt-2">
                  {results
                    .filter(r => !r.success)
                    .map((result, i) => (
                      <div key={i} className="py-2 border-b last:border-0">
                        <div className="font-medium">{result.contact.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {result.contact.phone_number}
                        </div>
                        <div className="text-sm text-destructive">{result.error}</div>
                      </div>
                    ))}
                </ScrollArea>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {currentStep === "config" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleSend} disabled={loading}>
                Iniciar Envio
              </Button>
            </>
          )}
          {currentStep === "results" && (
            <Button onClick={handleClose}>Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
