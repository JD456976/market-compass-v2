-- Offer Outcome Tracker table
CREATE TABLE public.offer_outcomes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  address TEXT NOT NULL,
  list_price INTEGER NOT NULL,
  offer_price INTEGER NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('won', 'lost', 'withdrawn', 'pending')),
  competing_offers INTEGER DEFAULT 0,
  days_on_market INTEGER DEFAULT 0,
  financing_type TEXT DEFAULT 'Conventional',
  had_inspection_contingency BOOLEAN DEFAULT true,
  had_escalation BOOLEAN DEFAULT false,
  notes TEXT,
  session_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.offer_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own offer outcomes"
  ON public.offer_outcomes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own offer outcomes"
  ON public.offer_outcomes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own offer outcomes"
  ON public.offer_outcomes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own offer outcomes"
  ON public.offer_outcomes FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_offer_outcomes_updated_at
  BEFORE UPDATE ON public.offer_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Market shift alerts table
CREATE TABLE public.market_shift_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  zip_code TEXT NOT NULL,
  city_state TEXT,
  previous_score INTEGER NOT NULL,
  current_score INTEGER NOT NULL,
  score_delta INTEGER NOT NULL,
  lead_type TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.market_shift_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own market alerts"
  ON public.market_shift_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own market alerts"
  ON public.market_shift_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own market alerts"
  ON public.market_shift_alerts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own market alerts"
  ON public.market_shift_alerts FOR DELETE
  USING (auth.uid() = user_id);