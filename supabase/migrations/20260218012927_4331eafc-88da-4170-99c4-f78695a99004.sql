-- Lead Finder: ZIP code analysis cache table
CREATE TABLE public.lead_finder_analyses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  zip_code text NOT NULL,
  city_state text,
  fred_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  opportunity_score integer,
  lead_type text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  refreshed_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_finder_analyses ENABLE ROW LEVEL SECURITY;

-- Users can only see their own analyses
CREATE POLICY "Users can view own lead finder analyses"
  ON public.lead_finder_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lead finder analyses"
  ON public.lead_finder_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lead finder analyses"
  ON public.lead_finder_analyses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own lead finder analyses"
  ON public.lead_finder_analyses FOR DELETE
  USING (auth.uid() = user_id);

-- Unique constraint so we upsert per user+zip
CREATE UNIQUE INDEX lead_finder_analyses_user_zip_idx 
  ON public.lead_finder_analyses (user_id, zip_code);

-- Updated at trigger
CREATE TRIGGER update_lead_finder_analyses_refreshed_at
  BEFORE UPDATE ON public.lead_finder_analyses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
