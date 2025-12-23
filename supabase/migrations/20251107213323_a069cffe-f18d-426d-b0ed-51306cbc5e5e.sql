-- FASE 1: Tabela de Eventos do Sistema SIP
CREATE TABLE sip_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL,
  
  -- Contexto do evento
  user_id UUID REFERENCES auth.users(id),
  domain_group_id UUID,
  sip_user_id UUID REFERENCES sip_users(id) ON DELETE SET NULL,
  route_id UUID REFERENCES sip_routes(id) ON DELETE SET NULL,
  
  -- Detalhes
  provider TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- Informações adicionais
  ip_address TEXT,
  user_agent TEXT,
  triggered_by UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CHECK (event_type IN ('domain_created', 'domain_deleted', 'domain_updated', 
                        'user_created', 'user_deleted', 'user_updated',
                        'route_created', 'route_deleted', 'route_updated',
                        'endpoint_registered', 'endpoint_unregistered',
                        'call_started', 'call_completed', 'call_failed')),
  CHECK (event_category IN ('domain', 'user', 'route', 'endpoint', 'call')),
  CHECK (provider IN ('twilio', 'vonage'))
);

-- Índices para performance
CREATE INDEX idx_sip_events_category ON sip_events(event_category);
CREATE INDEX idx_sip_events_type ON sip_events(event_type);
CREATE INDEX idx_sip_events_user ON sip_events(user_id);
CREATE INDEX idx_sip_events_domain ON sip_events(domain_group_id);
CREATE INDEX idx_sip_events_created ON sip_events(created_at DESC);
CREATE INDEX idx_sip_events_provider ON sip_events(provider);

-- RLS Policies
ALTER TABLE sip_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all events"
  ON sip_events FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own events"
  ON sip_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert events"
  ON sip_events FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE sip_events IS 'Logs de eventos do sistema SIP para auditoria e monitoramento';

-- FASE 2: Trigger para logar eventos de registro de endpoints
CREATE OR REPLACE FUNCTION log_endpoint_registration_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o status mudou para 'registered'
  IF NEW.status = 'registered' AND (OLD IS NULL OR OLD.status != 'registered') THEN
    INSERT INTO sip_events (
      event_type,
      event_category,
      sip_user_id,
      provider,
      event_data,
      metadata
    )
    SELECT 
      'endpoint_registered',
      'endpoint',
      NEW.sip_user_id,
      NEW.provider,
      jsonb_build_object(
        'endpoint_id', NEW.id,
        'ip_address', NEW.ip_address,
        'user_agent', NEW.user_agent
      ),
      jsonb_build_object(
        'previous_status', COALESCE(OLD.status, 'none'),
        'new_status', NEW.status
      );
  END IF;

  -- Se o status mudou para 'unregistered'
  IF NEW.status = 'unregistered' AND (OLD IS NULL OR OLD.status = 'registered') THEN
    INSERT INTO sip_events (
      event_type,
      event_category,
      sip_user_id,
      provider,
      event_data,
      metadata
    )
    SELECT 
      'endpoint_unregistered',
      'endpoint',
      NEW.sip_user_id,
      NEW.provider,
      jsonb_build_object(
        'endpoint_id', NEW.id,
        'last_seen', NEW.last_seen
      ),
      jsonb_build_object(
        'previous_status', COALESCE(OLD.status, 'none'),
        'new_status', NEW.status
      );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_log_endpoint_registration
  AFTER INSERT OR UPDATE OF status ON sip_endpoints
  FOR EACH ROW
  EXECUTE FUNCTION log_endpoint_registration_event();

COMMENT ON FUNCTION log_endpoint_registration_event IS 'Loga eventos de registro/desregistro de endpoints SIP';

-- FASE 3: Adicionar route_id aos logs de chamadas (se não existir)
ALTER TABLE sip_call_logs 
ADD COLUMN IF NOT EXISTS route_id UUID REFERENCES sip_routes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sip_call_logs_route ON sip_call_logs(route_id);

COMMENT ON COLUMN sip_call_logs.route_id IS 'Rota SIP usada para esta chamada';