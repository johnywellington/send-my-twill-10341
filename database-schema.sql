-- =====================================================
-- COMPLETE DATABASE SCHEMA
-- Gamma Portal - SMS, Voice & SIP Platform
-- =====================================================

-- =====================================================
-- 1. TYPES & ENUMS
-- =====================================================

CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- =====================================================
-- 2. TABLES
-- =====================================================

-- User Roles Table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Profiles Table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    suspended_at TIMESTAMPTZ,
    suspension_reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Provider Credentials Table
CREATE TABLE public.provider_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    provider TEXT NOT NULL,
    credential_name TEXT NOT NULL,
    account_identifier TEXT NOT NULL,
    secret_key TEXT,
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Phone Numbers Table
CREATE TABLE public.phone_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    phone_number TEXT NOT NULL,
    provider TEXT NOT NULL,
    credential_id UUID,
    friendly_name TEXT,
    country_code TEXT NOT NULL,
    supports_sms BOOLEAN DEFAULT true,
    supports_voice BOOLEAN DEFAULT true,
    supports_mms BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    webhook_configured BOOLEAN DEFAULT false,
    sync_source TEXT DEFAULT 'manual',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Contacts Table
CREATE TABLE public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    email TEXT,
    notes TEXT,
    tags TEXT[],
    is_valid BOOLEAN,
    validation_status TEXT,
    validation_reason TEXT,
    validated_at TIMESTAMPTZ,
    carrier_name TEXT,
    line_type TEXT,
    country_code_detected TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contact Groups Table
CREATE TABLE public.contact_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contact Group Members Table
CREATE TABLE public.contact_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL,
    contact_id UUID NOT NULL,
    added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Message Templates Table
CREATE TABLE public.message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    voice_name TEXT,
    category TEXT,
    variables TEXT[] DEFAULT ARRAY[]::text[],
    is_favorite BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SMS Logs Table
CREATE TABLE public.sms_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    to_number TEXT NOT NULL,
    from_number TEXT NOT NULL,
    message TEXT NOT NULL,
    provider TEXT NOT NULL,
    credential_id UUID,
    status TEXT NOT NULL DEFAULT 'sent',
    external_id TEXT,
    cost NUMERIC,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Voice Logs Table
CREATE TABLE public.voice_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    to_number TEXT NOT NULL,
    from_number TEXT NOT NULL,
    message TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'pt-PT',
    voice_label TEXT,
    style INTEGER NOT NULL DEFAULT 0,
    premium BOOLEAN NOT NULL DEFAULT false,
    provider TEXT DEFAULT 'vonage',
    credential_id UUID,
    call_uuid TEXT,
    status TEXT NOT NULL DEFAULT 'initiated',
    duration INTEGER,
    cost NUMERIC,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- IVR Logs Table
CREATE TABLE public.ivr_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    to_number TEXT NOT NULL,
    from_number TEXT NOT NULL,
    ncco JSONB NOT NULL,
    language TEXT NOT NULL DEFAULT 'pt-PT',
    voice_label TEXT,
    style INTEGER NOT NULL DEFAULT 0,
    premium BOOLEAN NOT NULL DEFAULT false,
    provider TEXT DEFAULT 'vonage',
    credential_id UUID,
    call_uuid TEXT,
    conversation_uuid TEXT,
    status TEXT NOT NULL DEFAULT 'initiated',
    dtmf_response TEXT,
    duration INTEGER,
    cost NUMERIC,
    template_used TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- IVR Responses Table
CREATE TABLE public.ivr_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    conversation_uuid TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    dtmf_digits TEXT,
    timed_out BOOLEAN DEFAULT false,
    template_used TEXT,
    event_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- IVR Transfer Params Table
CREATE TABLE public.ivr_transfer_params (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    from_number TEXT NOT NULL,
    assistant_number TEXT NOT NULL,
    call_uuid TEXT,
    conversation_uuid TEXT,
    transfer_timeout INTEGER DEFAULT 30,
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '1 hour')
);

-- Received SMS Table
CREATE TABLE public.received_sms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    external_id TEXT NOT NULL,
    from_number TEXT NOT NULL,
    to_number TEXT NOT NULL,
    message TEXT NOT NULL,
    provider TEXT NOT NULL,
    metadata JSONB,
    received_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Received Calls Table
CREATE TABLE public.received_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    call_uuid TEXT NOT NULL,
    conversation_uuid TEXT,
    from_number TEXT NOT NULL,
    to_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ringing',
    provider TEXT NOT NULL,
    caller_name TEXT,
    answered BOOLEAN DEFAULT false,
    duration INTEGER,
    cost NUMERIC,
    recording_url TEXT,
    transcription_text TEXT,
    transcription_available BOOLEAN DEFAULT false,
    hangup_cause TEXT,
    answer_time TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- SIP Provider Config Table
