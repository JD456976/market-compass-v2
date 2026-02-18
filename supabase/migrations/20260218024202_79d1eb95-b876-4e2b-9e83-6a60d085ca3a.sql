
-- Create saved_playbooks table to persist generated prospecting assets per ZIP analysis
CREATE TABLE public.saved_playbooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  analysis_id UUID REFERENCES public.lead_finder_analyses(id) ON DELETE CASCADE,
  zip_code TEXT NOT NULL,
  city_state TEXT,
  lead_type TEXT NOT NULL,
  opportunity_score INTEGER,
  playbook_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  personalization JSONB,
  label TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_playbooks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own saved playbooks"
  ON public.saved_playbooks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved playbooks"
  ON public.saved_playbooks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved playbooks"
  ON public.saved_playbooks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved playbooks"
  ON public.saved_playbooks FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION public.update_saved_playbooks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_saved_playbooks_updated_at
  BEFORE UPDATE ON public.saved_playbooks
  FOR EACH ROW EXECUTE FUNCTION public.update_saved_playbooks_updated_at();
