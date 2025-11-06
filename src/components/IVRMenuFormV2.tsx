import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Info, PhoneForwarded, Beaker, Plus, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { VoiceSelector } from "@/components/VoiceSelector";
import { isPortugueseLanguage } from "@/lib/voice-options";

const templates = {
  "bank-security-v2": {
    name: "Segurança Bancária - Com Redirecionamento",
    description: "Alerta de fraude com transferência automática para assistente",
    ncco: [
      {
        action: "talk",
        text: "Está a falar com o serviço de segurança do seu banco. Contactamos para confirmar uma possível tentativa de fraude no seu cartão. Esta chamada está a ser gravada. Se reconhece a operação, prima 1. Se não reconhece, prima 2, e será encaminhado para um assistente.",
        language: "pt-PT",
        style: 2,
        bargeIn: true
      },
      {
        action: "input",
        type: ["dtmf"],
        dtmf: {
          maxDigits: 1,
          timeOut: 10,
          submitOnHash: false
        }
      }
    ]
  },
  "custom": {
    name: "NCCO Customizado",
    description: "Crie seu próprio fluxo IVR",
    ncco: []
  }
};

export function IVRMenuFormV2() {
  const [destinations, setDestinations] = useState<string[]>([""]);
  const MAX_DESTINATIONS = 100;
  const [from, setFrom] = useState("447418373268");
  const [assistantNumber, setAssistantNumber] = useState("351967344048");
  const [transferTimeout, setTransferTimeout] = useState("30");
  const [language, setLanguage] = useState("pt-PT");
  const [style, setStyle] = useState("2");
  const [voiceName, setVoiceName] = useState("");
  const [premium, setPremium] = useState(false);
  const [template, setTemplate] = useState<keyof typeof templates>("bank-security-v2");
  const [customNCCO, setCustomNCCO] = useState("");
  const [editedNCCO, setEditedNCCO] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [dryRun, setDryRun] = useState(false);

  const addDestination = () => {
    if (destinations.length < MAX_DESTINATIONS) {
      setDestinations([...destinations, ""]);
    }
  };

  const removeDestination = (index: number) => {
    if (destinations.length > 1) {
      setDestinations(destinations.filter((_, i) => i !== index));
    }
  };

  const updateDestination = (index: number, value: string) => {
    const updated = [...destinations];
    updated[index] = value;
    setDestinations(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filtrar números vazios
    const validDestinations = destinations.filter(d => d.trim() !== "");

    if (validDestinations.length === 0) {
      toast.error("Por favor, adicione pelo menos um número de destino");
      return;
    }

    if (!from || !assistantNumber) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    // Validar formato de cada número
    const phoneRegex = /^\d{10,15}$/;
    const invalidNumbers = validDestinations.filter(
      num => !phoneRegex.test(num.replace(/[^0-9]/g, ''))
    );

    if (invalidNumbers.length > 0) {
      toast.error(`Números de destino inválidos: ${invalidNumbers.join(', ')}`);
      return;
    }

    // Validar número do assistente
    if (!phoneRegex.test(assistantNumber.replace(/[^0-9]/g, ''))) {
      toast.error("Número do assistente inválido. Use formato E.164 (ex: 351912345678)");
      return;
    }

    // Validar NCCO customizado se selecionado
    let nccoToSend;
    if (template === "custom") {
      try {
        nccoToSend = JSON.parse(customNCCO);
        if (!Array.isArray(nccoToSend)) {
          toast.error("NCCO deve ser um array");
          return;
        }
      } catch (error) {
        toast.error("NCCO inválido. Verifique o formato JSON.");
        return;
      }
    } else {
      // Se há NCCO editado, usar ele
      if (editedNCCO) {
        try {
          nccoToSend = JSON.parse(editedNCCO);
          if (!Array.isArray(nccoToSend)) {
            toast.error("NCCO editado deve ser um array");
            return;
          }
        } catch (error) {
          toast.error("NCCO editado inválido. Verifique o formato JSON.");
          return;
        }
      } else {
        nccoToSend = templates[template].ncco;
      }
    }

    setLoading(true);

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    try {
      // Enviar para cada destino sequencialmente
      for (let i = 0; i < validDestinations.length; i++) {
        const destination = validDestinations[i];
        
        toast.info(`Enviando ${i + 1}/${validDestinations.length}: ${destination}`);
        
        try {
          const { data, error } = await supabase.functions.invoke('send-ivr-call-v2', {
            body: {
              to: destination,
              from,
              assistantNumber,
              transferTimeout: parseInt(transferTimeout),
              language,
              style: parseInt(style),
              premium,
              template,
              ncco: nccoToSend,
              voiceName: voiceName || undefined,
              dryRun
            }
          });

          if (error) throw error;
          
          successCount++;
          console.log(`✅ Chamada enviada para ${destination}: ${data.uuid}`);
          
        } catch (error: any) {
          failCount++;
          errors.push(`${destination}: ${error.message || 'Erro desconhecido'}`);
          console.error(`❌ Erro ao enviar para ${destination}:`, error);
        }
        
        // Pequeno delay entre chamadas (evitar throttling)
        if (i < validDestinations.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // Mostrar resultado final
      if (successCount === validDestinations.length) {
        toast.success(`🎉 Todas as ${successCount} chamadas foram iniciadas com sucesso!`);
      } else if (successCount > 0) {
        toast.warning(
          `⚠️ ${successCount} chamadas enviadas, ${failCount} falharam`,
          { duration: 5000 }
        );
      } else {
        toast.error('❌ Todas as chamadas falharam');
      }
      
      // Mostrar erros detalhados se houver
      if (errors.length > 0) {
        console.error('Erros detalhados:', errors);
        toast.error(
          `Erros: ${errors.slice(0, 3).join('; ')}${errors.length > 3 ? '...' : ''}`,
          { duration: 8000 }
        );
      }
      
      // Limpar apenas se houver sucesso
      if (successCount > 0) {
        setDestinations([""]);
        setAssistantNumber("");
      }
      
    } catch (error: any) {
      console.error('Error making IVR calls:', error);
      toast.error(error.message || "Erro ao iniciar chamadas IVR 2.0");
    } finally {
      setLoading(false);
    }
  };

  const currentTemplate = template !== "custom" ? templates[template] : null;

  return (
    <Card className="w-full border-accent/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <PhoneForwarded className="w-6 h-6 text-accent" />
          <CardTitle>IVR 2.0 - Com Redirecionamento</CardTitle>
        </div>
        <CardDescription>
          Sistema IVR avançado com transferência automática de chamadas para assistentes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4 border-accent/20 bg-accent/5">
          <Info className="h-4 w-4 text-accent" />
          <AlertDescription>
            <strong>Novo!</strong> Quando o destinatário pressionar 2, a chamada será automaticamente 
            transferida para o número do assistente configurado abaixo.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-6">
          {loading && (
            <Alert className="border-accent/20 bg-accent/5">
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Enviando chamadas para {destinations.filter(d => d.trim()).length} destinatário(s)...
                Aguarde, isso pode levar alguns segundos.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-center pb-4">
            <Button type="submit" className="max-w-md w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando Chamadas IVR 2.0...
                </>
              ) : (
                <>
                  <PhoneForwarded className="mr-2 h-4 w-4" />
                  Iniciar {destinations.filter(d => d.trim()).length} Chamada(s) IVR 2.0
                </>
              )}
            </Button>
          </div>

          {/* Configuração Básica */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground/80">Configuração Básica</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Números de Destino *</Label>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{destinations.length} de {MAX_DESTINATIONS}</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {destinations.map((destination, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="flex-1 space-y-1">
                        <Input
                          type="tel"
                          placeholder={`Número ${index + 1}: 351911019866`}
                          value={destination}
                          onChange={(e) => updateDestination(index, e.target.value)}
                          required
                          className="h-11"
                        />
                      </div>
                      
                      {destinations.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeDestination(index)}
                          className="h-11 w-11 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {destinations.length < MAX_DESTINATIONS && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addDestination}
                    className="w-full border-dashed"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Número ({destinations.length}/{MAX_DESTINATIONS})
                  </Button>
                )}
                
                <p className="text-xs text-muted-foreground">
                  Formato: código país + número (sem + ou espaços)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="from">Número de Origem *</Label>
                <Input
                  id="from"
                  type="tel"
                  placeholder="447418373268"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Configuração de Transferência */}
          <div className="space-y-4 p-4 rounded-lg border border-accent/20 bg-accent/5">
            <h3 className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
              <PhoneForwarded className="w-4 h-4 text-accent" />
              Configuração de Transferência
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="assistantNumber">Número do Assistente *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="assistantNumber"
                    type="tel"
                    placeholder="351967344048"
                    value={assistantNumber}
                    onChange={(e) => setAssistantNumber(e.target.value)}
                    required
                    className="flex-1"
                  />
                  {assistantNumber && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setAssistantNumber("")}
                      className="h-11 w-11 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Número para transferir quando pressionar 2
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="transferTimeout">Tempo de Espera (segundos)</Label>
                <Input
                  id="transferTimeout"
                  type="number"
                  min="10"
                  max="120"
                  placeholder="30"
                  value={transferTimeout}
                  onChange={(e) => setTransferTimeout(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Tempo máximo de tentativa de conexão
                </p>
              </div>
            </div>
          </div>

          {/* Template Selection */}
          <div className="space-y-2">
            <Label htmlFor="template">Template IVR</Label>
            <Select value={template} onValueChange={(value: any) => setTemplate(value)}>
              <SelectTrigger id="template">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(templates).map(([key, tmpl]) => (
                  <SelectItem key={key} value={key}>
                    {tmpl.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {currentTemplate && (
              <p className="text-xs text-muted-foreground">{currentTemplate.description}</p>
            )}
          </div>

          {/* NCCO Preview */}
          {currentTemplate && currentTemplate.ncco.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="editableNCCO">Preview do Fluxo (Editável):</Label>
              <Textarea
                id="editableNCCO"
                value={editedNCCO || JSON.stringify(currentTemplate.ncco, null, 2)}
                onChange={(e) => setEditedNCCO(e.target.value)}
                className="font-mono text-xs min-h-[300px] bg-muted/50"
                placeholder="Edite as perguntas e textos do IVR aqui"
              />
              <p className="text-xs text-muted-foreground">
                💡 Edite os textos das perguntas diretamente no JSON acima
              </p>
            </div>
          )}

          {/* Custom NCCO */}
          {template === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="customNCCO">NCCO Customizado (JSON)</Label>
              <Textarea
                id="customNCCO"
                placeholder='[{"action":"talk","text":"Seu texto aqui","language":"pt-PT"}]'
                value={customNCCO}
                onChange={(e) => setCustomNCCO(e.target.value)}
                className="font-mono text-sm min-h-[200px]"
              />
              <p className="text-xs text-muted-foreground">
                Cole seu NCCO customizado em formato JSON
              </p>
            </div>
          )}

          {/* Configurações de Voz */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground/80">Configurações de Voz</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="language">Idioma</Label>
                <Select value={language} onValueChange={(value) => {
                  setLanguage(value);
                  if (!isPortugueseLanguage(value)) {
                    setVoiceName("");
                  }
                }}>
                  <SelectTrigger id="language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                    <SelectItem value="pt-PT">Português (Portugal)</SelectItem>
                    <SelectItem value="en-US">English (US)</SelectItem>
                    <SelectItem value="es-ES">Español</SelectItem>
                    <SelectItem value="fr-FR">Français</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Voice Selector for Portuguese */}
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
                <div className="space-y-2">
                  <Label htmlFor="style">Estilo de Voz</Label>
                  <Select value={style} onValueChange={setStyle}>
                    <SelectTrigger id="style">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Padrão</SelectItem>
                      <SelectItem value="1">Casual</SelectItem>
                      <SelectItem value="2">Profissional</SelectItem>
                      <SelectItem value="3">Animado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center space-x-2 pt-2">
                <Checkbox 
                  id="premium" 
                  checked={premium}
                  onCheckedChange={(checked) => setPremium(checked as boolean)}
                />
                <Label htmlFor="premium" className="cursor-pointer">
                  Voz Premium
                </Label>
              </div>
            </div>
          </div>

          {/* Modo Teste */}
          <div className="flex items-center space-x-2 p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
            <Beaker className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <div className="flex-1">
              <Label htmlFor="dryRun" className="font-medium cursor-pointer">Modo Teste</Label>
              <p className="text-xs text-muted-foreground">Teste sem fazer chamada IVR real</p>
            </div>
            <Switch
              id="dryRun"
              checked={dryRun}
              onCheckedChange={setDryRun}
            />
          </div>

        </form>
      </CardContent>
    </Card>
  );
}