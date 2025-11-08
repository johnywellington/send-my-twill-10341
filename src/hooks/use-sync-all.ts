import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface SyncProgress {
  total: number;
  completed: number;
  current?: string;
  results: {
    name: string;
    status: "pending" | "running" | "success" | "error";
    message?: string;
  }[];
}

export function useSyncAll() {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<SyncProgress | null>(null);

  const syncAll = async () => {
    setIsLoading(true);

    const syncOperations = [
      { name: "Números Twilio", function: "sync-twilio-numbers" },
      { name: "Números Vonage", function: "sync-vonage-numbers" },
      { name: "Domínios SIP Twilio", function: "sync-twilio-sip-domains" },
      { name: "Aplicações SIP Vonage", function: "sync-vonage-sip-applications" },
      { name: "Status Endpoints SIP", function: "sync-sip-endpoints-status" },
    ];

    const initialProgress: SyncProgress = {
      total: syncOperations.length,
      completed: 0,
      results: syncOperations.map(op => ({
        name: op.name,
        status: "pending"
      }))
    };

    setProgress(initialProgress);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < syncOperations.length; i++) {
      const operation = syncOperations[i];

      setProgress(prev => ({
        ...prev!,
        current: operation.name,
        results: prev!.results.map((r, idx) =>
          idx === i ? { ...r, status: "running" } : r
        )
      }));

      try {
        const { data, error } = await supabase.functions.invoke(operation.function, {
          body: {},
        });

        if (error) throw error;

        successCount++;
        setProgress(prev => ({
          ...prev!,
          completed: prev!.completed + 1,
          results: prev!.results.map((r, idx) =>
            idx === i
              ? {
                  ...r,
                  status: "success",
                  message: data?.message || "Sincronização concluída"
                }
              : r
          )
        }));
      } catch (error) {
        console.error(`Error syncing ${operation.name}:`, error);
        errorCount++;
        setProgress(prev => ({
          ...prev!,
          completed: prev!.completed + 1,
          results: prev!.results.map((r, idx) =>
            idx === i
              ? {
                  ...r,
                  status: "error",
                  message: error instanceof Error ? error.message : "Erro desconhecido"
                }
              : r
          )
        }));
      }
    }

    setIsLoading(false);

    // Toast final
    if (errorCount === 0) {
      toast({
        title: "✅ Sincronização Completa",
        description: `Todas as ${successCount} operações foram concluídas com sucesso.`,
      });
    } else if (successCount > 0) {
      toast({
        title: "⚠️ Sincronização Parcial",
        description: `${successCount} operações bem-sucedidas, ${errorCount} falharam.`,
        variant: "default",
      });
    } else {
      toast({
        title: "❌ Erro na Sincronização",
        description: `Todas as ${errorCount} operações falharam.`,
        variant: "destructive",
      });
    }

    // Aguardar 2s para o usuário ver o resultado antes de limpar
    setTimeout(() => {
      setProgress(null);
    }, 3000);
  };

  return {
    syncAll,
    isLoading,
    progress,
  };
}
