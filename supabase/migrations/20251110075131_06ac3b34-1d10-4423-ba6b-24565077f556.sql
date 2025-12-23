-- Create provider_subaccounts table
CREATE TABLE provider_subaccounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_credential_id UUID NOT NULL REFERENCES provider_credentials(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('twilio', 'vonage')),
  
  -- Subaccount information
  subaccount_name TEXT NOT NULL,
  subaccount_sid TEXT, -- For Twilio: Account SID of subaccount
  subaccount_api_key TEXT, -- For Vonage: API Key of subaccount
  subaccount_api_secret TEXT, -- Secret/Token of subaccount
  
  -- Configuration
  use_parent_balance BOOLEAN DEFAULT true, -- If using parent account balance
  is_active BOOLEAN DEFAULT true,
  
  -- API metadata
  api_metadata JSONB DEFAULT '{}'::jsonb, -- Stores complete API response
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(parent_credential_id, subaccount_name)
);

-- Indexes
CREATE INDEX idx_subaccounts_parent ON provider_subaccounts(parent_credential_id);
CREATE INDEX idx_subaccounts_user ON provider_subaccounts(user_id);
CREATE INDEX idx_subaccounts_provider ON provider_subaccounts(provider);

-- Enable RLS
ALTER TABLE provider_subaccounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own subaccounts"
  ON provider_subaccounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subaccounts"
  ON provider_subaccounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subaccounts"
  ON provider_subaccounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subaccounts"
  ON provider_subaccounts FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_provider_subaccounts_updated_at
  BEFORE UPDATE ON provider_subaccounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add subaccount_id to existing log tables
ALTER TABLE sms_logs ADD COLUMN subaccount_id UUID REFERENCES provider_subaccounts(id) ON DELETE SET NULL;
ALTER TABLE voice_logs ADD COLUMN subaccount_id UUID REFERENCES provider_subaccounts(id) ON DELETE SET NULL;
ALTER TABLE ivr_logs ADD COLUMN subaccount_id UUID REFERENCES provider_subaccounts(id) ON DELETE SET NULL;

-- Indexes for log tables
CREATE INDEX idx_sms_logs_subaccount ON sms_logs(subaccount_id);
CREATE INDEX idx_voice_logs_subaccount ON voice_logs(subaccount_id);
CREATE INDEX idx_ivr_logs_subaccount ON ivr_logs(subaccount_id);