-- Modificar função de criação de perfil para marcar novos usuários como inativos
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, is_active, last_login_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    false,  -- Novos usuários criados como INATIVOS (aguardando aprovação)
    now()
  );
  RETURN NEW;
END;
$$;

-- Comentário para clareza
COMMENT ON FUNCTION public.handle_new_user_profile IS 'Cria perfil inativo para novos usuários. Admin deve ativar manualmente.';