import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Send, Loader2, Save, Beaker, RefreshCw, AlertTriangle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { TemplateSelector } from "@/components/templates/TemplateSelector";
import { TemplateDialog } from "@/components/templates/TemplateDialog";
import { useCreateTemplate } from "@/features/user/hooks/use-templates";
import { extractVariables } from "@/lib/template-utils";
import { SenderIdTooltip } from "./SenderIdTooltip";
import { useProvider } from "@/contexts/ProviderContext";
import { ProviderFactory } from "@/services/providers";
import { PhoneNumberSelector } from "@/components/PhoneNumberSelector";
import { DestinationNumbersInput } from "@/components/DestinationNumbersInput";
import { BatchSendProgress, PhoneStatus } from "@/components/BatchSendProgress";
import { RateLimitSelector } from "@/components/RateLimitSelector";
import { calculateDelay } from "@/lib/rate-limits";
import { useTwilioAccountType } from "@/hooks/use-twilio-account-type";
import { CredentialSelector } from "@/components/CredentialSelector";
interface SmsFormProps {
  onSmsSent?: () => void;
}
export const SmsForm = ({
  onSmsSent
}: SmsFormProps) => {
  const {
    provider,
    autoFallback,
    getAlternativeProvider,
    selectedCredentialId,
    setSelectedCredentialId
  } = useProvider();
  const adapter = ProviderFactory.getAdapter(provider);
  const {
    isTrial,
    isLoading: loadingAccountType
  } = useTwilioAccountType(selectedCredentialId);
  const [destinations, setDestinations] = useState<string[]>([""]);
  const [from, setFrom] = useState("");
  const [senderId, setSenderId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [dryRun, setDryRun] = useState(false);
  const [useSenderId, setUseSenderId] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const createTemplate = useCreateTemplate();

  // Estados para progresso de envio em lote
  const [showProgress, setShowProgress] = useState(false);
  const [phoneStatuses, setPhoneStatuses] = useState<PhoneStatus[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cancelRequested, setCancelRequested] = useState(false);
  const [throttle, setThrottle] = useState(1.0); // 100% por padrão

  // Desabilitar Sender ID automaticamente quando conta Twilio for trial
  useEffect(() => {
    if (provider === 'twilio' && !loadingAccountType && isTrial && useSenderId) {
      setUseSenderId(false);
      setSenderId("");
      toast.warning("Sender ID desabilitado", {
        description: "Conta Twilio trial não permite Sender ID alfanumérico. Use um número de telefone.",
        duration: 6000
      });
    }
  }, [provider, loadingAccountType, isTrial, useSenderId]);

  const maxLength = 160;
  const messageLength = message.length;
  const isNearLimit = messageLength > maxLength * 0.8;
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validDestinations = destinations.filter(d => d.trim() !== "");
    if (validDestinations.length === 0) {
      toast.error("Adicione pelo menos um número de destino");
      return;
    }
    setLoading(true);
    setCancelRequested(false);

    // Inicializar status de todos os números como 'pending'
    const initialStatuses: PhoneStatus[] = validDestinations.map(number => ({
      number,
      status: 'pending' as const
    }));
    setPhoneStatuses(initialStatuses);
    setCurrentIndex(0);
    setShowProgress(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // Validar modo de remetente
      if (useSenderId) {
        // Bloquear Sender ID em conta Trial Twilio
        if (provider === 'twilio' && isTrial) {
          toast.error("Conta Twilio Trial", {
            description: "Sender ID alfanumérico não é permitido em contas Trial. Use um número de telefone ou troque para Vonage.",
            duration: 8000
          });
          setUseSenderId(false);
          setSenderId("");
          setLoading(false);
          setShowProgress(false);
          return;
        }
        
        // Modo Sender ID: obrigatório
        if (!senderId) {
          toast.error("Preencha o Sender ID");
          setLoading(false);
          setShowProgress(false);
          return;
        }
        const senderValidation = adapter.validateSenderId(senderId);
        if (!senderValidation.valid) {
          toast.error("Sender ID inválido", {
            description: senderValidation.error
          });
          setLoading(false);
          setShowProgress(false);
          return;
        }
      } else {
        // Modo número: obrigatório
        if (!from) {
          toast.error("Escolha um número de origem");
          setLoading(false);
          setShowProgress(false);
          return;
        }
      }

      // Normalizar e validar números
      const normalizedDestinations: string[] = [];
      for (let to of validDestinations) {
        // Tentar adicionar + automaticamente se faltar
        let normalizedNumber = to.trim();

        // Se não tem + e parece ser um número internacional, adicionar +
        if (!normalizedNumber.startsWith('+') && /^\d{10,15}$/.test(normalizedNumber)) {
          normalizedNumber = '+' + normalizedNumber;
          console.log(`Auto-normalizando: ${to} → ${normalizedNumber}`);
        }
        const phoneValidation = adapter.validatePhoneNumber(normalizedNumber, 'sms');
        if (!phoneValidation.valid) {
          errors.push(`${to}: ${phoneValidation.error}`);
          errorCount++;
        } else {
          normalizedDestinations.push(normalizedNumber);
        }
      }
      if (errors.length > 0) {
        toast.error("Números inválidos encontrados", {
          description: errors.slice(0, 3).join("\n") + (errors.length > 3 ? `\n... e mais ${errors.length - 3}` : ""),
          duration: 6000
        });
        setLoading(false);
        setShowProgress(false);
        return;
      }
      const trySend = async (to: string, providerToUse: 'twilio' | 'vonage') => {
        const result = await supabase.functions.invoke('send-sms', {
          body: {
            to,
            from: useSenderId ? senderId : from,
            body: message,
            provider: providerToUse,
            credentialId: selectedCredentialId,
            dryRun
          }
        });
        
        // Se a função retornou erro, tentar extrair dados do context
        if (result.error) {
          // Tentar parsear o corpo do erro se disponível
          try {
            const errorBody = result.error.context?.body || result.error.message;
            if (typeof errorBody === 'string' && errorBody.includes('{')) {
              const parsed = JSON.parse(errorBody);
              return { data: parsed, error: null };
            }
          } catch (e) {
            // Ignorar erro de parse
          }
        }
        
        return result;
      };

      // Enviar para cada destino COM ATUALIZAÇÕES DE STATUS
      for (let i = 0; i < normalizedDestinations.length; i++) {
        if (cancelRequested) {
          toast.info("Envio cancelado pelo usuário");
          break;
        }
        const to = normalizedDestinations[i];

        // Atualizar status para 'sending'
        setPhoneStatuses(prev => prev.map((p, idx) => idx === i ? {
          ...p,
          status: 'sending',
          timestamp: new Date()
        } : p));
        setCurrentIndex(i + 1);
        try {
          console.log(`[SMS] Enviando para ${to} via ${provider}`);
          let {
            data,
            error
          } = await trySend(to, provider);
          
          // Verificar erro específico de conta trial com Sender ID
          if (data?.code === 'TRIAL_SENDER_ID_NOT_ALLOWED' || data?.error?.includes('Sender ID alfanumérico não é permitido')) {
            toast.error("Conta Twilio Trial", {
              description: "Sender ID alfanumérico não é permitido em contas Trial. Use um número de telefone ou troque para Vonage.",
              duration: 8000
            });
            setUseSenderId(false);
            setSenderId("");
            setLoading(false);
            setShowProgress(false);
            return;
          }
          
          if (error && autoFallback) {
            const alternativeProvider = getAlternativeProvider();
            console.log(`[SMS] Fallback para ${to}: tentando com ${alternativeProvider}`);
            const fallbackResult = await trySend(to, alternativeProvider);
            data = fallbackResult.data;
            error = fallbackResult.error;
          }
          if (error || !data?.success) {
            const errorMsg = data?.error || error?.message || "Erro desconhecido";
            console.error(`Error sending to ${to}:`, errorMsg);
            errorCount++;
            errors.push(`${to}: ${errorMsg}`);
            setPhoneStatuses(prev => prev.map((p, idx) => idx === i ? {
              ...p,
              status: 'error',
              message: errorMsg,
              timestamp: new Date()
            } : p));
          } else {
            successCount++;
            setPhoneStatuses(prev => prev.map((p, idx) => idx === i ? {
              ...p,
              status: 'success',
              message: 'Enviado com sucesso',
              timestamp: new Date()
            } : p));
          }
        } catch (err: any) {
          console.error(`Error sending to ${to}:`, err);
          errorCount++;
          const errorMsg = err.message || "Erro inesperado";
          errors.push(`${to}: ${errorMsg}`);
          setPhoneStatuses(prev => prev.map((p, idx) => idx === i ? {
            ...p,
            status: 'error',
            message: errorMsg,
            timestamp: new Date()
          } : p));
        }

        // Delay dinâmico baseado no throttle configurado
        if (i < normalizedDestinations.length - 1 && !cancelRequested) {
          const delay = calculateDelay(provider, 'sms', throttle);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      // Toast final
      if (errorCount === 0) {
        toast.success(`✅ ${successCount} SMS enviados com sucesso!`);
        setMessage("");
        setDestinations([""]);
        if (onSmsSent) onSmsSent();
      } else if (successCount > 0) {
        toast.warning(`${successCount} enviados, ${errorCount} falharam`);
      } else {
        toast.error(`Falha ao enviar para todos os números`);
      }
    } catch (error: any) {
      console.error("Erro ao enviar SMS:", error);
      toast.error("Erro inesperado", {
        description: error.message,
        duration: 6000
      });
    } finally {
      setLoading(false);
    }
  };
  return <Card className="w-full max-w-md mx-auto glass-effect shadow-xl border border-border/50">
      <CardHeader className="space-y-3 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Send className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-semibold">Enviar SMS</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Envie mensagens usando {adapter.displayName}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 px-6 pb-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Toggle: Usar Sender ID - COM VALIDAÇÃO TRIAL */}
          <Card className="bg-muted/50 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1 flex-1">
                  <Label htmlFor="useSenderId" className={`text-sm font-medium ${provider === 'twilio' && isTrial && !loadingAccountType ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                    Usar Sender ID Personalizado
                    {provider === 'twilio' && loadingAccountType && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Verificando...
                      </Badge>
                    )}
                    {provider === 'twilio' && !loadingAccountType && isTrial && (
                      <Badge variant="destructive" className="ml-2 text-xs">
                        Indisponível em Trial
                      </Badge>
                    )}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {provider === 'twilio' && isTrial && !loadingAccountType ? <>
                        Contas trial não podem usar Sender IDs alfanuméricos.
                        Use um número real ou{' '}
                        <button type="button" onClick={() => {
                      toast.info("💡 Dica: Vonage permite Sender IDs em contas normais!", {
                        description: "Troque o provider para Vonage no seletor acima.",
                        duration: 5000
                      });
                    }} className="underline text-primary hover:text-primary/80 font-medium">
                          use Vonage
                        </button>
                      </> : "Envie com nome personalizado (ex: EMPRESA) ao invés de número"}
                  </p>
                </div>
                <Switch id="useSenderId" checked={useSenderId} disabled={loadingAccountType || (provider === 'twilio' && isTrial)} onCheckedChange={checked => {
                // Prevenir ativação em trial Twilio
                if (checked && provider === 'twilio' && isTrial) {
                  toast.error("Sender ID não disponível em conta trial Twilio", {
                    description: "Faça upgrade da sua conta ou use Vonage.",
                    duration: 6000
                  });
                  return;
                }
                setUseSenderId(checked);
                if (checked) {
                  setFrom("");
                } else {
                  setSenderId("");
                }
              }} />
              </div>
            </CardContent>
          </Card>

          {/* Seletor de Conta/Credencial */}
          <Card>
            <CardContent className="p-4">
              <CredentialSelector
                provider={provider}
                value={selectedCredentialId}
                onChange={setSelectedCredentialId}
                label="Conta/Credencial"
                showLegacyOption={true}
              />
            </CardContent>
          </Card>

          {!useSenderId && <PhoneNumberSelector value={from} onChange={setFrom} filterType="sms" label="Número de Origem" description="Escolha um número cadastrado ou adicione novos em 'Números'" />}

          {useSenderId && <div className="space-y-2.5">
              <Label htmlFor="senderId" className="text-sm font-medium text-foreground flex items-center gap-2">
                Sender ID <span className="text-destructive">*</span>
                <SenderIdTooltip />
              </Label>
              <Input id="senderId" type="text" placeholder="Ex: EMPRESA, LOJA, ALERT" value={senderId} onChange={e => {
            const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            if (value.length <= 11) {
              setSenderId(value);
            }
          }} maxLength={11} required={useSenderId} className="h-11 font-mono transition-all duration-200 hover:border-primary/50 focus:ring-2 focus:ring-primary/20" />
              <p className="text-xs text-muted-foreground">
                {senderId ? <>
                    <span className="text-primary font-medium">{senderId.length}/11</span> caracteres
                    {senderId.length >= 3 && <span className="text-green-500 ml-2">✓ Válido</span>}
                  </> : <span className="text-amber-600">Digite 3-11 caracteres alfanuméricos</span>}
              </p>
            </div>}

          <DestinationNumbersInput value={destinations} onChange={setDestinations} maxNumbers={1000} label="Números de Destino" placeholder="351911019866" description="Digite o número com código do país (ex: 351911019866 ou +351911019866). Sistema adiciona + automaticamente se necessário." />

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="message" className="text-sm font-medium text-foreground">
                Mensagem
              </Label>
              <div className="flex items-center gap-2">
                <TemplateSelector type="sms" onSelect={template => {
                setMessage(template.content);
                toast.success("Template carregado!");
              }} />
                <span className={`text-xs font-medium transition-colors ${isNearLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {messageLength}/{maxLength}
                </span>
              </div>
            </div>
            <Textarea id="message" placeholder="Digite sua mensagem aqui..." value={message} onChange={e => setMessage(e.target.value)} required rows={5} maxLength={maxLength} className="resize-none transition-all duration-200 hover:border-primary/50 focus:ring-2 focus:ring-primary/20" />
          </div>

          <div className="flex items-center space-x-2 p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
            <Beaker className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <div className="flex-1">
              <Label htmlFor="dryRun" className="font-medium cursor-pointer">Modo Teste</Label>
              <p className="text-xs text-muted-foreground">Teste sem enviar de verdade</p>
            </div>
            <Switch id="dryRun" checked={dryRun} onCheckedChange={setDryRun} />
          </div>

          {/* Controle de Velocidade de Envio - mostra apenas quando há múltiplos destinos */}
          {destinations.filter(d => d.trim()).length > 1 && <RateLimitSelector provider={provider} type="sms" value={throttle} onChange={setThrottle} />}

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => message && setSaveDialogOpen(true)} disabled={!message || loading} className="h-12">
              <Save className="mr-2 h-4 w-4" />
              Salvar Template
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 h-12 bg-gradient-to-r from-primary to-accent hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-[var(--shadow-glow)] text-base font-semibold">
              {loading ? <>
                  <Loader2 className="mr-2.5 h-5 w-5 animate-spin" />
                  Enviando...
                </> : <>
                  <Send className="mr-2.5 h-5 w-5" />
                  Enviar SMS
                </>}
            </Button>
          </div>
        </form>
      </CardContent>
      
      <TemplateDialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen} onSave={template => createTemplate.mutate(template)} defaultType="sms" defaultContent={message} />
      
      <BatchSendProgress open={showProgress} onOpenChange={setShowProgress} phoneStatuses={phoneStatuses} currentIndex={currentIndex} total={phoneStatuses.length} onCancel={() => setCancelRequested(true)} title="Enviando SMS em Lote" />
    </Card>;
};