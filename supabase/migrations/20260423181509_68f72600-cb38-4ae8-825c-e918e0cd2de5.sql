CREATE TABLE IF NOT EXISTS public.pre_approved_emails (

  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  email text NOT NULL,

  name text,

  days int NOT NULL DEFAULT 30,

  expires_at timestamptz NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now(),

  created_by uuid REFERENCES auth.users(id)

);



CREATE UNIQUE INDEX IF NOT EXISTS pre_approved_emails_email_key ON public.pre_approved_emails (lower(email));



ALTER TABLE public.pre_approved_emails ENABLE ROW LEVEL SECURITY;



CREATE POLICY "admin_full_access" ON public.pre_approved_emails FOR ALL USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());



CREATE OR REPLACE FUNCTION public.claim_pre_approved_access()

RETURNS jsonb

LANGUAGE plpgsql

SECURITY DEFINER

SET search_path = public

AS $$

DECLARE

  v_user_id uuid;

  v_email   text;

  v_row     RECORD;

BEGIN

  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN

    RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');

  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;

  SELECT * INTO v_row FROM public.pre_approved_emails WHERE lower(email) = lower(v_email);

  IF NOT FOUND THEN

    RETURN jsonb_build_object('ok', true, 'claimed', false);

  END IF;

  UPDATE public.profiles SET

    beta_access_active = true,

    beta_access_expires_at = v_row.expires_at,

    beta_access_source = 'admin_invite',

    full_name = COALESCE(NULLIF(full_name, ''), v_row.name)

  WHERE user_id = v_user_id;

  DELETE FROM public.pre_approved_emails WHERE lower(email) = lower(v_email);

  RETURN jsonb_build_object('ok', true, 'claimed', true, 'expires_at', v_row.expires_at);

END;

$$;



CREATE OR REPLACE FUNCTION public.upsert_pre_approved_email(

  p_email text,

  p_name text DEFAULT NULL,

  p_expires_at timestamptz DEFAULT NULL,

  p_days int DEFAULT 30

)

RETURNS jsonb

LANGUAGE plpgsql

SECURITY DEFINER

SET search_path = public

AS $$

DECLARE

  v_expires timestamptz;

BEGIN

  IF NOT public.is_admin_user() THEN

    RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized');

  END IF;

  v_expires := COALESCE(p_expires_at, now() + (p_days || ' days')::interval);

  INSERT INTO public.pre_approved_emails (email, name, days, expires_at, created_by)

  VALUES (lower(trim(p_email)), p_name, p_days, v_expires, auth.uid())

  ON CONFLICT (lower(email))

  DO UPDATE SET

    name = EXCLUDED.name,

    days = EXCLUDED.days,

    expires_at = EXCLUDED.expires_at,

    created_at = now();

  RETURN jsonb_build_object('ok', true);

END;

$$;