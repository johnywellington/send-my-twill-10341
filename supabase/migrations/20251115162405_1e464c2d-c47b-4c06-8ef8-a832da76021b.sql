-- Add subaccount_id column to phone_numbers table
ALTER TABLE phone_numbers 
ADD COLUMN IF NOT EXISTS subaccount_id UUID REFERENCES provider_subaccounts(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_phone_numbers_subaccount_id ON phone_numbers(subaccount_id);

-- Update comment
COMMENT ON COLUMN phone_numbers.subaccount_id IS 'Reference to provider subaccount if this number is managed by a subaccount';