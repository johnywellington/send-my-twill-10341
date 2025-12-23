-- Adicionar suporte a múltiplas credenciais de API
-- Adiciona coluna para armazenar a chave do secret associado

ALTER TABLE public.provider_credentials 
ADD COLUMN IF NOT EXISTS secret_key TEXT;

-- Criar índice para melhorar performance de busca por secret_key
CREATE INDEX IF NOT EXISTS idx_provider_credentials_secret_key 
ON public.provider_credentials(secret_key);

-- Adicionar comentários para documentação
COMMENT ON COLUMN public.provider_credentials.secret_key IS 'Chave única que mapeia para os secrets do Supabase (ex: twilio_1, vonage_1). Os secrets reais são CRED_{secret_key}_sid, CRED_{secret_key}_token';

-- Atualizar credenciais existentes para usar o sistema legado (compatibilidade)
-- As credenciais antigas continuarão usando os secrets globais TWILIO_* e VONAGE_*
UPDATE public.provider_credentials 
SET secret_key = CASE 
  WHEN provider = 'twilio' AND secret_key IS NULL THEN 'legacy_twilio'
  WHEN provider = 'vonage' AND secret_key IS NULL THEN 'legacy_vonage'
  ELSE secret_key
END
WHERE secret_key IS NULL;