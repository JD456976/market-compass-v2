-- Create enum for beta access code status
CREATE TYPE public.beta_code_status AS ENUM ('active', 'used', 'revoked', 'expired');

-- Create beta_access_codes table
CREATE TABLE public.beta_access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  status public.beta_code_status NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL,
  used_at TIMESTAMPTZ,
  used_by_device_id UUID,
  issued_to TEXT,
  note TEXT
);

-- Create beta_authorized_devices table
CREATE TABLE public.beta_authorized_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID UNIQUE NOT NULL,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_via_code_id UUID REFERENCES public.beta_access_codes(id) ON DELETE SET NULL,
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  revoked_at TIMESTAMPTZ,
  label TEXT
);

-- Enable RLS on both tables
ALTER TABLE public.beta_access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beta_authorized_devices ENABLE ROW LEVEL SECURITY;

-- Create admin check function (security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND email = 'jason.craig@chinattirealty.com'
  )
$$;

-- RLS Policies for beta_access_codes
-- Admin can do everything
CREATE POLICY "Admin full access to codes"
ON public.beta_access_codes
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- RLS Policies for beta_authorized_devices
-- Admin can do everything
CREATE POLICY "Admin full access to devices"
ON public.beta_authorized_devices
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Public can check their own device authorization (read only their device)
CREATE POLICY "Public can check own device"
ON public.beta_authorized_devices
FOR SELECT
TO anon
USING (true);

-- Create atomic redeem function (callable by anyone)
CREATE OR REPLACE FUNCTION public.redeem_beta_code(
  p_code TEXT,
  p_device_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code_record RECORD;
  v_existing_device RECORD;
  v_result JSONB;
BEGIN
  -- Check if device is already authorized
  SELECT * INTO v_existing_device
  FROM public.beta_authorized_devices
  WHERE device_id = p_device_id AND is_revoked = false;
  
  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'message', 'Device already authorized');
  END IF;

  -- Lock and fetch the code
  SELECT * INTO v_code_record
  FROM public.beta_access_codes
  WHERE code = p_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid access code');
  END IF;

  -- Check if already used
  IF v_code_record.status = 'used' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This code has already been used');
  END IF;

  -- Check if revoked
  IF v_code_record.status = 'revoked' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This code has been revoked');
  END IF;

  -- Check if expired (by status or date)
  IF v_code_record.status = 'expired' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This code has expired');
  END IF;

  IF v_code_record.expires_at IS NOT NULL AND v_code_record.expires_at < now() THEN
    -- Update status to expired
    UPDATE public.beta_access_codes
    SET status = 'expired'
    WHERE id = v_code_record.id;
    
    RETURN jsonb_build_object('success', false, 'error', 'This code has expired');
  END IF;

  -- Valid code - mark as used and bind to device
  UPDATE public.beta_access_codes
  SET 
    status = 'used',
    used_at = now(),
    used_by_device_id = p_device_id
  WHERE id = v_code_record.id;

  -- Create authorized device entry
  INSERT INTO public.beta_authorized_devices (
    device_id,
    activated_via_code_id,
    label
  ) VALUES (
    p_device_id,
    v_code_record.id,
    v_code_record.issued_to
  );

  RETURN jsonb_build_object('success', true, 'message', 'Access granted');
END;
$$;

-- Create function to check device authorization (public)
CREATE OR REPLACE FUNCTION public.check_device_authorization(p_device_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_device RECORD;
BEGIN
  SELECT * INTO v_device
  FROM public.beta_authorized_devices
  WHERE device_id = p_device_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('authorized', false, 'reason', 'not_found');
  END IF;

  IF v_device.is_revoked THEN
    RETURN jsonb_build_object('authorized', false, 'reason', 'revoked');
  END IF;

  RETURN jsonb_build_object('authorized', true, 'label', v_device.label);
END;
$$;

-- Grant execute permissions to anon role for public functions
GRANT EXECUTE ON FUNCTION public.redeem_beta_code(TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.check_device_authorization(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;