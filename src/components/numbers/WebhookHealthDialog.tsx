import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Activity, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { useValidateWebhook } from "@/hooks/use-validate-webhook";
import { useWebhookHealth } from "@/features/admin/hooks/use-webhook-health";
import { getWebhookUrls } from "@/lib/webhook-utils";
import { PhoneNumber } from "@/hooks/use-phone-numbers";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WebhookHealthDialogProps {
  phoneNumber: PhoneNumber;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WebhookHealthDialog = ({ 
  phoneNumber, 
  open, 
  onOpenChange 
}: WebhookHealthDialogProps) => {
  const { data: healthChecks, isLoading } = useWebhookHealth(phoneNumber.id);
  const validateMutation = useValidateWebhook();
  const webhooks = getWebhookUrls(phoneNumber.phone_number, phoneNumber.provider as 'vonage' | 'twilio');
  const [testingType, setTestingType] = useState<'sms' | 'voice' | null>(null);

  const handleTest = async (testType: 'sms' | 'voice') => {
    setTestingType(testType);
    const webhookUrl = testType === 'sms' 
      ? webhooks.smsInbound.url 
      : webhooks.voiceInbound.url;
    
    try {
      await validateMutation.mutateAsync({
        phoneNumberId: phoneNumber.id,
        phoneNumber: phoneNumber.phone_number,
        provider: phoneNumber.provider as 'vonage' | 'twilio',
        testType,
        webhookUrl
      });
    } finally {
      setTestingType(null);
    }
  };

  const getStatusIcon = (check: any) => {
    if (check.success && check.valid_format) {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    } else if (check.success && !check.valid_format) {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    } else {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (check: any) => {
    if (check.success && check.valid_format) {
      return <Badge variant="default" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">✅ Sucesso</Badge>;
    } else if (check.success && !check.valid_format) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">⚠️ Formato Incorreto</Badge>;
    } else {
      return <Badge variant="destructive">❌ Falha</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Validação de Webhooks
          </DialogTitle>
          <DialogDescription>
            {phoneNumber.phone_number} ({phoneNumber.provider.toUpperCase()})
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Test Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={() => handleTest('sms')}
              disabled={validateMutation.isPending}
              variant="outline"
            >
              {testingType === 'sms' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testando SMS...
                </>
              ) : (
                'Testar SMS Webhook'
              )}
            </Button>
            <Button 
              onClick={() => handleTest('voice')}
              disabled={validateMutation.isPending}
              variant="outline"
            >
              {testingType === 'voice' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testando Voice...
                </>
              ) : (
                'Testar Voice Webhook'
              )}
            </Button>
          </div>

          {/* Health Check History */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Histórico de Testes</h3>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !healthChecks || healthChecks.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  <p>Nenhum teste realizado ainda.</p>
                  <p className="text-sm mt-1">Clique nos botões acima para testar os webhooks.</p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {healthChecks.map((check) => (
                    <Card key={check.id}>
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          {/* Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(check)}
                              <div className="flex flex-wrap gap-2">
                                {getStatusBadge(check)}
                                <Badge variant="outline">
                                  {check.test_type.toUpperCase()}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground text-right">
                              {new Date(check.tested_at).toLocaleString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>

                          {/* Details */}
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Status HTTP:</span>
                              <span className="ml-2 font-mono">{check.status_code || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Tempo:</span>
                              <span className="ml-2 font-mono">{check.response_time_ms}ms</span>
                            </div>
                            {check.valid_format !== null && (
                              <div className="col-span-2">
                                <span className="text-muted-foreground">Formato:</span>
                                <span className="ml-2">
                                  {check.valid_format ? '✅ Válido' : '❌ Inválido'}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Error Message */}
                          {check.error_message && (
                            <div className="text-sm bg-destructive/10 text-destructive p-2 rounded">
                              <span className="font-semibold">Erro:</span> {check.error_message}
                            </div>
                          )}

                          {/* URL */}
                          <div className="text-xs text-muted-foreground border-t pt-2">
                            <span className="font-semibold">URL:</span>
                            <div className="font-mono break-all mt-1">{check.webhook_url}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Info */}
          <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
            <p className="font-semibold mb-1">ℹ️ Como funciona:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Envia uma requisição de teste ao webhook configurado</li>
              <li>Verifica se o webhook responde em até 5 segundos</li>
              <li>Valida o formato da resposta (NCCO para Vonage, TwiML para Twilio)</li>
              <li>Limite: 1 teste por webhook a cada 60 segundos</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
