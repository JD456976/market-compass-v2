-- Add address_fields JSONB column to sessions for address recall matching
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS address_fields jsonb DEFAULT NULL;

-- Add index for efficient address matching
CREATE INDEX IF NOT EXISTS idx_sessions_address_fields ON public.sessions USING gin (address_fields);
