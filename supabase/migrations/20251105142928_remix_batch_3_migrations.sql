
-- Migration: 20251101220423
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
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

-- Create sms_limits table to track usage per user
CREATE TABLE public.sms_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    monthly_limit INTEGER NOT NULL DEFAULT 100,
    used_this_month INTEGER NOT NULL DEFAULT 0,
    last_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on sms_limits
ALTER TABLE public.sms_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for sms_limits
CREATE POLICY "Users can view their own limits"
ON public.sms_limits
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all limits"
ON public.sms_limits
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Function to auto-create sms_limit when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user_sms_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.sms_limits (user_id, monthly_limit, used_this_month)
  VALUES (NEW.id, 100, 0);
  RETURN NEW;
END;
$$;

-- Trigger to create sms_limit for new users
CREATE TRIGGER on_auth_user_created_sms_limit
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_sms_limit();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for sms_limits updated_at
CREATE TRIGGER update_sms_limits_updated_at
BEFORE UPDATE ON public.sms_limits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: 20251101220728
-- Create app_role enum (skip if exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'user');
    END IF;
END $$;

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
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

-- Create sms_limits table to track usage per user
CREATE TABLE IF NOT EXISTS public.sms_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    monthly_limit INTEGER NOT NULL DEFAULT 100,
    used_this_month INTEGER NOT NULL DEFAULT 0,
    last_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on sms_limits
ALTER TABLE public.sms_limits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own limits" ON public.sms_limits;
DROP POLICY IF EXISTS "Admins can manage all limits" ON public.sms_limits;

-- RLS Policies for user_roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for sms_limits
CREATE POLICY "Users can view their own limits"
ON public.sms_limits
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all limits"
ON public.sms_limits
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Function to auto-create sms_limit when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user_sms_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.sms_limits (user_id, monthly_limit, used_this_month)
  VALUES (NEW.id, 100, 0);
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created_sms_limit ON auth.users;
CREATE TRIGGER on_auth_user_created_sms_limit
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_sms_limit();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS update_sms_limits_updated_at ON public.sms_limits;
CREATE TRIGGER update_sms_limits_updated_at
BEFORE UPDATE ON public.sms_limits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: 20251105142409
-- Drop the function with CASCADE to remove dependent trigger
DROP FUNCTION IF EXISTS public.handle_new_user_sms_limit() CASCADE;

-- Drop all policies on sms_limits table
DROP POLICY IF EXISTS "Admins can manage all limits" ON public.sms_limits;
DROP POLICY IF EXISTS "Users can view their own limits" ON public.sms_limits;

-- Drop sms_limits table
DROP TABLE IF EXISTS public.sms_limits;

-- Drop all policies on user_roles table
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

-- Drop user_roles table
DROP TABLE IF EXISTS public.user_roles;

-- Drop the has_role security definer function
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);

-- Drop the app_role enum type
DROP TYPE IF EXISTS public.app_role;
