import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SenderIdTooltip } from "./SenderIdTooltip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Send, Users, MessageSquare, Phone, Clock } from "lucide-react";
import { sendBulkSMS, sendBulkVoice, Contact, SMSConfig, VoiceConfig, replaceVariables } from "@/lib/bulk-sender";
import { calculateEstimatedTime } from "@/lib/rate-limits";
import { RateLimitSelector } from "@/components/RateLimitSelector";
import { VoiceSelector } from "@/components/VoiceSelector";
import { isPortugueseLanguage } from "@/lib/voice-options";

interface ContactGroup {
  id: string;
  name: string;
  description: string | null;
  member_count?: number;
}

export const BulkSendForm = () => {
  const [selectionType, setSelectionType] = useState<"groups" | "contacts">("groups");
  const [sendType, setSendType] = useState<"sms" | "voice">("sms");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Data from database
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  
  // SMS Config
  const [smsProvider, setSmsProvider] = useState<"twilio" | "vonage">("twilio");
  const [smsFrom, setSmsFrom] = useState("");
  const [smsSenderId, setSmsSenderId] = useState("");
  const [smsMessage, setSmsMessage] = useState("");
  
  // Voice Config
  const [voiceFrom, setVoiceFrom] = useState("");
  const [voiceMessage, setVoiceMessage] = useState("");
  const [voiceLanguage, setVoiceLanguage] = useState("pt-PT");
  const [voiceStyle, setVoiceStyle] = useState(0);
  const [voiceName, setVoiceName] = useState("");
  const [voicePremium, setVoicePremium] = useState(false);
  
  // Throttle Config
  const [smsThrottle, setSmsThrottle] = useState<number>(1.00);
  const [voiceThrottle, setVoiceThrottle] = useState<number>(1.00);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch groups with member count
      const { data: groupsData, error: groupsError } = await supabase
        .from('contact_groups')
        .select(`
          id,
          name,
          description,
          contact_group_members(count)
        `)
        .order('name');

      if (groupsError) throw groupsError;

      const groupsWithCount = groupsData?.map(g => ({
        id: g.id,
        name: g.name,
        description: g.description,
        member_count: Array.isArray(g.contact_group_members) ? g.contact_group_members.length : 0
      })) || [];

      setGroups(groupsWithCount);

      // Fetch contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('id, name, phone_number')
        .order('name');

      if (contactsError) throw contactsError;
      setContacts(contactsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const getSelectedContacts = async (): Promise<Contact[]> => {
    if (selectionType === 'contacts') {
      return contacts.filter(c => selectedContactIds.includes(c.id));
    } else {
      // Fetch all contacts from selected groups
      const { data, error } = await supabase
        .from('contact_group_members')
        .select(`
          contact_id,
          contacts(id, name, phone_number)
        `)
        .in('group_id', selectedGroupIds);

      if (error) {
        console.error('Error fetching group members:', error);
        return [];
      }

      return data?.map(item => item.contacts).filter(Boolean) as Contact[];
    }
  };

  const handleSend = async () => {
    const selectedContacts = await getSelectedContacts();
    
    if (selectedContacts.length === 0) {
      toast.error('Selecione pelo menos um contato ou grupo');
      return;
    }

    if (sendType === 'sms') {
      if (!smsFrom || !smsMessage) {
        toast.error('Preencha todos os campos obrigatórios');
        return;
      }
    } else {
      if (!voiceFrom || !voiceMessage) {
        toast.error('Preencha todos os campos obrigatórios');
        return;
      }
    }

    setSending(true);
    setProgress(0);

    try {
      let results;
      
    if (sendType === 'sms') {
      const config: SMSConfig = {
        from: smsSenderId || smsFrom, // Usa Sender ID se fornecido
        message: smsMessage,
        provider: smsProvider,
        throttlePercentage: smsThrottle
      };
        
        results = await sendBulkSMS(selectedContacts, config, (current, total) => {
          setProgress((current / total) * 100);
        });
      } else {
        const config: VoiceConfig = {
          from: voiceFrom,
          message: voiceMessage,
          language: voiceLanguage,
          style: voiceStyle,
          premium: voicePremium,
          throttlePercentage: voiceThrottle,
          voiceName: voiceName || undefined
        };
        
        results = await sendBulkVoice(selectedContacts, config, (current, total) => {
          setProgress((current / total) * 100);
        });
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      if (failCount === 0) {
        toast.success(`${successCount} ${sendType === 'sms' ? 'SMS enviados' : 'chamadas realizadas'} com sucesso!`);
      } else {
        toast.warning(`${successCount} sucesso, ${failCount} falharam`);
      }
    } catch (error) {
      console.error('Error sending:', error);
      toast.error('Erro ao enviar mensagens');
    } finally {
      setSending(false);
      setProgress(0);
    }
  };

  const toggleGroupSelection = (groupId: string) => {
    setSelectedGroupIds(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const toggleContactSelection = (contactId: string) => {
    setSelectedContactIds(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const getSelectedCount = () => {
    if (selectionType === 'groups') {
      return groups
        .filter(g => selectedGroupIds.includes(g.id))
        .reduce((sum, g) => sum + (g.member_count || 0), 0);
    }
    return selectedContactIds.length;
  };

  const getPreviewContact = () => {
    if (selectionType === 'contacts' && selectedContactIds.length > 0) {
      return contacts.find(c => c.id === selectedContactIds[0]);
    }
    return contacts[0];
  };

  const selectedCount = getSelectedCount();
  const previewContact = getPreviewContact();
  const currentMessage = sendType === 'sms' ? smsMessage : voiceMessage;
  const previewMessage = previewContact 
    ? replaceVariables(currentMessage, previewContact)
    : currentMessage;

  if (loading) {
    return (
      <Card className="glass-effect border-white/10">
        <CardHeader>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-effect border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="w-5 h-5" />
          Envio em Massa
        </CardTitle>
        <CardDescription>
          Configure e envie mensagens SMS ou chamadas de voz para múltiplos contatos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Seleção de Destinatários */}
        <div className="space-y-4">
          <Label>Selecionar Destinatários</Label>
          <RadioGroup value={selectionType} onValueChange={(v) => setSelectionType(v as "groups" | "contacts")}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="groups" id="groups" />
              <Label htmlFor="groups" className="cursor-pointer">Selecionar Grupos</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="contacts" id="contacts" />
              <Label htmlFor="contacts" className="cursor-pointer">Selecionar Contatos Individuais</Label>
            </div>
          </RadioGroup>

          {selectionType === 'groups' ? (
            <div className="space-y-2">
              {groups.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum grupo cadastrado. <a href="/contacts" className="text-primary hover:underline">Criar grupo</a>
                </p>
              ) : (
                <div className="grid gap-2 max-h-64 overflow-y-auto p-2 border border-border rounded-md">
                  {groups.map(group => (
                    <div
                      key={group.id}
                      className={`flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors ${
                        selectedGroupIds.includes(group.id)
                          ? 'bg-primary/10 border border-primary'
                          : 'bg-muted hover:bg-muted/80 border border-transparent'
                      }`}
                      onClick={() => toggleGroupSelection(group.id)}
                    >
                      <div>
                        <p className="font-medium">{group.name}</p>
                        <p className="text-sm text-muted-foreground">{group.member_count || 0} contatos</p>
                      </div>
                      <Checkbox
                        checked={selectedGroupIds.includes(group.id)}
                        onCheckedChange={() => toggleGroupSelection(group.id)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum contato cadastrado. <a href="/contacts" className="text-primary hover:underline">Adicionar contato</a>
                </p>
              ) : (
                <div className="grid gap-2 max-h-64 overflow-y-auto p-2 border border-border rounded-md">
                  {contacts.map(contact => (
                    <div
                      key={contact.id}
                      className={`flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors ${
                        selectedContactIds.includes(contact.id)
                          ? 'bg-primary/10 border border-primary'
                          : 'bg-muted hover:bg-muted/80 border border-transparent'
                      }`}
                      onClick={() => toggleContactSelection(contact.id)}
                    >
                      <div>
                        <p className="font-medium">{contact.name}</p>
                        <p className="text-sm text-muted-foreground">{contact.phone_number}</p>
                      </div>
                      <Checkbox
                        checked={selectedContactIds.includes(contact.id)}
                        onCheckedChange={() => toggleContactSelection(contact.id)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedCount > 0 && (
            <div className="space-y-2">
              <Badge variant="secondary" className="gap-2">
                <Users className="w-4 h-4" />
                {selectedCount} contato{selectedCount !== 1 ? 's' : ''} selecionado{selectedCount !== 1 ? 's' : ''}
              </Badge>
              
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Tempo estimado: {calculateEstimatedTime(
                  selectedCount,
                  sendType === 'sms' ? smsProvider : 'vonage',
                  sendType,
                  sendType === 'sms' ? smsThrottle : voiceThrottle
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tipo de Envio e Velocidade */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Coluna 1: Tipo de Envio */}
          <div className="space-y-4">
            <Label>Tipo de Envio</Label>
            <RadioGroup value={sendType} onValueChange={(v) => setSendType(v as "sms" | "voice")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sms" id="sms-type" />
                <Label htmlFor="sms-type" className="cursor-pointer flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  SMS
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="voice" id="voice-type" />
                <Label htmlFor="voice-type" className="cursor-pointer flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Chamada de Voz
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Coluna 2: Velocidade de Envio */}
          <div>
            <RateLimitSelector
              provider={sendType === 'sms' ? smsProvider : 'vonage'}
              type={sendType}
              value={sendType === 'sms' ? smsThrottle : voiceThrottle}
              onChange={sendType === 'sms' ? setSmsThrottle : setVoiceThrottle}
            />
          </div>
        </div>

        {/* Configuração SMS */}
        {sendType === 'sms' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sms-provider">Provider</Label>
              <Select value={smsProvider} onValueChange={(v) => setSmsProvider(v as "twilio" | "vonage")}>
                <SelectTrigger id="sms-provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="twilio">Twilio</SelectItem>
                  <SelectItem value="vonage">Vonage</SelectItem>
                </SelectContent>
              </Select>
            </div>


                  <div className="space-y-2">
                    <Label htmlFor="sms-from">Número de Origem</Label>
                    <Input
                      id="sms-from"
                      placeholder="+14789921910"
                      value={smsFrom}
                      onChange={(e) => setSmsFrom(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sms-sender-id" className="flex items-center gap-2">
                      Sender ID (Opcional)
                      <SenderIdTooltip />
                    </Label>
                    <Input
                      id="sms-sender-id"
                      placeholder="Ex: EMPRESA, LOJA"
                      value={smsSenderId}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                        if (value.length <= 11) {
                          setSmsSenderId(value);
                        }
                      }}
                      maxLength={11}
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      {smsSenderId ? (
                        <>
                          <span className="text-primary font-medium">{smsSenderId.length}/11</span> caracteres • Será usado como remetente
                        </>
                      ) : (
                        'Deixe vazio para usar o número de origem'
                      )}
                    </p>
                  </div>

            <div className="space-y-2">
              <Label htmlFor="sms-message">Mensagem</Label>
              <Textarea
                id="sms-message"
                placeholder="Digite sua mensagem... Use {{nome}} e {{telefone}} para personalizar"
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                rows={4}
                maxLength={1000}
              />
              <p className="text-sm text-muted-foreground text-right">
                {smsMessage.length}/1000 caracteres
              </p>
            </div>
          </div>
        )}

        {/* Configuração Voice */}
        {sendType === 'voice' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="voice-from">Número de Origem</Label>
              <Input
                id="voice-from"
                placeholder="+14789921910"
                value={voiceFrom}
                onChange={(e) => setVoiceFrom(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="voice-language">Idioma</Label>
              <Select value={voiceLanguage} onValueChange={(value) => {
                setVoiceLanguage(value);
                if (!isPortugueseLanguage(value)) {
                  setVoiceName("");
                }
              }}>
                <SelectTrigger id="voice-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-PT">Português (Portugal)</SelectItem>
                  <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                  <SelectItem value="en-US">Inglês (EUA)</SelectItem>
                  <SelectItem value="es-ES">Espanhol</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Voice Selector for Portuguese */}
            {isPortugueseLanguage(voiceLanguage) && (
              <VoiceSelector
                language={voiceLanguage}
                value={voiceName}
                onChange={setVoiceName}
                onPremiumSuggestion={setVoicePremium}
              />
            )}


            {/* Style selector - only show when NOT using Portuguese specific voices */}
            {!isPortugueseLanguage(voiceLanguage) && (
              <div className="space-y-2">
                <Label htmlFor="voice-style">Estilo de Voz</Label>
                <Select value={voiceStyle.toString()} onValueChange={(v) => setVoiceStyle(parseInt(v))}>
                  <SelectTrigger id="voice-style">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Padrão</SelectItem>
                    <SelectItem value="1">Formal</SelectItem>
                    <SelectItem value="2">Casual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="voice-premium"
                checked={voicePremium}
                onCheckedChange={(checked) => setVoicePremium(checked as boolean)}
              />
              <Label htmlFor="voice-premium" className="cursor-pointer">
                Usar voz premium (melhor qualidade)
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="voice-message">Mensagem</Label>
              <Textarea
                id="voice-message"
                placeholder="Digite sua mensagem... Use {{nome}} e {{telefone}} para personalizar"
                value={voiceMessage}
                onChange={(e) => setVoiceMessage(e.target.value)}
                rows={4}
                maxLength={1000}
              />
              <p className="text-sm text-muted-foreground text-right">
                {voiceMessage.length}/1000 caracteres
              </p>
            </div>
          </div>
        )}

        {/* Preview */}
        {currentMessage && selectedCount > 0 && (
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-sm">Preview da Mensagem</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tipo:</span>
                <Badge>{sendType === 'sms' ? 'SMS' : 'Voice Call'}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Destinatários:</span>
                <Badge variant="secondary">{selectedCount} contatos</Badge>
              </div>
              {previewContact && (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Exemplo (primeiro contato):</span>
                    <span className="font-medium">{previewContact.name}</span>
                  </div>
                  <div className="p-3 bg-background rounded-md border border-border">
                    <p className="text-sm">{previewMessage}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Progress */}
        {sending && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Enviando...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {/* Actions */}
        <Button
          onClick={handleSend}
          disabled={sending || selectedCount === 0}
          className="w-full gap-2"
          size="lg"
        >
          <Send className="w-4 h-4" />
          {sending ? 'Enviando...' : `Enviar em Massa (${selectedCount})`}
        </Button>
      </CardContent>
    </Card>
  );
};
