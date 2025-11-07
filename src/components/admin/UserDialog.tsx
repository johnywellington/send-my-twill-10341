import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { UserProfile, useUsers } from "@/hooks/use-users";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const userSchema = z.object({
  full_name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  phone: z.string().optional(),
  avatar_url: z.string().url("URL inválida").optional().or(z.literal("")),
});

type UserFormValues = z.infer<typeof userSchema>;

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserProfile | null;
  onSuccess: () => void;
}

export const UserDialog = ({ open, onOpenChange, user, onSuccess }: UserDialogProps) => {
  const { updateProfile } = useUsers();

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      avatar_url: "",
    },
  });

  useEffect(() => {
    if (user && open) {
      form.reset({
        full_name: user.full_name || "",
        phone: user.phone || "",
        avatar_url: user.avatar_url || "",
      });
    }
  }, [user, open, form]);

  const onSubmit = async (data: UserFormValues) => {
    if (!user) return;

    const updates: any = {
      full_name: data.full_name,
    };

    if (data.phone) updates.phone = data.phone;
    if (data.avatar_url) updates.avatar_url = data.avatar_url;

    const success = await updateProfile(user.user_id, updates);

    if (success) {
      toast.success("Perfil atualizado com sucesso");
      onSuccess();
      onOpenChange(false);
    } else {
      toast.error("Erro ao atualizar perfil");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Perfil do Usuário</DialogTitle>
          <DialogDescription>
            Atualize as informações do perfil de {user?.full_name || "usuário"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o nome completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input placeholder="(11) 99999-9999" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="avatar_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL do Avatar</FormLabel>
                  <FormControl>
                    <Input placeholder="https://exemplo.com/avatar.jpg" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
