ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS license text,
  ADD COLUMN IF NOT EXISTS custom_cta text;