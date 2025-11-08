import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Copy, Trash2, Plus, Search, Loader2, Users, Scan, QrCode, PhoneCall, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSIPUsers } from "@/hooks/use-sip-users";
import { SIPUserDialog } from "./SIPUserDialog";
import QRCode from "react-qr-code";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSIPConnectivityTest } from "@/hooks/use-sip-connectivity-test";
import { Check, X, AlertCircle } from "lucide-react";
import { OrphanedResourcesDialog } from "./OrphanedResourcesDialog";
import { useCleanupOrphanedResources } from "@/hooks/use-cleanup-orphaned-resources";
import { formatSIPUri, getProviderIcon } from "@/lib/sip-utils";
import { useProvider } from "@/contexts/ProviderContext";
import { CredentialBadge } from "./CredentialBadge";
import { SyncEndpointsButton } from "./SyncEndpointsButton";
import { OrphanedUsersDialog } from "./OrphanedUsersDialog";
import { useSIPTestCall } from "@/hooks/use-sip-test-call";
import { useRecoverVonageEndpoints } from "@/hooks/use-recover-vonage-endpoints";

export function UsersContent() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [orphanedDialogOpen, setOrphanedDialogOpen] = useState(false);
  const [orphanedUsers, setOrphanedUsers] = useState<any[]>([]);
  const [orphanedResourcesDialogOpen, setOrphanedResourcesDialogOpen] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [selectedUserForTest, setSelectedUserForTest] = useState<any>(null);
  const [showQRCodeDialog, setShowQRCodeDialog] = useState(false);
  const [selectedUserForQR, setSelectedUserForQR] = useState<any>(null);
  const { selectedCredentialId } = useProvider();
  const { users, isLoading, deleteUser, isDeleting } = useSIPUsers(selectedCredentialId);
  const { detectOrphansAsync, cleanupOrphans, isDetecting, isCleaning, lastDetection } = useCleanupOrphanedResources();
  const { testConnectivity, lastTest, isTesting } = useSIPConnectivityTest();
  const { startTestCall, isTestingCall } = useSIPTestCall();
  const { recoverEndpoints, isRecovering } = useRecoverVonageEndpoints();

  const handleOrphansDetected = (orphaned: any[]) => {
    setOrphanedUsers(orphaned);
    setOrphanedDialogOpen(true);
  };

  const handleCleanupOrphans = async (selectedIds: string[]) => {
    setIsCleaningUp(true);
    try {
      for (const id of selectedIds) {
        const { error } = await supabase
          .from('sip_users')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
      }
      
      toast.success(`${selectedIds.length} usuário(s) órfão(s) removido(s)`);
      setOrphanedDialogOpen(false);
      setOrphanedUsers([]);
      
      // Refresh the list
      window.location.reload();
    } catch (error: any) {
      toast.error(`Erro ao limpar órfãos: ${error.message}`);
    } finally {
      setIsCleaningUp(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const handleDeleteClick = (user: any) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (userToDelete) {
      deleteUser({
        id: userToDelete.id,
        provider: userToDelete.provider
      });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const handleDetectOrphans = async () => {
    try {
      const result = await detectOrphansAsync(undefined);
      if (result && result.count > 0) {
        setOrphanedResourcesDialogOpen(true);
      }
    } catch (error) {
      console.error('Error detecting orphans:', error);
    }
  };

  const handleCleanupOrphanedResources = (selectedIds: string[]) => {
    cleanupOrphans({ orphanedIds: selectedIds });
    setOrphanedResourcesDialogOpen(false);
  };

  const handleTestConnectivity = async (user: any) => {
    setSelectedUserForTest(user);
    await testConnectivity({
      provider: user.provider as 'twilio' | 'vonage',
      test_type: 'full'
    });
    setShowTestDialog(true);
  };

  const handleShowQRCode = (user: any) => {
    setSelectedUserForQR(user);
    setShowQRCodeDialog(true);
  };

  const handleTestCall = async (user: any) => {
    await startTestCall({
      sip_user_id: user.id,
      provider: user.provider as 'twilio' | 'vonage',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalUsers = users?.length || 0;
  const twilioUsers = users?.filter(u => u.provider === 'twilio').length || 0;
  const vonageUsers = users?.filter(u => u.provider === 'vonage').length || 0;
  const vonageUsersMissingId = users?.filter(u => u.provider === 'vonage' && !u.vonage_endpoint_id).length || 0;

  // Estatísticas de extensões
  const extensionsByProvider = {
    twilio: users?.filter(u => u.provider === 'twilio').map(u => parseInt(u.extension)).filter(n => !isNaN(n)).sort((a, b) => a - b) || [],
    vonage: users?.filter(u => u.provider === 'vonage').map(u => parseInt(u.extension)).filter(n => !isNaN(n)).sort((a, b) => a - b) || [],
  };

  const nextAvailableExt = {
    twilio: extensionsByProvider.twilio.length > 0 
      ? Math.max(...extensionsByProvider.twilio) + 1 
      : 1000,
    vonage: extensionsByProvider.vonage.length > 0 
      ? Math.max(...extensionsByProvider.vonage) + 1 
      : 1000,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Usuários SIP</h2>
        </div>
        <div className="flex gap-2">
          {vonageUsersMissingId > 0 && (
            <Button 
              variant="outline" 
              onClick={() => recoverEndpoints()}
              disabled={isRecovering}
              className="border-yellow-500/50 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-950/20"
            >
              {isRecovering ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Recuperando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Recuperar {vonageUsersMissingId} ID{vonageUsersMissingId > 1 ? 's' : ''} Faltante{vonageUsersMissingId > 1 ? 's' : ''}
                </>
              )}
            </Button>
          )}
          <SyncEndpointsButton onOrphansDetected={handleOrphansDetected} />
          <Button 
            variant="outline" 
            onClick={handleDetectOrphans}
            disabled={isDetecting}
          >
            {isDetecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <Scan className="h-4 w-4 mr-2" />
                Detectar Órfãos
              </>
            )}
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Usuário SIP
          </Button>
        </div>
      </div>

      <SIPUserDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      
      <OrphanedUsersDialog 
        open={orphanedDialogOpen}
        onOpenChange={setOrphanedDialogOpen}
        orphanedUsers={orphanedUsers}
        onCleanup={handleCleanupOrphans}
        isLoading={isCleaningUp}
      />

      {/* Test Dialog */}
      <AlertDialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {lastTest?.status === 'passed' && <Check className="h-5 w-5 text-green-600" />}
              {lastTest?.status === 'warning' && <AlertCircle className="h-5 w-5 text-yellow-600" />}
              {lastTest?.status === 'failed' && <X className="h-5 w-5 text-red-600" />}
              Teste de Conectividade - {selectedUserForTest?.sip_username}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Validação das credenciais SIP
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4">
            {/* Status Badge */}
            <div className={`p-4 rounded-lg ${
              lastTest?.status === 'passed' ? 'bg-green-50 dark:bg-green-950/20' :
              lastTest?.status === 'warning' ? 'bg-yellow-50 dark:bg-yellow-950/20' :
              'bg-red-50 dark:bg-red-950/20'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">
                    Status: {
                      lastTest?.status === 'passed' ? '✅ Aprovado' :
                      lastTest?.status === 'warning' ? '⚠️ Aviso' :
                      '❌ Falhou'
                    }
                  </p>
                  {lastTest?.latency_ms && (
                    <p className="text-sm text-muted-foreground">Latência: {lastTest.latency_ms}ms</p>
                  )}
                </div>
              </div>
            </div>

            {/* Checklist */}
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 rounded-lg border ${
                lastTest?.credentials_valid ? 'bg-green-50 dark:bg-green-950/20 border-green-200' : 'bg-red-50 dark:bg-red-950/20 border-red-200'
              }`}>
                <div className="flex items-center gap-2">
                  {lastTest?.credentials_valid ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-red-600" />}
                  <span className="text-sm font-medium">Credenciais Válidas</span>
                </div>
              </div>

              <div className={`p-3 rounded-lg border ${
                lastTest?.endpoint_registered ? 'bg-green-50 dark:bg-green-950/20 border-green-200' : 'bg-red-50 dark:bg-red-950/20 border-red-200'
              }`}>
                <div className="flex items-center gap-2">
                  {lastTest?.endpoint_registered ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-red-600" />}
                  <span className="text-sm font-medium">Endpoint Registrado</span>
                </div>
              </div>

              <div className={`p-3 rounded-lg border ${
                lastTest?.api_reachable ? 'bg-green-50 dark:bg-green-950/20 border-green-200' : 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200'
              }`}>
                <div className="flex items-center gap-2">
                  {lastTest?.api_reachable ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-yellow-600" />}
                  <span className="text-sm font-medium">API Acessível</span>
                </div>
              </div>

              <div className={`p-3 rounded-lg border ${
                lastTest?.account_status === 'active' ? 'bg-green-50 dark:bg-green-950/20 border-green-200' : 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200'
              }`}>
                <div className="flex items-center gap-2">
                  {lastTest?.account_status === 'active' ? <Check className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-yellow-600" />}
                  <span className="text-sm font-medium">Conta Ativa</span>
                </div>
              </div>
            </div>

            {/* Recomendações */}
            {lastTest?.recommendations && Array.isArray(lastTest.recommendations) && lastTest.recommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Recomendações:</h4>
                <ul className="space-y-1">
                  {lastTest.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-yellow-600 mt-0.5">•</span>
                      <span>{String(rec)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Detalhes Técnicos */}
            {(lastTest?.error_message || lastTest?.error_code) && (
              <details className="text-sm">
                <summary className="cursor-pointer font-medium">▶ Detalhes técnicos</summary>
                <div className="mt-2 p-3 bg-muted/50 rounded-lg space-y-1">
                  {lastTest.error_code && (
                    <p><span className="font-medium">Código:</span> {lastTest.error_code}</p>
                  )}
                  {lastTest.error_message && (
                    <p><span className="font-medium">Mensagem:</span> {lastTest.error_message}</p>
                  )}
                </div>
              </details>
            )}
          </div>

          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setShowTestDialog(false)}>
              Entendi
            </Button>
            <Button 
              onClick={() => handleTestConnectivity(selectedUserForTest)}
              disabled={isTesting}
            >
              {isTesting ? 'Testando...' : 'Testar Novamente'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <OrphanedResourcesDialog
        open={orphanedResourcesDialogOpen}
        onOpenChange={setOrphanedResourcesDialogOpen}
        orphanedResources={lastDetection?.orphaned || []}
        onCleanup={handleCleanupOrphanedResources}
        isLoading={isCleaning}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Usuários</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalUsers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Twilio</CardTitle>
            <CardDescription className="font-mono text-xs">
              Próxima: {nextAvailableExt.twilio}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{twilioUsers}</p>
            <div className="flex gap-1 mt-2 flex-wrap">
              {extensionsByProvider.twilio?.map(ext => (
                <Badge key={ext} variant="outline" className="text-xs font-mono">
                  {ext}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Vonage</CardTitle>
            <CardDescription className="font-mono text-xs">
              Próxima: {nextAvailableExt.vonage}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{vonageUsers}</p>
            <div className="flex gap-1 mt-2 flex-wrap">
              {extensionsByProvider.vonage?.map(ext => (
                <Badge key={ext} variant="outline" className="text-xs font-mono">
                  {ext}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardHeader>
            <CardTitle className="text-sm">Última Criada</CardTitle>
          </CardHeader>
          <CardContent>
            {users && users.length > 0 ? (
              <>
                <p className="text-2xl font-bold font-mono">{users[0].extension}</p>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {users[0].display_name || users[0].sip_username}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">-</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
          <CardDescription>Gerenciar ramais e credenciais SIP</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SIP URI</TableHead>
                  <TableHead>Ramal</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Credencial</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users && users.length > 0 ? (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-mono text-sm">
                        {formatSIPUri(user.sip_username, user.sip_domain)}
                      </TableCell>
                      <TableCell>{user.extension}</TableCell>
                      <TableCell>{user.display_name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getProviderIcon(user.provider as 'twilio' | 'vonage')} {user.provider}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <CredentialBadge credential={user.credential} size="sm" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={user.is_active ? "default" : "secondary"}>
                            {user.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                          {user.provider === 'vonage' && !user.vonage_endpoint_id && (
                            <Badge 
                              variant="destructive" 
                              className="text-xs"
                              title="ID da API Vonage não configurado. Clique em 'Recuperar IDs Faltantes'"
                            >
                              ID Faltando
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleTestCall(user)}
                            disabled={isTestingCall}
                            title="Testar Áudio (1 min)"
                            className="text-green-600 hover:text-green-700"
                          >
                            <PhoneCall className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleShowQRCode(user)}
                            title="QR Code para Configuração"
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleTestConnectivity(user)}
                            disabled={isTesting}
                            title="Testar Conectividade"
                          >
                            <Search className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard(formatSIPUri(user.sip_username, user.sip_domain), 'SIP URI')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteClick(user)}
                            disabled={isDeleting}
                            className="text-destructive hover:text-destructive"
                          >
                            {isDeleting && userToDelete?.id === user.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* QR Code Dialog */}
      <AlertDialog open={showQRCodeDialog} onOpenChange={setShowQRCodeDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Configuração via QR Code
            </AlertDialogTitle>
            <AlertDialogDescription>
              Escaneie o QR Code abaixo com seu app de softphone para configurar automaticamente
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4">
            {selectedUserForQR && (
              <>
                {/* QR Code */}
                <div className="flex justify-center p-6 bg-white rounded-lg">
                  <QRCode
                    value={`sip:${selectedUserForQR.sip_username}:${selectedUserForQR.sip_password}@${selectedUserForQR.sip_domain}`}
                    size={200}
                    level="H"
                  />
                </div>

                {/* Informações do Ramal */}
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Ramal</p>
                    <p className="font-mono font-semibold">{selectedUserForQR.extension}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Usuário SIP</p>
                    <p className="font-mono text-sm">{selectedUserForQR.sip_username}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Domínio</p>
                    <p className="font-mono text-sm">{selectedUserForQR.sip_domain}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Provider</p>
                    <Badge variant="outline">{selectedUserForQR.provider}</Badge>
                  </div>
                </div>

                {/* Instruções */}
                <div className="text-sm space-y-2">
                  <p className="font-semibold">📱 Apps compatíveis:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Linphone (iOS/Android)</li>
                    <li>Zoiper (iOS/Android)</li>
                    <li>Groundwire (iOS/Android)</li>
                    <li>Bria (iOS/Android)</li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-3">
                    💡 Abra o app, procure por "Scan QR Code" ou "Configurar conta" e aponte a câmera para o código acima.
                  </p>
                </div>
              </>
            )}
          </div>

          <AlertDialogFooter>
            <Button onClick={() => setShowQRCodeDialog(false)}>
              Fechar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário <strong className="font-mono">{userToDelete?.sip_username}</strong> (ramal {userToDelete?.extension})?
              <br /><br />
              Esta ação irá:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Remover o usuário da API {userToDelete?.provider === 'twilio' ? 'Twilio' : 'Vonage'}</li>
                <li>Excluir o registro do banco de dados local</li>
                <li className="text-destructive font-medium">Esta ação não pode ser desfeita</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir Usuário
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
