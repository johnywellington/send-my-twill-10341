import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface SmsHistoryFilters {
  dateFrom?: Date;
  dateTo?: Date;
  fromNumber?: string;
  status?: string;
  provider?: string;
  searchTerm?: string;
}

interface SMSLog {
  id: string;
  created_at: string;
  from_number: string;
  to_number: string;
  message: string;
  status: string;
  provider: string;
  cost: number | null;
  external_id: string | null;
  error_message: string | null;
  user_id: string;
}

const PAGE_SIZE = 20;

export function useSmsHistory() {
  const [logs, setLogs] = useState<SMSLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<SmsHistoryFilters>({});
  const [uniqueFromNumbers, setUniqueFromNumbers] = useState<string[]>([]);

  const fetchLogs = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from("sms_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      // Apply filters
      if (filters.dateFrom) {
        query = query.gte("created_at", filters.dateFrom.toISOString());
      }
      if (filters.dateTo) {
        const endOfDay = new Date(filters.dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte("created_at", endOfDay.toISOString());
      }
      if (filters.fromNumber && filters.fromNumber !== "all") {
        query = query.eq("from_number", filters.fromNumber);
      }
      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }
      if (filters.provider && filters.provider !== "all") {
        query = query.eq("provider", filters.provider);
      }
      if (filters.searchTerm) {
        query = query.or(
          `to_number.ilike.%${filters.searchTerm}%,message.ilike.%${filters.searchTerm}%`
        );
      }

      // Pagination
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      setLogs(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Error fetching SMS logs:", error);
      toast({
        title: "Erro ao carregar histórico",
        description: "Não foi possível carregar os logs de SMS",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUniqueNumbers = async () => {
    try {
      const { data } = await supabase
        .from("sms_logs")
        .select("from_number")
        .order("from_number");

      if (data) {
        const unique = [...new Set(data.map((d) => d.from_number))];
        setUniqueFromNumbers(unique);
      }
    } catch (error) {
      console.error("Error fetching unique numbers:", error);
    }
  };

  useEffect(() => {
    fetchUniqueNumbers();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [currentPage, filters]);

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const exportToCSV = () => {
    if (logs.length === 0) {
      toast({
        title: "Nenhum dado para exportar",
        description: "Não há logs para exportar",
        variant: "destructive",
      });
      return;
    }

    const csv = [
      ["Data", "De", "Para", "Mensagem", "Status", "Provider", "Custo", "Erro"],
      ...logs.map((log) => [
        format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss"),
        log.from_number,
        log.to_number,
        log.message.replace(/"/g, '""'),
        log.status,
        log.provider,
        log.cost?.toString() || "0",
        log.error_message || "",
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `historico-sms-${format(new Date(), "yyyy-MM-dd-HHmmss")}.csv`;
    link.click();

    toast({
      title: "CSV exportado com sucesso",
      description: `${logs.length} registros exportados`,
    });
  };

  return {
    logs,
    totalCount,
    loading,
    currentPage,
    totalPages,
    filters,
    setFilters,
    goToPage,
    refetch: fetchLogs,
    exportToCSV,
    uniqueFromNumbers,
  };
}
