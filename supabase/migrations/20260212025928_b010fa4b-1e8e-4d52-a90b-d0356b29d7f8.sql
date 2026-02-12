
-- 1. Fix: Allow sessions to be updated even without owner info 
-- (matches INSERT policy pattern where owner_user_id can be NULL)
DROP POLICY IF EXISTS "Users can update own sessions" ON public.sessions;
CREATE POLICY "Users can update own sessions" 
ON public.sessions 
FOR UPDATE 
USING (
  (owner_user_id = auth.uid()) 
  OR (owner_device_id IS NOT NULL) 
  OR (owner_user_id IS NULL AND owner_device_id IS NULL)
);

DROP POLICY IF EXISTS "Users can delete own sessions" ON public.sessions;
CREATE POLICY "Users can delete own sessions" 
ON public.sessions 
FOR DELETE 
USING (
  (owner_user_id = auth.uid()) 
  OR (owner_device_id IS NOT NULL) 
  OR (owner_user_id IS NULL AND owner_device_id IS NULL)
);

-- 2. Create RPC for admins to list all owner devices (bypasses RLS)
CREATE OR REPLACE FUNCTION public.list_owner_devices()
RETURNS SETOF public.owner_devices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.owner_devices ORDER BY created_at DESC;
END;
$$;

-- 3. Create market_scenarios table for DB persistence
CREATE TABLE public.market_scenarios (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  summary text NOT NULL,
  is_built_in boolean NOT NULL DEFAULT false,
  demand_level text NOT NULL DEFAULT 'medium',
  competition_level text NOT NULL DEFAULT 'medium',
  pricing_sensitivity text NOT NULL DEFAULT 'medium',
  typical_dom_band text NOT NULL DEFAULT 'average',
  negotiation_leverage text NOT NULL DEFAULT 'neutral',
  owner_device_id text,
  owner_user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.market_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own market scenarios"
ON public.market_scenarios FOR SELECT
USING ((owner_user_id = auth.uid()) OR (owner_device_id IS NOT NULL) OR (owner_user_id IS NULL AND owner_device_id IS NULL));

CREATE POLICY "Users can insert own market scenarios"
ON public.market_scenarios FOR INSERT
WITH CHECK ((owner_user_id = auth.uid()) OR (owner_user_id IS NULL));

CREATE POLICY "Users can update own market scenarios"
ON public.market_scenarios FOR UPDATE
USING ((owner_user_id = auth.uid()) OR (owner_device_id IS NOT NULL) OR (owner_user_id IS NULL AND owner_device_id IS NULL));

CREATE POLICY "Users can delete own market scenarios"
ON public.market_scenarios FOR DELETE
USING ((owner_user_id = auth.uid()) OR (owner_device_id IS NOT NULL) OR (owner_user_id IS NULL AND owner_device_id IS NULL));

CREATE TRIGGER update_market_scenarios_updated_at
BEFORE UPDATE ON public.market_scenarios
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
