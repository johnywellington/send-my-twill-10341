-- Fase 1: Database Schema para Módulo SIP

-- 1. Tabela sip_users - Usuários SIP
CREATE TABLE public.sip_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sip_username TEXT NOT NULL,
  sip_password TEXT NOT NULL,
  sip_domain TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('twilio', 'vonage')),
  extension TEXT NOT NULL,
  display_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  twilio_credential_sid TEXT,
  vonage_endpoint_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(sip_username, provider),
  UNIQUE(extension)
);

-- 2. Tabela sip_routes - Rotas de Chamadas
CREATE TABLE public.sip_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  route_type TEXT NOT NULL CHECK (route_type IN ('sip_to_sip', 'sip_to_pstn', 'pstn_to_sip')),
  provider TEXT NOT NULL CHECK (provider IN ('twilio', 'vonage')),
  from_pattern TEXT NOT NULL,
  to_pattern TEXT NOT NULL,
  forward_to TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Tabela sip_call_logs - Logs Detalhados de SIP
CREATE TABLE public.sip_call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sip_user_id UUID REFERENCES public.sip_users(id) ON DELETE SET NULL,
  route_id UUID REFERENCES public.sip_routes(id) ON DELETE SET NULL,
  call_uuid TEXT NOT NULL UNIQUE,
  conversation_uuid TEXT,
  provider TEXT NOT NULL CHECK (provider IN ('twilio', 'vonage')),
  call_type TEXT NOT NULL CHECK (call_type IN ('sip_to_sip', 'sip_to_pstn', 'pstn_to_sip')),
  from_uri TEXT NOT NULL,
  to_uri TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'ringing', 'answered', 'completed', 'failed')),
  duration INTEGER,
  start_time TIMESTAMP WITH TIME ZONE,
  answer_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  hangup_cause TEXT,
  cost NUMERIC(10, 4),
  quality_score INTEGER CHECK (quality_score >= 1 AND quality_score <= 5),
  metadata JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Tabela sip_endpoints - Status em Tempo Real
CREATE TABLE public.sip_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sip_user_id UUID NOT NULL REFERENCES public.sip_users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('twilio', 'vonage')),
  status TEXT NOT NULL DEFAULT 'unregistered' CHECK (status IN ('registered', 'unregistered', 'busy', 'idle')),
  last_seen TIMESTAMP WITH TIME ZONE,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(sip_user_id, provider)
);

-- Enable RLS
ALTER TABLE public.sip_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sip_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sip_call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sip_endpoints ENABLE ROW LEVEL SECURITY;

-- RLS Policies para sip_users
CREATE POLICY "Admins can manage all SIP users"
  ON public.sip_users FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own SIP user"
  ON public.sip_users FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policies para sip_routes
CREATE POLICY "Admins can manage all routes"
  ON public.sip_routes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view active routes"
  ON public.sip_routes FOR SELECT
  USING (is_active = true);

-- RLS Policies para sip_call_logs
CREATE POLICY "Admins can view all call logs"
  ON public.sip_call_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own call logs"
  ON public.sip_call_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage call logs"
  ON public.sip_call_logs FOR ALL
  USING (true);

-- RLS Policies para sip_endpoints
CREATE POLICY "Admins can view all endpoints"
  ON public.sip_endpoints FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own endpoints"
  ON public.sip_endpoints FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.sip_users
    WHERE sip_users.id = sip_endpoints.sip_user_id
    AND sip_users.user_id = auth.uid()
  ));

CREATE POLICY "Service role can manage endpoints"
  ON public.sip_endpoints FOR ALL
  USING (true);

-- Triggers para updated_at
CREATE TRIGGER update_sip_users_updated_at
  BEFORE UPDATE ON public.sip_users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sip_routes_updated_at
  BEFORE UPDATE ON public.sip_routes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sip_call_logs_updated_at
  BEFORE UPDATE ON public.sip_call_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sip_endpoints_updated_at
  BEFORE UPDATE ON public.sip_endpoints
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_sip_users_user_id ON public.sip_users(user_id);
CREATE INDEX idx_sip_users_extension ON public.sip_users(extension);
CREATE INDEX idx_sip_users_provider ON public.sip_users(provider);
CREATE INDEX idx_sip_routes_user_id ON public.sip_routes(user_id);
CREATE INDEX idx_sip_routes_is_active ON public.sip_routes(is_active);
CREATE INDEX idx_sip_routes_priority ON public.sip_routes(priority DESC);
CREATE INDEX idx_sip_call_logs_user_id ON public.sip_call_logs(user_id);
CREATE INDEX idx_sip_call_logs_sip_user_id ON public.sip_call_logs(sip_user_id);
CREATE INDEX idx_sip_call_logs_status ON public.sip_call_logs(status);
CREATE INDEX idx_sip_call_logs_created_at ON public.sip_call_logs(created_at DESC);
CREATE INDEX idx_sip_endpoints_sip_user_id ON public.sip_endpoints(sip_user_id);
CREATE INDEX idx_sip_endpoints_status ON public.sip_endpoints(status);