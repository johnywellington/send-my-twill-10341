import { Users, AlertCircle, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useLeadLists, type LeadList } from "@/shared/hooks/use-lead-lists";

interface LeadListSelectorProps {
  selectedListId: string | null;
  onSelectList: (list: LeadList | null) => void;
}

export function LeadListSelector({
  selectedListId,
  onSelectList,
}: LeadListSelectorProps) {
  const { data: leadLists, isLoading } = useLeadLists();

  if (isLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Carregando listas...
      </div>
    );
  }

  if (!leadLists?.length) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground font-medium">
          Nenhuma lista de leads encontrada
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Importe uma lista de leads na página de Leads antes de criar uma campanha.
        </p>
      </div>
    );
  }

  const selectedList = leadLists.find((l) => l.id === selectedListId);

  return (
    <div className="space-y-4">
      <ScrollArea className="h-[300px] pr-4">
        <div className="space-y-2">
          {leadLists.map((list) => (
            <div
              key={list.id}
              onClick={() => onSelectList(list)}
              className={cn(
                "p-4 rounded-lg border cursor-pointer transition-all",
                selectedListId === list.id
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      selectedListId === list.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    {selectedListId === list.id ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Users className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{list.name}</p>
                    {list.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {list.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {list.total_contacts} contatos
                  </Badge>
                  {list.recurring_contacts > 0 && (
                    <Badge variant="outline" className="text-yellow-600">
                      {list.recurring_contacts} recorrentes
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Resumo */}
      {selectedList && (
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="font-medium">{selectedList.name}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedList.total_contacts} contatos serão incluídos nesta campanha
            {selectedList.clean_contacts > 0 && (
              <span className="text-green-600"> ({selectedList.clean_contacts} limpos)</span>
            )}
          </p>
          {selectedList.recurring_contacts > 0 && (
            <div className="flex items-center gap-2 mt-2 text-sm text-yellow-600">
              <AlertCircle className="h-4 w-4" />
              <span>
                {selectedList.recurring_contacts} contatos já receberam campanhas anteriores
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
