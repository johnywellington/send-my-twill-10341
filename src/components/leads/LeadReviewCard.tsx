import { CheckCircle, AlertTriangle, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface LeadReviewCardProps {
  totalProcessed: number;
  cleanCount: number;
  recurringCount: number;
  duplicatesRemoved: number;
  invalidCount: number;
  onViewRecurring?: () => void;
}

export function LeadReviewCard({
  totalProcessed,
  cleanCount,
  recurringCount,
  duplicatesRemoved,
  invalidCount,
  onViewRecurring,
}: LeadReviewCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          Resumo do Processamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Processados */}
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold">{totalProcessed}</p>
            <p className="text-sm text-muted-foreground">Total Processados</p>
          </div>

          {/* Números Limpos */}
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 text-center">
            <div className="flex items-center justify-center gap-1">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-2xl font-bold text-green-600">{cleanCount}</p>
            </div>
            <p className="text-sm text-green-700 dark:text-green-400">Novos (Limpos)</p>
          </div>

          {/* Números Recorrentes */}
          <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-center">
            <div className="flex items-center justify-center gap-1">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <p className="text-2xl font-bold text-amber-600">{recurringCount}</p>
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-400">Recorrentes</p>
            {recurringCount > 0 && onViewRecurring && (
              <Button
                variant="link"
                size="sm"
                className="text-amber-600 p-0 h-auto mt-1"
                onClick={onViewRecurring}
              >
                Ver Detalhes
              </Button>
            )}
          </div>

          {/* Inválidos/Duplicados */}
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold text-muted-foreground">{duplicatesRemoved + invalidCount}</p>
            <p className="text-sm text-muted-foreground">Removidos</p>
            <div className="flex gap-1 justify-center mt-1">
              {duplicatesRemoved > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {duplicatesRemoved} duplicados
                </Badge>
              )}
              {invalidCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {invalidCount} inválidos
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
