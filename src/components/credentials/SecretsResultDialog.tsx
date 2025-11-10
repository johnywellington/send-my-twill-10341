import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Copy, AlertTriangle, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

interface SecretsResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: {
    secretKey: string;
    secretsToCreate: string[];
    message: string;
  } | null;
}

export function SecretsResultDialog({ open, onOpenChange, result }: SecretsResultDialogProps) {
  if (!result) return null;

  const handleCopySecretKey = () => {
    navigator.clipboard.writeText(result.secretKey);
    toast({
      title: "✅ Copiado",
      description: "Secret key copiado para área de transferência",
    });
  };

  const handleCopySecretNames = () => {
    const names = result.secretsToCreate.join('\n');
    navigator.clipboard.writeText(names);
    toast({
      title: "✅ Copiado",
      description: "Nomes dos secrets copiados para área de transferência",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Secrets Preparados com Sucesso!
          </DialogTitle>
          <DialogDescription>
            Os secrets foram processados e estão prontos para serem configurados
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Secret Key Gerado:</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopySecretKey}
                className="h-8"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copiar
              </Button>
            </div>
            <div className="bg-muted p-3 rounded-md font-mono text-sm break-all">
              {result.secretKey}
            </div>
            <p className="text-xs text-muted-foreground">
              Este identificador será usado pelo sistema para acessar seus secrets
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Secrets Criados ({result.secretsToCreate.length}):</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopySecretNames}
                className="h-8"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copiar Todos
              </Button>
            </div>
            <div className="bg-muted p-3 rounded-md space-y-1">
              {result.secretsToCreate.map((secretName, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {secretName}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <Alert variant="default" className="border-yellow-500/50 bg-yellow-500/10">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-sm space-y-2">
              <p className="font-semibold">⚠️ IMPORTANTE - Próximos Passos:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Anote ou copie os nomes dos secrets acima</li>
                <li>Acesse <strong>Lovable Cloud → Secrets</strong></li>
                <li>Adicione cada secret manualmente com seus valores correspondentes</li>
                <li>Os nomes dos secrets devem ser exatamente como mostrados acima</li>
              </ol>
            </AlertDescription>
          </Alert>

          <Alert>
            <ExternalLink className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Dica:</strong> Guarde o <code>secret_key</code> em local seguro. 
              Ele será necessário para as edge functions acessarem suas credenciais.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} className="w-full">
            ✅ Entendi, Vou Configurar no Lovable Cloud
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
