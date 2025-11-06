-- Simplificar tabela voice_logs: remover colunas de fallback e adicionar voice_label
ALTER TABLE voice_logs DROP COLUMN IF EXISTS voice_name;
ALTER TABLE voice_logs DROP COLUMN IF EXISTS used_fallback;
ALTER TABLE voice_logs DROP COLUMN IF EXISTS original_voice;
ALTER TABLE voice_logs ADD COLUMN IF NOT EXISTS voice_label TEXT;

COMMENT ON COLUMN voice_logs.voice_label IS 'Nome legível da voz selecionada (ex: Inês, Cristiano)';

-- Simplificar tabela ivr_logs: remover colunas de fallback e adicionar voice_label
ALTER TABLE ivr_logs DROP COLUMN IF EXISTS voice_name;
ALTER TABLE ivr_logs DROP COLUMN IF EXISTS used_fallback;
ALTER TABLE ivr_logs DROP COLUMN IF EXISTS original_voice;
ALTER TABLE ivr_logs ADD COLUMN IF NOT EXISTS voice_label TEXT;

COMMENT ON COLUMN ivr_logs.voice_label IS 'Nome legível da voz selecionada (ex: Inês, Cristiano)';