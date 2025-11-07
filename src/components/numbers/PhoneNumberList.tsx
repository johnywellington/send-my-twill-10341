import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Copy, Link, Edit, Trash2, Eye, EyeOff, AlertCircle, ChevronDown, Loader2 } from "lucide-react";
import { usePhoneNumbers, useDeletePhoneNumber, useUpdatePhoneNumber, useTestWebhook, type PhoneNumber } from "@/hooks/use-phone-numbers";
import { getWebhookUrls, copyAllWebhooksToClipboard, copyWebhookUrl } from "@/lib/webhook-utils";
import { toast } from "sonner";
import { PhoneNumberDialog } from "./PhoneNumberDialog";

export const PhoneNumberList = () => {
  const { data: phoneNumbers, isLoading } = usePhoneNumbers();
  const deleteMutation = useDeletePhoneNumber();
  const updateMutation = useUpdatePhoneNumber();
  const testWebhookMutation = useTestWebhook();

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingPhone, setEditingPhone] = useState<PhoneNumber | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleCopyAll = (phone: PhoneNumber) => {
    copyAllWebhooksToClipboard(phone.phone_number, phone.provider);
    toast.success("URLs copiadas!", {
      description: "Todas as URLs foram copiadas para a área de transferência",
    });
  };

  const handleCopyUrl = (url: string) => {
    copyWebhookUrl(url);
    toast.success("URL copiada!");
  };

  const handleToggleActive = async (phone: PhoneNumber) => {
    await updateMutation.mutateAsync({
      id: phone.id,
      updates: { is_active: !phone.is_active },
    });
  };

  const handleTestWebhook = async (phone: PhoneNumber, testType: 'sms' | 'voice') => {
    await testWebhookMutation.mutateAsync({
      phoneNumber: phone.phone_number,
      provider: phone.provider,
      testType,
    });
  };

  const handleEdit = (phone: PhoneNumber) => {
    setEditingPhone(phone);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const filteredNumbers = phoneNumbers?.filter(phone =>
    phone.phone_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    phone.friendly_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!phoneNumbers || phoneNumbers.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground mb-4">Nenhum número cadastrado ainda.</p>
          <p className="text-sm text-muted-foreground">
            Clique em "Adicionar Número" para começar.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex gap-4">
          <Input
            placeholder="Pesquisar por número ou nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredNumbers?.map((phone) => {
            const webhooks = getWebhookUrls(phone.phone_number, phone.provider);
            
            return (
              <Card key={phone.id} className={phone.is_active ? '' : 'opacity-60'}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{phone.phone_number}</CardTitle>
                      {phone.friendly_name && (
                        <CardDescription>{phone.friendly_name}</CardDescription>
                      )}
                    </div>
                    <Badge variant={phone.provider === 'vonage' ? 'default' : 'secondary'}>
                      {phone.provider.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {phone.supports_sms && <Badge variant="outline">📱 SMS</Badge>}
                    {phone.supports_voice && <Badge variant="outline">📞 Voice</Badge>}
                    {phone.supports_mms && <Badge variant="outline">🖼️ MMS</Badge>}
                    {phone.webhook_configured ? (
                      <Badge variant="default">✅ Webhooks OK</Badge>
                    ) : (
                      <Badge variant="destructive">⚠️ Configure Webhooks</Badge>
                    )}
                    {phone.sync_source === 'twilio' && (
                      <Badge variant="secondary" className="gap-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                        🔄 Twilio
                      </Badge>
                    )}
                    {phone.sync_source === 'vonage' && (
                      <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                        🔄 Vonage
                      </Badge>
                    )}
                  </div>

                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full">
                        <Link className="h-4 w-4 mr-2" />
                        Ver URLs de Webhook
                        <ChevronDown className="h-4 w-4 ml-auto" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="space-y-2 mt-2 p-4 bg-muted/50 rounded-lg">
                        <div>
                          <Label className="text-xs">SMS Inbound (Receber SMS)</Label>
                          <div className="flex gap-2">
                            <Input 
                              readOnly 
                              value={webhooks.smsInbound.url}
                              className="font-mono text-xs"
                            />
                            <Button 
                              size="icon" 
                              variant="outline"
                              onClick={() => handleCopyUrl(webhooks.smsInbound.url)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Método: {webhooks.smsInbound.method}
                          </p>
                        </div>

                        <div>
                          <Label className="text-xs">Voice Inbound (Receber Chamadas)</Label>
                          <div className="flex gap-2">
                            <Input 
                              readOnly 
                              value={webhooks.voiceInbound.url}
                              className="font-mono text-xs"
                            />
                            <Button 
                              size="icon" 
                              variant="outline"
                              onClick={() => handleCopyUrl(webhooks.voiceInbound.url)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Método: {webhooks.voiceInbound.method}
                          </p>
                        </div>

                        <Button 
                          variant="default" 
                          size="sm" 
                          className="w-full mt-2"
                          onClick={() => handleCopyAll(phone)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar Todas as URLs
                        </Button>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {!phone.webhook_configured && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Configure os Webhooks</AlertTitle>
                      <AlertDescription className="text-xs">
                        <ol className="list-decimal list-inside space-y-1 mt-2">
                          <li>Copie as URLs acima</li>
                          <li>
                            Acesse o {phone.provider === 'vonage' ? 'Vonage Dashboard' : 'Twilio Console'}
                          </li>
                          <li>Configure cada webhook no número</li>
                          <li>Clique em "Testar" abaixo para verificar</li>
                        </ol>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {phone.supports_sms && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleTestWebhook(phone, 'sms')}
                        disabled={testWebhookMutation.isPending}
                      >
                        Testar SMS
                      </Button>
                    )}
                    {phone.supports_voice && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleTestWebhook(phone, 'voice')}
                        disabled={testWebhookMutation.isPending}
                      >
                        Testar Voice
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEdit(phone)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleToggleActive(phone)}
                      disabled={updateMutation.isPending}
                    >
                      {phone.is_active ? (
                        <><EyeOff className="h-4 w-4 mr-2" />Desativar</>
                      ) : (
                        <><Eye className="h-4 w-4 mr-2" />Ativar</>
                      )}
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => setDeleteId(phone.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <PhoneNumberDialog 
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingPhone(null);
        }}
        editingPhone={editingPhone}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este número? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
