import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { RecurringInfo } from "@/shared/hooks/use-verify-recurring";

interface RecurringDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recurringNumbers: RecurringInfo[];
}

export function RecurringDetailsModal({
  open,
  onOpenChange,
  recurringNumbers,
}: RecurringDetailsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Números Recorrentes</DialogTitle>
          <DialogDescription>
            Estes números já foram usados em campanhas anteriores.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Última Campanha</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Envios</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recurringNumbers.map((item) => (
                <TableRow key={item.phone_number}>
                  <TableCell className="font-mono">{item.phone_number}</TableCell>
                  <TableCell>
                    {item.last_campaign_name ? (
                      <Badge variant="outline">{item.last_campaign_name}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(item.last_campaign_date), "dd/MM/yyyy HH:mm", {
                      locale: ptBR,
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">{item.count}x</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
