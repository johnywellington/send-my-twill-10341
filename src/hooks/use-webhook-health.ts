import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WebhookHealthCheck {
  id: string;
  user_id: string;
  phone_number_id: string;
  phone_number: string;
  provider: 'vonage' | 'twilio';
  test_type: 'sms' | 'voice';
  webhook_url: string;
  success: boolean;
  status_code: number | null;
  response_time_ms: number | null;
  valid_format: boolean;
  error_message: string | null;
  response_body: any;
  test_mode: 'manual' | 'automatic' | 'scheduled';
  tested_at: string;
  created_at: string;
}

export const useWebhookHealth = (phoneNumberId?: string) => {
  return useQuery({
    queryKey: ['webhook-health-checks', phoneNumberId],
    queryFn: async () => {
      let query = supabase
        .from('webhook_health_checks')
        .select('*')
        .order('tested_at', { ascending: false });
      
      if (phoneNumberId) {
        query = query.eq('phone_number_id', phoneNumberId);
      }
      
      const { data, error } = await query.limit(20);
      
      if (error) throw error;
      return data as WebhookHealthCheck[];
    },
    enabled: !!phoneNumberId
  });
};
