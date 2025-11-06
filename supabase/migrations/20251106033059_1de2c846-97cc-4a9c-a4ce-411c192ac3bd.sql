-- Add retry_count column to bulk_send_logs table
ALTER TABLE bulk_send_logs 
ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0;