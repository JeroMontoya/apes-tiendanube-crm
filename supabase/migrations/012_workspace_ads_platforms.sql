-- =============================================
-- 012_workspace_ads_platforms.sql
-- Add Google Ads & TikTok Ads columns to workspaces
-- =============================================

ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS google_ads_customer_id TEXT;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS google_ads_client_id TEXT;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS google_ads_client_secret TEXT;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS google_ads_refresh_token TEXT;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS google_ads_developer_token TEXT;

ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS tiktok_advertiser_id TEXT;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS tiktok_access_token TEXT;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS tiktok_app_secret TEXT;
