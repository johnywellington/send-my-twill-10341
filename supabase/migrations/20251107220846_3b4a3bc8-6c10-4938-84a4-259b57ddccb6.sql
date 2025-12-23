-- Criar tabela de testes de conectividade SIP
CREATE TABLE sip_connectivity_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sip_user_id UUID REFERENCES sip_users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('twilio', 'vonage')),
  test_type TEXT NOT NULL CHECK (test_type IN ('registration', 'credentials', 'api', 'full')),
  status TEXT NOT NULL CHECK (status IN ('passed', 'failed', 'warning')),
  
  -- Detalhes do teste
  endpoint_registered BOOLEAN,
  credentials_valid BOOLEAN,
  api_reachable BOOLEAN,
  account_status TEXT,
  
  -- Métricas
  latency_ms INTEGER,
  last_seen_at TIMESTAMPTZ,
  
  -- Diagnóstico
  error_message TEXT,
  error_code TEXT,
  recommendations JSONB DEFAULT '[]'::jsonb,
  
  -- Metadados
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_connectivity_tests_user ON sip_connectivity_tests(user_id);
CREATE INDEX idx_connectivity_tests_sip_user ON sip_connectivity_tests(sip_user_id);
CREATE INDEX idx_connectivity_tests_created ON sip_connectivity_tests(created_at DESC);

-- RLS
ALTER TABLE sip_connectivity_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own connectivity tests"
  ON sip_connectivity_tests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage connectivity tests"
  ON sip_connectivity_tests FOR ALL
  USING (true);