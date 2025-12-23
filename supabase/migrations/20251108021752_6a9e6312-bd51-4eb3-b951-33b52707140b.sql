-- Create exchange_rates table for caching currency conversion rates
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency TEXT NOT NULL,
  target_currency TEXT NOT NULL,
  rate NUMERIC NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '1 hour',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient lookups
CREATE INDEX idx_exchange_rates_currencies ON public.exchange_rates(base_currency, target_currency);
CREATE INDEX idx_exchange_rates_expires_at ON public.exchange_rates(expires_at);

-- Enable Row Level Security
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- Admins can manage exchange rates
CREATE POLICY "Admins can manage exchange rates" 
  ON public.exchange_rates 
  FOR ALL 
  USING (has_role(auth.uid(), 'admin'));

-- Anyone can read valid (non-expired) exchange rates
CREATE POLICY "Anyone can read exchange rates" 
  ON public.exchange_rates 
  FOR SELECT 
  USING (expires_at > NOW());

-- Add comment
COMMENT ON TABLE public.exchange_rates IS 'Cache for currency exchange rates with 1-hour expiration';