CREATE TABLE public.sip_provider_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_group_id UUID DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    config_key TEXT NOT NULL,
    config_value TEXT NOT NULL,
    friendly_name TEXT,
    credential_id UUID,
    created_by UUID,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- SIP Users Table
CREATE TABLE public.sip_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    domain_group_id UUID,
    provider TEXT NOT NULL,
    sip_username TEXT NOT NULL,
    sip_password TEXT NOT NULL,
    sip_domain TEXT NOT NULL,
    extension TEXT NOT NULL,
    display_name TEXT,
    credential_id UUID,
    twilio_credlist_sid TEXT,
    twilio_credential_sid TEXT,
    vonage_endpoint_id TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SIP Endpoints Table
CREATE TABLE public.sip_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sip_user_id UUID NOT NULL,
    provider TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unregistered',
    ip_address TEXT,
    user_agent TEXT,
    last_seen TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SIP Routes Table
CREATE TABLE public.sip_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    domain_group_id UUID,
    provider TEXT NOT NULL,
    name TEXT NOT NULL,
    route_type TEXT NOT NULL,
    from_pattern TEXT NOT NULL,
    to_pattern TEXT NOT NULL,
    forward_to TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    credential_id UUID,
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SIP Call Logs Table
CREATE TABLE public.sip_call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    sip_user_id UUID,
    route_id UUID,
    provider TEXT NOT NULL,
    call_type TEXT NOT NULL,
    call_uuid TEXT NOT NULL,
    conversation_uuid TEXT,
    from_uri TEXT NOT NULL,
    to_uri TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'initiated',
    duration INTEGER,
    cost NUMERIC,
    quality_score INTEGER,
    hangup_cause TEXT,
    error_message TEXT,
    start_time TIMESTAMPTZ,
    answer_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SIP Events Table
CREATE TABLE public.sip_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    sip_user_id UUID,
    domain_group_id UUID,
    route_id UUID,
    provider TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_category TEXT NOT NULL,
    event_data JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    triggered_by UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- SIP Connectivity Tests Table
CREATE TABLE public.sip_connectivity_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    sip_user_id UUID,
    provider TEXT NOT NULL,
    test_type TEXT NOT NULL,
    status TEXT NOT NULL,
    endpoint_registered BOOLEAN,
    credentials_valid BOOLEAN,
    api_reachable BOOLEAN,
    account_status TEXT,
    latency_ms INTEGER,
    last_seen_at TIMESTAMPTZ,
    error_code TEXT,
    error_message TEXT,
    recommendations JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Bulk Send Logs Table
CREATE TABLE public.bulk_send_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    total_contacts INTEGER NOT NULL,
    successful_sends INTEGER NOT NULL DEFAULT 0,
    failed_sends INTEGER NOT NULL DEFAULT 0,
    throttle_percentage NUMERIC NOT NULL DEFAULT 1.00,
    avg_delay_ms INTEGER NOT NULL,
    total_duration_seconds INTEGER NOT NULL,
    retry_count INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Usage Analytics Table
CREATE TABLE public.usage_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    provider TEXT NOT NULL DEFAULT 'vonage',
    report_date DATE NOT NULL,
    sms_sent INTEGER DEFAULT 0,
    sms_delivered INTEGER DEFAULT 0,
    sms_failed INTEGER DEFAULT 0,
    sms_cost NUMERIC DEFAULT 0,
    voice_calls INTEGER DEFAULT 0,
    voice_minutes INTEGER DEFAULT 0,
    voice_cost NUMERIC DEFAULT 0,
    ivr_calls INTEGER DEFAULT 0,
    ivr_minutes INTEGER DEFAULT 0,
    ivr_cost NUMERIC DEFAULT 0,
    total_cost NUMERIC DEFAULT 0,
    raw_data JSONB,
    synced_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sync Logs Table
CREATE TABLE public.sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    sync_type TEXT NOT NULL,
    provider TEXT,
    status TEXT NOT NULL,
    items_added INTEGER DEFAULT 0,
    items_updated INTEGER DEFAULT 0,
    execution_time_ms INTEGER,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User Activity Logs Table
CREATE TABLE public.user_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    action_type TEXT NOT NULL,
    description TEXT NOT NULL,
    ip_address TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- API Validation Logs Table
