-- CORREÇÃO: Agrupar configs Twilio por domínio
WITH twilio_domains AS (
  -- Para cada sip_domain único, criar um novo group_id
  SELECT DISTINCT 
    config_value as sip_domain,
    (SELECT domain_group_id FROM sip_provider_config 
     WHERE provider = 'twilio' 
       AND config_key = 'sip_domain' 
       AND config_value = spc.config_value 
     LIMIT 1) as old_group_id,
    gen_random_uuid() as new_group_id
  FROM sip_provider_config spc
  WHERE provider = 'twilio' AND config_key = 'sip_domain'
)
UPDATE sip_provider_config spc
SET domain_group_id = td.new_group_id,
    friendly_name = COALESCE(spc.friendly_name, td.sip_domain)
FROM twilio_domains td
WHERE spc.provider = 'twilio'
  AND spc.domain_group_id = td.old_group_id;

-- CORREÇÃO: Agrupar configs Vonage por app_id
WITH vonage_apps AS (
  -- Para cada app_id único, criar um novo group_id
  SELECT DISTINCT 
    config_value as app_id,
    (SELECT domain_group_id FROM sip_provider_config 
     WHERE provider = 'vonage' 
       AND config_key = 'app_id' 
       AND config_value = spc.config_value 
     LIMIT 1) as old_group_id,
    gen_random_uuid() as new_group_id
  FROM sip_provider_config spc
  WHERE provider = 'vonage' AND config_key = 'app_id'
)
UPDATE sip_provider_config spc
SET domain_group_id = va.new_group_id,
    friendly_name = COALESCE(
      spc.friendly_name,
      (SELECT config_value FROM sip_provider_config 
       WHERE provider = 'vonage' 
         AND config_key = 'app_name' 
         AND domain_group_id = spc.domain_group_id 
       LIMIT 1)
    )
FROM vonage_apps va
WHERE spc.provider = 'vonage'
  AND spc.domain_group_id = va.old_group_id;

-- Garantir que todas as linhas do mesmo domain_group_id tenham o mesmo friendly_name
UPDATE sip_provider_config spc
SET friendly_name = (
  SELECT friendly_name 
  FROM sip_provider_config 
  WHERE domain_group_id = spc.domain_group_id 
    AND friendly_name IS NOT NULL 
  LIMIT 1
)
WHERE friendly_name IS NULL;