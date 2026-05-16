DROP FUNCTION IF EXISTS public.admin_grant_beta_access(text, text, int);

CREATE OR REPLACE FUNCTION public.admin_grant_beta_access(
  p_email text, p_name text, p_days int
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles SET
    beta_access_active = true,
    beta_access_expires_at = now() + (p_days || ' days')::interval,
    beta_access_source = 'admin_invite',
    full_name = COALESCE(NULLIF(p_name, ''), full_name)
  WHERE lower(email) = lower(p_email);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_grant_beta_access(text, text, int) TO anon, authenticated;