CREATE TABLE public.api_validation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    provider TEXT NOT NULL,
    credential_id UUID,
    validation_type TEXT NOT NULL,
    status TEXT NOT NULL,
    account_type TEXT,
    account_info JSONB,
    latency_ms INTEGER,
    error_message TEXT,
    tested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Webhook Health Checks Table
CREATE TABLE public.webhook_health_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    phone_number_id UUID NOT NULL,
    phone_number TEXT NOT NULL,
    provider TEXT NOT NULL,
    webhook_url TEXT NOT NULL,
    test_type TEXT NOT NULL,
    test_mode TEXT DEFAULT 'manual',
    success BOOLEAN NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    response_body JSONB,
    valid_format BOOLEAN DEFAULT false,
    error_message TEXT,
    tested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Exchange Rates Table
CREATE TABLE public.exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_currency TEXT NOT NULL,
    target_currency TEXT NOT NULL,
    rate NUMERIC NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '1 hour'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- 3. FUNCTIONS
-- =====================================================

-- Security Definer Function for Role Checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Trigger Function: Update updated_at Column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger Function: Handle New User (Create Role)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

-- Trigger Function: Handle New User Profile
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
    false,
    now()
  );
  RETURN NEW;
END;
$$;

-- Function: Cleanup Stale Calls
CREATE OR REPLACE FUNCTION public.cleanup_stale_calls()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE ivr_logs 
  SET 
    status = 'failed',
    error_message = 'Timeout: Chamada não atualizada por webhook',
    updated_at = NOW()
  WHERE 
    status IN ('initiated', 'ringing', 'in-progress')
    AND created_at < NOW() - INTERVAL '10 minutes';

  UPDATE voice_logs 
  SET 
    status = 'failed',
    error_message = 'Timeout: Chamada não atualizada por webhook',
    updated_at = NOW()
  WHERE 
    status IN ('initiated', 'ringing', 'in-progress')
    AND created_at < NOW() - INTERVAL '10 minutes';
END;
$$;

-- Function: Cleanup Expired IVR Params
CREATE OR REPLACE FUNCTION public.cleanup_expired_ivr_params()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.ivr_transfer_params
  WHERE expires_at < NOW();
END;
$$;

-- Trigger Function: Log Endpoint Registration Event
CREATE OR REPLACE FUNCTION public.log_endpoint_registration_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'registered' AND (OLD IS NULL OR OLD.status != 'registered') THEN
    INSERT INTO sip_events (
      event_type,
      event_category,
      sip_user_id,
      provider,
      event_data,
      metadata
    )
    SELECT 
      'endpoint_registered',
      'endpoint',
      NEW.sip_user_id,
      NEW.provider,
      jsonb_build_object(
        'endpoint_id', NEW.id,
        'ip_address', NEW.ip_address,
        'user_agent', NEW.user_agent
      ),
      jsonb_build_object(
        'previous_status', COALESCE(OLD.status, 'none'),
        'new_status', NEW.status
      );
  END IF;

  IF NEW.status = 'unregistered' AND (OLD IS NULL OR OLD.status = 'registered') THEN
    INSERT INTO sip_events (
      event_type,
      event_category,
      sip_user_id,
      provider,
      event_data,
      metadata
    )
    SELECT 
      'endpoint_unregistered',
      'endpoint',
      NEW.sip_user_id,
      NEW.provider,
      jsonb_build_object(
        'endpoint_id', NEW.id,
        'last_seen', NEW.last_seen
      ),
      jsonb_build_object(
        'previous_status', COALESCE(OLD.status, 'none'),
        'new_status', NEW.status
      );
  END IF;

  RETURN NEW;
END;
$$;

-- =====================================================
-- 4. TRIGGERS
-- =====================================================

-- Trigger: On Auth User Created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger: On Auth User Created Profile
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user_profile();

-- Triggers: Update updated_at on tables
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contact_groups_updated_at
  BEFORE UPDATE ON public.contact_groups
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_provider_credentials_updated_at
  BEFORE UPDATE ON public.provider_credentials
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_phone_numbers_updated_at
  BEFORE UPDATE ON public.phone_numbers
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_message_templates_updated_at
  BEFORE UPDATE ON public.message_templates
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sms_logs_updated_at
  BEFORE UPDATE ON public.sms_logs
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_voice_logs_updated_at
  BEFORE UPDATE ON public.voice_logs
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ivr_logs_updated_at
  BEFORE UPDATE ON public.ivr_logs
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sip_users_updated_at
  BEFORE UPDATE ON public.sip_users
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sip_endpoints_updated_at
  BEFORE UPDATE ON public.sip_endpoints
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sip_routes_updated_at
  BEFORE UPDATE ON public.sip_routes
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sip_call_logs_updated_at
  BEFORE UPDATE ON public.sip_call_logs
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_received_calls_updated_at
  BEFORE UPDATE ON public.received_calls
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: Log Endpoint Registration
CREATE TRIGGER on_endpoint_status_change
  AFTER INSERT OR UPDATE OF status ON public.sip_endpoints
  FOR EACH ROW 
  EXECUTE FUNCTION public.log_endpoint_registration_event();

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ivr_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ivr_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ivr_transfer_params ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.received_sms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.received_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sip_provider_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sip_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sip_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sip_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sip_call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sip_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sip_connectivity_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_send_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_validation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- User Roles Policies
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage user roles" ON public.user_roles
  FOR ALL USING (true);

