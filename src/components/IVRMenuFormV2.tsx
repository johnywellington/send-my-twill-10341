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
import { Loader2, Info, PhoneForwarded, Beaker, Plus, X, MessageSquare, Phone, Hash, Clock, ArrowRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { CSVImportDialog } from "@/components/CSVImportDialog";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { VoiceSelector } from "@/components/VoiceSelector";
import { isPortugueseLanguage } from "@/lib/voice-options";
import { IVRVoiceTestDialog } from "@/components/IVRVoiceTestDialog";
import { useProvider } from "@/contexts/ProviderContext";
import { ProviderFactory } from "@/services/providers";
import { Badge } from "@/components/ui/badge";
import { PhoneNumberSelector } from "@/components/numbers/PhoneNumberSelector";
import { RateLimitSelector } from "@/components/RateLimitSelector";
import { calculateDelay, calculateEstimatedTime } from "@/lib/rate-limits";

export function IVRMenuFormV2() {
  const { provider, autoFallback, getAlternativeProvider } = useProvider();
  const adapter = ProviderFactory.getAdapter(provider);
  const [destinations, setDestinations] = useState<string[]>([""]);
  const MAX_DESTINATIONS = 100;
  const [from, setFrom] = useState("447418373268");
  const [assistantNumber, setAssistantNumber] = useState("351967344048");
  const [transferTimeout, setTransferTimeout] = useState("30");
  const [language, setLanguage] = useState("pt-PT");
  const [style, setStyle] = useState("2");
  const [voiceName, setVoiceName] = useState("");
  const [premium, setPremium] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [currentSending, setCurrentSending] = useState(0);
  const [totalToSend, setTotalToSend] = useState(0);
  const [dryRun, setDryRun] = useState(false);
  const [throttle, setThrottle] = useState(1.0); // 100% por padrão

  // Estados do formulário simplificado
  const [messageText, setMessageText] = useState("Está a falar com o serviço de segurança do seu banco. Contactamos para confirmar uma possível tentativa de fraude no seu cartão. Esta chamada está a ser gravada. Se reconhece a operação, prima 1. Se não reconhece, prima 2, e será encaminhado para um assistente.");
  const [captureInput, setCaptureInput] = useState(true);
  const [maxDigits, setMaxDigits] = useState("1");
  const [inputTimeout, setInputTimeout] = useState("10");
  const [submitOnHash, setSubmitOnHash] = useState(false);
  const [action1, setAction1] = useState<'hangup' | 'talk' | 'transfer'>('hangup');
  const [action1Message, setAction1Message] = useState("");
  const [action2, setAction2] = useState<'hangup' | 'talk' | 'transfer'>('transfer');
  const [action2Message, setAction2Message] = useState("");
  const [actionTimeout, setActionTimeout] = useState<'repeat' | 'hangup' | 'transfer'>('repeat');

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

  const handleCSVImport = (numbers: string[]) => {
    // Remover campos vazios
    const currentValid = destinations.filter(d => d.trim());
    
    // Verificar quantos podem ser adicionados
    const available = MAX_DESTINATIONS - currentValid.length;
    
    if (numbers.length > available) {
      toast.warning(`Apenas ${available} números podem ser adicionados (limite: ${MAX_DESTINATIONS})`);
    }
    
    // Adicionar números (até o limite)
    const toAdd = numbers.slice(0, available);
    setDestinations([...currentValid, ...toAdd]);
    
    if (toAdd.length < numbers.length) {
      toast.success(`✅ ${toAdd.length} números adicionados (${numbers.length - toAdd.length} ignorados por limite)`);
    } else {
      toast.success(`✅ ${toAdd.length} números importados com sucesso!`);
    }
  };

  // Função para construir NCCO a partir dos campos do formulário
  const buildNCCO = () => {
    const ncco: any[] = [];

    // 1. Adicionar mensagem de voz
    ncco.push({
      action: "talk",
      text: messageText,
      language: language,
      style: parseInt(style),
      bargeIn: true
    });

    // 2. Adicionar captura de input (se habilitada)
    if (captureInput) {
      ncco.push({
        action: "input",
        type: ["dtmf"],
        dtmf: {
          maxDigits: parseInt(maxDigits),
          timeOut: parseInt(inputTimeout),
          submitOnHash: submitOnHash
        },
        eventUrl: [`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ivr-webhook-v2-events`]
      });
    }

    return ncco;
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

    if (!messageText.trim()) {
      toast.error("Por favor, escreva a mensagem de voz");
      return;
    }

    // Validar formato de cada número com adapter
    for (const destination of validDestinations) {
      const validation = adapter.validatePhoneNumber(destination, 'voice');
      if (!validation.valid) {
        toast.error(`Número inválido: ${destination}`, {
          description: validation.error,
        });
        return;
      }
    }

    // Validar número do assistente com adapter
    const assistantValidation = adapter.validatePhoneNumber(assistantNumber, 'voice');
    if (!assistantValidation.valid) {
      toast.error("Número do assistente inválido", {
        description: assistantValidation.error,
      });
      return;
    }

    // Construir NCCO a partir dos campos
    const nccoToSend = buildNCCO();

    setLoading(true);
    setTotalToSend(validDestinations.length);
    setSendProgress(0);
    setCurrentSending(0);

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    try {
      // Enviar para cada destino sequencialmente
      for (let i = 0; i < validDestinations.length; i++) {
        const destination = validDestinations[i];
        
        setCurrentSending(i + 1);
        setSendProgress(((i + 1) / validDestinations.length) * 100);
        
        toast.info(`Enviando ${i + 1}/${validDestinations.length}: ${destination}`);
        
        const trySend = async (providerToUse: 'twilio' | 'vonage') => {
          return await supabase.functions.invoke('send-ivr-call-v2', {
            body: {
              to: destination,
              from,
              assistantNumber,
              transferTimeout: parseInt(transferTimeout),
              language,
              style: parseInt(style),
              premium,
              ncco: nccoToSend,
              voiceName: voiceName || undefined,
              provider: providerToUse,
              dryRun,
              actions: {
                action1,
                action1Message,
                action2,
                action2Message,
                actionTimeout
              }
            }
          });
        };
        
        try {
          let { data, error } = await trySend(provider);

          // Fallback
          if (error && autoFallback) {
            const alternativeProvider = getAlternativeProvider();
            console.log(`[IVR] Fallback para ${destination}: tentando ${alternativeProvider}`);
            const fallbackResult = await trySend(alternativeProvider);
            data = fallbackResult.data;
            error = fallbackResult.error;
          }

          if (error) throw error;
          
          successCount++;
          console.log(`✅ Chamada enviada para ${destination}: ${data.uuid}`);
          
        } catch (error: any) {
          failCount++;
          errors.push(`${destination}: ${error.message || 'Erro desconhecido'}`);
          console.error(`❌ Erro ao enviar para ${destination}:`, error);
        }
        
        // Delay dinâmico baseado no throttle configurado
        if (i < validDestinations.length - 1) {
          const delay = calculateDelay(provider, 'voice', throttle);
          await new Promise(resolve => setTimeout(resolve, delay));
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
      console.error('Error making URA calls:', error);
      toast.error(error.message || "Erro ao iniciar chamadas URA 2.0");
    } finally {
      setLoading(false);
      setSendProgress(0);
      setCurrentSending(0);
      setTotalToSend(0);
    }
  };


  return (
    <Card className="w-full border-accent/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <PhoneForwarded className="w-6 h-6 text-accent" />
          <CardTitle>URA 2.0 - Com Redirecionamento</CardTitle>
        </div>
        <CardDescription className="flex items-center gap-2">
          Sistema URA avançado com transferência automática via {adapter.displayName}
          <Badge variant="outline" className="text-xs">
            {adapter.displayName}
          </Badge>
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
              <AlertDescription className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Enviando chamadas URA...</span>
                  <span className="font-semibold">{currentSending}/{totalToSend}</span>
                </div>
                <Progress value={sendProgress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Progresso: {Math.round(sendProgress)}% • Tempo estimado: ~{Math.ceil((totalToSend - currentSending) * 0.5)}s
                </p>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-center pb-4">
            <Button type="submit" className="max-w-md w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando Chamadas URA 2.0...
                </>
              ) : (
                <>
                  <PhoneForwarded className="mr-2 h-4 w-4" />
                  Iniciar {destinations.filter(d => d.trim()).length} Chamada(s) URA 2.0
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

                <div className="flex gap-2">
                  {destinations.length < MAX_DESTINATIONS && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addDestination}
                      className="flex-1 border-dashed"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar Número ({destinations.length}/{MAX_DESTINATIONS})
                    </Button>
                  )}
                  
                  <CSVImportDialog 
                    onImport={handleCSVImport}
                    currentCount={destinations.filter(d => d.trim()).length}
                    maxCount={MAX_DESTINATIONS}
                  />
                </div>
                
                <p className="text-xs text-muted-foreground">
                  Formato: código país + número (sem + ou espaços). Ou importe via CSV.
                </p>
              </div>

              <PhoneNumberSelector
                value={from}
                onChange={setFrom}
                filterType="voice"
                label="Número de Origem *"
                description="Formato: código país + número. Selecione um número salvo ou digite manualmente."
              />
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

          {/* Mensagem de Voz */}
          <div className="space-y-4 p-4 rounded-lg border border-primary/20 bg-primary/5">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground/80">Mensagem de Voz</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="messageText">Texto da Mensagem *</Label>
                <span className="text-xs text-muted-foreground">{messageText.length} caracteres</span>
              </div>
              <Textarea
                id="messageText"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Digite a mensagem que será lida para o destinatário..."
                className="min-h-[120px]"
                required
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  Esta mensagem será convertida em voz e reproduzida na chamada
                </p>
                <IVRVoiceTestDialog
                  defaultText={messageText}
                  language={language}
                  voiceName={voiceName || 'Camila'}
                />
              </div>
            </div>
          </div>

          {/* Captura de Resposta */}
          <div className="space-y-4 p-4 rounded-lg border border-accent/20 bg-accent/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-semibold text-foreground/80">Captura de Resposta do Usuário</h3>
              </div>
              <Switch
                checked={captureInput}
                onCheckedChange={setCaptureInput}
              />
            </div>
            
            {captureInput && (
              <div className="space-y-4 pl-6 border-l-2 border-accent/20">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxDigits">Máximo de Dígitos</Label>
                    <Select value={maxDigits} onValueChange={setMaxDigits}>
                      <SelectTrigger id="maxDigits">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                          <SelectItem key={num} value={String(num)}>{num}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="inputTimeout">Timeout (segundos)</Label>
                    <Input
                      id="inputTimeout"
                      type="number"
                      min="5"
                      max="30"
                      value={inputTimeout}
                      onChange={(e) => setInputTimeout(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-7">
                    <Checkbox
                      id="submitOnHash"
                      checked={submitOnHash}
                      onCheckedChange={(checked) => setSubmitOnHash(checked as boolean)}
                    />
                    <Label htmlFor="submitOnHash" className="cursor-pointer text-sm">
                      Enviar com #
                    </Label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Ações Baseadas na Resposta */}
          {captureInput && (
            <div className="space-y-4 p-4 rounded-lg border border-secondary/20 bg-secondary/5">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-secondary" />
                <h3 className="text-sm font-semibold text-foreground/80">Ações Baseadas na Resposta</h3>
              </div>

              <div className="space-y-4">
                {/* Ação 1 */}
                <div className="space-y-2">
                  <Label htmlFor="action1">Quando pressionar 1</Label>
                  <Select value={action1} onValueChange={(value: any) => setAction1(value)}>
                    <SelectTrigger id="action1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hangup">Desligar chamada</SelectItem>
                      <SelectItem value="talk">Reproduzir mensagem</SelectItem>
                      <SelectItem value="transfer">Transferir para assistente</SelectItem>
                    </SelectContent>
                  </Select>
                  {action1 === 'talk' && (
                    <Textarea
                      placeholder="Digite a mensagem a ser reproduzida..."
                      value={action1Message}
                      onChange={(e) => setAction1Message(e.target.value)}
                      className="min-h-[80px]"
                    />
                  )}
                </div>

                {/* Ação 2 */}
                <div className="space-y-2">
                  <Label htmlFor="action2">Quando pressionar 2</Label>
                  <Select value={action2} onValueChange={(value: any) => setAction2(value)}>
                    <SelectTrigger id="action2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hangup">Desligar chamada</SelectItem>
                      <SelectItem value="talk">Reproduzir mensagem</SelectItem>
                      <SelectItem value="transfer">Transferir para assistente</SelectItem>
                    </SelectContent>
                  </Select>
                  {action2 === 'talk' && (
                    <Textarea
                      placeholder="Digite a mensagem a ser reproduzida..."
                      value={action2Message}
                      onChange={(e) => setAction2Message(e.target.value)}
                      className="min-h-[80px]"
                    />
                  )}
                </div>

                {/* Ação Timeout */}
                <div className="space-y-2">
                  <Label htmlFor="actionTimeout">Quando não responder (timeout)</Label>
                  <Select value={actionTimeout} onValueChange={(value: any) => setActionTimeout(value)}>
                    <SelectTrigger id="actionTimeout">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="repeat">Repetir mensagem</SelectItem>
                      <SelectItem value="hangup">Desligar chamada</SelectItem>
                      <SelectItem value="transfer">Transferir para assistente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Preview Visual do Fluxo */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <ArrowRight className="w-4 h-4" />
                Preview do Fluxo URA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                  1
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">Reproduzir mensagem de voz</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{messageText}</p>
                </div>
              </div>

              {captureInput && (
                <>
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-accent text-accent-foreground text-xs font-bold shrink-0">
                      2
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">Aguardar resposta do usuário</p>
                      <p className="text-xs text-muted-foreground">
                        Máx {maxDigits} dígito(s), timeout {inputTimeout}s
                        {submitOnHash && " • Envio com #"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 pl-9 border-l-2 border-dashed border-muted-foreground/20">
                    <div className="flex-1 space-y-2">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">→ Se pressionar 1:</p>
                        <p className="text-xs">
                          {action1 === 'hangup' && '🔚 Desligar'}
                          {action1 === 'talk' && `💬 ${action1Message || 'Reproduzir mensagem'}`}
                          {action1 === 'transfer' && '📞 Transferir para assistente'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">→ Se pressionar 2:</p>
                        <p className="text-xs">
                          {action2 === 'hangup' && '🔚 Desligar'}
                          {action2 === 'talk' && `💬 ${action2Message || 'Reproduzir mensagem'}`}
                          {action2 === 'transfer' && '📞 Transferir para assistente'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">→ Se timeout:</p>
                        <p className="text-xs">
                          {actionTimeout === 'repeat' && '🔄 Repetir mensagem'}
                          {actionTimeout === 'hangup' && '🔚 Desligar'}
                          {actionTimeout === 'transfer' && '📞 Transferir para assistente'}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {(action1 === 'transfer' || action2 === 'transfer' || actionTimeout === 'transfer') && (
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-secondary text-secondary-foreground text-xs font-bold shrink-0">
                    <PhoneForwarded className="w-3 h-3" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">Transferir para assistente</p>
                    <p className="text-xs text-muted-foreground">
                      Número: {assistantNumber} • Timeout: {transferTimeout}s
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

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
                <div className="space-y-2">
                  <Label>Seleção de Voz</Label>
                  <VoiceSelector
                    language={language}
                    value={voiceName}
                    onChange={setVoiceName}
                    onPremiumSuggestion={setPremium}
                  />
                </div>
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
              <p className="text-xs text-muted-foreground">Teste sem fazer chamada URA real</p>
            </div>
            <Switch
              id="dryRun"
              checked={dryRun}
              onCheckedChange={setDryRun}
            />
          </div>

          {/* Controle de Velocidade de Envio - mostra apenas quando há múltiplos destinos */}
          {destinations.filter(d => d.trim()).length > 1 && (
            <RateLimitSelector
              provider={provider}
              type="voice"
              value={throttle}
              onChange={setThrottle}
            />
          )}

          {/* Estimativa de Tempo - mostra apenas quando há múltiplos destinos */}
          {destinations.filter(d => d.trim()).length > 1 && (
            <Alert className="border-blue-500/20 bg-blue-50 dark:bg-blue-950">
              <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Tempo estimado de envio:</span>
                  <Badge variant="outline" className="text-sm font-mono">
                    {calculateEstimatedTime(
                      destinations.filter(d => d.trim()).length,
                      provider,
                      'voice',
                      throttle
                    )}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Para {destinations.filter(d => d.trim()).length} chamadas com velocidade {(throttle * 100).toFixed(0)}%
                </p>
              </AlertDescription>
            </Alert>
          )}

        </form>
      </CardContent>
    </Card>
  );
}