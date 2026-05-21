-- Simple subscriptions table for tier tracking (no Stripe)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own subscription
CREATE POLICY "Users can view their own subscription"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can update their own subscription tier
CREATE POLICY "Users can update their own subscription"
  ON public.subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can insert their own subscription (for first-time setup)
CREATE POLICY "Users can insert their own subscription"
  ON public.subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_tier ON public.subscriptions(tier);

-- Function to check if user has pro tier
CREATE OR REPLACE FUNCTION public.is_pro_user(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.subscriptions
    WHERE user_id = check_user_id
    AND tier = 'pro'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
