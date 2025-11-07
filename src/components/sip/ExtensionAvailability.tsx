import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Lightbulb } from "lucide-react";
import { useExtensionAvailability } from "@/hooks/use-extension-availability";

interface ExtensionAvailabilityProps {
  provider?: 'twilio' | 'vonage';
  currentExtension?: string;
}

export function ExtensionAvailability({ provider, currentExtension }: ExtensionAvailabilityProps) {
  const { analysis, isExtensionAvailable } = useExtensionAvailability(provider);
  
  if (!analysis) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Carregando extensões...</p>
        </CardContent>
      </Card>
    );
  }
  
  const isCurrentAvailable = currentExtension 
    ? isExtensionAvailable(currentExtension) 
    : null;
  
  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">Extensões Disponíveis</CardTitle>
            <CardDescription>
              {analysis.totalExtensions} {provider ? `(${provider})` : ''} em uso
            </CardDescription>
          </div>
          <Badge variant="secondary" className="font-mono">
            <Lightbulb className="h-3 w-3 mr-1" />
            Sugestão: {analysis.nextAvailable}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Extensões Ocupadas */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Extensões Ocupadas:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {analysis.occupiedExtensions.length > 0 ? (
              analysis.occupiedExtensions.map(ext => (
                <Badge 
                  key={ext} 
                  variant="secondary"
                  className="font-mono text-xs"
                >
                  {ext}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground italic">
                Nenhuma extensão cadastrada ainda
              </span>
            )}
          </div>
        </div>
        
        {/* Validação da Extensão Atual */}
        {currentExtension && (
          <div className={`p-3 rounded-lg border ${
            isCurrentAvailable 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-center gap-2">
              {isCurrentAvailable ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-900 dark:text-green-100">
                    Extensão {currentExtension} está disponível ✓
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <span className="text-sm font-medium text-red-900 dark:text-red-100">
                    Extensão {currentExtension} já está em uso ✗
                  </span>
                </>
              )}
            </div>
          </div>
        )}
        
        {/* Dica de Sugestão */}
        <div className="p-2 bg-primary/5 rounded border border-primary/20">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Dica:</strong> Clique no botão "Usar Sugerida" para preencher automaticamente
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
