-- Update agent_branding RLS policies to allow access without Supabase Auth
-- The app uses beta access sessions, not Supabase Auth for the primary user

DROP POLICY IF EXISTS "Users can view own branding" ON public.agent_branding;
DROP POLICY IF EXISTS "Users can insert own branding" ON public.agent_branding;
DROP POLICY IF EXISTS "Users can update own branding" ON public.agent_branding;

-- Allow anyone to view branding (needed for shared reports too)
CREATE POLICY "Anyone can view branding"
ON public.agent_branding
FOR SELECT
USING (true);

-- Allow anyone to insert branding (app controls via beta session)
CREATE POLICY "Anyone can insert branding"
ON public.agent_branding
FOR INSERT
WITH CHECK (true);

-- Allow anyone to update branding (app controls via beta session)
CREATE POLICY "Anyone can update branding"
ON public.agent_branding
FOR UPDATE
USING (true);