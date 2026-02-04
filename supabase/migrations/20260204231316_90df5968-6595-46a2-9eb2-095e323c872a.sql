-- Create a function to insert beta codes with admin email verification
-- This bypasses RLS since it's SECURITY DEFINER and validates admin email internally
CREATE OR REPLACE FUNCTION public.create_beta_code(
  p_admin_email text,
  p_email text,
  p_code_hash text,
  p_issued_to text DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code_id uuid;
BEGIN
  -- Validate admin email against allowlist
  IF lower(trim(p_admin_email)) NOT IN ('jdog45@gmail.com', 'jason.craig@chinattirealty.com') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized to create codes');
  END IF;
  
  -- Insert the code
  INSERT INTO public.beta_codes (
    email,
    code_hash,
    issued_to,
    expires_at,
    created_by_admin_email
  ) VALUES (
    lower(trim(p_email)),
    p_code_hash,
    p_issued_to,
    p_expires_at,
    lower(trim(p_admin_email))
  )
  RETURNING id INTO v_code_id;
  
  RETURN jsonb_build_object('success', true, 'code_id', v_code_id);
END;
$$;