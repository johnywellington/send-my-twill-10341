import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const SenderIdTooltip = () => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="w-4 h-4 text-muted-foreground cursor-help" />
        </TooltipTrigger>
        <TooltipContent className="max-w-sm p-4">
          <div className="space-y-2">
            <p className="font-semibold text-sm">O que é Sender ID?</p>
            <p className="text-xs">
              Identificador alfanumérico que aparece como remetente do SMS
              no lugar do número de telefone.
            </p>
            
            <div className="text-xs space-y-1 pt-2 border-t">
              <p><strong>✅ Exemplos válidos:</strong> LOJA, EMPRESA, ALERT</p>
              <p><strong>❌ Não funciona:</strong> EUA, Canadá, Brasil (limitado)</p>
              <p><strong>📏 Limite:</strong> 11 caracteres alfanuméricos</p>
            </div>
            
            <p className="text-xs text-muted-foreground pt-2">
              💡 Deixe vazio para usar o número de origem
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
