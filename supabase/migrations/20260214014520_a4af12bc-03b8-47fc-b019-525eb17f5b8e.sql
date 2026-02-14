
-- Fix sessions: remove NULL owner bypass from UPDATE and DELETE
DROP POLICY IF EXISTS "Users can update own sessions" ON public.sessions;
CREATE POLICY "Users can update own sessions"
ON public.sessions FOR UPDATE
USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own sessions" ON public.sessions;
CREATE POLICY "Users can delete own sessions"
ON public.sessions FOR DELETE
USING (owner_user_id = auth.uid());

-- Also tighten SELECT to not expose orphaned sessions
DROP POLICY IF EXISTS "Users can view own sessions" ON public.sessions;
CREATE POLICY "Users can view own sessions"
ON public.sessions FOR SELECT
USING (owner_user_id = auth.uid());

-- Fix market_profiles: remove device_id fallback from UPDATE/DELETE/SELECT
DROP POLICY IF EXISTS "Users can update own market profiles" ON public.market_profiles;
CREATE POLICY "Users can update own market profiles"
ON public.market_profiles FOR UPDATE
USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own market profiles" ON public.market_profiles;
CREATE POLICY "Users can delete own market profiles"
ON public.market_profiles FOR DELETE
USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own market profiles" ON public.market_profiles;
CREATE POLICY "Users can view own market profiles"
ON public.market_profiles FOR SELECT
USING (owner_user_id = auth.uid());

-- Fix market_scenarios: remove NULL/device_id fallback from UPDATE/DELETE/SELECT
DROP POLICY IF EXISTS "Users can update own market scenarios" ON public.market_scenarios;
CREATE POLICY "Users can update own market scenarios"
ON public.market_scenarios FOR UPDATE
USING (owner_user_id = auth.uid() OR is_built_in = true);

DROP POLICY IF EXISTS "Users can delete own market scenarios" ON public.market_scenarios;
CREATE POLICY "Users can delete own market scenarios"
ON public.market_scenarios FOR DELETE
USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own market scenarios" ON public.market_scenarios;
CREATE POLICY "Users can view own market scenarios"
ON public.market_scenarios FOR SELECT
USING (owner_user_id = auth.uid() OR is_built_in = true);
