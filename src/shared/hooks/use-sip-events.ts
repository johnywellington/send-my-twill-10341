import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SIPEvent {
  id: string;
  event_type: string;
  event_category: string;
  user_id: string | null;
  domain_group_id: string | null;
  sip_user_id: string | null;
  route_id: string | null;
  provider: 'twilio' | 'vonage';
  event_data: Record<string, any>;
  metadata: Record<string, any>;
  created_at: string;
}

export function useSIPEvents(filters?: {
  category?: string;
  provider?: string;
  domain_group_id?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['sip-events', filters],
    queryFn: async () => {
      let query = supabase
        .from('sip_events')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.category) {
        query = query.eq('event_category', filters.category);
      }

      if (filters?.provider) {
        query = query.eq('provider', filters.provider);
      }

      if (filters?.domain_group_id) {
        query = query.eq('domain_group_id', filters.domain_group_id);
      }

      query = query.limit(filters?.limit || 50);

      const { data, error } = await query;

      if (error) throw error;
      return data as SIPEvent[];
    },
  });
}
