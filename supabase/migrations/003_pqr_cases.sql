-- PQR Cases Table for Returns/Claims Tracking
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS pqr_cases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  order_number TEXT NOT NULL DEFAULT '',
  contact_date DATE NOT NULL DEFAULT CURRENT_DATE,
  return_reason TEXT NOT NULL DEFAULT 'customer_request',
  original_tracking TEXT DEFAULT '',
  return_tracking TEXT DEFAULT '',
  resend_tracking TEXT DEFAULT '',
  requested_items TEXT DEFAULT '',
  customer_message TEXT DEFAULT '',
  internal_notes TEXT DEFAULT '',
  tracker_status TEXT NOT NULL DEFAULT 'sent_to_us',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_pqr_cases_user_id ON pqr_cases(user_id);

-- RLS
ALTER TABLE pqr_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD their own PQR cases"
  ON pqr_cases
  FOR ALL
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_pqr_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pqr_cases_updated_at
  BEFORE UPDATE ON pqr_cases
  FOR EACH ROW
  EXECUTE FUNCTION update_pqr_updated_at();
