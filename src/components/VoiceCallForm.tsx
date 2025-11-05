import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Phone, Loader2 } from "lucide-react";

interface VoiceCallFormProps {
  onCallMade?: () => void;
}

export const VoiceCallForm = ({ onCallMade }: VoiceCallFormProps) => {
  const [to, setTo] = useState("");
  const [from, setFrom] = useState("447418373268");
  const [message, setMessage] = useState("Hello from Voice API");
  const [language, setLanguage] = useState("en-US");
  const [style, setStyle] = useState("0");
  const [premium, setPremium] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-voice-call', {
        body: {
          to,
          from,
          text: message,
          language,
          style: parseInt(style),
          premium
        }
      });

      if (error) {
        const errorData = data?.error || error.message;
        
        toast.error("Erro ao fazer ligação", {
          description: errorData,
          duration: 6000,
        });
        return;
      }

      if (data?.success) {
        toast.success("Ligação iniciada com sucesso!", {
          description: `UUID: ${data.uuid}`
        });
        setMessage("Hello from Voice API");
        setTo("");
        if (onCallMade) {
          onCallMade();
        }
      } else {
        throw new Error(data?.error || "Falha ao fazer ligação");
      }
    } catch (error: any) {
      console.error("Erro ao fazer ligação:", error);
      
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
        <CardTitle className="text-2xl font-bold">Voice API</CardTitle>
        <CardDescription className="text-primary-foreground/90">
          Envie chamadas de voz usando a API do Vonage
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="from">From</Label>
            <Input
              id="from"
              type="tel"
              placeholder="447418373268"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              required
              className="transition-all focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              type="tel"
              placeholder="351911019866"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
              className="transition-all focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger id="language" className="transition-all focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en-US">English (United States)</SelectItem>
                <SelectItem value="en-GB">English (United Kingdom)</SelectItem>
                <SelectItem value="pt-BR">Portuguese (Brazil)</SelectItem>
                <SelectItem value="pt-PT">Portuguese (Portugal)</SelectItem>
                <SelectItem value="es-ES">Spanish (Spain)</SelectItem>
                <SelectItem value="fr-FR">French (France)</SelectItem>
                <SelectItem value="de-DE">German (Germany)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="style">Style</Label>
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger id="style" className="transition-all focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]">
                <SelectValue placeholder="Select style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Style 0</SelectItem>
                <SelectItem value="1">Style 1</SelectItem>
                <SelectItem value="2">Style 2</SelectItem>
                <SelectItem value="3">Style 3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="premium" 
              checked={premium}
              onCheckedChange={(checked) => setPremium(checked as boolean)}
            />
            <Label 
              htmlFor="premium" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Premium Voices
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Hello from Voice API"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={4}
              maxLength={100}
              className="resize-none transition-all focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]"
            />
            <p className="text-xs text-muted-foreground">
              Limite de caracteres: {message.length}/100
            </p>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all duration-300 shadow-[var(--shadow-glow)]"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ligando...
              </>
            ) : (
              <>
                <Phone className="mr-2 h-4 w-4" />
                Call
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};