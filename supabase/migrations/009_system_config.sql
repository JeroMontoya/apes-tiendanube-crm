-- =============================================
-- 009_system_config.sql
-- Shared system configuration for API credentials
-- All team members use the same credentials
-- =============================================

CREATE TABLE IF NOT EXISTS system_config (
  id TEXT PRIMARY KEY DEFAULT 'main',
  
  -- Tiendanube
  tiendanube_store_id TEXT,
  tiendanube_access_token TEXT,
  
  -- Meta Ads
  meta_ad_account_id TEXT,
  meta_access_token TEXT,
  
  -- Google Analytics 4
  ga4_property_id TEXT,
  ga4_credentials_json JSONB,
  
  -- Integrations
  n8n_webhook_url TEXT,
  
  -- Sync settings
  auto_sync_enabled BOOLEAN DEFAULT true,
  sync_interval_seconds INTEGER DEFAULT 90,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default row
INSERT INTO system_config (id) VALUES ('main') ON CONFLICT (id) DO NOTHING;

-- RLS: Anyone authenticated can read, only admins can update
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read system_config" ON system_config
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can update system_config" ON system_config
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert system_config" ON system_config
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );
