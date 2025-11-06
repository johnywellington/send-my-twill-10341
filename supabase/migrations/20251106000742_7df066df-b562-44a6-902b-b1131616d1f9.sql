-- Create tables for communication logs

-- SMS Logs Table
CREATE TABLE public.sms_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_number TEXT NOT NULL,
  from_number TEXT NOT NULL,
  message TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('twilio', 'vonage')),
  status TEXT NOT NULL DEFAULT 'sent',
  external_id TEXT,
  error_message TEXT,
  cost NUMERIC(10, 4),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Voice Call Logs Table
CREATE TABLE public.voice_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_number TEXT NOT NULL,
  from_number TEXT NOT NULL,
  message TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'pt-PT',
  style INTEGER NOT NULL DEFAULT 0,
  premium BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'initiated',
  call_uuid TEXT,
  duration INTEGER,
  error_message TEXT,
  cost NUMERIC(10, 4),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- IVR Call Logs Table
CREATE TABLE public.ivr_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_number TEXT NOT NULL,
  from_number TEXT NOT NULL,
  template_used TEXT,
  ncco JSONB NOT NULL,
  language TEXT NOT NULL DEFAULT 'pt-PT',
  style INTEGER NOT NULL DEFAULT 0,
  premium BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'initiated',
  call_uuid TEXT,
  conversation_uuid TEXT,
  duration INTEGER,
  dtmf_response TEXT,
  error_message TEXT,
  cost NUMERIC(10, 4),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ivr_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sms_logs
CREATE POLICY "Users can view own SMS logs"
  ON public.sms_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own SMS logs"
  ON public.sms_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage SMS logs"
  ON public.sms_logs
  FOR ALL
  USING (true);

-- RLS Policies for voice_logs
CREATE POLICY "Users can view own voice logs"
  ON public.voice_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own voice logs"
  ON public.voice_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage voice logs"
  ON public.voice_logs
  FOR ALL
  USING (true);

-- RLS Policies for ivr_logs
CREATE POLICY "Users can view own IVR logs"
  ON public.ivr_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own IVR logs"
  ON public.ivr_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage IVR logs"
  ON public.ivr_logs
  FOR ALL
  USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_sms_logs_updated_at
  BEFORE UPDATE ON public.sms_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_voice_logs_updated_at
  BEFORE UPDATE ON public.voice_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ivr_logs_updated_at
  BEFORE UPDATE ON public.ivr_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for better query performance
CREATE INDEX idx_sms_logs_user_id ON public.sms_logs(user_id);
CREATE INDEX idx_sms_logs_created_at ON public.sms_logs(created_at DESC);
CREATE INDEX idx_voice_logs_user_id ON public.voice_logs(user_id);
CREATE INDEX idx_voice_logs_created_at ON public.voice_logs(created_at DESC);
CREATE INDEX idx_ivr_logs_user_id ON public.ivr_logs(user_id);
CREATE INDEX idx_ivr_logs_created_at ON public.ivr_logs(created_at DESC);