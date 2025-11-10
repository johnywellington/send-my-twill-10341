import { useEffect, useState } from "react";
import { useUsers } from "@/features/admin/hooks/use-users";
import { UserProfile } from "@/features/admin/hooks/use-users";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Clock,
  CheckCircle2,
  XCircle,
  Shield,
  Ban,
  UserCheck,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { ChangeRoleDialog } from "@/components/admin/ChangeRoleDialog";
import { SuspendUserDialog } from "@/components/admin/SuspendUserDialog";

const UserApprovals = () => {
  const { users, loading, fetchUsers, activateUser, changeUserRole } = useUsers();
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'suspend' | 'promote' | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const pendingUsers = users.filter(u => !u.is_active && !u.suspended_at);
  const activeUsers = users.filter(u => u.is_active && !u.suspended_at && u.role === 'user');
  const suspendedUsers = users.filter(u => u.suspended_at);

  const handleApprove = (user: UserProfile) => {
    setSelectedUser(user);
    setActionType('approve');
  };

  const confirmApprove = async () => {
    if (!selectedUser) return;
    
    const success = await activateUser(selectedUser.user_id);
    if (success) {
      toast.success(`${selectedUser.full_name || selectedUser.email} aprovado com sucesso!`);
      fetchUsers();
    }
    setSelectedUser(null);
    setActionType(null);
  };

  const handlePromote = (user: UserProfile) => {
    setSelectedUser(user);
    setRoleDialogOpen(true);
  };

  const handleSuspend = (user: UserProfile) => {
    setSelectedUser(user);
    setSuspendDialogOpen(true);
  };

  const handleReactivate = async (user: UserProfile) => {
    const success = await activateUser(user.user_id);
    if (success) {
      toast.success(`${user.full_name || user.email} reativado com sucesso!`);
      fetchUsers();
    }
  };

  const UserCard = ({ user, actions }: { user: UserProfile; actions: React.ReactNode }) => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user.avatar_url || undefined} />
            <AvatarFallback>
              {user.full_name?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">{user.full_name || "Sem nome"}</h3>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                {user.phone && (
                  <p className="text-sm text-muted-foreground">{user.phone}</p>
                )}
              </div>
              <Badge variant={user.role === "admin" ? "destructive" : "secondary"}>
                {user.role === "admin" ? (
                  <>
                    <Shield className="h-3 w-3 mr-1" />
                    Admin
                  </>
                ) : (
                  "Usuário"
                )}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Cadastro: {format(new Date(user.created_at), "dd/MM/yyyy")}
              </div>
              {user.last_login_at && (
                <div className="flex items-center gap-1">
                  <UserCheck className="h-3 w-3" />
                  Último login: {format(new Date(user.last_login_at), "dd/MM/yyyy HH:mm")}
                </div>
              )}
            </div>

            {user.suspension_reason && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">
                  <strong>Motivo da suspensão:</strong> {user.suspension_reason}
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              {actions}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Aprovações e Permissões</h1>
        <p className="text-muted-foreground mt-2">
          Aprove cadastros, promova usuários e gerencie permissões
        </p>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aguardando Aprovação</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingUsers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Novos cadastros pendentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeUsers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Podem ser promovidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspensos</CardTitle>
            <Ban className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{suspendedUsers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Contas bloqueadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="relative">
            Pendentes de Aprovação
            {pendingUsers.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                {pendingUsers.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="active">Usuários Ativos</TabsTrigger>
          <TabsTrigger value="suspended">Suspensos</TabsTrigger>
        </TabsList>

        {/* Pending Users */}
        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cadastros Aguardando Aprovação</CardTitle>
              <CardDescription>
                Revise e aprove novos usuários antes de conceder acesso ao sistema
              </CardDescription>
            </CardHeader>
          </Card>

          {loading ? (
            <Card>
              <CardContent className="py-8 text-center">
                Carregando...
              </CardContent>
            </Card>
          ) : pendingUsers.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-semibold">Nenhum cadastro pendente</h3>
                <p className="text-muted-foreground">
                  Todos os usuários foram aprovados ou rejeitados
                </p>
              </CardContent>
            </Card>
          ) : (
            pendingUsers.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                actions={
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(user)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleSuspend(user)}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Rejeitar
                    </Button>
                  </>
                }
              />
            ))
          )}
        </TabsContent>

        {/* Active Users */}
        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usuários Ativos</CardTitle>
              <CardDescription>
                Promova usuários para admin ou bloqueie contas conforme necessário
              </CardDescription>
            </CardHeader>
          </Card>

          {loading ? (
            <Card>
              <CardContent className="py-8 text-center">
                Carregando...
              </CardContent>
            </Card>
          ) : activeUsers.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <UserCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">Nenhum usuário ativo</h3>
                <p className="text-muted-foreground">
                  Não há usuários ativos no momento
                </p>
              </CardContent>
            </Card>
          ) : (
            activeUsers.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                actions={
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePromote(user)}
                    >
                      <Shield className="h-4 w-4 mr-1" />
                      Promover a Admin
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleSuspend(user)}
                    >
                      <Ban className="h-4 w-4 mr-1" />
                      Bloquear
                    </Button>
                  </>
                }
              />
            ))
          )}
        </TabsContent>

        {/* Suspended Users */}
        <TabsContent value="suspended" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usuários Suspensos</CardTitle>
              <CardDescription>
                Usuários bloqueados que podem ser reativados
              </CardDescription>
            </CardHeader>
          </Card>

          {loading ? (
            <Card>
              <CardContent className="py-8 text-center">
                Carregando...
              </CardContent>
            </Card>
          ) : suspendedUsers.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-semibold">Nenhum usuário suspenso</h3>
                <p className="text-muted-foreground">
                  Não há usuários bloqueados no momento
                </p>
              </CardContent>
            </Card>
          ) : (
            suspendedUsers.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                actions={
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReactivate(user)}
                    className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Reativar Conta
                  </Button>
                }
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ChangeRoleDialog
        open={roleDialogOpen}
        onOpenChange={setRoleDialogOpen}
        user={selectedUser}
        onSuccess={() => {
          fetchUsers();
          toast.success("Usuário promovido para admin com sucesso!");
        }}
      />

      <SuspendUserDialog
        open={suspendDialogOpen}
        onOpenChange={setSuspendDialogOpen}
        user={selectedUser}
        onSuccess={() => fetchUsers()}
      />

      {/* Approve Confirmation Dialog */}
      <AlertDialog open={actionType === 'approve'} onOpenChange={() => setActionType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aprovar Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja aprovar <strong>{selectedUser?.email}</strong>?
              O usuário receberá acesso imediato ao sistema e será notificado por email.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmApprove}
              className="bg-green-600 hover:bg-green-700"
            >
              Aprovar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserApprovals;
