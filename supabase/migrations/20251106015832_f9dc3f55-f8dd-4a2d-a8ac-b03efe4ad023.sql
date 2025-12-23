-- Add voice_name column to message_templates table
ALTER TABLE message_templates 
ADD COLUMN IF NOT EXISTS voice_name TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN message_templates.voice_name IS 'Specific voice name for Portuguese languages (e.g., Camila, Ricardo, Inês, Cristiano)';