import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import {
  ArrowLeft,
  Download,
  Filter,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DateRangePicker } from "@/components/DateRangePicker";
import { useSmsHistory } from "@/hooks/use-sms-history";

export default function HistoricoSMS() {
  const navigate = useNavigate();
  const {
    logs,
    totalCount,
    loading,
    currentPage,
    totalPages,
    filters,
    setFilters,
    goToPage,
    exportToCSV,
    uniqueFromNumbers,
  } = useSmsHistory();

  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    setFilters({
      ...filters,
      dateFrom: range?.from,
      dateTo: range?.to,
    });
  };

  const openDetails = (log: any) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" => {
    switch (status) {
      case "delivered":
        return "default";
      case "sent":
        return "secondary";
      case "failed":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case "delivered":
        return "Entregue";
      case "sent":
        return "Enviado";
      case "failed":
        return "Falha";
      default:
        return status;
    }
  };

  // Calculate KPIs
  const kpis = useMemo(() => {
    const delivered = logs.filter((log) => log.status === "delivered").length;
    const failed = logs.filter((log) => log.status === "failed").length;
    const totalCost = logs.reduce((sum, log) => sum + (log.cost || 0), 0);
    const successRate = totalCount > 0 ? ((delivered / totalCount) * 100).toFixed(1) : "0";

    return { delivered, failed, totalCost, successRate };
  }, [logs, totalCount]);

  // Generate page numbers
  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push("...");
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  }, [currentPage, totalPages]);

  const hasActiveFilters =
    filters.dateFrom ||
    filters.dateTo ||
    filters.fromNumber ||
    filters.status ||
    filters.provider ||
    filters.searchTerm;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Histórico de SMS</h1>
            <p className="text-muted-foreground">
              Busque e filtre seus envios de SMS
            </p>
          </div>
        </div>
        <Button onClick={exportToCSV} disabled={logs.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* KPI Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo do Período</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{totalCount}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Entregues</p>
              <p className="text-2xl font-bold text-green-500">{kpis.delivered}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Falhas</p>
              <p className="text-2xl font-bold text-red-500">{kpis.failed}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Custo Total</p>
              <p className="text-2xl font-bold">${kpis.totalCost.toFixed(2)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Taxa de Sucesso</p>
              <p className="text-2xl font-bold text-blue-500">{kpis.successRate}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Date Range */}
            <div>
              <Label>Período</Label>
              <DateRangePicker value={dateRange} onChange={handleDateRangeChange} />
            </div>

            {/* From Number Filter */}
            <div>
              <Label>Número de Origem</Label>
              <Select
                value={filters.fromNumber || "all"}
                onValueChange={(v) =>
                  setFilters({ ...filters, fromNumber: v === "all" ? undefined : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {uniqueFromNumbers.map((num) => (
                    <SelectItem key={num} value={num}>
                      {num}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div>
              <Label>Status</Label>
              <Select
                value={filters.status || "all"}
                onValueChange={(v) =>
                  setFilters({ ...filters, status: v === "all" ? undefined : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="sent">Enviado</SelectItem>
                  <SelectItem value="delivered">Entregue</SelectItem>
                  <SelectItem value="failed">Falha</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Provider Filter */}
            <div>
              <Label>Provider</Label>
              <Select
                value={filters.provider || "all"}
                onValueChange={(v) =>
                  setFilters({ ...filters, provider: v === "all" ? undefined : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="twilio">Twilio</SelectItem>
                  <SelectItem value="vonage">Vonage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search Input */}
            <div>
              <Label>Buscar</Label>
              <Input
                placeholder="Número ou mensagem"
                value={filters.searchTerm || ""}
                onChange={(e) =>
                  setFilters({ ...filters, searchTerm: e.target.value })
                }
              />
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilters({});
                setDateRange(undefined);
              }}
            >
              Limpar Filtros
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Logs de SMS ({totalCount} resultados)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>Nenhum SMS encontrado com os filtros aplicados</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>De</TableHead>
                    <TableHead>Para</TableHead>
                    <TableHead>Mensagem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Custo</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.from_number}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.to_number}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm">
                        {log.message}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(log.status)}>
                          {getStatusLabel(log.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.provider}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        ${(log.cost || 0).toFixed(4)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDetails(log)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {(currentPage - 1) * 20 + 1} a{" "}
                    {Math.min(currentPage * 20, totalCount)} de {totalCount}{" "}
                    resultados
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Anterior
                    </Button>

                    {/* Page Numbers */}
                    <div className="flex gap-1">
                      {pageNumbers.map((page, idx) =>
                        page === "..." ? (
                          <span key={`ellipsis-${idx}`} className="px-2">
                            ...
                          </span>
                        ) : (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => goToPage(page as number)}
                          >
                            {page}
                          </Button>
                        )
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Próximo
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do SMS</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Data/Hora</Label>
                  <p className="font-medium">
                    {format(
                      new Date(selectedLog.created_at),
                      "dd/MM/yyyy 'às' HH:mm:ss",
                      { locale: ptBR }
                    )}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    <Badge variant={getStatusVariant(selectedLog.status)}>
                      {getStatusLabel(selectedLog.status)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">De</Label>
                  <p className="font-mono text-sm">{selectedLog.from_number}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Para</Label>
                  <p className="font-mono text-sm">{selectedLog.to_number}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Provider</Label>
                  <p>{selectedLog.provider}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Custo</Label>
                  <p>${(selectedLog.cost || 0).toFixed(4)}</p>
                </div>
                {selectedLog.external_id && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">ID Externo</Label>
                    <p className="font-mono text-xs">{selectedLog.external_id}</p>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-muted-foreground">Mensagem</Label>
                <div className="mt-2 p-4 bg-muted rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{selectedLog.message}</p>
                </div>
              </div>

              {selectedLog.error_message && (
                <div>
                  <Label className="text-destructive">Erro</Label>
                  <div className="mt-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive">
                      {selectedLog.error_message}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
