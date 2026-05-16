CREATE OR REPLACE FUNCTION public.admin_grant_beta_access(
  p_email text,
  p_name text,
  p_days int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_expires timestamptz;
  v_updated int;
BEGIN
  IF NOT public.is_admin_user() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized');
  END IF;

  v_expires := now() + (p_days || ' days')::interval;

  UPDATE public.profiles
  SET
    beta_access_active = true,
    beta_access_expires_at = v_expires,
    beta_access_source = 'admin_invite',
    full_name = COALESCE(NULLIF(p_name, ''), full_name)
  WHERE lower(email) = lower(trim(p_email));

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN jsonb_build_object('ok', true, 'updated', v_updated, 'expires_at', v_expires);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_grant_beta_access(text, text, int) TO anon, authenticated;