-- Profiles Policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND is_active = (SELECT is_active FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Provider Credentials Policies
CREATE POLICY "Users can view own credentials" ON public.provider_credentials
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credentials" ON public.provider_credentials
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credentials" ON public.provider_credentials
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own credentials" ON public.provider_credentials
  FOR DELETE USING (auth.uid() = user_id);

-- Phone Numbers Policies
CREATE POLICY "Users can view own phone numbers" ON public.phone_numbers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own phone numbers" ON public.phone_numbers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own phone numbers" ON public.phone_numbers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own phone numbers" ON public.phone_numbers
  FOR DELETE USING (auth.uid() = user_id);

-- Contacts Policies
CREATE POLICY "Users can view own contacts" ON public.contacts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contacts" ON public.contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contacts" ON public.contacts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own contacts" ON public.contacts
  FOR DELETE USING (auth.uid() = user_id);

-- Contact Groups Policies
CREATE POLICY "Users can view own groups" ON public.contact_groups
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own groups" ON public.contact_groups
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own groups" ON public.contact_groups
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own groups" ON public.contact_groups
  FOR DELETE USING (auth.uid() = user_id);

-- Contact Group Members Policies
CREATE POLICY "Users can view own group members" ON public.contact_group_members
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM contact_groups 
    WHERE id = contact_group_members.group_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own group members" ON public.contact_group_members
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM contact_groups 
    WHERE id = contact_group_members.group_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own group members" ON public.contact_group_members
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM contact_groups 
    WHERE id = contact_group_members.group_id AND user_id = auth.uid()
  ));

-- Message Templates Policies
CREATE POLICY "Users can view own templates" ON public.message_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own templates" ON public.message_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates" ON public.message_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates" ON public.message_templates
  FOR DELETE USING (auth.uid() = user_id);

-- SMS Logs Policies
CREATE POLICY "Users can view own SMS logs" ON public.sms_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own SMS logs" ON public.sms_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage SMS logs" ON public.sms_logs
  FOR ALL USING (true);

-- Voice Logs Policies
CREATE POLICY "Users can view own voice logs" ON public.voice_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own voice logs" ON public.voice_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage voice logs" ON public.voice_logs
  FOR ALL USING (true);

-- IVR Logs Policies
CREATE POLICY "Users can view own IVR logs" ON public.ivr_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own IVR logs" ON public.ivr_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage IVR logs" ON public.ivr_logs
  FOR ALL USING (true);

-- IVR Responses Policies
CREATE POLICY "Users can view own IVR responses" ON public.ivr_responses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own IVR responses" ON public.ivr_responses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can insert IVR responses" ON public.ivr_responses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow service role to insert IVR responses" ON public.ivr_responses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all IVR responses" ON public.ivr_responses
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- IVR Transfer Params Policies
CREATE POLICY "Users can insert own transfer params" ON public.ivr_transfer_params
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage transfer params" ON public.ivr_transfer_params
  FOR ALL USING (true);

-- Received SMS Policies
CREATE POLICY "Users can view their received SMS" ON public.received_sms
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role can insert received SMS" ON public.received_sms
  FOR INSERT WITH CHECK (true);

-- Received Calls Policies
CREATE POLICY "Users can view their received calls" ON public.received_calls
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role can manage received calls" ON public.received_calls
  FOR ALL USING (true);

-- SIP Provider Config Policies
CREATE POLICY "User read sip_provider_config" ON public.sip_provider_config
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admin full access to sip_provider_config" ON public.sip_provider_config
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- SIP Users Policies
CREATE POLICY "Users can view own SIP user" ON public.sip_users
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all SIP users" ON public.sip_users
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- SIP Endpoints Policies
CREATE POLICY "Users can view own endpoints" ON public.sip_endpoints
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM sip_users 
    WHERE id = sip_endpoints.sip_user_id AND user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all endpoints" ON public.sip_endpoints
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage endpoints" ON public.sip_endpoints
  FOR ALL USING (true);

