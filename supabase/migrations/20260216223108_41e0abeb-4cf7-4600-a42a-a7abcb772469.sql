
-- Create user_entitlements table for Stripe-based subscription tracking
CREATE TABLE IF NOT EXISTS public.user_entitlements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  is_pro BOOLEAN NOT NULL DEFAULT false,
  is_trial BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  product_id TEXT,
  source TEXT NOT NULL DEFAULT 'stripe',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;

-- Users can view their own entitlement
CREATE POLICY "Users can view own entitlement"
  ON public.user_entitlements
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own entitlement
CREATE POLICY "Users can insert own entitlement"
  ON public.user_entitlements
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own entitlement
CREATE POLICY "Users can update own entitlement"
  ON public.user_entitlements
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can manage all entitlements
CREATE POLICY "Admins can manage all entitlements"
  ON public.user_entitlements
  FOR ALL
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

-- Trigger for updated_at
CREATE TRIGGER update_user_entitlements_updated_at
  BEFORE UPDATE ON public.user_entitlements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
