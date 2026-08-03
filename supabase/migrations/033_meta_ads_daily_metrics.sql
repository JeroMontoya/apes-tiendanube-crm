-- 033_meta_ads_daily_metrics.sql
-- Meta Ads Insights diarios por anuncio (nivel ad)
-- Depende de: 009_system_config.sql (META_ACCESS_TOKEN, META_AD_ACCOUNT_ID)
--             015_server_cache.sql (server_cache.meta_insights)
--             032_rfm_abandoned_checkouts.sql (rfm_segments para cruce posterior)

-- ============================================================
-- 1. META ADS DAILY METRICS
-- Granularidad: un row por (date, ad_id)
-- Fuente: Meta Marketing API /insights?level=ad&time_increment=1
-- ============================================================
CREATE TABLE IF NOT EXISTS meta_ads_daily_metrics (
  id                BIGSERIAL PRIMARY KEY,
  date              DATE NOT NULL,
  campaign_id       TEXT NOT NULL,
  campaign_name     TEXT,
  campaign_objective TEXT,
  adset_id          TEXT NOT NULL,
  adset_name        TEXT,
  ad_id             TEXT NOT NULL,
  ad_name           TEXT,
  spend             NUMERIC(12,2) DEFAULT 0,
  impressions       BIGINT DEFAULT 0,
  reach             BIGINT DEFAULT 0,
  frequency         NUMERIC(6,2) GENERATED ALWAYS AS (
                        CASE WHEN reach > 0 THEN ROUND(impressions::NUMERIC / reach, 2) ELSE 0 END
                      ) STORED,
  clicks            BIGINT DEFAULT 0,
  ctr               NUMERIC(6,4) DEFAULT 0,
  cpc               NUMERIC(10,2) DEFAULT 0,
  meta_purchases    INT DEFAULT 0,
  meta_purchase_value NUMERIC(12,2) DEFAULT 0,
  synced_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (date, ad_id)
);

CREATE INDEX IF NOT EXISTS idx_madm_date ON meta_ads_daily_metrics(date);
CREATE INDEX IF NOT EXISTS idx_madm_campaign ON meta_ads_daily_metrics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_madm_adset ON meta_ads_daily_metrics(adset_id);
CREATE INDEX IF NOT EXISTS idx_madm_ad ON meta_ads_daily_metrics(ad_id);

ALTER TABLE meta_ads_daily_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "madm_service_write" ON meta_ads_daily_metrics FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Vista para agregación diaria por campaña (útil para dashboards rápidos)
CREATE OR REPLACE VIEW v_meta_campaign_daily AS
SELECT
  date,
  campaign_id,
  campaign_name,
  campaign_objective,
  COUNT(DISTINCT adset_id) AS adsets_active,
  COUNT(DISTINCT ad_id) AS ads_active,
  SUM(spend) AS total_spend,
  SUM(impressions) AS total_impressions,
  SUM(clicks) AS total_clicks,
  CASE WHEN SUM(impressions) > 0
    THEN ROUND(SUM(clicks)::NUMERIC / SUM(impressions), 4) ELSE 0 END AS ctr,
  CASE WHEN SUM(clicks) > 0
    THEN ROUND(SUM(spend) / SUM(clicks), 2) ELSE 0 END AS cpc,
  SUM(meta_purchases) AS total_purchases,
  SUM(meta_purchase_value) AS total_purchase_value,
  CASE WHEN SUM(meta_purchase_value) > 0
    THEN ROUND(SUM(meta_purchase_value) / NULLIF(SUM(spend), 0), 2) ELSE 0 END AS roas,
  CASE WHEN SUM(meta_purchases) > 0
    THEN ROUND(SUM(spend) / SUM(meta_purchases), 2) ELSE 0 END AS cpa
FROM meta_ads_daily_metrics
GROUP BY date, campaign_id, campaign_name, campaign_objective;

-- Vista para totales diarios (visión general)
CREATE OR REPLACE VIEW v_meta_daily_summary AS
SELECT
  date,
  SUM(spend) AS total_spend,
  SUM(impressions) AS total_impressions,
  SUM(clicks) AS total_clicks,
  SUM(meta_purchases) AS total_purchases,
  SUM(meta_purchase_value) AS total_purchase_value,
  COUNT(DISTINCT campaign_id) AS campaigns_active,
  COUNT(DISTINCT adset_id) AS adsets_active,
  COUNT(DISTINCT ad_id) AS ads_active
FROM meta_ads_daily_metrics
GROUP BY date
ORDER BY date DESC;

-- ============================================================
-- 2. RPC: fn_upsert_meta_ads_daily — upsert por lote
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_upsert_meta_ads_daily(
  p_rows JSONB
)
RETURNS SETOF meta_ads_daily_metrics
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r JSONB;
BEGIN
  FOR r IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    RETURN QUERY
    INSERT INTO meta_ads_daily_metrics (
      date, campaign_id, campaign_name, campaign_objective,
      adset_id, adset_name, ad_id, ad_name,
      spend, impressions, reach, clicks, ctr, cpc,
      meta_purchases, meta_purchase_value
    ) VALUES (
      (r->>'date')::DATE,
      r->>'campaign_id',
      r->>'campaign_name',
      r->>'campaign_objective',
      r->>'adset_id',
      r->>'adset_name',
      r->>'ad_id',
      r->>'ad_name',
      COALESCE((r->>'spend')::NUMERIC, 0),
      COALESCE((r->>'impressions')::BIGINT, 0),
      COALESCE((r->>'reach')::BIGINT, 0),
      COALESCE((r->>'clicks')::BIGINT, 0),
      COALESCE((r->>'ctr')::NUMERIC, 0),
      COALESCE((r->>'cpc')::NUMERIC, 0),
      COALESCE((r->>'meta_purchases')::INT, 0),
      COALESCE((r->>'meta_purchase_value')::NUMERIC, 0)
    )
    ON CONFLICT (date, ad_id) DO UPDATE SET
      campaign_name       = EXCLUDED.campaign_name,
      campaign_objective  = EXCLUDED.campaign_objective,
      adset_name          = EXCLUDED.adset_name,
      ad_name             = EXCLUDED.ad_name,
      spend               = EXCLUDED.spend,
      impressions         = EXCLUDED.impressions,
      reach               = EXCLUDED.reach,
      clicks              = EXCLUDED.clicks,
      ctr                 = EXCLUDED.ctr,
      cpc                 = EXCLUDED.cpc,
      meta_purchases      = EXCLUDED.meta_purchases,
      meta_purchase_value = EXCLUDED.meta_purchase_value,
      synced_at           = NOW()
    RETURNING *;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_upsert_meta_ads_daily TO service_role;
