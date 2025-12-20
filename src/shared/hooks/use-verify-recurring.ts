import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RecurringInfo {
  phone_number: string;
  last_campaign_name: string | null;
  last_campaign_date: string;
  count: number;
}

export interface VerifyResult {
  cleanNumbers: string[];
  recurringNumbers: RecurringInfo[];
}

export function useVerifyRecurring() {
  return useMutation({
    mutationFn: async (phoneNumbers: string[]): Promise<VerifyResult> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      // Buscar números que já existem em sms_logs
      const { data: existingLogs, error } = await supabase
        .from("sms_logs")
        .select("to_number, campaign_name, created_at")
        .eq("user_id", user.id)
        .in("to_number", phoneNumbers)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Agrupar por número e pegar a campanha mais recente
      const recurringMap = new Map<string, RecurringInfo>();
      
      for (const log of existingLogs || []) {
        const existing = recurringMap.get(log.to_number);
        if (!existing) {
          recurringMap.set(log.to_number, {
            phone_number: log.to_number,
            last_campaign_name: log.campaign_name,
            last_campaign_date: log.created_at,
            count: 1,
          });
        } else {
          existing.count++;
        }
      }

      const recurringSet = new Set(recurringMap.keys());
      const cleanNumbers = phoneNumbers.filter(n => !recurringSet.has(n));
      const recurringNumbers = Array.from(recurringMap.values());

      return {
        cleanNumbers,
        recurringNumbers,
      };
    },
  });
}
