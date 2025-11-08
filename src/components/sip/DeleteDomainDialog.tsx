import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DeleteDomainDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domainName: string;
  provider: 'twilio' | 'vonage';
  isDefault: boolean;
  hasUsers: boolean;
  hasRoutes: boolean;
  userCount?: number;
  routeCount?: number;
  onConfirm: () => void;
}

export function DeleteDomainDialog({
  open,
  onOpenChange,
  domainName,
  provider,
  isDefault,
  hasUsers,
  hasRoutes,
  userCount = 0,
  routeCount = 0,
  onConfirm,
}: DeleteDomainDialogProps) {
  const warnings = [];
  if (isDefault) warnings.push("⭐ Este é o domínio padrão");
  if (hasUsers) warnings.push(`👥 Possui ${userCount} usuário(s) configurado(s)`);
  if (hasRoutes) warnings.push(`🛣️ Possui ${routeCount} rota(s) ativa(s)`);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Confirmar Deleção
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Você está prestes a <strong>deletar permanentemente</strong> {provider === 'twilio' ? 'o domínio Twilio' : 'a aplicação Vonage'}:
            </p>
            <Badge variant="outline" className="text-sm font-mono">
              {domainName}
            </Badge>
            
            {warnings.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 space-y-1">
                <p className="font-semibold text-sm">⚠️ Avisos:</p>
                {warnings.map((warning, idx) => (
                  <p key={idx} className="text-xs">{warning}</p>
                ))}
              </div>
            )}
            
            <p className="text-sm">
              Esta ação <strong>não pode ser desfeita</strong>.
              {hasUsers && " Todos os usuários SIP associados serão afetados."}
              {hasRoutes && " Todas as rotas configuradas serão removidas."}
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive hover:bg-destructive/90"
          >
            Sim, Deletar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
