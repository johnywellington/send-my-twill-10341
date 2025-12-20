-- Tabela de Listas de Leads para campanhas SMS
CREATE TABLE public.lead_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  total_contacts INTEGER DEFAULT 0,
  clean_contacts INTEGER DEFAULT 0,
  recurring_contacts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Contatos da Lista de Leads
CREATE TABLE public.lead_list_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_list_id UUID NOT NULL REFERENCES public.lead_lists(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  name TEXT,
  is_recurring BOOLEAN DEFAULT false,
  last_campaign_name TEXT,
  last_campaign_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Adicionar coluna campaign_name em sms_logs para tracking de campanhas
ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS campaign_name TEXT;

-- Enable RLS
ALTER TABLE public.lead_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_list_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies para lead_lists
CREATE POLICY "Users can view own lead lists"
ON public.lead_lists FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lead lists"
ON public.lead_lists FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lead lists"
ON public.lead_lists FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own lead lists"
ON public.lead_lists FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies para lead_list_contacts
CREATE POLICY "Users can view contacts of own lead lists"
ON public.lead_list_contacts FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.lead_lists 
  WHERE lead_lists.id = lead_list_contacts.lead_list_id 
  AND lead_lists.user_id = auth.uid()
));

CREATE POLICY "Users can insert contacts to own lead lists"
ON public.lead_list_contacts FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.lead_lists 
  WHERE lead_lists.id = lead_list_contacts.lead_list_id 
  AND lead_lists.user_id = auth.uid()
));

CREATE POLICY "Users can delete contacts from own lead lists"
ON public.lead_list_contacts FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.lead_lists 
  WHERE lead_lists.id = lead_list_contacts.lead_list_id 
  AND lead_lists.user_id = auth.uid()
));

-- Indexes para performance
CREATE INDEX idx_lead_lists_user_id ON public.lead_lists(user_id);
CREATE INDEX idx_lead_list_contacts_lead_list_id ON public.lead_list_contacts(lead_list_id);
CREATE INDEX idx_lead_list_contacts_phone_number ON public.lead_list_contacts(phone_number);
CREATE INDEX idx_sms_logs_campaign_name ON public.sms_logs(campaign_name);

-- Trigger para updated_at
CREATE TRIGGER update_lead_lists_updated_at
BEFORE UPDATE ON public.lead_lists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();