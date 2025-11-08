-- Create provider_credentials table for managing multiple accounts per provider
CREATE TABLE IF NOT EXISTS public.provider_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('twilio', 'vonage')),
  credential_name TEXT NOT NULL,
  account_identifier TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, provider, credential_name)
);

-- Add credential_id to phone_numbers table
ALTER TABLE public.phone_numbers 
ADD COLUMN IF NOT EXISTS credential_id UUID REFERENCES public.provider_credentials(id) ON DELETE SET NULL;

-- Enable RLS on provider_credentials
ALTER TABLE public.provider_credentials ENABLE ROW LEVEL SECURITY;

-- RLS Policies for provider_credentials
CREATE POLICY "Users can view own credentials"
  ON public.provider_credentials
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credentials"
  ON public.provider_credentials
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credentials"
  ON public.provider_credentials
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own credentials"
  ON public.provider_credentials
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_provider_credentials_updated_at
  BEFORE UPDATE ON public.provider_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_provider_credentials_user_provider 
  ON public.provider_credentials(user_id, provider);

CREATE INDEX IF NOT EXISTS idx_phone_numbers_credential_id 
  ON public.phone_numbers(credential_id);