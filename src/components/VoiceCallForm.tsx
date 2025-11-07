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
import { Loader2, Save, Beaker, RefreshCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { TemplateSelector } from "@/components/templates/TemplateSelector";
import { TemplateDialog } from "@/components/templates/TemplateDialog";
import { useCreateTemplate } from "@/hooks/use-templates";
import { VoiceSelector } from "@/components/VoiceSelector";
import { isPortugueseLanguage } from "@/lib/voice-options";
import { useProvider } from "@/contexts/ProviderContext";
import { ProviderFactory } from "@/services/providers";
import { PhoneNumberSelector } from "@/components/numbers/PhoneNumberSelector";
import { Badge } from "@/components/ui/badge";

interface VoiceCallFormProps {
  onCallMade?: () => void;
}

export function VoiceCallForm({ onCallMade }: VoiceCallFormProps) {
  const { provider, autoFallback, getAlternativeProvider } = useProvider();
  const adapter = ProviderFactory.getAdapter(provider);
  const [to, setTo] = useState("351911019866");
  const [from, setFrom] = useState("");
  const [message, setMessage] = useState("Hello from Voice API");
  const [language, setLanguage] = useState("en-US");
  const [style, setStyle] = useState("0");
  const [voiceName, setVoiceName] = useState("");
  const [premium, setPremium] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dryRun, setDryRun] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const createTemplate = useCreateTemplate();
  
  const maxLength = 5000; // Vonage Voice API limit
  const messageLength = message.length;
  const isNearLimit = messageLength > maxLength * 0.8;


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!to || !from || !message) {
      toast.error("Please fill all required fields");
      return;
    }
    
    // Validar número com adapter
    const phoneValidation = adapter.validatePhoneNumber(to, 'voice');
    if (!phoneValidation.valid) {
      toast.error("Número inválido", {
        description: phoneValidation.error,
      });
      return;
    }

    setLoading(true);

    const trySend = async (providerToUse: 'twilio' | 'vonage') => {
      return await supabase.functions.invoke('send-voice-call', {
        body: {
          to,
          from,
          text: message,
          language,
          style: parseInt(style),
          premium,
          voiceName: voiceName || undefined,
          provider: providerToUse,
          dryRun
        }
      });
    };

    try {
      console.log(`[Voice] Tentando via ${provider}`);
      let { data, error } = await trySend(provider);

      // Fallback
      if (error && autoFallback) {
        const alternativeProvider = getAlternativeProvider();
        toast.info(`Tentando com ${alternativeProvider === 'twilio' ? 'Twilio' : 'Vonage'}...`, {
          description: `Fallback automático ativado`,
          duration: 2000,
        });
        
        console.log(`[Voice] Fallback: tentando com ${alternativeProvider}`);
        const fallbackResult = await trySend(alternativeProvider);
        data = fallbackResult.data;
        error = fallbackResult.error;
        
        if (!error && data?.success) {
          toast.success("Chamada iniciada via fallback!", {
            description: `Enviado via ${alternativeProvider === 'twilio' ? 'Twilio' : 'Vonage'}`,
            duration: 4000,
          });
          setMessage("");
          if (onCallMade) onCallMade();
          return;
        }
      }

      if (error) {
        console.error('Error making call:', error);
        const errorTitle = autoFallback 
          ? "Falha em ambos providers" 
          : "Erro ao iniciar chamada";
        
        toast.error(errorTitle, {
          description: error.message || "Ocorreu um erro ao processar sua solicitação. Tente novamente.",
          duration: 6000,
        });
        return;
      }

      if (data?.success) {
        const providerUsed = data.provider || provider;
        toast.success("Call initiated successfully!", {
          description: `Via ${providerUsed === 'twilio' ? 'Twilio' : 'Vonage'} • UUID: ${data.uuid}`
        });
        onCallMade?.();
      } else {
        toast.error("Failed to make call", {
          description: data?.error || "Unknown error"
        });
      }
    } catch (error: any) {
      console.error("Error making call:", error);
      toast.error("Unexpected error", {
        description: error.message || "An error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card className="w-full glass-effect animate-slide-up shadow-[var(--shadow-elegant)] hover-lift">
        <CardHeader className="space-y-2 bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-t-xl pb-8 pt-6">
          <CardTitle className="text-3xl font-bold tracking-tight">Experimente</CardTitle>
          <CardDescription className="text-primary-foreground/90 text-base flex items-center gap-2">
            Teste nossa API enviando uma chamada de voz para o seu telefone
            <Badge variant="secondary" className="text-xs">
              {adapter.displayName}
            </Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-8 px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <PhoneNumberSelector
              value={from}
              onChange={setFrom}
              filterType="voice"
              label="Número de Origem"
              description="Escolha um número cadastrado ou adicione novos em 'Números'. Sender ID não é suportado em chamadas de voz."
            />

            <div className="space-y-2.5">
              <Label htmlFor="to" className="text-sm font-medium text-foreground">
                Número de Destino <span className="text-muted-foreground text-xs">ⓘ</span>
              </Label>
              <Input
                id="to"
                type="tel"
                placeholder="351911019866"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                required
                className="h-11 transition-all duration-200 hover:border-primary/50 focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-4">
              <div className="space-y-2.5">
                <Label htmlFor="language" className="text-sm font-medium text-foreground">
                  Idioma
                </Label>
                <Select value={language} onValueChange={(value) => {
                  setLanguage(value);
                  // Reset voice name when changing to non-Portuguese language
                  if (!isPortugueseLanguage(value)) {
                    setVoiceName("");
                  }
                }}>
                  <SelectTrigger id="language" className="h-11 transition-all duration-200 hover:border-primary/50 focus:ring-2 focus:ring-primary/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="en-US">English (US)</SelectItem>
                    <SelectItem value="en-GB">English (UK)</SelectItem>
                    <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                    <SelectItem value="pt-PT">Português (Portugal)</SelectItem>
                    <SelectItem value="es-ES">Español (España)</SelectItem>
                    <SelectItem value="es-US">Español (EE.UU.)</SelectItem>
                    <SelectItem value="fr-FR">Français</SelectItem>
                    <SelectItem value="de-DE">Deutsch</SelectItem>
                    <SelectItem value="it-IT">Italiano</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Voice Selector for Portuguese languages */}
              {isPortugueseLanguage(language) && (
                <VoiceSelector
                  language={language}
                  value={voiceName}
                  onChange={setVoiceName}
                  onPremiumSuggestion={setPremium}
                />
              )}

              {/* Style selector - only show when NOT using Portuguese specific voices */}
              {!isPortugueseLanguage(language) && (
                <div className="space-y-2.5">
                  <Label htmlFor="style" className="text-sm font-medium text-foreground">
                    Estilo de Voz
                  </Label>
                  <Select value={style} onValueChange={setStyle}>
                    <SelectTrigger id="style" className="h-11 transition-all duration-200 hover:border-primary/50 focus:ring-2 focus:ring-primary/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="0">Estilo 0 (Padrão)</SelectItem>
                      <SelectItem value="1">Estilo 1</SelectItem>
                      <SelectItem value="2">Estilo 2</SelectItem>
                      <SelectItem value="3">Estilo 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3 p-4 rounded-lg bg-muted/50 border border-border hover:border-primary/30 transition-colors">
              <Checkbox 
                id="premium" 
                checked={premium}
                onCheckedChange={(checked) => setPremium(checked as boolean)}
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <Label htmlFor="premium" className="cursor-pointer text-foreground font-medium flex items-center gap-2">
                <span className="text-xl">✨</span>
                Vozes Premium (Melhor Qualidade)
              </Label>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="message" className="text-sm font-medium text-foreground">
                  Mensagem para Voz
                </Label>
                <div className="flex items-center gap-2">
                  <TemplateSelector 
                    type="voice"
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
                placeholder="Digite a mensagem que será convertida em voz. Você pode usar até 5000 caracteres para mensagens mais longas e detalhadas."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                className="min-h-[200px] resize-none transition-all duration-200 hover:border-primary/50 focus:ring-2 focus:ring-primary/20"
                maxLength={maxLength}
              />
              <p className="text-xs text-muted-foreground">
                💡 <strong>Dica:</strong> Textos mais longos levam mais tempo para serem falados. Limite máximo: 5000 caracteres.
              </p>
            </div>

            <div className="flex items-center space-x-2 p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
              <Beaker className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <div className="flex-1">
                <Label htmlFor="dryRun" className="font-medium cursor-pointer">Modo Teste</Label>
                <p className="text-xs text-muted-foreground">Teste sem fazer chamada real</p>
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
                className="flex-1 h-12 bg-gradient-to-r from-primary to-accent hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-[var(--shadow-glow)] text-base font-semibold" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2.5 h-5 w-5 animate-spin" />
                    Iniciando Chamada...
                  </>
                ) : (
                  <>
                    <svg className="mr-2.5 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Fazer Chamada
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
          defaultType="voice"
          defaultContent={message}
        />
      </Card>
    </div>
  );
}
