-- =============================================
-- 010_google_integrations_config.sql
-- Add Google Merchant Center & Search Console credentials
-- =============================================

ALTER TABLE system_config ADD COLUMN IF NOT EXISTS merchant_center_merchant_id TEXT;
ALTER TABLE system_config ADD COLUMN IF NOT EXISTS merchant_center_credentials_json JSONB;

ALTER TABLE system_config ADD COLUMN IF NOT EXISTS search_console_site_url TEXT;
ALTER TABLE system_config ADD COLUMN IF NOT EXISTS search_console_credentials_json JSONB;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_config_merchant_id ON system_config(merchant_center_merchant_id) WHERE merchant_center_merchant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_system_config_search_console_site ON system_config(search_console_site_url) WHERE search_console_site_url IS NOT NULL;

-- Comment columns
COMMENT ON COLUMN system_config.merchant_center_merchant_id IS 'Google Merchant Center Merchant ID (numeric)';
COMMENT ON COLUMN system_config.merchant_center_credentials_json IS 'Service Account JSON for Merchant Center API (Content API)';
COMMENT ON COLUMN system_config.search_console_site_url IS 'Site URL in Search Console (e.g., https://www.tutienda.com/)';
COMMENT ON COLUMN system_config.search_console_credentials_json IS 'Service Account JSON for Search Console API (Webmasters API)';