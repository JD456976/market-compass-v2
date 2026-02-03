-- Create sessions table for storing all report data
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_device_id TEXT, -- For non-authenticated users (legacy support)
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- For authenticated users
  session_type TEXT NOT NULL CHECK (session_type IN ('Seller', 'Buyer')),
  client_name TEXT NOT NULL,
  location TEXT NOT NULL,
  property_type TEXT NOT NULL CHECK (property_type IN ('SFH', 'Condo', 'MFH')),
  condition TEXT NOT NULL CHECK (condition IN ('Dated', 'Maintained', 'Updated', 'Renovated')),
  selected_market_profile_id UUID,
  market_scenario_id TEXT,
  market_scenario_overrides JSONB,
  market_snapshot_id TEXT,
  seller_inputs JSONB,
  buyer_inputs JSONB,
  share_link_created BOOLEAN DEFAULT false,
  share_token TEXT UNIQUE, -- For public share links
  share_token_revoked BOOLEAN DEFAULT false,
  pdf_exported BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create market_profiles table
CREATE TABLE public.market_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_device_id TEXT,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  location TEXT NOT NULL,
  property_type TEXT NOT NULL CHECK (property_type IN ('SFH', 'Condo', 'MFH')),
  typical_sale_to_list TEXT NOT NULL CHECK (typical_sale_to_list IN ('Below', 'Near', 'Above')),
  typical_dom TEXT NOT NULL CHECK (typical_dom IN ('Fast', 'Normal', 'Slow')),
  multiple_offers_frequency TEXT NOT NULL CHECK (multiple_offers_frequency IN ('Rare', 'Sometimes', 'Common')),
  contingency_tolerance TEXT NOT NULL CHECK (contingency_tolerance IN ('Low', 'Medium', 'High')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_profiles ENABLE ROW LEVEL SECURITY;

-- Sessions policies
-- Users can view their own sessions
CREATE POLICY "Users can view own sessions"
ON public.sessions FOR SELECT
USING (
  owner_user_id = auth.uid() 
  OR owner_device_id IS NOT NULL
);

-- Anyone can view sessions via share token (for shared reports)
CREATE POLICY "Anyone can view shared sessions"
ON public.sessions FOR SELECT
USING (
  share_token IS NOT NULL 
  AND share_link_created = true 
  AND share_token_revoked = false
);

-- Users can insert their own sessions
CREATE POLICY "Users can insert own sessions"
ON public.sessions FOR INSERT
WITH CHECK (
  owner_user_id = auth.uid() 
  OR owner_user_id IS NULL
);

-- Users can update their own sessions
CREATE POLICY "Users can update own sessions"
ON public.sessions FOR UPDATE
USING (owner_user_id = auth.uid() OR owner_device_id IS NOT NULL);

-- Users can delete their own sessions
CREATE POLICY "Users can delete own sessions"
ON public.sessions FOR DELETE
USING (owner_user_id = auth.uid() OR owner_device_id IS NOT NULL);

-- Market profiles policies
CREATE POLICY "Users can view own market profiles"
ON public.market_profiles FOR SELECT
USING (owner_user_id = auth.uid() OR owner_device_id IS NOT NULL);

CREATE POLICY "Users can insert own market profiles"
ON public.market_profiles FOR INSERT
WITH CHECK (owner_user_id = auth.uid() OR owner_user_id IS NULL);

CREATE POLICY "Users can update own market profiles"
ON public.market_profiles FOR UPDATE
USING (owner_user_id = auth.uid() OR owner_device_id IS NOT NULL);

CREATE POLICY "Users can delete own market profiles"
ON public.market_profiles FOR DELETE
USING (owner_user_id = auth.uid() OR owner_device_id IS NOT NULL);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER market_profiles_updated_at
  BEFORE UPDATE ON public.market_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create index for share token lookups
CREATE INDEX idx_sessions_share_token ON public.sessions(share_token) WHERE share_token IS NOT NULL;

-- Create index for owner lookups
CREATE INDEX idx_sessions_owner_user_id ON public.sessions(owner_user_id);
CREATE INDEX idx_market_profiles_owner_user_id ON public.market_profiles(owner_user_id);