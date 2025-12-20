import { useState } from "react";
import { Database, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLeadLists, useLeadListContacts } from "@/shared/hooks/use-lead-lists";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LeadListSelectorProps {
  onSelect: (numbers: string[], listName: string) => void;
}

export function LeadListSelector({ onSelect }: LeadListSelectorProps) {
  const [open, setOpen] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const { data: lists, isLoading: loadingLists } = useLeadLists();
  const { data: contacts, isLoading: loadingContacts } = useLeadListContacts(selectedListId);

  const handleConfirm = () => {
    if (contacts && selectedListId) {
      const selectedList = lists?.find(l => l.id === selectedListId);
      const numbers = contacts.map(c => c.phone_number);
      onSelect(numbers, selectedList?.name || "Lista");
      setOpen(false);
      setSelectedListId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Database className="h-4 w-4" />
          Carregar Lista
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Selecionar Lista de Leads</DialogTitle>
          <DialogDescription>
            Escolha uma lista salva para carregar os números.
          </DialogDescription>
        </DialogHeader>

        {loadingLists ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : !lists?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma lista de leads encontrada.
            <br />
            <span className="text-sm">Crie uma lista na página de Leads.</span>
          </div>
        ) : (
          <>
            <ScrollArea className="max-h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead className="text-right">Contatos</TableHead>
                    <TableHead className="text-right">Criado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lists.map((list) => (
                    <TableRow
                      key={list.id}
                      className={`cursor-pointer ${selectedListId === list.id ? "bg-primary/10" : ""}`}
                      onClick={() => setSelectedListId(list.id)}
                    >
                      <TableCell>
                        {selectedListId === list.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{list.name}</p>
                          {list.description && (
                            <p className="text-sm text-muted-foreground">{list.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Badge variant="secondary">{list.total_contacts}</Badge>
                          {list.recurring_contacts > 0 && (
                            <Badge variant="outline" className="text-amber-600">
                              {list.recurring_contacts} recorr.
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {format(new Date(list.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!selectedListId || loadingContacts}
              >
                {loadingContacts ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Carregar {contacts?.length || 0} números
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
