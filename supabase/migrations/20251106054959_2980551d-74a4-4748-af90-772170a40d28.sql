-- Create phone_numbers table
CREATE TABLE phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Phone Information
  phone_number TEXT NOT NULL,
  friendly_name TEXT,
  country_code TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('vonage', 'twilio')),
  
  -- Capabilities
  supports_sms BOOLEAN DEFAULT true,
  supports_voice BOOLEAN DEFAULT true,
  supports_mms BOOLEAN DEFAULT false,
  
  -- Status and Configuration
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  webhook_configured BOOLEAN DEFAULT false,
  
  -- Metadata
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(phone_number, provider)
);

-- Indexes for performance
CREATE INDEX idx_phone_numbers_user_id ON phone_numbers(user_id);
CREATE INDEX idx_phone_numbers_provider ON phone_numbers(provider);
CREATE INDEX idx_phone_numbers_active ON phone_numbers(is_active);

-- Function to update timestamps (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_phone_numbers_updated_at
  BEFORE UPDATE ON phone_numbers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE phone_numbers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own phone numbers"
  ON phone_numbers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own phone numbers"
  ON phone_numbers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own phone numbers"
  ON phone_numbers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own phone numbers"
  ON phone_numbers FOR DELETE
  USING (auth.uid() = user_id);