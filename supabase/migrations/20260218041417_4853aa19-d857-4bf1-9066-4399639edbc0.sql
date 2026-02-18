
-- Fix 1: Update is_admin_user() to use user_roles table instead of hardcoded emails
-- Also fix create_beta_code and register_owner_device to remove hardcoded email checks

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  )
$$;

-- Seed existing admin users into user_roles (idempotent)
INSERT INTO public.user_roles (user_id, role)
SELECT au.id, 'admin'::app_role
FROM auth.users au
WHERE lower(au.email) IN ('jason.craig@chinattirealty.com', 'jdog45@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;

-- Fix create_beta_code: remove hardcoded email allowlist, rely on is_admin_user()
CREATE OR REPLACE FUNCTION public.create_beta_code(
  p_admin_email text,
  p_email text,
  p_code_hash text,
  p_issued_to text DEFAULT NULL::text,
  p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_code_id uuid;
BEGIN
  IF NOT is_admin_user() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin access required');
  END IF;

  INSERT INTO public.beta_codes (
    email, code_hash, issued_to, expires_at, created_by_admin_email
  ) VALUES (
    lower(trim(p_email)), p_code_hash, p_issued_to, p_expires_at, lower(trim(p_admin_email))
  )
  RETURNING id INTO v_code_id;

  RETURN jsonb_build_object('success', true, 'code_id', v_code_id);
END;
$$;

-- Fix register_owner_device: remove hardcoded email allowlist, rely on is_admin_user()
CREATE OR REPLACE FUNCTION public.register_owner_device(p_device_id text, p_admin_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT is_admin_user() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin access required');
  END IF;

  INSERT INTO public.owner_devices (device_id, admin_email)
  VALUES (p_device_id, lower(trim(p_admin_email)))
  ON CONFLICT (device_id) DO UPDATE SET
    admin_email = lower(trim(p_admin_email)),
    revoked_at = NULL;

  RETURN jsonb_build_object('success', true, 'message', 'Owner device registered');
END;
$$;
