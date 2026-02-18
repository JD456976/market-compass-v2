-- Score history table to track opportunity score changes over time
CREATE TABLE public.lead_finder_score_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  zip_code text NOT NULL,
  city_state text,
  opportunity_score integer NOT NULL,
  lead_type text NOT NULL,
  recorded_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_finder_score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own score history"
  ON public.lead_finder_score_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own score history"
  ON public.lead_finder_score_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own score history"
  ON public.lead_finder_score_history FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX lead_finder_score_history_user_zip_idx 
  ON public.lead_finder_score_history (user_id, zip_code, recorded_at DESC);

-- Add pinned column to lead_finder_analyses
ALTER TABLE public.lead_finder_analyses 
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;
