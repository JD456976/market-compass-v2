-- Create owner_devices table for admin device bypass
CREATE TABLE public.owner_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL UNIQUE,
  admin_email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz NULL
);

-- Enable RLS
ALTER TABLE public.owner_devices ENABLE ROW LEVEL SECURITY;

-- Admin-only access policy
CREATE POLICY "Admins can manage owner_devices"
ON public.owner_devices
FOR ALL
USING (is_admin_user())
WITH CHECK (is_admin_user());

-- Public can check their own device (for gate logic)
CREATE POLICY "Public can check own device"
ON public.owner_devices
FOR SELECT
USING (true);

-- Create index on device_id
CREATE INDEX idx_owner_devices_device_id ON public.owner_devices(device_id);

-- Function to check if a device is an owner device
CREATE OR REPLACE FUNCTION public.check_owner_device(p_device_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_device RECORD;
BEGIN
  SELECT * INTO v_device
  FROM public.owner_devices
  WHERE device_id = p_device_id
    AND revoked_at IS NULL;
  
  IF FOUND THEN
    RETURN jsonb_build_object(
      'is_owner', true, 
      'admin_email', v_device.admin_email,
      'created_at', v_device.created_at
    );
  ELSE
    RETURN jsonb_build_object('is_owner', false);
  END IF;
END;
$$;

-- Function to register an owner device
CREATE OR REPLACE FUNCTION public.register_owner_device(p_device_id text, p_admin_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if admin email is in allowlist
  IF lower(trim(p_admin_email)) NOT IN ('jdog45@gmail.com', 'jason.craig@chinattirealty.com') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not an admin email');
  END IF;
  
  -- Upsert the device
  INSERT INTO public.owner_devices (device_id, admin_email)
  VALUES (p_device_id, lower(trim(p_admin_email)))
  ON CONFLICT (device_id) DO UPDATE SET
    admin_email = lower(trim(p_admin_email)),
    revoked_at = NULL;
  
  RETURN jsonb_build_object('success', true, 'message', 'Owner device registered');
END;
$$;

-- Function to revoke an owner device
CREATE OR REPLACE FUNCTION public.revoke_owner_device(p_device_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.owner_devices
  SET revoked_at = now()
  WHERE device_id = p_device_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Device not found');
  END IF;
  
  RETURN jsonb_build_object('success', true, 'message', 'Owner device revoked');
END;
$$;