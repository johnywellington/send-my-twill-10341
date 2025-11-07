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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const suspendSchema = z.object({
  reason: z.string().min(10, "O motivo deve ter pelo menos 10 caracteres"),
});

type SuspendFormValues = z.infer<typeof suspendSchema>;

interface SuspendUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserProfile | null;
  onSuccess: () => void;
}

export const SuspendUserDialog = ({
  open,
  onOpenChange,
  user,
  onSuccess,
}: SuspendUserDialogProps) => {
  const { suspendUser } = useUsers();

  const form = useForm<SuspendFormValues>({
    resolver: zodResolver(suspendSchema),
    defaultValues: {
      reason: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({ reason: "" });
    }
  }, [open, form]);

  const onSubmit = async (data: SuspendFormValues) => {
    if (!user) return;

    const success = await suspendUser(user.user_id, data.reason);

    if (success) {
      toast.success(`${user.full_name} foi suspenso com sucesso`, {
        description: `Motivo: ${data.reason}`,
      });
      onSuccess();
      onOpenChange(false);
    } else {
      toast.error("Erro ao suspender usuário");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Suspender Usuário</DialogTitle>
          <DialogDescription>
            Você está prestes a suspender <strong>{user?.full_name}</strong>. O usuário não
            poderá mais acessar o sistema.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Um motivo detalhado é obrigatório para fins de auditoria. Esta ação será registrada
            no histórico de atividades.
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo da Suspensão</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o motivo da suspensão de forma detalhada..."
                      className="min-h-[120px]"
                      {...field}
                    />
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
                variant="destructive"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Suspendendo..." : "Suspender Usuário"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
