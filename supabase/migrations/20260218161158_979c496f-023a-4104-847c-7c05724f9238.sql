
-- ============================================================
-- Phase 2A: Beta access columns on profiles
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS beta_access_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS beta_access_expires_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS beta_access_source text NULL,
  ADD COLUMN IF NOT EXISTS last_entitlement_check_at timestamptz NULL;

-- ============================================================
-- Phase 2A: beta_access_codes table (proper, with max_uses)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.beta_access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  issued_to text NOT NULL,
  email text NULL,
  notes text NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NULL,
  max_uses int NOT NULL DEFAULT 1,
  uses_count int NOT NULL DEFAULT 0,
  revoked_at timestamptz NULL
);

ALTER TABLE public.beta_access_codes ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admins can manage beta_access_codes"
  ON public.beta_access_codes FOR ALL
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- ============================================================
-- Phase 2A: beta_code_redemptions table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.beta_code_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL REFERENCES public.beta_access_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  ip_hash text NULL,
  user_agent text NULL
);

ALTER TABLE public.beta_code_redemptions ENABLE ROW LEVEL SECURITY;

-- Only admins can SELECT; no direct client inserts (use RPC only)
CREATE POLICY "Admins can view beta_code_redemptions"
  ON public.beta_code_redemptions FOR SELECT
  USING (public.is_admin_user());

CREATE POLICY "No direct client insert to redemptions"
  ON public.beta_code_redemptions FOR INSERT
  WITH CHECK (false);

-- ============================================================
-- Phase 2A: Rate limiting table for failed redemption attempts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.beta_redeem_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  success boolean NOT NULL DEFAULT false
);

ALTER TABLE public.beta_redeem_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct client access to rate limits"
  ON public.beta_redeem_rate_limits FOR ALL
  USING (false)
  WITH CHECK (false);

-- Index for fast rate-limit lookups
CREATE INDEX IF NOT EXISTS idx_redeem_rate_limits_user_time
  ON public.beta_redeem_rate_limits(user_id, attempted_at);
