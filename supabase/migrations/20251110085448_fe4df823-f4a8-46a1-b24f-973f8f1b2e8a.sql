-- Add encrypted_data column to provider_credentials for storing non-sensitive metadata
ALTER TABLE provider_credentials 
ADD COLUMN IF NOT EXISTS encrypted_data jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN provider_credentials.encrypted_data IS 'Stores non-sensitive credential metadata like application_id, but NOT auth tokens or secrets';