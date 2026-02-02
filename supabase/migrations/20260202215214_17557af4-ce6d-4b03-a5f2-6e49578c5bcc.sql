-- Create new beta access codes table with email-based authentication
CREATE TABLE public.beta_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  issued_to TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NULL,
  revoked_at TIMESTAMP WITH TIME ZONE NULL,
  used_at TIMESTAMP WITH TIME ZONE NULL,
  used_by_device_id TEXT NULL,
  used_by_user_agent TEXT NULL,
  created_by_admin_email TEXT NOT NULL
);

-- Create indexes for beta_codes
CREATE INDEX idx_beta_codes_email ON public.beta_codes(email);
CREATE INDEX idx_beta_codes_used_at ON public.beta_codes(used_at);
CREATE UNIQUE INDEX idx_beta_codes_code_hash ON public.beta_codes(code_hash);

-- Create beta access activations table
CREATE TABLE public.beta_activations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  activated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  device_id TEXT NOT NULL,
  activation_source TEXT NOT NULL CHECK (activation_source IN ('code', 'admin_bypass')),
  code_id UUID NULL REFERENCES public.beta_codes(id)
);

-- Create unique constraint to prevent re-activating same device repeatedly
CREATE UNIQUE INDEX idx_beta_activations_email_device ON public.beta_activations(email, device_id);

-- Enable RLS on both tables
ALTER TABLE public.beta_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beta_activations ENABLE ROW LEVEL SECURITY;

-- RLS policies for beta_codes - only admins can manage
CREATE POLICY "Admins can manage beta_codes"
ON public.beta_codes
FOR ALL
USING (is_admin_user())
WITH CHECK (is_admin_user());

-- RLS policies for beta_activations - admins can view all, public can insert (validated server-side)
CREATE POLICY "Admins can manage beta_activations"
ON public.beta_activations
FOR ALL
USING (is_admin_user())
WITH CHECK (is_admin_user());

-- Allow public to read their own activation (for checking access)
CREATE POLICY "Users can check their own activation"
ON public.beta_activations
FOR SELECT
USING (true);

-- Create function to validate and redeem an email+code pair
CREATE OR REPLACE FUNCTION public.validate_beta_code(
  p_email TEXT,
  p_code_hash TEXT,
  p_device_id TEXT,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_code_record RECORD;
  v_existing_activation RECORD;
BEGIN
  -- Normalize email
  p_email := lower(trim(p_email));
  
  -- Check if this email+device is already activated
  SELECT * INTO v_existing_activation
  FROM public.beta_activations
  WHERE email = p_email AND device_id = p_device_id;
  
  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'message', 'Already activated', 'already_active', true);
  END IF;
  
  -- Find a valid code for this email
  SELECT * INTO v_code_record
  FROM public.beta_codes
  WHERE email = p_email
    AND code_hash = p_code_hash
    AND revoked_at IS NULL
    AND used_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired access code');
  END IF;
  
  -- Mark code as used
  UPDATE public.beta_codes
  SET 
    used_at = now(),
    used_by_device_id = p_device_id,
    used_by_user_agent = p_user_agent
  WHERE id = v_code_record.id;
  
  -- Create activation record
  INSERT INTO public.beta_activations (email, device_id, activation_source, code_id)
  VALUES (p_email, p_device_id, 'code', v_code_record.id)
  ON CONFLICT (email, device_id) DO NOTHING;
  
  RETURN jsonb_build_object('success', true, 'message', 'Access granted');
END;
$$;

-- Create function to record admin bypass activation
CREATE OR REPLACE FUNCTION public.record_admin_activation(
  p_email TEXT,
  p_device_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  p_email := lower(trim(p_email));
  
  INSERT INTO public.beta_activations (email, device_id, activation_source, code_id)
  VALUES (p_email, p_device_id, 'admin_bypass', NULL)
  ON CONFLICT (email, device_id) DO UPDATE SET activated_at = now();
  
  RETURN jsonb_build_object('success', true, 'message', 'Admin access recorded');
END;
$$;

-- Create function to check if email+device has active access
CREATE OR REPLACE FUNCTION public.check_beta_access(
  p_email TEXT,
  p_device_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_activation RECORD;
BEGIN
  p_email := lower(trim(p_email));
  
  SELECT * INTO v_activation
  FROM public.beta_activations
  WHERE email = p_email AND device_id = p_device_id;
  
  IF FOUND THEN
    RETURN jsonb_build_object(
      'has_access', true, 
      'activation_source', v_activation.activation_source,
      'activated_at', v_activation.activated_at
    );
  ELSE
    RETURN jsonb_build_object('has_access', false);
  END IF;
END;
$$;

-- Update is_admin_user function to include both admin emails
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND (
      email = 'jason.craig@chinattirealty.com'
      OR email = 'jdog45@gmail.com'
    )
  )
$$;