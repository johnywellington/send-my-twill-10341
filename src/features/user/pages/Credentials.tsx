import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  useProviderCredentials, 
  useCreateProviderCredential, 
  useUpdateProviderCredential, 
  useDeleteProviderCredential,
  ProviderCredential 
} from "@/shared/hooks/use-provider-credentials";
import { useTestCredentialConnection } from "@/shared/hooks/use-test-credential-connection";
import { Key, Plus, Trash2, Edit2, Star, Wifi, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Credentials() {
  const { data: credentials, isLoading } = useProviderCredentials();
  const createCredential = useCreateProviderCredential();
  const updateCredential = useUpdateProviderCredential();
  const deleteCredential = useDeleteProviderCredential();
  const testConnection = useTestCredentialConnection();

  const [testingCredentialId, setTestingCredentialId] = useState<string | null>(null);

  const handleTestConnection = async (credentialId: string) => {
    setTestingCredentialId(credentialId);
    try {
      const result = await testConnection.mutateAsync(credentialId);
      if (result.success) {
        toast({ title: "Conexão OK", description: "Credenciais válidas e funcionando!" });
      } else {
        toast({ 
          title: "Falha na conexão", 
          description: result.error || "Verifique as credenciais", 
          variant: "destructive" 
        });
      }
    } catch (error) {
      toast({ 
        title: "Erro ao testar", 
        description: error instanceof Error ? error.message : "Erro desconhecido", 
        variant: "destructive" 
      });
    } finally {
      setTestingCredentialId(null);
    }
  };

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<ProviderCredential | null>(null);
  const [formData, setFormData] = useState({
    provider: 'twilio' as 'twilio' | 'vonage',
    credential_name: '',
    account_identifier: '',
    secret_key: '',
    is_default: false,
  });

  const resetForm = () => {
    setFormData({
      provider: 'twilio',
      credential_name: '',
      account_identifier: '',
      secret_key: '',
      is_default: false,
    });
    setEditingCredential(null);
  };

  const handleOpenDialog = (credential?: ProviderCredential) => {
    if (credential) {
      setEditingCredential(credential);
      setFormData({
        provider: credential.provider,
        credential_name: credential.credential_name,
        account_identifier: credential.account_identifier,
        secret_key: '',
        is_default: credential.is_default,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.credential_name.trim()) {
      toast({ title: "Erro", description: "Nome da credencial é obrigatório", variant: "destructive" });
      return;
    }

    if (!formData.account_identifier.trim()) {
      toast({ title: "Erro", description: "Identificador da conta é obrigatório", variant: "destructive" });
      return;
    }

    try {
      if (editingCredential) {
        await updateCredential.mutateAsync({
          id: editingCredential.id,
          credential_name: formData.credential_name,
          account_identifier: formData.account_identifier,
          is_default: formData.is_default,
          ...(formData.secret_key && { secret_key: formData.secret_key }),
        });
      } else {
        if (!formData.secret_key.trim()) {
          toast({ title: "Erro", description: "Chave secreta é obrigatória para novas credenciais", variant: "destructive" });
          return;
        }
        await createCredential.mutateAsync({
          provider: formData.provider,
          credential_name: formData.credential_name,
          account_identifier: formData.account_identifier,
          secret_key: formData.secret_key,
          is_default: formData.is_default,
          is_active: true,
        });
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar credencial:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCredential.mutateAsync(id);
    } catch (error) {
      console.error('Erro ao deletar credencial:', error);
    }
  };

  const handleSetDefault = async (credential: ProviderCredential) => {
    try {
      // Remove default from other credentials of same provider
      const sameProviderCredentials = credentials?.filter(c => c.provider === credential.provider && c.id !== credential.id) || [];
      for (const cred of sameProviderCredentials) {
        if (cred.is_default) {
          await updateCredential.mutateAsync({ id: cred.id, is_default: false });
        }
      }
      // Set this one as default
      await updateCredential.mutateAsync({ id: credential.id, is_default: true });
    } catch (error) {
      console.error('Erro ao definir credencial padrão:', error);
    }
  };

  const twilioCredentials = credentials?.filter(c => c.provider === 'twilio') || [];
  const vonageCredentials = credentials?.filter(c => c.provider === 'vonage') || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Credenciais</h1>
          <p className="text-muted-foreground">
            Gerencie suas credenciais de API Twilio e Vonage
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Credencial
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingCredential ? 'Editar Credencial' : 'Nova Credencial'}
                </DialogTitle>
                <DialogDescription>
                  {editingCredential 
                    ? 'Atualize os dados da credencial. Deixe a chave secreta em branco para manter a atual.'
                    : 'Adicione uma nova credencial de API para Twilio ou Vonage.'
                  }
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Provedor</Label>
                  <Select
                    value={formData.provider}
                    onValueChange={(v: 'twilio' | 'vonage') => setFormData(prev => ({ ...prev, provider: v }))}
                    disabled={!!editingCredential}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="twilio">Twilio</SelectItem>
                      <SelectItem value="vonage">Vonage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Nome da Credencial</Label>
                  <Input
                    value={formData.credential_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, credential_name: e.target.value }))}
                    placeholder="Ex: Conta Principal"
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    {formData.provider === 'twilio' ? 'Account SID' : 'API Key'}
                  </Label>
                  <Input
                    value={formData.account_identifier}
                    onChange={(e) => setFormData(prev => ({ ...prev, account_identifier: e.target.value }))}
                    placeholder={formData.provider === 'twilio' ? 'AC...' : 'Sua API Key'}
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    {formData.provider === 'twilio' ? 'Auth Token' : 'API Secret'}
                    {editingCredential && <span className="text-muted-foreground text-xs ml-2">(opcional)</span>}
                  </Label>
                  <Input
                    type="password"
                    value={formData.secret_key}
                    onChange={(e) => setFormData(prev => ({ ...prev, secret_key: e.target.value }))}
                    placeholder={editingCredential ? '••••••••' : 'Sua chave secreta'}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="is_default">Definir como padrão</Label>
                  <Switch
                    id="is_default"
                    checked={formData.is_default}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_default: checked }))}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createCredential.isPending || updateCredential.isPending}>
                  {(createCredential.isPending || updateCredential.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingCredential ? 'Salvar' : 'Adicionar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Twilio Credentials */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-8 w-8 rounded bg-red-100 dark:bg-red-900 flex items-center justify-center">
                  <span className="text-red-600 dark:text-red-400 font-bold text-sm">T</span>
                </div>
                Twilio
              </CardTitle>
              <CardDescription>
                {twilioCredentials.length} credencial(is) configurada(s)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {twilioCredentials.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Key className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma credencial Twilio</p>
                  <Button variant="link" onClick={() => {
                    setFormData(prev => ({ ...prev, provider: 'twilio' }));
                    handleOpenDialog();
                  }}>
                    Adicionar credencial
                  </Button>
                </div>
              ) : (
                twilioCredentials.map((cred) => (
                  <CredentialCard
                    key={cred.id}
                    credential={cred}
                    onEdit={() => handleOpenDialog(cred)}
                    onDelete={() => handleDelete(cred.id)}
                    onSetDefault={() => handleSetDefault(cred)}
                    onTest={() => handleTestConnection(cred.id)}
                    isDeleting={deleteCredential.isPending}
                    isTesting={testingCredentialId === cred.id}
                  />
                ))
              )}
            </CardContent>
          </Card>

          {/* Vonage Credentials */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-8 w-8 rounded bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <span className="text-purple-600 dark:text-purple-400 font-bold text-sm">V</span>
                </div>
                Vonage
              </CardTitle>
              <CardDescription>
                {vonageCredentials.length} credencial(is) configurada(s)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {vonageCredentials.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Key className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma credencial Vonage</p>
                  <Button variant="link" onClick={() => {
                    setFormData(prev => ({ ...prev, provider: 'vonage' }));
                    handleOpenDialog();
                  }}>
                    Adicionar credencial
                  </Button>
                </div>
              ) : (
                vonageCredentials.map((cred) => (
                  <CredentialCard
                    key={cred.id}
                    credential={cred}
                    onEdit={() => handleOpenDialog(cred)}
                    onDelete={() => handleDelete(cred.id)}
                    onSetDefault={() => handleSetDefault(cred)}
                    onTest={() => handleTestConnection(cred.id)}
                    isDeleting={deleteCredential.isPending}
                    isTesting={testingCredentialId === cred.id}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

interface CredentialCardProps {
  credential: ProviderCredential;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  onTest: () => void;
  isDeleting: boolean;
  isTesting: boolean;
}

function CredentialCard({ credential, onEdit, onDelete, onSetDefault, onTest, isDeleting, isTesting }: CredentialCardProps) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-medium">{credential.credential_name}</span>
            {credential.is_default && (
              <Badge variant="secondary" className="text-xs">
                <Star className="h-3 w-3 mr-1" />
                Padrão
              </Badge>
            )}
          </div>
          <span className="text-sm text-muted-foreground font-mono">
            {credential.account_identifier.substring(0, 8)}...
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onTest} 
          disabled={isTesting}
          title="Testar conexão"
        >
          {isTesting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Wifi className="h-4 w-4" />
          )}
        </Button>
        {!credential.is_default && (
          <Button variant="ghost" size="icon" onClick={onSetDefault} title="Definir como padrão">
            <Star className="h-4 w-4" />
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={onEdit}>
          <Edit2 className="h-4 w-4" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover credencial?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. A credencial "{credential.credential_name}" será removida permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete} disabled={isDeleting}>
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Remover'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}