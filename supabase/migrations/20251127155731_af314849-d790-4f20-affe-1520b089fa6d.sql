-- Adicionar coluna para tipo de conta (trial/full)
ALTER TABLE public.provider_credentials 
ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'full';

-- Comentário para documentação
COMMENT ON COLUMN public.provider_credentials.account_type IS 'Tipo da conta: trial ou full';