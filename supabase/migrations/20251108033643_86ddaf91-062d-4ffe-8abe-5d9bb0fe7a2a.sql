-- Adicionar coluna para armazenar o CredentialList SID do Twilio
ALTER TABLE sip_users 
ADD COLUMN IF NOT EXISTS twilio_credlist_sid TEXT;

-- Criar índice para melhorar performance de buscas
CREATE INDEX IF NOT EXISTS idx_sip_users_twilio_credlist 
ON sip_users(twilio_credlist_sid) 
WHERE provider = 'twilio';

COMMENT ON COLUMN sip_users.twilio_credlist_sid IS 'Twilio CredentialList SID - necessário para buscar a credential na API';
