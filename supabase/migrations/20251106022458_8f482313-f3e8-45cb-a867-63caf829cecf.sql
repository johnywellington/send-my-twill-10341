-- Criar bucket público para voice samples
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-samples', 'voice-samples', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Leitura pública dos samples
CREATE POLICY "Public read access for voice samples"
ON storage.objects FOR SELECT
USING (bucket_id = 'voice-samples');

-- Policy: Service role pode fazer upload
CREATE POLICY "Service role can upload voice samples"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'voice-samples' 
  AND auth.role() = 'service_role'
);

-- Adicionar colunas para tracking de fallback em voice_logs
ALTER TABLE voice_logs 
ADD COLUMN IF NOT EXISTS used_fallback BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS original_voice TEXT;

-- Adicionar colunas para tracking de fallback em ivr_logs
ALTER TABLE ivr_logs 
ADD COLUMN IF NOT EXISTS used_fallback BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS original_voice TEXT;

-- Índices para analytics
CREATE INDEX IF NOT EXISTS idx_voice_logs_fallback 
ON voice_logs(used_fallback) 
WHERE used_fallback = TRUE;

CREATE INDEX IF NOT EXISTS idx_ivr_logs_fallback 
ON ivr_logs(used_fallback) 
WHERE used_fallback = TRUE;