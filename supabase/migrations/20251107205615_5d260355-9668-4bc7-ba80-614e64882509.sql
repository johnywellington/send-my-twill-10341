-- FASE 1: Modificar estrutura do banco para suportar múltiplos domínios SIP

-- 1. Remover constraint UNIQUE antiga
ALTER TABLE sip_provider_config 
DROP CONSTRAINT IF EXISTS sip_provider_config_provider_config_key_key;

-- 2. Adicionar coluna domain_group_id para agrupar configs relacionadas
ALTER TABLE sip_provider_config 
ADD COLUMN IF NOT EXISTS domain_group_id UUID DEFAULT gen_random_uuid();

-- 3. Popular domain_group_id nas configs existentes (agrupar por provider)
-- Twilio: todas as configs do mesmo domínio ficam com mesmo group_id
WITH twilio_group AS (
  SELECT gen_random_uuid() as group_id
)
UPDATE sip_provider_config 
SET domain_group_id = (SELECT group_id FROM twilio_group)
WHERE provider = 'twilio' AND domain_group_id IS NULL;

-- Vonage: todas as configs da mesma app ficam com mesmo group_id
WITH vonage_group AS (
  SELECT gen_random_uuid() as group_id
)
UPDATE sip_provider_config 
SET domain_group_id = (SELECT group_id FROM vonage_group)
WHERE provider = 'vonage' AND domain_group_id IS NULL;

-- 4. Adicionar colunas adicionais úteis
ALTER TABLE sip_provider_config 
ADD COLUMN IF NOT EXISTS friendly_name TEXT,
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- 5. Popular friendly_name a partir dos dados existentes
UPDATE sip_provider_config 
SET friendly_name = config_value 
WHERE config_key IN ('sip_domain', 'app_name') AND friendly_name IS NULL;

-- 6. Definir primeira config de cada provider como padrão
UPDATE sip_provider_config 
SET is_default = true 
WHERE id IN (
  SELECT DISTINCT ON (provider) id 
  FROM sip_provider_config 
  ORDER BY provider, created_at
) AND is_default = false;

-- 7. Nova constraint: unique por (provider, config_key, domain_group_id)
ALTER TABLE sip_provider_config 
ADD CONSTRAINT sip_provider_config_unique_per_group 
UNIQUE (provider, config_key, domain_group_id);

-- 8. Indexes para performance
CREATE INDEX IF NOT EXISTS idx_sip_config_group ON sip_provider_config(domain_group_id);
CREATE INDEX IF NOT EXISTS idx_sip_config_default ON sip_provider_config(provider, is_default) WHERE is_default = true;