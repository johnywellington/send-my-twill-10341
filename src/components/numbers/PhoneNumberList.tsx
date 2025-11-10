import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Copy, Link, Edit, Trash2, Eye, EyeOff, AlertCircle, ChevronDown, Loader2, Activity, AlertTriangle } from "lucide-react";
import { usePhoneNumbers, useDeletePhoneNumber, useUpdatePhoneNumber, type PhoneNumber } from "@/hooks/use-phone-numbers";
import { useOrphanedNumbers } from "@/features/admin/hooks/use-orphaned-numbers";
import { useProviderCredentials } from "@/hooks/use-provider-credentials";
import { getWebhookUrls, copyAllWebhooksToClipboard, copyWebhookUrl } from "@/lib/webhook-utils";
import { toast } from "sonner";
import { PhoneNumberDialog } from "./PhoneNumberDialog";
import { WebhookHealthDialog } from "./WebhookHealthDialog";

export const PhoneNumberList = () => {
  const { data: phoneNumbers, isLoading } = usePhoneNumbers();
  const { data: orphanedData } = useOrphanedNumbers();
  const { data: credentials } = useProviderCredentials();
  const orphanedIds = orphanedData?.orphanedIds || new Set();
  
  const deleteMutation = useDeletePhoneNumber();
  const updateMutation = useUpdatePhoneNumber();

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingPhone, setEditingPhone] = useState<PhoneNumber | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [validationDialogPhone, setValidationDialogPhone] = useState<PhoneNumber | null>(null);

  const isOrphan = (numberId: string) => {
    return orphanedIds.has(numberId);
  };

  const getOrphanDetails = (numberId: string) => {
    return orphanedData?.orphanedNumbers.find((o) => o.id === numberId);
  };

  const getCredentialInfo = (credentialId: string | null | undefined) => {
    if (!credentialId || !credentials) return null;
    return credentials.find(c => c.id === credentialId);
  };

  const getCredentialBadgeColor = (provider: string, credentialId: string | null | undefined) => {
    const credential = getCredentialInfo(credentialId);
    if (!credential) {
      return provider === 'twilio' 
        ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' 
        : 'bg-green-500/10 text-green-600 border-green-500/20';
    }
    
    // Generate consistent color based on credential name
    const colors = [
      'bg-blue-500/10 text-blue-600 border-blue-500/20',
      'bg-purple-500/10 text-purple-600 border-purple-500/20',
      'bg-pink-500/10 text-pink-600 border-pink-500/20',
      'bg-orange-500/10 text-orange-600 border-orange-500/20',
      'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
      'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    ];
    const hash = credential.credential_name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

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

  const twilioNumbers = filteredNumbers?.filter(phone => phone.provider === 'twilio') || [];
  const vonageNumbers = filteredNumbers?.filter(phone => phone.provider === 'vonage') || [];

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

  const renderPhoneCard = (phone: PhoneNumber) => {
    const webhooks = getWebhookUrls(phone.phone_number, phone.provider);
    const credentialInfo = getCredentialInfo(phone.credential_id);
    
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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="outline"
                    className={getCredentialBadgeColor(phone.provider, phone.credential_id)}
                  >
                    {phone.provider.toUpperCase()}
                    {credentialInfo && ` • ${credentialInfo.credential_name}`}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs">
                  <div className="space-y-1 text-xs">
                    <p className="font-semibold">Provedor: {phone.provider.toUpperCase()}</p>
                    {credentialInfo ? (
                      <>
                        <p>Conta: <span className="font-medium">{credentialInfo.credential_name}</span></p>
                        <p className="text-muted-foreground font-mono text-[10px]">
                          {credentialInfo.account_identifier}
                        </p>
                        {credentialInfo.is_default && (
                          <Badge variant="secondary" className="text-[10px] mt-1">Padrão</Badge>
                        )}
                      </>
                    ) : (
                      <p className="text-muted-foreground">Conta não identificada</p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
            
            {isOrphan(phone.id) && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge 
                      variant="destructive" 
                      className="cursor-help animate-pulse"
                    >
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Órfão
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <div className="space-y-2">
                      <p className="font-semibold text-sm">⚠️ Número Órfão Detectado</p>
                      <p className="text-xs">
                        Este número foi deletado do {phone.provider === 'twilio' ? 'Twilio' : 'Vonage'} mas ainda existe no banco de dados local.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Detectado em: {getOrphanDetails(phone.id) 
                          ? new Date(getOrphanDetails(phone.id)!.detected_at).toLocaleString('pt-BR')
                          : 'N/A'
                        }
                      </p>
                      <p className="text-xs text-destructive font-medium">
                        💡 Sincronize novamente para ver a opção de remover
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
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
            <Button
              variant="outline" 
              size="sm"
              onClick={() => setValidationDialogPhone(phone)}
            >
              <Activity className="h-4 w-4 mr-2" />
              Validar
            </Button>
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
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex gap-4">
          <Input
            placeholder="Pesquisar por número ou nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {/* Números Twilio */}
        {twilioNumbers.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    📱 Números Twilio
                  </CardTitle>
                  <CardDescription>
                    {twilioNumbers.length} número(s) configurado(s)
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  TWILIO
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {twilioNumbers.map(renderPhoneCard)}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Números Vonage */}
        {vonageNumbers.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    📞 Números Vonage
                  </CardTitle>
                  <CardDescription>
                    {vonageNumbers.length} número(s) configurado(s)
                  </CardDescription>
                </div>
                <Badge variant="default" className="bg-green-600">
                  VONAGE
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {vonageNumbers.map(renderPhoneCard)}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mensagem quando não há números */}
        {twilioNumbers.length === 0 && vonageNumbers.length === 0 && searchTerm && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Nenhum número encontrado com o termo "{searchTerm}".</p>
            </CardContent>
          </Card>
        )}
      </div>

      <PhoneNumberDialog 
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingPhone(null);
        }}
        editingPhone={editingPhone}
      />

      {validationDialogPhone && (
        <WebhookHealthDialog
          phoneNumber={validationDialogPhone}
          open={!!validationDialogPhone}
          onOpenChange={(open) => !open && setValidationDialogPhone(null)}
        />
      )}

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
