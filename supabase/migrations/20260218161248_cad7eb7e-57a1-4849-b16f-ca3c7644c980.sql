
-- ============================================================
-- Phase 2B: redeem_beta_code() SECURITY DEFINER RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.redeem_beta_code(
  p_code text,
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_code_record RECORD;
  v_existing_redemption RECORD;
  v_failed_attempts int;
  v_profile RECORD;
  v_beta_expires_at timestamptz;
BEGIN
  -- 1. Must be authenticated
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  -- 2. Rate limiting: max 5 failed attempts per 10 minutes
  SELECT COUNT(*) INTO v_failed_attempts
  FROM public.beta_redeem_rate_limits
  WHERE user_id = v_user_id
    AND success = false
    AND attempted_at > now() - interval '10 minutes';

  IF v_failed_attempts >= 5 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Too many failed attempts. Please wait 10 minutes before trying again.');
  END IF;

  -- 3. Check if user already has active beta access (idempotent)
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE user_id = v_user_id;

  IF v_profile.beta_access_active = true
    AND (v_profile.beta_access_expires_at IS NULL OR v_profile.beta_access_expires_at > now()) THEN
    RETURN jsonb_build_object(
      'ok', true,
      'beta_expires_at', v_profile.beta_access_expires_at,
      'message', 'Beta access already active'
    );
  END IF;

  -- 4. Normalize and validate the code (SELECT FOR UPDATE for concurrency safety)
  p_code := upper(trim(p_code));

  SELECT * INTO v_code_record
  FROM public.beta_access_codes
  WHERE code = p_code
  FOR UPDATE;

  -- Record this attempt
  INSERT INTO public.beta_redeem_rate_limits (user_id, success)
  VALUES (v_user_id, false);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid access code');
  END IF;

  -- 5. Check revoked
  IF v_code_record.revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This access code has been revoked');
  END IF;

  -- 6. Check expired
  IF v_code_record.expires_at IS NOT NULL AND now() > v_code_record.expires_at THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This access code has expired');
  END IF;

  -- 7. Check max uses
  IF v_code_record.uses_count >= v_code_record.max_uses THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This access code has already been used the maximum number of times');
  END IF;

  -- 8. Prevent duplicate redemption by same user
  SELECT * INTO v_existing_redemption
  FROM public.beta_code_redemptions
  WHERE user_id = v_user_id;

  IF FOUND THEN
    -- User already redeemed a code; return their existing access if still valid
    SELECT * INTO v_profile FROM public.profiles WHERE user_id = v_user_id;
    IF v_profile.beta_access_active = true THEN
      RETURN jsonb_build_object(
        'ok', true,
        'beta_expires_at', v_profile.beta_access_expires_at,
        'message', 'Beta access already granted from a previous code'
      );
    END IF;
    RETURN jsonb_build_object('ok', false, 'error', 'You have already used a beta access code');
  END IF;

  -- 9. Compute beta expiry from code's expires_at
  v_beta_expires_at := v_code_record.expires_at;

  -- 10. Transaction: increment uses_count, insert redemption, update profile
  UPDATE public.beta_access_codes
  SET uses_count = uses_count + 1
  WHERE id = v_code_record.id;

  INSERT INTO public.beta_code_redemptions (code_id, user_id, user_agent)
  VALUES (v_code_record.id, v_user_id, p_user_agent);

  UPDATE public.profiles
  SET
    beta_access_active = true,
    beta_access_expires_at = v_beta_expires_at,
    beta_access_source = 'beta_code',
    last_entitlement_check_at = now()
  WHERE user_id = v_user_id;

  -- 11. Mark rate limit entry as success
  UPDATE public.beta_redeem_rate_limits
  SET success = true
  WHERE id = (
    SELECT id FROM public.beta_redeem_rate_limits
    WHERE user_id = v_user_id
    ORDER BY attempted_at DESC
    LIMIT 1
  );

  RETURN jsonb_build_object(
    'ok', true,
    'beta_expires_at', v_beta_expires_at,
    'message', 'Beta access activated successfully'
  );
END;
$$;

-- ============================================================
-- Phase 2C: get_user_entitlements() - single source of truth
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_entitlements()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_profile RECORD;
  v_entitlement RECORD;
  v_beta_allowed boolean := false;
  v_stripe_allowed boolean := false;
  v_allowed boolean;
  v_reason text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'not_authenticated');
  END IF;

  -- Get profile (beta access info)
  SELECT * INTO v_profile FROM public.profiles WHERE user_id = v_user_id;

  -- Get entitlement row (stripe info)
  SELECT * INTO v_entitlement FROM public.user_entitlements WHERE user_id = v_user_id;

  -- Check beta access
  IF v_profile.beta_access_active = true THEN
    IF v_profile.beta_access_expires_at IS NULL OR v_profile.beta_access_expires_at > now() THEN
      v_beta_allowed := true;
    ELSE
      -- Expired: flip the flag so future checks are fast
      UPDATE public.profiles
      SET beta_access_active = false, last_entitlement_check_at = now()
      WHERE user_id = v_user_id;
    END IF;
  END IF;

  -- Check Stripe subscription
  IF v_entitlement.is_pro = true OR v_entitlement.is_trial = true THEN
    IF v_entitlement.expires_at IS NULL OR v_entitlement.expires_at > now() THEN
      v_stripe_allowed := true;
    END IF;
  END IF;

  v_allowed := v_beta_allowed OR v_stripe_allowed;

  IF v_beta_allowed THEN
    v_reason := 'beta_access';
  ELSIF v_stripe_allowed THEN
    v_reason := CASE WHEN v_entitlement.is_trial THEN 'trial' ELSE 'subscription' END;
  ELSE
    v_reason := 'no_access';
  END IF;

  -- Update last check timestamp
  UPDATE public.profiles SET last_entitlement_check_at = now() WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'reason', v_reason,
    'beta_active', v_beta_allowed,
    'beta_expires_at', v_profile.beta_access_expires_at,
    'beta_source', v_profile.beta_access_source,
    'subscription_status', CASE
      WHEN v_stripe_allowed AND v_entitlement.is_trial THEN 'trial'
      WHEN v_stripe_allowed THEN 'active'
      ELSE 'none'
    END,
    'subscription_expires_at', v_entitlement.expires_at
  );
