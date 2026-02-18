
-- Fix 1: Restrict client_invitations to token-only lookup via secure RPC
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.client_invitations;
DROP POLICY IF EXISTS "Public can view pending invitations by token lookup" ON public.client_invitations;

-- Create secure RPC that only returns limited fields for a specific token
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token TEXT)
RETURNS TABLE (
  status TEXT,
  client_email TEXT,
  client_first_name TEXT,
  client_last_name TEXT,
  agent_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ci.status,
    ci.client_email,
    ci.client_first_name,
    ci.client_last_name,
    COALESCE(p.full_name, '') AS agent_name
  FROM public.client_invitations ci
  LEFT JOIN public.profiles p ON p.user_id = ci.agent_user_id
  WHERE ci.invite_token = p_token
    AND ci.revoked_at IS NULL
  LIMIT 1;
END;
$$;

-- Fix 2: Add missing RLS so clients can view their claimed sessions
CREATE POLICY "Clients can view claimed sessions"
ON public.sessions FOR SELECT
USING (claimed_by_user_id = auth.uid());

-- Fix 3: Create secure crm_api_keys table (no client access - edge functions only)
CREATE TABLE IF NOT EXISTS public.crm_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  crm_type text NOT NULL DEFAULT 'follow_up_boss',
  encrypted_api_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_api_keys ENABLE ROW LEVEL SECURITY;

-- Deny ALL direct client access - only accessible via service role in edge functions
CREATE POLICY "No direct client access to crm_api_keys"
  ON public.crm_api_keys FOR ALL
  USING (false)
  WITH CHECK (false);

-- Trigger for updated_at
CREATE TRIGGER update_crm_api_keys_updated_at
  BEFORE UPDATE ON public.crm_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
