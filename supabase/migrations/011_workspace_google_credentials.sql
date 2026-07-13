-- =============================================
-- 011_workspace_google_credentials.sql
-- Add Google MC & GSC columns to per-user workspaces
-- =============================================

ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS merchant_center_merchant_id TEXT;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS merchant_center_credentials_json JSONB;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS search_console_site_url TEXT;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS search_console_credentials_json JSONB;

COMMENT ON COLUMN workspaces.merchant_center_merchant_id IS 'Google Merchant Center Merchant ID';
COMMENT ON COLUMN workspaces.merchant_center_credentials_json IS 'Service Account JSON for Merchant Center';
COMMENT ON COLUMN workspaces.search_console_site_url IS 'Site URL in Search Console';
COMMENT ON COLUMN workspaces.search_console_credentials_json IS 'Service Account JSON for Search Console';
