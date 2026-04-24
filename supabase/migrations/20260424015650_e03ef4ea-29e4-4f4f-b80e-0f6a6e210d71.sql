ALTER TABLE public.beta_access_codes ADD COLUMN IF NOT EXISTS email text;

CREATE OR REPLACE FUNCTION public.create_beta_access_code(
  p_code text,
  p_issued_to text,
  p_email text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL,
  p_max_uses int DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF NOT public.is_admin_user() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized: Admin access required');
  END IF;

  IF trim(p_code) = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Code cannot be empty');
  END IF;

  INSERT INTO public.beta_access_codes (code, issued_to, email, notes, created_by, expires_at, max_uses)
  VALUES (upper(trim(p_code)), trim(p_issued_to), lower(trim(p_email)), trim(p_notes), v_user_id, p_expires_at, COALESCE(p_max_uses, 1))
  RETURNING id INTO v_code_id;

  RETURN jsonb_build_object('ok', true, 'code_id', v_code_id);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('ok', false, 'error', 'A code with that value already exists');
END;
$$;