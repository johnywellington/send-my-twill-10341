import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { UserProfile, useUsers } from "@/hooks/use-users";
import { useAuth } from "@/hooks/use-auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Shield, User } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const roleSchema = z.object({
  role: z.enum(["admin", "user"]),
});

type RoleFormValues = z.infer<typeof roleSchema>;

interface ChangeRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserProfile | null;
  onSuccess: () => void;
}

export const ChangeRoleDialog = ({
  open,
  onOpenChange,
  user,
  onSuccess,
}: ChangeRoleDialogProps) => {
  const { user: currentUser } = useAuth();
  const { changeUserRole } = useUsers();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingRole, setPendingRole] = useState<"admin" | "user" | null>(null);

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      role: "user",
    },
  });

  useEffect(() => {
    if (user && open) {
      form.reset({
        role: user.role as "admin" | "user",
      });
    }
  }, [user, open, form]);

  const onSubmit = async (data: RoleFormValues) => {
    if (!user) return;

    // Verificar se está tentando remover o próprio role de admin
    if (user.user_id === currentUser?.id && data.role === "user") {
      toast.error("Você não pode remover seu próprio acesso de admin");
      return;
    }

    // Se estiver promovendo para admin, pedir confirmação
    if (data.role === "admin" && user.role !== "admin") {
      setPendingRole(data.role);
      setConfirmDialogOpen(true);
      return;
    }

    await executeRoleChange(data.role);
  };

  const executeRoleChange = async (newRole: "admin" | "user") => {
    if (!user) return;

    const success = await changeUserRole(user.user_id, newRole);

    if (success) {
      toast.success(`Role alterada com sucesso`, {
        description: `${user.full_name} agora é ${newRole === "admin" ? "Administrador" : "Usuário"}`,
      });
      onSuccess();
      onOpenChange(false);
      setConfirmDialogOpen(false);
    } else {
      toast.error("Erro ao alterar role");
    }
  };

  const handleConfirmRoleChange = () => {
    if (pendingRole) {
      executeRoleChange(pendingRole);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Alterar Role do Usuário</DialogTitle>
            <DialogDescription>
              Altere o nível de acesso de <strong>{user?.full_name}</strong> no sistema.
            </DialogDescription>
          </DialogHeader>

          {user?.user_id === currentUser?.id && (
            <Alert>
              <AlertDescription>
                Você não pode alterar sua própria role por motivos de segurança.
              </AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Selecione a Role</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-2"
                        disabled={user?.user_id === currentUser?.id}
                      >
                        <div className="flex items-center space-x-3 space-y-0 border rounded-lg p-4 cursor-pointer hover:bg-accent">
                          <RadioGroupItem value="user" id="user" />
                          <label
                            htmlFor="user"
                            className="flex items-center gap-3 cursor-pointer flex-1"
                          >
                            <User className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <div className="font-medium">Usuário</div>
                              <div className="text-sm text-muted-foreground">
                                Acesso padrão ao sistema com permissões limitadas
                              </div>
                            </div>
                          </label>
                        </div>

                        <div className="flex items-center space-x-3 space-y-0 border rounded-lg p-4 cursor-pointer hover:bg-accent">
                          <RadioGroupItem value="admin" id="admin" />
                          <label
                            htmlFor="admin"
                            className="flex items-center gap-3 cursor-pointer flex-1"
                          >
                            <Shield className="h-5 w-5 text-destructive" />
                            <div>
                              <div className="font-medium">Administrador</div>
                              <div className="text-sm text-muted-foreground">
                                Acesso total ao sistema, gerenciamento de usuários e configurações
                              </div>
                            </div>
                          </label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting || user?.user_id === currentUser?.id}
                >
                  {form.formState.isSubmitting ? "Salvando..." : "Alterar Role"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Confirmação para Admin */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Promover para Administrador?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a promover <strong>{user?.full_name}</strong> a Administrador.
              <br />
              <br />
              Administradores têm acesso completo ao sistema, incluindo gerenciamento de
              usuários, configurações e dados sensíveis. Confirma esta ação?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingRole(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRoleChange}>
              Sim, promover a Admin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
