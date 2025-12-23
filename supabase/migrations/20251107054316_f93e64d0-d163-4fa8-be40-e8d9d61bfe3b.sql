-- Create webhook health checks table
CREATE TABLE webhook_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  phone_number_id UUID NOT NULL REFERENCES phone_numbers(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('vonage', 'twilio')),
  test_type TEXT NOT NULL CHECK (test_type IN ('sms', 'voice')),
  webhook_url TEXT NOT NULL,
  
  -- Test results
  success BOOLEAN NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  valid_format BOOLEAN DEFAULT false,
  error_message TEXT,
  response_body JSONB,
  
  -- Metadata
  test_mode TEXT DEFAULT 'manual' CHECK (test_mode IN ('manual', 'automatic', 'scheduled')),
  tested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_webhook_health_phone ON webhook_health_checks(phone_number_id);
CREATE INDEX idx_webhook_health_tested_at ON webhook_health_checks(tested_at DESC);
CREATE INDEX idx_webhook_health_success ON webhook_health_checks(success);

-- Enable RLS
ALTER TABLE webhook_health_checks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own health checks"
  ON webhook_health_checks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert health checks"
  ON webhook_health_checks FOR INSERT
  WITH CHECK (true);