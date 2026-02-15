
-- Create the updated_at trigger function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- User subscription tracking table
CREATE TABLE public.user_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'none',
  trial_started_at TIMESTAMP WITH TIME ZONE,
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  subscription_product_id TEXT,
  subscription_started_at TIMESTAMP WITH TIME ZONE,
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  original_transaction_id TEXT,
  latest_receipt TEXT,
  auto_renew_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
ON public.user_subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription"
ON public.user_subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
ON public.user_subscriptions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all subscriptions"
ON public.user_subscriptions FOR ALL
USING (is_admin_user())
WITH CHECK (is_admin_user());

CREATE TRIGGER update_user_subscriptions_updated_at
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
