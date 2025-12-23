-- Create SIP provider configuration table
CREATE TABLE IF NOT EXISTS public.sip_provider_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('twilio', 'vonage')),
  config_key TEXT NOT NULL,
  config_value TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, config_key)
);

-- Enable RLS
ALTER TABLE public.sip_provider_config ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY "Admin full access to sip_provider_config"
  ON public.sip_provider_config FOR ALL 
  USING (has_role(auth.uid(), 'admin'));

-- User: read only active configs
CREATE POLICY "User read sip_provider_config"
  ON public.sip_provider_config FOR SELECT
  USING (is_active = true);

-- Trigger for updated_at
CREATE TRIGGER update_sip_provider_config_updated_at
  BEFORE UPDATE ON public.sip_provider_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();