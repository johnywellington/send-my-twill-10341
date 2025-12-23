-- Criar tabela de logs de sincronização
CREATE TABLE IF NOT EXISTS public.sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sync_type text NOT NULL,
  provider text,
  status text NOT NULL CHECK (status IN ('success', 'error')),
  items_added integer DEFAULT 0,
  items_updated integer DEFAULT 0,
  error_message text,
  execution_time_ms integer,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- Política: usuários podem ver seus próprios logs
CREATE POLICY "Users can view own sync logs"
ON public.sync_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Política: admins podem ver todos os logs
CREATE POLICY "Admins can view all sync logs"
ON public.sync_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Política: service role pode inserir logs
CREATE POLICY "Service role can insert sync logs"
ON public.sync_logs
FOR INSERT
WITH CHECK (true);

-- Criar índices para performance
CREATE INDEX idx_sync_logs_user_id ON public.sync_logs(user_id);
CREATE INDEX idx_sync_logs_sync_type ON public.sync_logs(sync_type);
CREATE INDEX idx_sync_logs_created_at ON public.sync_logs(created_at DESC);
CREATE INDEX idx_sync_logs_status ON public.sync_logs(status);