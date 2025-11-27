-- Atualizar função para criar usuários já ativos (aprovação automática)
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, is_active, last_login_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    true,  -- Novos usuários criados como ATIVOS (aprovação automática)
    now()
  );
  RETURN NEW;
END;
$$;