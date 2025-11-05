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
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('send-sms', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        },
        body: {
          to,
          from,
          body: message,
          provider
        }
      });

      if (error) throw error;

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
      
      let errorDescription = "Por favor, tente novamente";
      
      if (error.message?.includes("Edge Function returned a non-2xx status code")) {
        errorDescription = "Erro no servidor. Verifique se as credenciais Twilio/Vonage estão configuradas corretamente nos secrets.";
      } else if (error.message) {
        errorDescription = error.message;
      }
      
      toast.error("Erro ao enviar SMS", {
        description: errorDescription
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
