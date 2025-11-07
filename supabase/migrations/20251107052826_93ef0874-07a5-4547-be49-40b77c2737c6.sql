-- Adicionar coluna sync_source para rastrear origem dos números
ALTER TABLE phone_numbers 
ADD COLUMN IF NOT EXISTS sync_source TEXT DEFAULT 'manual' CHECK (sync_source IN ('manual', 'twilio', 'vonage'));

-- Adicionar comentário para documentação
COMMENT ON COLUMN phone_numbers.sync_source IS 'Origem do número: manual (adicionado pelo usuário), twilio (sincronizado via API), vonage (sincronizado via API)';

-- Criar index para melhor performance em queries
CREATE INDEX IF NOT EXISTS idx_phone_numbers_sync_source ON phone_numbers(sync_source);

-- Criar index composto para queries por usuário e origem
CREATE INDEX IF NOT EXISTS idx_phone_numbers_user_sync ON phone_numbers(user_id, sync_source);