-- SIP Routes Policies
CREATE POLICY "Users can view active routes" ON public.sip_routes
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage all routes" ON public.sip_routes
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- SIP Call Logs Policies
CREATE POLICY "Users can view own call logs" ON public.sip_call_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all call logs" ON public.sip_call_logs
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage call logs" ON public.sip_call_logs
  FOR ALL USING (true);

-- SIP Events Policies
CREATE POLICY "Users can view own events" ON public.sip_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all events" ON public.sip_events
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert events" ON public.sip_events
  FOR INSERT WITH CHECK (true);

-- SIP Connectivity Tests Policies
CREATE POLICY "Users can view own connectivity tests" ON public.sip_connectivity_tests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage connectivity tests" ON public.sip_connectivity_tests
  FOR ALL USING (true);

-- Bulk Send Logs Policies
CREATE POLICY "Users can view own bulk send logs" ON public.bulk_send_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bulk send logs" ON public.bulk_send_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Usage Analytics Policies
CREATE POLICY "Users can view own analytics" ON public.usage_analytics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage analytics" ON public.usage_analytics
  FOR ALL USING (true);

-- Sync Logs Policies
CREATE POLICY "Users can view own sync logs" ON public.sync_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sync logs" ON public.sync_logs
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert sync logs" ON public.sync_logs
  FOR INSERT WITH CHECK (true);

-- User Activity Logs Policies
CREATE POLICY "Users can view own activity" ON public.user_activity_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all activity" ON public.user_activity_logs
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert activity logs" ON public.user_activity_logs
  FOR INSERT WITH CHECK (true);

-- API Validation Logs Policies
CREATE POLICY "Users can view own validation logs" ON public.api_validation_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert validation logs" ON public.api_validation_logs
  FOR INSERT WITH CHECK (true);

-- Webhook Health Checks Policies
CREATE POLICY "Users can view own health checks" ON public.webhook_health_checks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert health checks" ON public.webhook_health_checks
  FOR INSERT WITH CHECK (true);

-- Exchange Rates Policies
CREATE POLICY "Anyone can read exchange rates" ON public.exchange_rates
  FOR SELECT USING (expires_at > now());

CREATE POLICY "Admins can manage exchange rates" ON public.exchange_rates
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- 6. INDEXES (Performance Optimization)
-- =====================================================

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_provider_credentials_user_id ON public.provider_credentials(user_id);
CREATE INDEX idx_phone_numbers_user_id ON public.phone_numbers(user_id);
CREATE INDEX idx_contacts_user_id ON public.contacts(user_id);
CREATE INDEX idx_contact_groups_user_id ON public.contact_groups(user_id);
CREATE INDEX idx_message_templates_user_id ON public.message_templates(user_id);
CREATE INDEX idx_sms_logs_user_id ON public.sms_logs(user_id);
CREATE INDEX idx_voice_logs_user_id ON public.voice_logs(user_id);
CREATE INDEX idx_ivr_logs_user_id ON public.ivr_logs(user_id);
CREATE INDEX idx_ivr_responses_user_id ON public.ivr_responses(user_id);
CREATE INDEX idx_ivr_responses_conversation_uuid ON public.ivr_responses(conversation_uuid);
CREATE INDEX idx_received_sms_user_id ON public.received_sms(user_id);
CREATE INDEX idx_received_calls_user_id ON public.received_calls(user_id);
CREATE INDEX idx_sip_users_user_id ON public.sip_users(user_id);
CREATE INDEX idx_sip_endpoints_sip_user_id ON public.sip_endpoints(sip_user_id);
CREATE INDEX idx_sip_routes_user_id ON public.sip_routes(user_id);
CREATE INDEX idx_sip_call_logs_user_id ON public.sip_call_logs(user_id);
CREATE INDEX idx_sip_events_user_id ON public.sip_events(user_id);
CREATE INDEX idx_sip_connectivity_tests_user_id ON public.sip_connectivity_tests(user_id);
CREATE INDEX idx_usage_analytics_user_id ON public.usage_analytics(user_id);
CREATE INDEX idx_sync_logs_user_id ON public.sync_logs(user_id);
CREATE INDEX idx_user_activity_logs_user_id ON public.user_activity_logs(user_id);

-- =====================================================
-- SETUP COMPLETE
-- =====================================================
-- This schema is ready for deployment.
-- Execute this SQL file in your Supabase SQL editor.
-- =====================================================
