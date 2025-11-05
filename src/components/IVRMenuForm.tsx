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
import { Loader2, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const templates = {
  "main-menu": {
    name: "Menu Principal de Atendimento",
    description: "Menu com opções para suporte, vendas e atendente",
    ncco: [
      {
        action: "talk",
        text: "Bem-vindo ao atendimento. Para suporte técnico, pressione 1. Para vendas, pressione 2. Para falar com atendente, pressione 9.",
        language: "pt-BR",
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
      },
      {
        action: "talk",
        text: "Obrigado pela sua escolha. Aguarde enquanto transferimos sua ligação.",
        language: "pt-BR"
      }
    ]
  },
  "confirmation": {
    name: "Sistema de Confirmação",
    description: "Confirmar ou reagendar compromissos",
    ncco: [
      {
        action: "talk",
        text: "Confirmamos o seu agendamento para amanhã às 14 horas. Para confirmar, pressione 1. Para reagendar, pressione 2.",
        language: "pt-BR",
        style: 2,
        bargeIn: true
      },
      {
        action: "input",
        type: ["dtmf"],
        dtmf: {
          maxDigits: 1,
          timeOut: 10
        }
      },
      {
        action: "talk",
        text: "Obrigado pela confirmação.",
        language: "pt-BR"
      }
    ]
  },
  "protocol": {
    name: "Coleta de Protocolo",
    description: "Capturar número de protocolo de 6 dígitos",
    ncco: [
      {
        action: "talk",
        text: "Digite o número do seu protocolo de 6 dígitos, seguido de sustenido.",
        language: "pt-BR",
        style: 2,
        bargeIn: false
      },
      {
        action: "input",
        type: ["dtmf"],
        dtmf: {
          maxDigits: 6,
          timeOut: 15,
          submitOnHash: true
        }
      },
      {
        action: "talk",
        text: "Protocolo recebido. Estamos processando sua solicitação.",
        language: "pt-BR"
      }
    ]
  },
  "satisfaction": {
    name: "Pesquisa de Satisfação",
    description: "Avaliar atendimento de 1 a 5",
    ncco: [
      {
        action: "talk",
        text: "Como você avalia nosso atendimento? Digite 1 para péssimo, 2 para ruim, 3 para regular, 4 para bom, ou 5 para excelente.",
        language: "pt-BR",
        style: 2,
        bargeIn: true
      },
      {
        action: "input",
        type: ["dtmf"],
        dtmf: {
          maxDigits: 1,
          timeOut: 10
        }
      },
      {
        action: "talk",
        text: "Obrigado pela sua avaliação. Seu feedback é muito importante para nós.",
        language: "pt-BR"
      }
    ]
  },
  "bank-security": {
    name: "Segurança Bancária - Alerta de Fraude",
    description: "Confirmação de operação suspeita com encaminhamento para assistente",
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
      },
      {
        action: "talk",
        text: "Aguarde enquanto transferimos sua ligação.",
        language: "pt-PT",
        style: 2
      }
    ]
  }
};

export function IVRMenuForm() {
  const [to, setTo] = useState("");
  const [from, setFrom] = useState("");
  const [language, setLanguage] = useState("pt-BR");
  const [style, setStyle] = useState("2");
  const [premium, setPremium] = useState(false);
  const [template, setTemplate] = useState<keyof typeof templates | "custom">("main-menu");
  const [customNCCO, setCustomNCCO] = useState("");
  const [editedNCCO, setEditedNCCO] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!to || !from) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
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
      const { data, error } = await supabase.functions.invoke('send-ivr-call', {
        body: {
          to,
          from,
          language,
          style: parseInt(style),
          premium,
          template,
          ncco: nccoToSend
        }
      });

      if (error) throw error;

      toast.success(`Chamada IVR iniciada! UUID: ${data.uuid}`);
      
      // Limpar formulário
      setTo("");
      setFrom("");
    } catch (error: any) {
      console.error('Error making IVR call:', error);
      toast.error(error.message || "Erro ao iniciar chamada IVR");
    } finally {
      setLoading(false);
    }
  };

  const currentTemplate = template !== "custom" ? templates[template] : null;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Menu IVR Interativo</CardTitle>
        <CardDescription>
          Crie menus de atendimento automático com captura de DTMF
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="to">Número de Destino *</Label>
              <Input
                id="to"
                type="tel"
                placeholder="351911019866"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">Formato: código país + número</p>
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
                <SelectItem value="custom">NCCO Customizado</SelectItem>
              </SelectContent>
            </Select>
            {currentTemplate && (
              <p className="text-xs text-muted-foreground">{currentTemplate.description}</p>
            )}
          </div>

          {currentTemplate && (
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

          {template === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="customNCCO">NCCO Customizado (JSON)</Label>
              <Textarea
                id="customNCCO"
                placeholder='[{"action":"talk","text":"Seu texto aqui","language":"pt-BR"}]'
                value={customNCCO}
                onChange={(e) => setCustomNCCO(e.target.value)}
                className="font-mono text-sm min-h-[200px]"
              />
              <p className="text-xs text-muted-foreground">
                Cole seu NCCO customizado em formato JSON
              </p>
            </div>
          )}

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

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Iniciando Chamada IVR...
              </>
            ) : (
              "Iniciar Chamada IVR"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
