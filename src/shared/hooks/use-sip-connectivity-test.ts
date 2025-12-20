import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TestResult {
  status: 'passed' | 'failed' | 'warning';
  endpoint_registered: boolean;
  credentials_valid: boolean;
  api_reachable: boolean;
  account_status: string;
  latency_ms: number;
  error_message?: string;
  recommendations: string[];
}

export function useSIPConnectivityTest() {
  const queryClient = useQueryClient();

  // Buscar histórico de testes
  const { data: testHistory, isLoading: loadingHistory } = useQuery({
    queryKey: ['sip-connectivity-tests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sip_connectivity_tests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  // Executar teste de conectividade
  const testConnectivity = useMutation({
    mutationFn: async (params: {
      provider: 'twilio' | 'vonage';
      test_type?: 'registration' | 'credentials' | 'api' | 'full' | 'post_creation';
    }) => {
      const { data, error } = await supabase.functions.invoke('sip-test-connectivity', {
        body: params,
      });

      if (error) throw error;
      return data as TestResult;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['sip-connectivity-tests'] });
      
      if (result.status === 'passed') {
        toast.success(`✅ Conectividade OK!`, {
          description: `Sistema operacional (${result.latency_ms}ms)`,
        });
      } else if (result.status === 'warning') {
        toast.warning('⚠️ Sistema funcional com avisos', {
          description: 'Verifique as recomendações abaixo',
          duration: 5000,
        });
      } else {
        toast.error(`❌ Sistema indisponível`, {
          description: result.error_message || 'Verifique as recomendações',
          duration: 5000,
        });
      }
    },
    onError: (error: Error) => {
      toast.error('Erro ao testar conectividade', {
        description: error.message,
      });
    },
  });

  // Obter último teste
  const lastTest = testHistory?.[0];

  // Verificar se pode fazer chamadas
  const canMakeCalls = lastTest?.status === 'passed' && lastTest?.endpoint_registered;

  return {
    testConnectivity: testConnectivity.mutate,
    isTesting: testConnectivity.isPending,
    lastTest,
    testHistory,
    loadingHistory,
    canMakeCalls,
  };
}
