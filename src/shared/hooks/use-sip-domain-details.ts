import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSIPDomainDetails(domainGroupId: string) {
  // Buscar informações do domínio
  const { data: domainInfo, isLoading: loadingDomain } = useQuery({
    queryKey: ['sip-domain-info', domainGroupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sip_provider_config')
        .select('*')
        .eq('domain_group_id', domainGroupId);

      if (error) throw error;

      // Transformar em objeto único
      const config: Record<string, any> = {
        domain_group_id: domainGroupId,
      };
      
      data.forEach(row => {
        config[row.config_key] = row.config_value;
        config.provider = row.provider;
        config.friendly_name = row.friendly_name;
        config.is_default = row.is_default;
        config.is_active = row.is_active;
        config.created_at = row.created_at;
        config.created_by = row.created_by;
      });

      return config;
    },
    enabled: !!domainGroupId,
  });

  // Buscar usuários do domínio
  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['sip-domain-users', domainGroupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sip_users')
        .select('*')
        .eq('domain_group_id', domainGroupId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!domainGroupId,
  });

  // Buscar rotas do domínio
  const { data: routes, isLoading: loadingRoutes } = useQuery({
    queryKey: ['sip-domain-routes', domainGroupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sip_routes')
        .select('*')
        .eq('domain_group_id', domainGroupId)
        .order('priority', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!domainGroupId,
  });

  // Buscar estatísticas de chamadas
  const { data: callStats, isLoading: loadingStats } = useQuery({
    queryKey: ['sip-domain-stats', domainGroupId],
    queryFn: async () => {
      // Buscar logs de chamadas dos usuários deste domínio
      const { data: userIds } = await supabase
        .from('sip_users')
        .select('id')
        .eq('domain_group_id', domainGroupId);

      if (!userIds || userIds.length === 0) {
        return {
          total_calls: 0,
          total_minutes: 0,
          total_cost: 0,
          last_call_at: null,
        };
      }

      const { data, error } = await supabase
        .from('sip_call_logs')
        .select('duration, cost, created_at')
        .in('sip_user_id', userIds.map(u => u.id))
        .order('created_at', { ascending: false });

      if (error) throw error;

      const stats = {
        total_calls: data?.length || 0,
        total_minutes: Math.round((data?.reduce((acc, log) => acc + (log.duration || 0), 0) || 0) / 60),
        total_cost: data?.reduce((acc, log) => acc + (parseFloat(log.cost as any) || 0), 0) || 0,
        last_call_at: data?.[0]?.created_at || null,
      };

      return stats;
    },
    enabled: !!domainGroupId,
  });

  return {
    domainInfo,
    users,
    routes,
    callStats,
    isLoading: loadingDomain || loadingUsers || loadingRoutes || loadingStats,
  };
}
