-- Remover política atual de SELECT
DROP POLICY IF EXISTS "Users can view own credentials" ON public.provider_credentials;

-- Criar nova política que permite todos usuários autenticados ver todas as credenciais
CREATE POLICY "Authenticated users can view all credentials" 
ON public.provider_credentials 
FOR SELECT 
TO authenticated
USING (true);

-- Fazer o mesmo para subaccounts
DROP POLICY IF EXISTS "Users can view own subaccounts" ON public.provider_subaccounts;

CREATE POLICY "Authenticated users can view all subaccounts" 
ON public.provider_subaccounts 
FOR SELECT 
TO authenticated
USING (true);