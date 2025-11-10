import { useEffect, useState } from "react";
import { useAuth } from "@/features/shared/hooks/use-auth";
import { useUsers } from "@/hooks/use-users";
import { UserProfile } from "@/hooks/use-users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Users,
  Shield,
  CheckCircle,
  XCircle,
  MoreVertical,
  Edit,
  Activity,
  Ban,
  Trash2,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { UserDialog } from "@/components/admin/UserDialog";
import { SuspendUserDialog } from "@/components/admin/SuspendUserDialog";
import { ChangeRoleDialog } from "@/components/admin/ChangeRoleDialog";
import { UserActivityDialog } from "@/components/admin/UserActivityDialog";

const AdminUsers = () => {
  const { user: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended" | "pending">("all");

  const { users, loading, fetchUsers, deleteUser, activateUser } = useUsers();

  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  useEffect(() => {
    const filters: any = {};
    if (searchTerm) filters.search = searchTerm;
    if (roleFilter !== "all") filters.role = roleFilter;
    if (statusFilter !== "all") filters.status = statusFilter;
    fetchUsers(filters);
  }, [searchTerm, roleFilter, statusFilter]);

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === "admin").length,
    active: users.filter((u) => u.is_active && !u.suspended_at).length,
    suspended: users.filter((u) => u.suspended_at).length,
    pending: users.filter((u) => !u.is_active && !u.suspended_at).length,
  };

  const handleEditUser = (user: UserProfile) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const handleViewActivity = (user: UserProfile) => {
    setSelectedUser(user);
    setActivityDialogOpen(true);
  };

  const handleChangeRole = (user: UserProfile) => {
    if (user.user_id === currentUser?.id) {
      toast.error("Você não pode alterar sua própria role");
      return;
    }
    setSelectedUser(user);
    setRoleDialogOpen(true);
  };

  const handleSuspendUser = (user: UserProfile) => {
    if (user.user_id === currentUser?.id) {
      toast.error("Você não pode suspender sua própria conta");
      return;
    }
    setSelectedUser(user);
    setSuspendDialogOpen(true);
  };

  const handleActivateUser = async (user: UserProfile) => {
    const success = await activateUser(user.user_id);
    if (success) {
      toast.success(`${user.full_name} foi reativado com sucesso`);
      fetchUsers();
    }
  };

  const handleApproveUser = async (user: UserProfile) => {
    const success = await activateUser(user.user_id);
    if (success) {
      toast.success(`Usuário ${user.email} aprovado com sucesso!`);
      fetchUsers();
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;

    if (deleteUserId === currentUser?.id) {
      toast.error("Você não pode deletar sua própria conta");
      setDeleteUserId(null);
      return;
    }

    const success = await deleteUser(deleteUserId);
    if (success) {
      toast.success("Usuário deletado com sucesso");
      fetchUsers();
    }
    setDeleteUserId(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gerenciamento de Usuários</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie usuários, roles e permissões do sistema
        </p>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administradores</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.admins}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativos</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspensos</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.suspended}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Aguardando aprovação
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-4">
        <Input
          placeholder="Buscar por nome, email ou telefone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="md:max-w-sm"
        />
        <Select value={roleFilter} onValueChange={(value: any) => setRoleFilter(value)}>
          <SelectTrigger className="md:w-[180px]">
            <SelectValue placeholder="Filtrar por role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="user">Usuário</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
          <SelectTrigger className="md:w-[180px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="suspended">Suspensos</SelectItem>
            <SelectItem value="pending">Pendentes de Aprovação</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabela de Usuários */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Último Login</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">Nenhum usuário encontrado</h3>
                  <p className="text-muted-foreground">
                    Ajuste os filtros ou adicione novos usuários
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback>
                          {user.full_name?.charAt(0)?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.full_name || "Sem nome"}</div>
                        {user.phone && (
                          <div className="text-sm text-muted-foreground">{user.phone}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell>
                    {!user.is_active && !user.suspended_at ? (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-300">
                        <Clock className="h-3 w-3 mr-1" />
                        Pendente
                      </Badge>
                    ) : user.suspended_at ? (
                      <Badge variant="destructive">
                        <Ban className="h-3 w-3 mr-1" />
                        Suspenso
                      </Badge>
                    ) : (
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Ativo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.last_login_at
                      ? format(new Date(user.last_login_at), "dd/MM/yyyy HH:mm")
                      : "Nunca"}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!user.is_active && !user.suspended_at && (
                          <>
                            <DropdownMenuItem onClick={() => handleApproveUser(user)}>
                              <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                              Aprovar Usuário
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem onClick={() => handleEditUser(user)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar Perfil
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewActivity(user)}>
                          <Activity className="h-4 w-4 mr-2" />
                          Ver Atividades
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleChangeRole(user)}>
                          <Shield className="h-4 w-4 mr-2" />
                          Alterar Role
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {user.is_active ? (
                          <DropdownMenuItem onClick={() => handleSuspendUser(user)}>
                            <Ban className="h-4 w-4 mr-2" />
                            Suspender
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleActivateUser(user)}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Reativar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteUserId(user.user_id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Deletar Usuário
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Diálogos */}
      <UserDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        user={selectedUser}
        onSuccess={() => fetchUsers()}
      />

      <SuspendUserDialog
        open={suspendDialogOpen}
        onOpenChange={setSuspendDialogOpen}
        user={selectedUser}
        onSuccess={() => fetchUsers()}
      />

      <ChangeRoleDialog
        open={roleDialogOpen}
        onOpenChange={setRoleDialogOpen}
        user={selectedUser}
        onSuccess={() => fetchUsers()}
      />

      <UserActivityDialog
        open={activityDialogOpen}
        onOpenChange={setActivityDialogOpen}
        user={selectedUser}
      />

      {/* Dialog de Confirmação de Delete */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar este usuário permanentemente? Esta ação não pode
              ser desfeita e todos os dados do usuário serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUsers;
