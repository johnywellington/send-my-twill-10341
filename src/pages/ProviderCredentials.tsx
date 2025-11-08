import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, CheckCircle2, XCircle, Star } from "lucide-react";
import { useState } from "react";
import { useProviderCredentials, useCreateProviderCredential, useUpdateProviderCredential, useDeleteProviderCredential, ProviderCredential } from "@/hooks/use-provider-credentials";
import { CredentialDialog } from "@/components/credentials/CredentialDialog";

export default function ProviderCredentials() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<ProviderCredential | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [credentialToDelete, setCredentialToDelete] = useState<string | null>(null);

  const { data: credentials, isLoading } = useProviderCredentials();
  const createMutation = useCreateProviderCredential();
  const updateMutation = useUpdateProviderCredential();
  const deleteMutation = useDeleteProviderCredential();

  const handleOpenDialog = (credential?: ProviderCredential) => {
    setEditingCredential(credential);
    setDialogOpen(true);
  };

  const handleSave = async (data: Partial<ProviderCredential>) => {
    if (editingCredential) {
      await updateMutation.mutateAsync({ id: editingCredential.id, ...data });
    } else {
      await createMutation.mutateAsync(data as any);
    }
    setDialogOpen(false);
    setEditingCredential(undefined);
  };

  const handleDelete = async () => {
    if (credentialToDelete) {
      await deleteMutation.mutateAsync(credentialToDelete);
      setDeleteDialogOpen(false);
      setCredentialToDelete(null);
    }
  };

  const getProviderColor = (provider: string) => {
    return provider === 'twilio' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20';
  };

  const twilioCredentials = credentials?.filter(c => c.provider === 'twilio') || [];
  const vonageCredentials = credentials?.filter(c => c.provider === 'vonage') || [];

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Credenciais de Provedores</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie múltiplas contas Twilio e Vonage
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Credencial
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Twilio Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                  Twilio
                </Badge>
                <span className="text-sm font-normal text-muted-foreground">
                  ({twilioCredentials.length} {twilioCredentials.length === 1 ? 'conta' : 'contas'})
                </span>
              </CardTitle>
              <CardDescription>Contas Twilio configuradas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {twilioCredentials.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma conta Twilio configurada
                </p>
              ) : (
                twilioCredentials.map((cred) => (
                  <div key={cred.id} className="flex items-center justify-between p-3 border rounded-lg bg-card/50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{cred.credential_name}</p>
                        {cred.is_default && (
                          <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {cred.account_identifier}
                      </p>
                      <div className="flex gap-2 mt-2">
                        {cred.is_active ? (
                          <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/20">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Ativa
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-gray-500/10 text-gray-500 border-gray-500/20">
                            <XCircle className="h-3 w-3 mr-1" />
                            Inativa
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(cred)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setCredentialToDelete(cred.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Vonage Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                  Vonage
                </Badge>
                <span className="text-sm font-normal text-muted-foreground">
                  ({vonageCredentials.length} {vonageCredentials.length === 1 ? 'conta' : 'contas'})
                </span>
              </CardTitle>
              <CardDescription>Contas Vonage configuradas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {vonageCredentials.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma conta Vonage configurada
                </p>
              ) : (
                vonageCredentials.map((cred) => (
                  <div key={cred.id} className="flex items-center justify-between p-3 border rounded-lg bg-card/50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{cred.credential_name}</p>
                        {cred.is_default && (
                          <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {cred.account_identifier}
                      </p>
                      <div className="flex gap-2 mt-2">
                        {cred.is_active ? (
                          <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/20">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Ativa
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-gray-500/10 text-gray-500 border-gray-500/20">
                            <XCircle className="h-3 w-3 mr-1" />
                            Inativa
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(cred)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setCredentialToDelete(cred.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <CredentialDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingCredential(undefined);
        }}
        credential={editingCredential}
        onSave={handleSave}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta credencial? Esta ação não pode ser desfeita.
              Os números associados não serão deletados, mas perderão a referência à conta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
