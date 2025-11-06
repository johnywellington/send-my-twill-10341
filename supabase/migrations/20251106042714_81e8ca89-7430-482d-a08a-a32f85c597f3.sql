-- Tabela para SMS recebidos
CREATE TABLE received_sms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL UNIQUE,
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  message TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('twilio', 'vonage')),
  user_id UUID REFERENCES auth.users(id),
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_received_sms_to_number ON received_sms(to_number);
CREATE INDEX idx_received_sms_user_id ON received_sms(user_id);
CREATE INDEX idx_received_sms_received_at ON received_sms(received_at DESC);
CREATE INDEX idx_received_sms_from_number ON received_sms(from_number);

-- RLS Policies para received_sms
ALTER TABLE received_sms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their received SMS"
  ON received_sms FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Service role can insert received SMS"
  ON received_sms FOR INSERT
  WITH CHECK (true);

-- Habilitar Realtime para received_sms
ALTER PUBLICATION supabase_realtime ADD TABLE received_sms;

-- Tabela para chamadas recebidas
CREATE TABLE received_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_uuid TEXT NOT NULL UNIQUE,
  conversation_uuid TEXT,
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'answered', 'in-progress', 'completed', 'missed', 'failed', 'busy', 'no-answer')),
  provider TEXT NOT NULL CHECK (provider IN ('twilio', 'vonage')),
  user_id UUID REFERENCES auth.users(id),
  duration INTEGER,
  recording_url TEXT,
  cost NUMERIC(10, 4),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_received_calls_to_number ON received_calls(to_number);
CREATE INDEX idx_received_calls_user_id ON received_calls(user_id);
CREATE INDEX idx_received_calls_started_at ON received_calls(started_at DESC);
CREATE INDEX idx_received_calls_status ON received_calls(status);
CREATE INDEX idx_received_calls_from_number ON received_calls(from_number);

-- RLS Policies para received_calls
ALTER TABLE received_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their received calls"
  ON received_calls FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage received calls"
  ON received_calls FOR ALL
  USING (true);

-- Habilitar Realtime para received_calls
ALTER PUBLICATION supabase_realtime ADD TABLE received_calls;

-- Trigger para atualizar updated_at em received_calls
CREATE TRIGGER update_received_calls_updated_at
  BEFORE UPDATE ON received_calls
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();