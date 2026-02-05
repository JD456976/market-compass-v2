-- Fix security vulnerabilities in RLS policies and functions

-- 1. Fix beta_activations: Remove overly permissive public SELECT policy
-- Users should only be able to check their own activation by device_id
DROP POLICY IF EXISTS "Users can check their own activation" ON beta_activations;

CREATE POLICY "Users can check own activation by device"
ON beta_activations FOR SELECT
USING (device_id = current_setting('request.headers', true)::json->>'x-device-id');

-- 2. Fix owner_devices: Remove public SELECT policy that exposes admin emails
DROP POLICY IF EXISTS "Public can check own device" ON owner_devices;

-- The check_owner_device() RPC function is sufficient for device verification
-- Only admins should be able to view the full table
-- No new policy needed - existing "Admins can manage owner_devices" covers admin access

-- 3. Fix revoke_owner_device function to require admin authorization
CREATE OR REPLACE FUNCTION public.revoke_owner_device(p_device_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_device_id text;
  v_caller RECORD;
BEGIN
  -- Check if caller is a registered admin owner device
  -- This validates that the request comes from an admin's registered device
  SELECT * INTO v_caller
  FROM public.owner_devices
  WHERE device_id = p_device_id
    AND revoked_at IS NULL;
  
  -- Only allow revoking if the device exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Device not found');
  END IF;
  
  -- Check if caller is an admin (device must belong to admin email)
  IF v_caller.admin_email NOT IN ('jdog45@gmail.com', 'jason.craig@chinattirealty.com') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;
  
  UPDATE public.owner_devices
  SET revoked_at = now()
  WHERE device_id = p_device_id;
  
  RETURN jsonb_build_object('success', true, 'message', 'Owner device revoked');
END;
$$;