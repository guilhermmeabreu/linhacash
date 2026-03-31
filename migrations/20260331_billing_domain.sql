-- LinhaCash billing domain hardening
-- Run in Supabase SQL editor before deploying this release.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_status text DEFAULT 'none';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_source text DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS billing_status text DEFAULT 'none';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_started_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS granted_by_admin text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS granted_reason text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payment_provider text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payment_reference text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_reference text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS external_reference text;

UPDATE profiles
SET
  plan_status = COALESCE(plan_status, CASE WHEN plan = 'pro' THEN 'active' ELSE 'none' END),
  plan_source = COALESCE(plan_source, CASE WHEN plan = 'pro' THEN 'paid' ELSE 'free' END),
  billing_status = COALESCE(billing_status, CASE WHEN plan = 'pro' THEN 'active' ELSE 'none' END)
WHERE plan_status IS NULL OR plan_source IS NULL OR billing_status IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_billing_source_status ON profiles(plan_source, plan_status);
CREATE INDEX IF NOT EXISTS idx_profiles_billing_paid_active ON profiles(plan_source, billing_status, subscription_expires_at);
CREATE INDEX IF NOT EXISTS idx_profiles_payment_reference ON profiles(payment_provider, payment_reference);
