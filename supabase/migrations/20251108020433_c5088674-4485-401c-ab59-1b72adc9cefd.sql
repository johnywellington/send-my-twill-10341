-- Create API validation logs table
CREATE TABLE api_validation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  credential_id UUID REFERENCES provider_credentials(id),
  provider TEXT NOT NULL,
  validation_type TEXT NOT NULL,
  status TEXT NOT NULL,
  account_type TEXT,
  account_info JSONB,
  error_message TEXT,
  latency_ms INTEGER,
  tested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_api_validation_logs_user_id ON api_validation_logs(user_id);
CREATE INDEX idx_api_validation_logs_provider ON api_validation_logs(provider);
CREATE INDEX idx_api_validation_logs_credential_id ON api_validation_logs(credential_id);
CREATE INDEX idx_api_validation_logs_tested_at ON api_validation_logs(tested_at DESC);

-- Enable RLS
ALTER TABLE api_validation_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own validation logs" 
  ON api_validation_logs FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert validation logs" 
  ON api_validation_logs FOR INSERT 
  WITH CHECK (true);