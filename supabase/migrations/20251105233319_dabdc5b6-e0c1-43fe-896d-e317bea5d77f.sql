-- ============================================================
-- FASE DE SEGURANÇA: Migrations do Banco de Dados
-- ============================================================

-- 1. Criar enum para roles de usuário
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. Criar tabela user_roles (separada por segurança)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- 3. Criar função security definer para verificar roles (evita recursão RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. Adicionar user_id à tabela ivr_responses
ALTER TABLE public.ivr_responses 
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- 5. Atualizar RLS policies da tabela ivr_responses
-- Remover política pública antiga
DROP POLICY IF EXISTS "Users can view IVR responses" ON public.ivr_responses;

-- Nova política restritiva: usuários só veem suas próprias respostas
CREATE POLICY "Users can view own IVR responses"
  ON public.ivr_responses
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política para usuários criarem suas próprias respostas
CREATE POLICY "Users can create own IVR responses"
  ON public.ivr_responses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role pode inserir (para webhooks)
CREATE POLICY "Service role can insert IVR responses"
  ON public.ivr_responses
  FOR INSERT
  WITH CHECK (true);

-- Admins podem ver tudo
CREATE POLICY "Admins can view all IVR responses"
  ON public.ivr_responses
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- 6. Enable RLS na tabela user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Políticas para user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage user roles"
  ON public.user_roles
  FOR ALL
  USING (true);

-- 7. Criar função para auto-criar role 'user' ao registrar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

-- 8. Criar trigger para chamar a função ao criar novo usuário
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 9. Comentários para documentação
COMMENT ON TABLE public.user_roles IS 'Tabela de roles de usuário (separada por segurança)';
COMMENT ON FUNCTION public.has_role IS 'Verifica se usuário tem role específico (security definer evita recursão RLS)';
COMMENT ON COLUMN public.ivr_responses.user_id IS 'ID do usuário dono da resposta IVR';