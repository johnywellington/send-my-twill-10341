-- Add provider column to voice_logs table
ALTER TABLE voice_logs 
ADD COLUMN IF NOT EXISTS provider text DEFAULT 'vonage' 
CHECK (provider IN ('vonage', 'twilio'));

-- Create index for queries by provider
CREATE INDEX IF NOT EXISTS idx_voice_logs_provider 
ON voice_logs(provider);

-- Add provider column to ivr_logs table
ALTER TABLE ivr_logs 
ADD COLUMN IF NOT EXISTS provider text DEFAULT 'vonage' 
CHECK (provider IN ('vonage', 'twilio'));

-- Create index for queries by provider
CREATE INDEX IF NOT EXISTS idx_ivr_logs_provider 
ON ivr_logs(provider);