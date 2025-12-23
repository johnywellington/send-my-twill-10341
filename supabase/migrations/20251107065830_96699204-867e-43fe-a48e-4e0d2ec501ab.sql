-- Criar função para limpar chamadas antigas automaticamente
CREATE OR REPLACE FUNCTION public.cleanup_stale_calls()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Atualizar ivr_logs com chamadas antigas
  UPDATE ivr_logs 
  SET 
    status = 'failed',
    error_message = 'Timeout: Chamada não atualizada por webhook',
    updated_at = NOW()
  WHERE 
    status IN ('initiated', 'ringing', 'in-progress')
    AND created_at < NOW() - INTERVAL '10 minutes';

  -- Atualizar voice_logs com chamadas antigas
  UPDATE voice_logs 
  SET 
    status = 'failed',
    error_message = 'Timeout: Chamada não atualizada por webhook',
    updated_at = NOW()
  WHERE 
    status IN ('initiated', 'ringing', 'in-progress')
    AND created_at < NOW() - INTERVAL '10 minutes';

  RAISE NOTICE 'Cleanup de chamadas antigas concluído';
END;
$$;