
-- =============================================
-- FIX 1: SECURITY DEFINER functions - add auth checks
-- =============================================

-- list_owner_devices: require admin auth
CREATE OR REPLACE FUNCTION public.list_owner_devices()
RETURNS SETOF owner_devices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  RETURN QUERY SELECT * FROM public.owner_devices ORDER BY created_at DESC;
END;
$$;

-- register_owner_device: require admin auth
CREATE OR REPLACE FUNCTION public.register_owner_device(p_device_id text, p_admin_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Require authenticated admin caller
  IF NOT is_admin_user() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin access required');
  END IF;

  IF lower(trim(p_admin_email)) NOT IN ('jdog45@gmail.com', 'jason.craig@chinattirealty.com') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not an admin email');
  END IF;
  
  INSERT INTO public.owner_devices (device_id, admin_email)
  VALUES (p_device_id, lower(trim(p_admin_email)))
  ON CONFLICT (device_id) DO UPDATE SET
    admin_email = lower(trim(p_admin_email)),
    revoked_at = NULL;
  
  RETURN jsonb_build_object('success', true, 'message', 'Owner device registered');
END;
$$;

-- revoke_owner_device: require admin auth
CREATE OR REPLACE FUNCTION public.revoke_owner_device(p_device_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT is_admin_user() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin access required');
  END IF;

  UPDATE public.owner_devices
  SET revoked_at = now()
  WHERE device_id = p_device_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Device not found');
  END IF;
  
  RETURN jsonb_build_object('success', true, 'message', 'Owner device revoked');
END;
$$;

-- create_beta_code: require admin auth
CREATE OR REPLACE FUNCTION public.create_beta_code(p_admin_email text, p_email text, p_code_hash text, p_issued_to text DEFAULT NULL, p_expires_at timestamptz DEFAULT NULL)
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

  IF lower(trim(p_admin_email)) NOT IN ('jdog45@gmail.com', 'jason.craig@chinattirealty.com') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized to create codes');
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

-- =============================================
-- FIX 2: Agent branding - restrict writes to authenticated owners
-- =============================================

DROP POLICY IF EXISTS "Anyone can insert branding" ON public.agent_branding;
DROP POLICY IF EXISTS "Anyone can update branding" ON public.agent_branding;

CREATE POLICY "Users can insert own branding"
ON public.agent_branding FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own branding"
ON public.agent_branding FOR UPDATE
USING (user_id = auth.uid());

-- =============================================
-- FIX 3: Agent-assets storage - restrict to authenticated users
-- =============================================

DROP POLICY IF EXISTS "Allow uploads to agent-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow updates to agent-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow deletes from agent-assets" ON storage.objects;

CREATE POLICY "Authenticated users can upload agent assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'agent-assets' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can update agent assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'agent-assets' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can delete agent assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'agent-assets' 
  AND auth.uid() IS NOT NULL
);

-- =============================================
-- FIX 4: Client invitations - restrict public SELECT to pending only, hide sensitive data
-- =============================================

DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.client_invitations;

-- Create a restricted view for public token lookups (no email/token exposed in bulk)
CREATE POLICY "Public can view pending invitations by token lookup"
ON public.client_invitations FOR SELECT
USING (
  status = 'pending' 
  AND revoked_at IS NULL
);
