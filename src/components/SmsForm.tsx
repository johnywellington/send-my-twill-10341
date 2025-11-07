import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Send, Loader2, Save, Beaker, AlertCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { TemplateSelector } from "@/components/templates/TemplateSelector";
import { TemplateDialog } from "@/components/templates/TemplateDialog";
import { useCreateTemplate } from "@/hooks/use-templates";
import { extractVariables } from "@/lib/template-utils";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { SenderIdTooltip } from "./SenderIdTooltip";
import { useProvider } from "@/contexts/ProviderContext";
import { ProviderFactory } from "@/services/providers";

interface SmsFormProps {
  onSmsSent?: () => void;
}

export const SmsForm = ({ onSmsSent }: SmsFormProps) => {
  const navigate = useNavigate();
  const { provider } = useProvider();
  const adapter = ProviderFactory.getAdapter(provider);
  const [to, setTo] = useState("");
  const [from, setFrom] = useState("");
  const [senderId, setSenderId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [dryRun, setDryRun] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const createTemplate = useCreateTemplate();

  // Query para buscar números ativos
  const { data: phoneNumbers } = useQuery({
    queryKey: ['phone-numbers-active-sms'],
    queryFn: async () => {
      const { data } = await supabase
        .from('phone_numbers')
        .select('*')
        .eq('is_active', true)
        .eq('supports_sms', true)
        .order('phone_number');
      return data || [];
    }
  });
  
  const maxLength = 160;
  const messageLength = message.length;
  const isNearLimit = messageLength > maxLength * 0.8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar número com adapter
    const phoneValidation = adapter.validatePhoneNumber(to, 'sms');
    if (!phoneValidation.valid) {
      toast.error("Número inválido", {
        description: phoneValidation.error,
      });
      return;
    }
    
    // Validar Sender ID se fornecido
    if (senderId) {
      const senderValidation = adapter.validateSenderId(senderId);
      if (!senderValidation.valid) {
        toast.error("Sender ID inválido", {
          description: senderValidation.error,
        });
        return;
      }
    }
    
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          to,
          from: senderId || from, // Usa Sender ID se fornecido, senão usa número
          body: message,
          provider,
          dryRun
        }
      });

      if (error) {
        // Handle error with detailed messages
        const errorData = data?.error || error.message;
        const errorCode = data?.code;
        const errorProvider = data?.provider || provider;
        
        let errorTitle = "Erro ao enviar SMS";
        let errorDescription = "Por favor, tente novamente";
        
        if (errorProvider === "twilio") {
          errorTitle = "Erro Twilio";
          
          // Twilio-specific error codes
          if (errorCode === "21211") {
            errorDescription = "Número de destino inválido. Verifique se o número está no formato internacional correto (+1234567890).";
          } else if (errorCode === "21408") {
            errorDescription = "Permissão negada para enviar SMS para este país. Verifique as configurações de geo-permissões na sua conta Twilio.";
          } else if (errorCode === "21610") {
            errorDescription = "Número bloqueado. O destinatário optou por não receber mensagens (opt-out).";
          } else if (errorCode === "20003") {
            errorDescription = "Credenciais Twilio inválidas. Verifique o TWILIO_ACCOUNT_SID e TWILIO_AUTH_TOKEN nos secrets.";
          } else if (errorCode === "21606") {
            errorDescription = "Número de origem não verificado. Para contas trial, você precisa verificar o número de destino primeiro.";
          } else if (errorData?.includes("not a valid phone number")) {
            errorDescription = "Formato de número inválido. Use o formato internacional: +[código do país][número] (ex: +5511999999999).";
          } else if (errorData?.includes("insufficient funds")) {
            errorDescription = "Saldo insuficiente na conta Twilio. Adicione créditos para continuar enviando SMS.";
          } else {
            errorDescription = `${errorData}. Verifique: 1) Formato do número (+5511999999999), 2) Saldo da conta, 3) Credenciais nos secrets.`;
          }
        } else if (errorProvider === "vonage") {
          errorTitle = "Erro Vonage";
          
          // Vonage-specific status codes
          if (errorCode === "1") {
            errorDescription = "Limitação de taxa excedida. Aguarde alguns segundos antes de enviar novamente.";
          } else if (errorCode === "2") {
            errorDescription = "Parâmetros faltando. Verifique se todos os campos estão preenchidos corretamente.";
          } else if (errorCode === "3") {
            errorDescription = "Formato de número inválido. Use apenas dígitos, sem espaços ou caracteres especiais (ex: 5511999999999).";
          } else if (errorCode === "4") {
            errorDescription = "Credenciais Vonage inválidas. Verifique o VONAGE_API_KEY e VONAGE_API_SECRET nos secrets.";
          } else if (errorCode === "5") {
            errorDescription = "Erro interno do Vonage. Tente novamente em alguns instantes.";
          } else if (errorCode === "6") {
            errorDescription = "Mensagem rejeitada pelo Vonage. Verifique se o conteúdo não contém caracteres proibidos.";
          } else if (errorCode === "7") {
            errorDescription = "Número bloqueado pela Vonage. O número pode estar em uma lista de bloqueio.";
          } else if (errorCode === "9") {
            errorDescription = "Saldo insuficiente na conta Vonage. Adicione créditos para continuar.";
          } else if (errorCode === "15") {
            errorDescription = "Número de destino não permitido. Verifique se você tem permissão para enviar SMS para este país.";
          } else {
            errorDescription = `${errorData}. Dicas: 1) Remova '+' do número, 2) Verifique credenciais API, 3) Confirme saldo da conta.`;
          }
        } else {
          // Generic errors
          if (errorData?.includes("Autenticação")) {
            errorDescription = "Erro de autenticação. Faça login novamente.";
          } else if (errorData?.includes("credenciais")) {
            errorDescription = `Credenciais ${provider === "twilio" ? "Twilio" : "Vonage"} não configuradas. Entre em contato com o administrador do sistema.`;
          } else if (error.message?.includes("Edge Function returned a non-2xx status code")) {
            errorDescription = "Erro no servidor. Verifique os logs para mais detalhes ou entre em contato com o suporte.";
          } else if (errorData) {
            errorDescription = errorData;
          }
        }
        
        toast.error(errorTitle, {
          description: errorDescription,
          duration: 6000,
        });
        return;
      }

      if (data?.success) {
        toast.success("SMS enviado com sucesso!", {
          description: `Message SID: ${data.messageSid}`
        });
        setMessage("");
        setTo("");
        if (onSmsSent) {
          onSmsSent();
        }
      } else {
        throw new Error(data?.error || "Falha ao enviar SMS");
      }
    } catch (error: any) {
      console.error("Erro ao enviar SMS:", error);
      
      toast.error("Erro inesperado", {
        description: error.message || "Ocorreu um erro ao processar sua solicitação. Tente novamente.",
        duration: 6000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto glass-effect shadow-xl border border-border/50">
      <CardHeader className="space-y-3 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Send className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-semibold">Enviar SMS</CardTitle>
            <CardDescription className="text-sm text-muted-foreground flex items-center gap-2">
              Envie mensagens usando {adapter.displayName}
              <Badge variant="outline" className="text-xs">
                {adapter.displayName}
              </Badge>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 px-6 pb-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2.5">
            <Label htmlFor="from" className="text-sm font-medium text-foreground">
              Número de Origem
            </Label>
            <Select value={from} onValueChange={setFrom}>
              <SelectTrigger id="from" className="h-11 transition-all duration-200 hover:border-primary/50 focus:ring-2 focus:ring-primary/20">
                <SelectValue placeholder="Escolha um número" />
              </SelectTrigger>
              <SelectContent>
                {phoneNumbers?.map((phone) => (
                  <SelectItem key={phone.id} value={phone.phone_number}>
                    <div className="flex items-center gap-2">
                      <Badge variant={phone.provider === 'vonage' ? 'default' : 'secondary'} className="text-xs">
                        {phone.provider}
                      </Badge>
                      <span>{phone.phone_number}</span>
                      {phone.friendly_name && (
                        <span className="text-muted-foreground text-xs">
                          ({phone.friendly_name})
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {phoneNumbers && phoneNumbers.length === 0 && (
              <Alert className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Nenhum número configurado para SMS.{' '}
                  <Button 
                    variant="link" 
                    className="p-0 h-auto"
                    onClick={() => navigate('/numbers')}
                  >
                    Adicionar número
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            
            <p className="text-xs text-muted-foreground">
              Escolha um número cadastrado ou adicione novos em "Números"
            </p>
          </div>

          {/* Sender ID (Opcional) */}
          <div className="space-y-2.5">
            <Label htmlFor="senderId" className="text-sm font-medium text-foreground flex items-center gap-2">
              Sender ID (Opcional)
              <SenderIdTooltip />
            </Label>
            <Input
              id="senderId"
              type="text"
              placeholder="Ex: EMPRESA, LOJA, ALERT"
              value={senderId}
              onChange={(e) => {
                const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                if (value.length <= 11) {
                  setSenderId(value);
                }
              }}
              maxLength={11}
              className="h-11 font-mono transition-all duration-200 hover:border-primary/50 focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-xs text-muted-foreground">
              {senderId ? (
                <>
                  <span className="text-primary font-medium">{senderId.length}/11</span> caracteres
                  {senderId.length > 0 && <> • Será usado como remetente</>}
                </>
              ) : (
                'Deixe vazio para usar o número de origem'
              )}
            </p>
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="to" className="text-sm font-medium text-foreground">
              Número de Destino
            </Label>
            <Input
              id="to"
              type="tel"
              placeholder="Ex: +351911019866 ou +5511999999999"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
              className="h-11 transition-all duration-200 hover:border-primary/50 focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-xs text-muted-foreground">
              Use formato internacional completo: +[código país][número] (mínimo 10 dígitos)
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="message" className="text-sm font-medium text-foreground">
                Mensagem
              </Label>
              <div className="flex items-center gap-2">
                <TemplateSelector 
                  type="sms"
                  onSelect={(template) => {
                    setMessage(template.content);
                    toast.success("Template carregado!");
                  }}
                />
                <span className={`text-xs font-medium transition-colors ${
                  isNearLimit ? 'text-destructive' : 'text-muted-foreground'
                }`}>
                  {messageLength}/{maxLength}
                </span>
              </div>
            </div>
            <Textarea
              id="message"
              placeholder="Digite sua mensagem aqui..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={5}
              maxLength={maxLength}
              className="resize-none transition-all duration-200 hover:border-primary/50 focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex items-center space-x-2 p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
            <Beaker className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <div className="flex-1">
              <Label htmlFor="dryRun" className="font-medium cursor-pointer">Modo Teste</Label>
              <p className="text-xs text-muted-foreground">Teste sem enviar de verdade</p>
            </div>
            <Switch
              id="dryRun"
              checked={dryRun}
              onCheckedChange={setDryRun}
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => message && setSaveDialogOpen(true)}
              disabled={!message || loading}
              className="h-12"
            >
              <Save className="mr-2 h-4 w-4" />
              Salvar Template
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 h-12 bg-gradient-to-r from-primary to-accent hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-[var(--shadow-glow)] text-base font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2.5 h-5 w-5 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="mr-2.5 h-5 w-5" />
                  Enviar SMS
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
      
      <TemplateDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        onSave={(template) => createTemplate.mutate(template)}
        defaultType="sms"
        defaultContent={message}
      />
    </Card>
  );
};
