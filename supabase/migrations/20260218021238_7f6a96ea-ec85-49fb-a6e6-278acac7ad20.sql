
-- CRM push activity log table
CREATE TABLE IF NOT EXISTS public.crm_push_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  crm_type text NOT NULL DEFAULT 'follow_up_boss',
  action text NOT NULL, -- 'push_analysis' | 'push_csv_leads' | 'score_alert'
  zip_code text,
  city_state text,
  opportunity_score integer,
  score_delta integer,
  lead_type text,
  leads_pushed integer,
  status text NOT NULL DEFAULT 'success', -- 'success' | 'error'
  error_msg text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_push_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own crm push log"
  ON public.crm_push_log
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own crm push log"
  ON public.crm_push_log
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_crm_push_log_user ON public.crm_push_log (user_id, created_at DESC);

-- Add hubspot support to crm_connections by adding webhook_url column
ALTER TABLE public.crm_connections 
  ADD COLUMN IF NOT EXISTS webhook_url text,
  ADD COLUMN IF NOT EXISTS crm_display_name text;
