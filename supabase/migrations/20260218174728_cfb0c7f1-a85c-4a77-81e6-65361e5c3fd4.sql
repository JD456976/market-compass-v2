
-- Add address, MLS number, and label fields to listing_navigator_runs
-- to support centralized property library with address-based display
ALTER TABLE public.listing_navigator_runs
  ADD COLUMN IF NOT EXISTS property_address text,
  ADD COLUMN IF NOT EXISTS mls_number text,
  ADD COLUMN IF NOT EXISTS listing_label text;

-- Index for fast lookups by address/mls across runs
CREATE INDEX IF NOT EXISTS idx_listing_runs_user_address 
  ON public.listing_navigator_runs (user_id, property_address);

CREATE INDEX IF NOT EXISTS idx_listing_runs_user_mls 
  ON public.listing_navigator_runs (user_id, mls_number);
