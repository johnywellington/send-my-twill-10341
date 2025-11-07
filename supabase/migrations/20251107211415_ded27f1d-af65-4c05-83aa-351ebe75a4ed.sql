-- 1. Adicionar coluna domain_group_id na tabela sip_users
ALTER TABLE sip_users 
ADD COLUMN IF NOT EXISTS domain_group_id UUID;

-- 2. Popular domain_group_id existentes em sip_users baseado no sip_domain
UPDATE sip_users su
SET domain_group_id = (
  SELECT DISTINCT domain_group_id 
  FROM sip_provider_config spc
  WHERE spc.config_key = 'sip_domain' 
    AND spc.config_value = su.sip_domain
    AND spc.provider = su.provider
  LIMIT 1
)
WHERE domain_group_id IS NULL;

-- 3. Adicionar coluna domain_group_id na tabela sip_routes
ALTER TABLE sip_routes 
ADD COLUMN IF NOT EXISTS domain_group_id UUID;

-- 4. Popular domain_group_id existentes em sip_routes baseado no provider (pegar o padrão)
UPDATE sip_routes sr
SET domain_group_id = (
  SELECT DISTINCT domain_group_id 
  FROM sip_provider_config spc
  WHERE spc.provider = sr.provider
    AND spc.is_default = true
  LIMIT 1
)
WHERE domain_group_id IS NULL;

-- 5. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_sip_users_domain_group ON sip_users(domain_group_id);
CREATE INDEX IF NOT EXISTS idx_sip_routes_domain_group ON sip_routes(domain_group_id);

-- 6. Comentários nas colunas
COMMENT ON COLUMN sip_users.domain_group_id IS 'Links SIP user to a specific domain configuration';
COMMENT ON COLUMN sip_routes.domain_group_id IS 'Links SIP route to a specific domain configuration';