END;
$$;

-- ============================================================
-- Phase 2E: create_beta_access_code() admin RPC
-- ============================================================
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

-- ============================================================
-- Phase 2E: revoke_beta_access_code() admin RPC  
-- ============================================================
CREATE OR REPLACE FUNCTION public.revoke_beta_access_code(p_code_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_user() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized');
  END IF;

  UPDATE public.beta_access_codes
  SET revoked_at = now()
  WHERE id = p_code_id AND revoked_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Code not found or already revoked');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ============================================================
-- Phase 2E: list_beta_access_codes() admin RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.list_beta_access_codes()
RETURNS TABLE (
  id uuid,
  code text,
  issued_to text,
  email text,
  notes text,
  created_at timestamptz,
  expires_at timestamptz,
  max_uses int,
  uses_count int,
  revoked_at timestamptz,
  redemptions jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    bac.id,
    bac.code,
    bac.issued_to,
    bac.email,
    bac.notes,
    bac.created_at,
    bac.expires_at,
    bac.max_uses,
    bac.uses_count,
    bac.revoked_at,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'user_id', r.user_id,
        'redeemed_at', r.redeemed_at
      ))
      FROM public.beta_code_redemptions r WHERE r.code_id = bac.id),
      '[]'::jsonb
    ) AS redemptions
  FROM public.beta_access_codes bac
  ORDER BY bac.created_at DESC;
END;
$$;

-- ============================================================
-- Phase 2E: Daily expiry job — expire stale beta access
-- Call via pg_cron or edge function schedule
-- ============================================================
CREATE OR REPLACE FUNCTION public.expire_stale_beta_access()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  UPDATE public.profiles
  SET beta_access_active = false
  WHERE beta_access_active = true
    AND beta_access_expires_at IS NOT NULL
    AND beta_access_expires_at < now();
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('ok', true, 'expired_count', v_count);
END;
$$;
