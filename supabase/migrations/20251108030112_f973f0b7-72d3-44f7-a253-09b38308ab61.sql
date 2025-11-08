-- Adicionar credential_id às tabelas de logs para rastreamento de uso

-- Adicionar credential_id à tabela sms_logs
ALTER TABLE public.sms_logs 
ADD COLUMN IF NOT EXISTS credential_id UUID REFERENCES public.provider_credentials(id) ON DELETE SET NULL;

-- Adicionar credential_id à tabela voice_logs
ALTER TABLE public.voice_logs 
ADD COLUMN IF NOT EXISTS credential_id UUID REFERENCES public.provider_credentials(id) ON DELETE SET NULL;

-- Adicionar credential_id à tabela ivr_logs
ALTER TABLE public.ivr_logs 
ADD COLUMN IF NOT EXISTS credential_id UUID REFERENCES public.provider_credentials(id) ON DELETE SET NULL;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_sms_logs_credential_id ON public.sms_logs(credential_id);
CREATE INDEX IF NOT EXISTS idx_voice_logs_credential_id ON public.voice_logs(credential_id);
CREATE INDEX IF NOT EXISTS idx_ivr_logs_credential_id ON public.ivr_logs(credential_id);

-- Criar índices compostos para queries de estatísticas
CREATE INDEX IF NOT EXISTS idx_sms_logs_credential_created ON public.sms_logs(credential_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_logs_credential_created ON public.voice_logs(credential_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ivr_logs_credential_created ON public.ivr_logs(credential_id, created_at DESC);