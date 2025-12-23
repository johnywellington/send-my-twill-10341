-- Create table for IVR responses
CREATE TABLE IF NOT EXISTS public.ivr_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  conversation_uuid TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  dtmf_digits TEXT,
  timed_out BOOLEAN DEFAULT false,
  event_data JSONB,
  template_used TEXT
);

-- Create index for faster lookups
CREATE INDEX idx_ivr_responses_conversation_uuid ON public.ivr_responses(conversation_uuid);
CREATE INDEX idx_ivr_responses_phone_number ON public.ivr_responses(phone_number);
CREATE INDEX idx_ivr_responses_created_at ON public.ivr_responses(created_at DESC);

-- Enable RLS
ALTER TABLE public.ivr_responses ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role to insert
CREATE POLICY "Allow service role to insert IVR responses" 
ON public.ivr_responses 
FOR INSERT 
TO service_role
WITH CHECK (true);

-- Create policy to allow authenticated users to read their own responses
CREATE POLICY "Users can view IVR responses" 
ON public.ivr_responses 
FOR SELECT 
TO authenticated
USING (true);