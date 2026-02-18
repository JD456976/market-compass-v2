
CREATE OR REPLACE FUNCTION public.list_beta_access_codes()
 RETURNS TABLE(id uuid, code text, issued_to text, email text, notes text, created_at timestamp with time zone, expires_at timestamp with time zone, max_uses integer, uses_count integer, revoked_at timestamp with time zone, redemptions jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    bac.id,
    bac.code,
    bac.issued_to,
    NULL::text AS email,         -- column does not exist on this table
    bac.note  AS notes,          -- table has 'note' (singular)
    bac.created_at,
    bac.expires_at,
    1         AS max_uses,       -- legacy table has no max_uses; default 1
    CASE WHEN bac.status = 'used' THEN 1 ELSE 0 END AS uses_count,
    NULL::timestamptz AS revoked_at,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'user_id', ba.device_id,
        'redeemed_at', ba.activated_at
      ))
      FROM public.beta_activations ba
      WHERE ba.code_id = bac.id),
      '[]'::jsonb
    ) AS redemptions
  FROM public.beta_access_codes bac
  ORDER BY bac.created_at DESC;
END;
$function$
