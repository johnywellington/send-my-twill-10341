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
    secrets: { name: string; value: string }[];
    message: string;
  } | null;
  onAddSecretsClick: () => void;
}

export function SecretsResultDialog({ 
  open, 
  onOpenChange, 
  result,
  onAddSecretsClick 
}: SecretsResultDialogProps) {
  if (!result) return null;

  const handleCopySecretKey = () => {
    navigator.clipboard.writeText(result.secretKey);
    toast({
      title: "✅ Copiado",
      description: "Secret key copiado para área de transferência",
    });
  };

  const handleCopySecretNames = () => {
    const names = result.secrets.map(s => s.name).join('\n');
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
            Dados Salvos com Sucesso!
          </DialogTitle>
          <DialogDescription>
            Agora adicione os secrets críticos no Lovable
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-sm space-y-1">
              <p className="font-semibold">✅ Dados Salvos no Banco</p>
              <p className="text-xs">Account Identifier e dados não-sensíveis foram salvos.</p>
              <div className="bg-background/50 p-2 rounded-md mt-2">
                <code className="text-xs">Secret Key: {result.secretKey}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopySecretKey}
                  className="ml-2 h-6"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">🔐 Secrets Críticos ({result.secrets.length}):</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopySecretNames}
                className="h-8"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copiar
              </Button>
            </div>
            <div className="bg-muted p-3 rounded-md space-y-1">
              {result.secrets.map((secret, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {secret.name}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <Alert variant="default" className="border-blue-500/50 bg-blue-500/10">
            <AlertTriangle className="h-4 w-4 text-blue-500" />
            <AlertDescription className="text-sm">
              <p className="font-semibold mb-2">💡 Por que isso é necessário?</p>
              <ul className="space-y-1 text-xs">
                <li>🔒 <strong>Auth Tokens/Secrets</strong> ficam protegidos no Lovable</li>
                <li>📊 <strong>Account IDs</strong> ficam no banco para acesso rápido</li>
                <li>⚡ Melhor segurança + Melhor experiência!</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={onAddSecretsClick} className="gap-2">
            🔐 Adicionar Secrets no Lovable
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
