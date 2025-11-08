-- ========================================
-- Limpeza de Duplicatas e Constraint Única
-- ========================================

-- 1. Criar função para manter apenas o registro mais antigo de cada domínio
DO $$
DECLARE
  duplicate_record RECORD;
  keep_id UUID;
BEGIN
  -- Para cada duplicata, manter apenas o registro mais antigo
  FOR duplicate_record IN
    SELECT 
      config_key,
      config_value,
      provider,
      array_agg(domain_group_id ORDER BY created_at) as group_ids
    FROM sip_provider_config
    WHERE provider IN ('twilio', 'vonage')
    GROUP BY config_key, config_value, provider
    HAVING COUNT(*) > 1
  LOOP
    -- Manter o primeiro (mais antigo)
    keep_id := duplicate_record.group_ids[1];
    
    -- Deletar os demais
    DELETE FROM sip_provider_config
    WHERE 
      config_key = duplicate_record.config_key
      AND config_value = duplicate_record.config_value
      AND provider = duplicate_record.provider
      AND domain_group_id != keep_id;
      
    RAISE NOTICE 'Removidas duplicatas para: % - % (%)', 
      duplicate_record.provider, 
      duplicate_record.config_key, 
      duplicate_record.config_value;
  END LOOP;
END $$;

-- 2. Adicionar constraint única para prevenir duplicatas futuras
-- Isto garante que cada combinação de provider + config_key + config_value seja única
CREATE UNIQUE INDEX IF NOT EXISTS idx_sip_provider_config_unique 
ON sip_provider_config (provider, config_key, config_value)
WHERE is_active = true;

-- 3. Comentário para documentação
COMMENT ON INDEX idx_sip_provider_config_unique IS 
'Previne duplicatas de configurações SIP. Cada combinação de provider + config_key + config_value deve ser única.';