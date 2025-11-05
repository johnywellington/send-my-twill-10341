import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Send, Loader2 } from "lucide-react";

interface SmsFormProps {
  onSmsSent?: () => void;
}

export const SmsForm = ({ onSmsSent }: SmsFormProps) => {
  const [to, setTo] = useState("");
  const [from, setFrom] = useState("+14789921910");
  const [message, setMessage] = useState("");
  const [provider, setProvider] = useState<"twilio" | "vonage">("twilio");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          to,
          from,
          body: message,
          provider
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
    <Card className="w-full max-w-lg shadow-lg border-primary/20">
      <CardHeader className="space-y-1 bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-t-lg">
        <CardTitle className="text-2xl font-bold">Enviar SMS</CardTitle>
        <CardDescription className="text-primary-foreground/90">
          Envie mensagens SMS usando Twilio ou Vonage
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="provider">Provedor SMS</Label>
            <Select value={provider} onValueChange={(value: "twilio" | "vonage") => setProvider(value)}>
              <SelectTrigger id="provider" className="transition-all focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]">
                <SelectValue placeholder="Selecione o provedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="twilio">Twilio</SelectItem>
                <SelectItem value="vonage">Vonage</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="from">Número de Origem</Label>
            <Input
              id="from"
              type="tel"
              placeholder="+1234567890"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              required
              className="transition-all focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="to">Número de Destino</Label>
            <Input
              id="to"
              type="tel"
              placeholder="+1234567890"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
              className="transition-all focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mensagem</Label>
            <Textarea
              id="message"
              placeholder="Digite sua mensagem aqui..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={4}
              className="resize-none transition-all focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all duration-300 shadow-[var(--shadow-glow)]"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Enviar SMS
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
