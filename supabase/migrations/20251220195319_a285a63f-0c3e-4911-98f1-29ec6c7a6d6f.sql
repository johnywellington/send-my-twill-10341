-- Tabela para histórico de execuções de campanhas
CREATE TABLE public.campaign_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_contacts INTEGER NOT NULL DEFAULT 0,
  successful_sends INTEGER NOT NULL DEFAULT 0,
  failed_sends INTEGER NOT NULL DEFAULT 0,
  pending_sends INTEGER NOT NULL DEFAULT 0,
  provider TEXT NOT NULL,
  from_number TEXT NOT NULL,
  failed_numbers JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela para detalhes de cada número em uma execução
CREATE TABLE public.campaign_run_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.campaign_runs(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  contact_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  provider TEXT,
  error_message TEXT,
  external_id TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_campaign_runs_user_id ON public.campaign_runs(user_id);
CREATE INDEX idx_campaign_runs_campaign_id ON public.campaign_runs(campaign_id);
CREATE INDEX idx_campaign_runs_status ON public.campaign_runs(status);
CREATE INDEX idx_campaign_runs_scheduled_at ON public.campaign_runs(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX idx_campaign_run_details_run_id ON public.campaign_run_details(run_id);
CREATE INDEX idx_campaign_run_details_status ON public.campaign_run_details(status);

-- Habilitar RLS
ALTER TABLE public.campaign_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_run_details ENABLE ROW LEVEL SECURITY;

-- Policies para campaign_runs
CREATE POLICY "Users can view own campaign runs"
ON public.campaign_runs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own campaign runs"
ON public.campaign_runs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own campaign runs"
ON public.campaign_runs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own campaign runs"
ON public.campaign_runs FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage campaign runs"
ON public.campaign_runs FOR ALL
USING (true);

-- Policies para campaign_run_details
CREATE POLICY "Users can view details of own campaign runs"
ON public.campaign_run_details FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.campaign_runs
  WHERE campaign_runs.id = campaign_run_details.run_id
  AND campaign_runs.user_id = auth.uid()
));

CREATE POLICY "Users can insert details to own campaign runs"
ON public.campaign_run_details FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.campaign_runs
  WHERE campaign_runs.id = campaign_run_details.run_id
  AND campaign_runs.user_id = auth.uid()
));

CREATE POLICY "Users can update details of own campaign runs"
ON public.campaign_run_details FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.campaign_runs
  WHERE campaign_runs.id = campaign_run_details.run_id
  AND campaign_runs.user_id = auth.uid()
));

CREATE POLICY "Service role can manage campaign run details"
ON public.campaign_run_details FOR ALL
USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_campaign_runs_updated_at
BEFORE UPDATE ON public.campaign_runs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();