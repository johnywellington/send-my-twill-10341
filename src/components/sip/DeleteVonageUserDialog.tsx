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
import { useSIPUsers } from "@/hooks/use-sip-users";

interface DeleteVonageUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    sip_username: string;
    extension: string;
    display_name?: string;
  };
}

export function DeleteVonageUserDialog({
  open,
  onOpenChange,
  user,
}: DeleteVonageUserDialogProps) {
  const { deleteUser, isDeleting } = useSIPUsers();

  const handleDelete = () => {
    deleteUser(
      { id: user.id, provider: 'vonage' },
      {
        onSuccess: () => onOpenChange(false),
      }
    );
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deletar Usuário?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Tem certeza que deseja deletar o usuário <strong>{user.display_name || user.sip_username}</strong>?
            </p>
            <div className="text-sm space-y-1 p-3 bg-muted rounded-md">
              <p><strong>Username:</strong> {user.sip_username}</p>
              <p><strong>Ramal:</strong> {user.extension}</p>
            </div>
            <p className="text-sm text-destructive">
              Esta ação não pode ser desfeita. O endpoint será removido da Vonage API.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isDeleting}
          >
            {isDeleting ? 'Deletando...' : 'Deletar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
