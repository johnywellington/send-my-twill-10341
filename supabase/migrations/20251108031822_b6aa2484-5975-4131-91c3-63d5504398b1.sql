-- Adicionar credential_id às tabelas SIP para rastreamento de multi-credenciais

-- Adicionar credential_id em sip_provider_config
ALTER TABLE sip_provider_config 
ADD COLUMN IF NOT EXISTS credential_id uuid REFERENCES provider_credentials(id) ON DELETE SET NULL;

-- Adicionar credential_id em sip_users
ALTER TABLE sip_users 
ADD COLUMN IF NOT EXISTS credential_id uuid REFERENCES provider_credentials(id) ON DELETE SET NULL;

-- Adicionar credential_id em sip_routes
ALTER TABLE sip_routes 
ADD COLUMN IF NOT EXISTS credential_id uuid REFERENCES provider_credentials(id) ON DELETE SET NULL;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_sip_provider_config_credential_id ON sip_provider_config(credential_id);
CREATE INDEX IF NOT EXISTS idx_sip_users_credential_id ON sip_users(credential_id);
CREATE INDEX IF NOT EXISTS idx_sip_routes_credential_id ON sip_routes(credential_id);

-- Comentários
COMMENT ON COLUMN sip_provider_config.credential_id IS 'Referência à credencial específica usada (NULL = global/legacy)';
COMMENT ON COLUMN sip_users.credential_id IS 'Referência à credencial específica usada (NULL = global/legacy)';
COMMENT ON COLUMN sip_routes.credential_id IS 'Referência à credencial específica usada (NULL = global/legacy)';