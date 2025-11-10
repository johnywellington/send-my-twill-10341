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
import { useVonageApplications } from "@/hooks/use-vonage-applications";
import { Badge } from "@/components/ui/badge";

interface DeleteVonageApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: {
    domain_group_id: string;
    friendly_name: string;
    is_default: boolean;
    app_name?: string;
  };
  usersCount: number;
}

export function DeleteVonageApplicationDialog({
  open,
  onOpenChange,
  application,
  usersCount,
}: DeleteVonageApplicationDialogProps) {
  const { deleteApplication } = useVonageApplications();

  const handleDelete = () => {
    deleteApplication.mutate(
      {
        domain_group_id: application.domain_group_id,
        force: true, // Force deletion even with users
      },
      {
        onSuccess: () => onOpenChange(false),
      }
    );
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deletar Application?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <div>
              Tem certeza que deseja deletar a application <strong>{application.friendly_name || application.app_name}</strong>?
            </div>
            
            {application.is_default && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Default</Badge>
                <span className="text-sm">Esta é a application padrão</span>
              </div>
            )}
            
            {usersCount > 0 && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm font-medium text-destructive">
                  ⚠️ Esta application possui {usersCount} usuário(s) associado(s)
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Os usuários serão desativados junto com a application.
                </p>
              </div>
            )}
            
            <p className="text-sm text-muted-foreground">
              Esta ação irá desativar a application (soft delete). Ela não será completamente removida do banco de dados.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteApplication.isPending}
          >
            {deleteApplication.isPending ? 'Deletando...' : 'Deletar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
