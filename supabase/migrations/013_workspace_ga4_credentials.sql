-- =============================================
-- 013_workspace_ga4_credentials.sql
-- Add GA4 columns to per-user workspaces
-- =============================================

ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS ga4_property_id TEXT;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS ga4_credentials_json JSONB;

COMMENT ON COLUMN workspaces.ga4_property_id IS 'Google Analytics 4 Property ID (numeric)';
COMMENT ON COLUMN workspaces.ga4_credentials_json IS 'Service Account JSON for GA4 (can be same as Merchant Center)';
