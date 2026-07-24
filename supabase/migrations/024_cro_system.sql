-- 024_cro_system.sql
-- Motor CRO: Caché de diagnósticos + Historial de cambios de copy
-- Evita re-analizar productos cuyo copy no ha cambiado (control de costos OpenAI)

-- Tabla de caché de análisis CRO
CREATE TABLE IF NOT EXISTS cro_analysis_cache (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL,
  product_name TEXT NOT NULL,
  product_description TEXT,
  product_price NUMERIC,
  views INTEGER DEFAULT 0,
  orders INTEGER DEFAULT 0,
  conversion_rate NUMERIC(6,2) DEFAULT 0,
  diagnostic JSONB NOT NULL,
  optimized_copy JSONB NOT NULL,
  expected_impact TEXT,
  framework_used TEXT,
  model_used TEXT DEFAULT 'gpt-4o',
  cache_key TEXT NOT NULL UNIQUE, -- hash del copy+precio para invalidación
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

-- Índice para lookup rápido por producto
CREATE INDEX IF NOT EXISTS idx_cro_cache_product ON cro_analysis_cache(product_id);
CREATE INDEX IF NOT EXISTS idx_cro_cache_key ON cro_analysis_cache(cache_key);

-- Tabla de historial de cambios de copy aplicados a TiendaNube
CREATE TABLE IF NOT EXISTS cro_copy_history (
  id BIGSERIAL PRIMARY KEY,
  tiendanube_product_id BIGINT NOT NULL,
  old_name TEXT,
  old_description TEXT,
  new_name TEXT,
  new_description TEXT,
  applied_by TEXT,
  cr_before NUMERIC(6,2),
  cr_after NUMERIC(6,2),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para queries por producto
CREATE INDEX IF NOT EXISTS idx_cro_history_product ON cro_copy_history(tiendanube_product_id);

-- Tabla de eventos CAPI enviados (para tracking y deduplicación)
CREATE TABLE IF NOT EXISTS meta_capi_events (
  id BIGSERIAL PRIMARY KEY,
  event_name TEXT NOT NULL,
  event_id TEXT UNIQUE, -- para deduplicación Pixel/CAPI
  tiendanube_order_id TEXT,
  user_email_hash TEXT,
  value NUMERIC(12,2),
  currency TEXT DEFAULT 'ARS',
  status TEXT DEFAULT 'sent', -- sent | failed | duplicate
  response_data JSONB,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_capi_event_id ON meta_capi_events(event_id);
CREATE INDEX IF NOT EXISTS idx_capi_order ON meta_capi_events(tiendanube_order_id);

-- RLS: Solo service_role puede acceder (ya está configurado por defecto)
ALTER TABLE cro_analysis_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE cro_copy_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_capi_events ENABLE ROW LEVEL SECURITY;

-- Política: service_role tiene acceso completo
CREATE POLICY "Service role full access" ON cro_analysis_cache FOR ALL USING (true);
CREATE POLICY "Service role full access" ON cro_copy_history FOR ALL USING (true);
CREATE POLICY "Service role full access" ON meta_capi_events FOR ALL USING (true);

-- Vista para métricas CRO resumidas
CREATE OR REPLACE VIEW cro_dashboard_stats AS
SELECT
  COUNT(DISTINCT product_id) as total_analyzed,
  AVG(conversion_rate) as avg_conversion_rate,
  COUNT(*) FILTER (WHERE conversion_rate < 1.5) as critical_products,
  COUNT(*) FILTER (WHERE conversion_rate < 3 AND conversion_rate >= 1.5) as below_products,
  COUNT(*) FILTER (WHERE conversion_rate >= 3) as good_products,
  MAX(created_at) as last_analysis_at
FROM cro_analysis_cache
WHERE expires_at > NOW();
