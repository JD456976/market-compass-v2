
ALTER TABLE public.beta_access_codes
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS max_uses integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS uses_count integer NOT NULL DEFAULT 0;

UPDATE public.beta_access_codes SET uses_count = 1 WHERE status = 'used' AND uses_count = 0;
