-- Table to store per-agent CRM connection settings
CREATE TABLE IF NOT EXISTS public.crm_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  crm_type text NOT NULL DEFAULT 'follow_up_boss',
  -- FUB API key is stored encrypted-at-rest by Supabase; never exposed in SELECT to clients
  api_key_hint text NULL, -- last 4 chars only, for display
  is_active boolean NOT NULL DEFAULT true,
  auto_push_on_analyze boolean NOT NULL DEFAULT true,
  auto_push_on_score_change boolean NOT NULL DEFAULT true,
  score_change_threshold integer NOT NULL DEFAULT 10,
  auto_push_on_csv_upload boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, crm_type)
);

ALTER TABLE public.crm_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own crm connections"
  ON public.crm_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own crm connections"
  ON public.crm_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own crm connections"
  ON public.crm_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own crm connections"
  ON public.crm_connections FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_crm_connections_updated_at
  BEFORE UPDATE ON public.crm_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
