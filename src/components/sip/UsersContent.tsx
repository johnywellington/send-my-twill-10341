import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Users, Copy, Trash2, Scan } from "lucide-react";
import { useSIPUsers } from "@/hooks/use-sip-users";
import { useCleanupOrphanedResources } from "@/hooks/use-cleanup-orphaned-resources";
import { SIPUserDialog } from "./SIPUserDialog";
import { OrphanedResourcesDialog } from "./OrphanedResourcesDialog";
import { formatSIPUri, getProviderIcon } from "@/lib/sip-utils";
import { toast } from "sonner";
import { useProvider } from "@/contexts/ProviderContext";
import { CredentialBadge } from "./CredentialBadge";
import { SyncEndpointsButton } from "./SyncEndpointsButton";
import { OrphanedUsersDialog } from "./OrphanedUsersDialog";
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

export function UsersContent() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [orphanedDialogOpen, setOrphanedDialogOpen] = useState(false);
  const [orphanedUsers, setOrphanedUsers] = useState<any[]>([]);
  const [orphanedResourcesDialogOpen, setOrphanedResourcesDialogOpen] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const { selectedCredentialId } = useProvider();
  const { users, isLoading, deleteUser, isDeleting } = useSIPUsers(selectedCredentialId);
  const { detectOrphansAsync, cleanupOrphans, isDetecting, isCleaning, lastDetection } = useCleanupOrphanedResources();

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
                        <Badge variant={user.is_active ? "default" : "secondary"}>
                          {user.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
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
              Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
