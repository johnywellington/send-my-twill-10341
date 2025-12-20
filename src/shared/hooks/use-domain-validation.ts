import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useDomainValidation(domainGroupId: string | null) {
  return useQuery({
    queryKey: ['domain-validation', domainGroupId],
    queryFn: async () => {
      if (!domainGroupId) {
        return { hasUsers: false, hasRoutes: false, userCount: 0, routeCount: 0 };
      }

      // Verificar usuários
      const { data: users } = await supabase
        .from('sip_users')
        .select('id')
        .eq('domain_group_id', domainGroupId);

      // Verificar rotas
      const { data: routes } = await supabase
        .from('sip_routes')
        .select('id')
        .eq('domain_group_id', domainGroupId);

      return {
        hasUsers: (users?.length || 0) > 0,
        hasRoutes: (routes?.length || 0) > 0,
        userCount: users?.length || 0,
        routeCount: routes?.length || 0,
      };
    },
    enabled: !!domainGroupId,
  });
}
