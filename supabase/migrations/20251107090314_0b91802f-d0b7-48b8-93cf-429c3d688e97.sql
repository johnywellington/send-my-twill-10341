-- Tabela para analytics do Vonage Reports API
CREATE TABLE IF NOT EXISTS public.usage_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  report_date DATE NOT NULL,
  provider TEXT NOT NULL DEFAULT 'vonage',
  
  -- Métricas de SMS
  sms_sent INTEGER DEFAULT 0,
  sms_delivered INTEGER DEFAULT 0,
  sms_failed INTEGER DEFAULT 0,
  sms_cost NUMERIC(10, 4) DEFAULT 0,
  
  -- Métricas de Voice
  voice_calls INTEGER DEFAULT 0,
  voice_minutes INTEGER DEFAULT 0,
  voice_cost NUMERIC(10, 4) DEFAULT 0,
  
  -- Métricas de IVR
  ivr_calls INTEGER DEFAULT 0,
  ivr_minutes INTEGER DEFAULT 0,
  ivr_cost NUMERIC(10, 4) DEFAULT 0,
  
  -- Totais
  total_cost NUMERIC(10, 4) DEFAULT 0,
  
  -- Metadata
  raw_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, report_date, provider)
);

-- Adicionar colunas de validação na tabela contacts
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS is_valid BOOLEAN,
ADD COLUMN IF NOT EXISTS validation_status TEXT,
ADD COLUMN IF NOT EXISTS validation_reason TEXT,
ADD COLUMN IF NOT EXISTS carrier_name TEXT,
ADD COLUMN IF NOT EXISTS country_code_detected TEXT,
ADD COLUMN IF NOT EXISTS line_type TEXT,
ADD COLUMN IF NOT EXISTS validated_at TIMESTAMP WITH TIME ZONE;

-- Adicionar colunas extras em received_calls para metadata enriquecida
ALTER TABLE public.received_calls
ADD COLUMN IF NOT EXISTS caller_name TEXT,
ADD COLUMN IF NOT EXISTS answered BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS answer_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS hangup_cause TEXT,
ADD COLUMN IF NOT EXISTS transcription_text TEXT,
ADD COLUMN IF NOT EXISTS transcription_available BOOLEAN DEFAULT false;

-- RLS para usage_analytics
ALTER TABLE public.usage_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analytics"
  ON public.usage_analytics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage analytics"
  ON public.usage_analytics FOR ALL
  USING (true);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_usage_analytics_user_date 
  ON public.usage_analytics(user_id, report_date DESC);

CREATE INDEX IF NOT EXISTS idx_contacts_validation 
  ON public.contacts(user_id, is_valid) WHERE is_valid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_received_calls_user_date 
  ON public.received_calls(user_id, created_at DESC);