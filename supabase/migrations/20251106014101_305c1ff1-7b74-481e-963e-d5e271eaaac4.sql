-- Create bulk_send_logs table to track bulk sending statistics
CREATE TABLE IF NOT EXISTS public.bulk_send_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('sms', 'voice')),
  provider text NOT NULL CHECK (provider IN ('twilio', 'vonage')),
  total_contacts integer NOT NULL,
  successful_sends integer NOT NULL DEFAULT 0,
  failed_sends integer NOT NULL DEFAULT 0,
  throttle_percentage numeric(3,2) NOT NULL DEFAULT 1.00,
  avg_delay_ms integer NOT NULL,
  total_duration_seconds integer NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bulk_send_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own bulk send logs"
  ON public.bulk_send_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bulk send logs"
  ON public.bulk_send_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_bulk_send_logs_user_id ON public.bulk_send_logs(user_id);
CREATE INDEX idx_bulk_send_logs_created_at ON public.bulk_send_logs(created_at DESC);
CREATE INDEX idx_bulk_send_logs_provider ON public.bulk_send_logs(provider);
CREATE INDEX idx_bulk_send_logs_type ON public.bulk_send_logs(type);