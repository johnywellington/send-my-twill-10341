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
import { Loader2, Info, PhoneForwarded } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PhoneInput } from "@/components/ui/phone-input";

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
  const [to, setTo] = useState("+351");
  const [from, setFrom] = useState("+44447418373268");
  const [assistantNumber, setAssistantNumber] = useState("+351");
  const [transferTimeout, setTransferTimeout] = useState("30");
  const [language, setLanguage] = useState("pt-PT");
  const [style, setStyle] = useState("2");
  const [premium, setPremium] = useState(false);
  const [template, setTemplate] = useState<keyof typeof templates>("bank-security-v2");
  const [customNCCO, setCustomNCCO] = useState("");
  const [editedNCCO, setEditedNCCO] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!to || !from || !assistantNumber) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    // Validar formato de telefone
    const phoneRegex = /^\d{10,15}$/;
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
    
    try {
      const { data, error } = await supabase.functions.invoke('send-ivr-call-v2', {
        body: {
          to,
          from,
          assistantNumber,
          transferTimeout: parseInt(transferTimeout),
          language,
          style: parseInt(style),
          premium,
          template,
          ncco: nccoToSend
        }
      });

      if (error) throw error;

      toast.success(`Chamada IVR 2.0 iniciada! UUID: ${data.uuid}`);
      
      // Limpar formulário
      setTo("");
      setAssistantNumber("");
    } catch (error: any) {
      console.error('Error making IVR call:', error);
      toast.error(error.message || "Erro ao iniciar chamada IVR 2.0");
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
          <div className="flex justify-center pb-4">
            <Button type="submit" className="max-w-md w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando Chamada IVR 2.0...
                </>
              ) : (
                <>
                  <PhoneForwarded className="mr-2 h-4 w-4" />
                  Iniciar Chamada IVR 2.0
                </>
              )}
            </Button>
          </div>

          {/* Configuração Básica */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground/80">Configuração Básica</h3>
            <div className="space-y-4">
              <PhoneInput
                value={to}
                onChange={setTo}
                label="Número de Destino"
                placeholder="911019866"
                defaultDdi="+351"
                required
              />

              <PhoneInput
                value={from}
                onChange={setFrom}
                label="Número de Origem"
                placeholder="447418373268"
                defaultDdi="+44"
                required
              />
            </div>
          </div>

          {/* Configuração de Transferência */}
          <div className="space-y-4 p-4 rounded-lg border border-accent/20 bg-accent/5">
            <h3 className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
              <PhoneForwarded className="w-4 h-4 text-accent" />
              Configuração de Transferência
            </h3>
            <div className="space-y-4">
              <PhoneInput
                value={assistantNumber}
                onChange={setAssistantNumber}
                label="Número do Assistente"
                placeholder="912345678"
                defaultDdi="+351"
                required
              />

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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="language">Idioma</Label>
                <Select value={language} onValueChange={setLanguage}>
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

              <div className="flex items-center space-x-2 pt-8">
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

        </form>
      </CardContent>
    </Card>
  );
}