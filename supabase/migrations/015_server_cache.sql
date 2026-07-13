-- 015_server_cache.sql
-- Server-side cache table for pre-loaded data
-- Vercel cron syncs data every 5 min, clients read instantly on login

CREATE TABLE IF NOT EXISTS server_cache (
  id TEXT PRIMARY KEY DEFAULT 'main',
  tiendanube_products JSONB DEFAULT '[]'::jsonb,
  tiendanube_orders JSONB DEFAULT '[]'::jsonb,
  tiendanube_customers JSONB DEFAULT '[]'::jsonb,
  unified_clients JSONB DEFAULT '[]'::jsonb,
  raw_orders JSONB DEFAULT '[]'::jsonb,
  ga4_insights JSONB DEFAULT NULL,
  meta_insights JSONB DEFAULT NULL,
  mc_products JSONB DEFAULT '[]'::jsonb,
  gsc_queries JSONB DEFAULT '[]'::jsonb,
  gsc_pages JSONB DEFAULT '[]'::jsonb,
  gsc_performance JSONB DEFAULT NULL,
  ai_insights JSONB DEFAULT NULL,
  last_sync TIMESTAMPTZ DEFAULT NOW(),
  sync_status TEXT DEFAULT 'pending',
  sync_duration_ms INTEGER DEFAULT 0,
  error_log JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: only service role can write, anyone authenticated can read
ALTER TABLE server_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read server cache"
  ON server_cache FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can insert/update server cache"
  ON server_cache FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Seed initial row
INSERT INTO server_cache (id, sync_status) VALUES ('main', 'pending')
ON CONFLICT (id) DO NOTHING;
