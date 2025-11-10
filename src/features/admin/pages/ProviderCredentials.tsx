import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, CheckCircle2, XCircle, Star, Download, BarChart3, ChevronDown, ChevronRight, FolderOpen, RefreshCw, Key, Lock } from "lucide-react";
import { useState } from "react";
import { useProviderCredentials, useCreateProviderCredential, useUpdateProviderCredential, useDeleteProviderCredential, ProviderCredential } from "@/hooks/use-provider-credentials";
import { useImportCredentials } from "@/hooks/use-import-credentials";
import { CredentialDialog } from "@/components/credentials/CredentialDialog";
import { CredentialSecretsDialog } from "@/components/credentials/CredentialSecretsDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCredentialStats } from "@/hooks/use-credential-stats";
import { CredentialStatsCard } from "@/components/credentials/CredentialStatsCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubaccounts, useCreateSubaccount, useUpdateSubaccount, useDeleteSubaccount, useSyncSubaccounts } from "@/hooks/use-provider-subaccounts";
import { SubaccountDialog } from "@/components/credentials/SubaccountDialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function ProviderCredentials() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<ProviderCredential | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [credentialToDelete, setCredentialToDelete] = useState<string | null>(null);
  const [expandedCredentials, setExpandedCredentials] = useState<Set<string>>(new Set());
  const [subaccountDialogOpen, setSubaccountDialogOpen] = useState(false);
  const [selectedParentCredential, setSelectedParentCredential] = useState<{ id: string; provider: 'twilio' | 'vonage' } | null>(null);
  const [deleteSubaccountDialogOpen, setDeleteSubaccountDialogOpen] = useState(false);
  const [subaccountToDelete, setSubaccountToDelete] = useState<string | null>(null);
  const [secretsDialogOpen, setSecretsDialogOpen] = useState(false);
  const [selectedCredentialForSecrets, setSelectedCredentialForSecrets] = useState<ProviderCredential | null>(null);

  const { data: credentials, isLoading } = useProviderCredentials();
  const { data: allStats, isLoading: statsLoading } = useCredentialStats();
  const { data: allSubaccounts } = useSubaccounts();
  const createMutation = useCreateProviderCredential();
  const updateMutation = useUpdateProviderCredential();
  const deleteMutation = useDeleteProviderCredential();
  const importCredentials = useImportCredentials();
  const createSubaccount = useCreateSubaccount();
  const updateSubaccount = useUpdateSubaccount();
  const deleteSubaccountMutation = useDeleteSubaccount();
  const syncSubaccounts = useSyncSubaccounts();

  const handleOpenDialog = (credential?: ProviderCredential) => {
    setEditingCredential(credential);
    setDialogOpen(true);
  };

  const handleSave = async (data: Partial<ProviderCredential>): Promise<ProviderCredential> => {
    if (editingCredential) {
      await updateMutation.mutateAsync({ id: editingCredential.id, ...data });
      setDialogOpen(false);
      setEditingCredential(undefined);
      return editingCredential; // Return the edited credential
    } else {
      const result = await createMutation.mutateAsync(data as any);
      // Don't close dialog here - let CredentialDialog handle the flow
      return result as ProviderCredential;
    }
  };

  const handleSecretsConfig = (credential: ProviderCredential) => {
    setSelectedCredentialForSecrets(credential);
    setSecretsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (credentialToDelete) {
      await deleteMutation.mutateAsync(credentialToDelete);
      setDeleteDialogOpen(false);
      setCredentialToDelete(null);
    }
  };

  const handleCreateSubaccount = async (data: any) => {
    await createSubaccount.mutateAsync(data);
    setSubaccountDialogOpen(false);
    setSelectedParentCredential(null);
  };

  const handleDeleteSubaccount = async () => {
    if (subaccountToDelete) {
      await deleteSubaccountMutation.mutateAsync(subaccountToDelete);
      setDeleteSubaccountDialogOpen(false);
      setSubaccountToDelete(null);
    }
  };

  const toggleExpanded = (credentialId: string) => {
    setExpandedCredentials(prev => {
      const newSet = new Set(prev);
      if (newSet.has(credentialId)) {
        newSet.delete(credentialId);
      } else {
        newSet.add(credentialId);
      }
      return newSet;
    });
  };

  const getSubaccountsForCredential = (credentialId: string) => {
    return allSubaccounts?.filter(s => s.parent_credential_id === credentialId) || [];
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
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => importCredentials.mutate()}
            disabled={importCredentials.isPending}
          >
            <Download className="h-4 w-4 mr-2" />
            {importCredentials.isPending ? 'Importando...' : 'Importar Credenciais'}
          </Button>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Credencial
          </Button>
        </div>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="list">Lista de Credenciais</TabsTrigger>
          <TabsTrigger value="stats">
            <BarChart3 className="h-4 w-4 mr-2" />
            Estatísticas de Uso
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6">
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
                twilioCredentials.map((cred) => {
                  const isExpanded = expandedCredentials.has(cred.id);
                  const subaccounts = getSubaccountsForCredential(cred.id);
                  
                  return (
                    <Collapsible key={cred.id} open={isExpanded} onOpenChange={() => toggleExpanded(cred.id)}>
                      <div className="border rounded-lg bg-card/50">
                        <div className="flex items-center justify-between p-3">
                          <div className="flex items-center gap-2 flex-1">
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </Button>
                            </CollapsibleTrigger>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{cred.credential_name}</p>
                                {cred.is_default && (
                                  <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                                )}
                                {subaccounts.length > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    {subaccounts.length} subconta{subaccounts.length !== 1 ? 's' : ''}
                                  </Badge>
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
                                {cred.secret_key ? (
                                  <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/20">
                                    <Lock className="h-3 w-3 mr-1" />
                                    Secrets Configurados
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                                    <Key className="h-3 w-3 mr-1" />
                                    Secrets Pendentes
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedCredentialForSecrets(cred);
                                setSecretsDialogOpen(true);
                              }}
                              title="Editar Secrets"
                            >
                              <Key className="h-4 w-4" />
                            </Button>
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

                        <CollapsibleContent>
                          <div className="px-3 pb-3 ml-8 space-y-2 border-t pt-3">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => syncSubaccounts.mutate(cred.id)}
                                disabled={syncSubaccounts.isPending}
                              >
                                <RefreshCw className={`h-3 w-3 mr-2 ${syncSubaccounts.isPending ? 'animate-spin' : ''}`} />
                                Sincronizar
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedParentCredential({ id: cred.id, provider: 'twilio' });
                                  setSubaccountDialogOpen(true);
                                }}
                              >
                                <Plus className="h-3 w-3 mr-2" />
                                Criar Subconta
                              </Button>
                            </div>

                            {subaccounts.length > 0 && (
                              <div className="space-y-2 mt-3">
                                {subaccounts.map((sub) => (
                                  <div key={sub.id} className="flex items-center justify-between p-2 border rounded bg-background/50">
                                    <div className="flex items-center gap-2 flex-1">
                                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                                      <div>
                                        <p className="text-sm font-medium">{sub.subaccount_name}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {sub.subaccount_sid || sub.subaccount_api_key}
                                        </p>
                                      </div>
                                      {sub.is_active ? (
                                        <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/20">
                                          Ativa
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-xs bg-gray-500/10 text-gray-500 border-gray-500/20">
                                          Inativa
                                        </Badge>
                                      )}
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => {
                                        setSubaccountToDelete(sub.id);
                                        setDeleteSubaccountDialogOpen(true);
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3 text-destructive" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })
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
                vonageCredentials.map((cred) => {
                  const isExpanded = expandedCredentials.has(cred.id);
                  const subaccounts = getSubaccountsForCredential(cred.id);
                  
                  return (
                    <Collapsible key={cred.id} open={isExpanded} onOpenChange={() => toggleExpanded(cred.id)}>
                      <div className="border rounded-lg bg-card/50">
                        <div className="flex items-center justify-between p-3">
                          <div className="flex items-center gap-2 flex-1">
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </Button>
                            </CollapsibleTrigger>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{cred.credential_name}</p>
                                {cred.is_default && (
                                  <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                                )}
                                {subaccounts.length > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    {subaccounts.length} subconta{subaccounts.length !== 1 ? 's' : ''}
                                  </Badge>
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
                                {cred.secret_key ? (
                                  <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/20">
                                    <Lock className="h-3 w-3 mr-1" />
                                    Secrets Configurados
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                                    <Key className="h-3 w-3 mr-1" />
                                    Secrets Pendentes
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedCredentialForSecrets(cred);
                                setSecretsDialogOpen(true);
                              }}
                              title="Editar Secrets"
                            >
                              <Key className="h-4 w-4" />
                            </Button>
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

                        <CollapsibleContent>
                          <div className="px-3 pb-3 ml-8 space-y-2 border-t pt-3">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => syncSubaccounts.mutate(cred.id)}
                                disabled={syncSubaccounts.isPending}
                              >
                                <RefreshCw className={`h-3 w-3 mr-2 ${syncSubaccounts.isPending ? 'animate-spin' : ''}`} />
                                Sincronizar
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedParentCredential({ id: cred.id, provider: 'vonage' });
                                  setSubaccountDialogOpen(true);
                                }}
                              >
                                <Plus className="h-3 w-3 mr-2" />
                                Criar Subconta
                              </Button>
                            </div>

                            {subaccounts.length > 0 && (
                              <div className="space-y-2 mt-3">
                                {subaccounts.map((sub) => (
                                  <div key={sub.id} className="flex items-center justify-between p-2 border rounded bg-background/50">
                                    <div className="flex items-center gap-2 flex-1">
                                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                                      <div>
                                        <p className="text-sm font-medium">{sub.subaccount_name}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {sub.subaccount_api_key}
                                        </p>
                                        {sub.use_parent_balance && (
                                          <Badge variant="outline" className="text-xs mt-1">
                                            Saldo compartilhado
                                          </Badge>
                                        )}
                                      </div>
                                      {sub.is_active ? (
                                        <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/20">
                                          Ativa
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-xs bg-gray-500/10 text-gray-500 border-gray-500/20">
                                          Inativa
                                        </Badge>
                                      )}
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => {
                                        setSubaccountToDelete(sub.id);
                                        setDeleteSubaccountDialogOpen(true);
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3 text-destructive" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </TabsContent>

    <TabsContent value="stats" className="mt-6">
      {statsLoading ? (
        <div className="grid gap-6">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : allStats && Array.isArray(allStats) && allStats.length > 0 ? (
        <div className="grid gap-6">
          {allStats.map((stats) => (
            <CredentialStatsCard key={stats.credentialId} stats={stats} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma estatística disponível ainda</p>
            <p className="text-sm mt-2">Comece a usar suas credenciais para ver estatísticas aqui</p>
          </CardContent>
        </Card>
      )}
    </TabsContent>
  </Tabs>

      <CredentialDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingCredential(undefined);
        }}
        credential={editingCredential}
        onSave={handleSave}
        isLoading={createMutation.isPending || updateMutation.isPending}
        onSecretsConfig={handleSecretsConfig}
      />

      <CredentialSecretsDialog
        open={secretsDialogOpen}
        onOpenChange={setSecretsDialogOpen}
        credential={selectedCredentialForSecrets}
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

      <AlertDialog open={deleteSubaccountDialogOpen} onOpenChange={setDeleteSubaccountDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão de Subconta</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta subconta? Esta ação não pode ser desfeita.
              A subconta também será removida do provedor (Twilio/Vonage).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSubaccount} className="bg-destructive text-destructive-foreground">
              Deletar Subconta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedParentCredential && (
        <SubaccountDialog
          open={subaccountDialogOpen}
          onOpenChange={setSubaccountDialogOpen}
          parentCredentialId={selectedParentCredential.id}
          provider={selectedParentCredential.provider}
          onSubmit={handleCreateSubaccount}
          isLoading={createSubaccount.isPending}
        />
      )}
    </div>
  );
}
