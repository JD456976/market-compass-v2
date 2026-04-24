ALTER TABLE public.beta_access_codes ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.beta_access_codes ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.beta_access_codes ADD COLUMN IF NOT EXISTS max_uses integer NOT NULL DEFAULT 1;
ALTER TABLE public.beta_access_codes ADD COLUMN IF NOT EXISTS uses_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.beta_access_codes ADD COLUMN IF NOT EXISTS revoked_at timestamptz DEFAULT NULL;