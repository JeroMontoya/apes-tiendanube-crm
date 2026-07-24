-- Unified Marketing Metrics for ONYX Marketing Center
-- Centralizes Tiendanube, GSC, GA4, Instagram metrics

BEGIN;

-- 1. Main metrics snapshot table
CREATE TABLE IF NOT EXISTS public.marketing_metrics_snapshot (
    id BIGSERIAL PRIMARY KEY,
    platform VARCHAR(50) NOT NULL,
    metric_key VARCHAR(100) NOT NULL,
    metric_value NUMERIC(15, 4) NOT NULL DEFAULT 0,
    previous_period_value NUMERIC(15, 4) DEFAULT 0,
    recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_platform_date ON public.marketing_metrics_snapshot(platform, recorded_date);
CREATE INDEX IF NOT EXISTS idx_marketing_metric_key ON public.marketing_metrics_snapshot(metric_key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_marketing_unique_snapshot ON public.marketing_metrics_snapshot(platform, metric_key, recorded_date);

-- 2. Daily sync log
CREATE TABLE IF NOT EXISTS public.marketing_sync_log (
    id BIGSERIAL PRIMARY KEY,
    platform VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    records_synced INT DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 3. View: Latest metrics per platform/key
CREATE OR REPLACE VIEW v_marketing_latest AS
SELECT DISTINCT ON (platform, metric_key)
    platform,
    metric_key,
    metric_value,
    previous_period_value,
    recorded_date,
    CASE
        WHEN previous_period_value > 0 THEN ROUND(((metric_value - previous_period_value) / previous_period_value * 100)::numeric, 1)
        ELSE 0
    END AS delta_pct,
    metadata,
    created_at
FROM marketing_metrics_snapshot
ORDER BY platform, metric_key, recorded_date DESC;

-- 4. View: Platform summary
CREATE OR REPLACE VIEW v_marketing_platform_summary AS
SELECT
    platform,
    COUNT(DISTINCT metric_key) AS metric_count,
    MAX(recorded_date) AS last_sync_date,
    MAX(created_at) AS last_updated
FROM marketing_metrics_snapshot
GROUP BY platform;

-- 5. RPC: Upsert a metric snapshot
CREATE OR REPLACE FUNCTION fn_upsert_marketing_metric(
    p_platform VARCHAR,
    p_metric_key VARCHAR,
    p_metric_value NUMERIC,
    p_previous_period_value NUMERIC DEFAULT 0,
    p_recorded_date DATE DEFAULT CURRENT_DATE,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS BIGINT AS $$
DECLARE
    result_id BIGINT;
BEGIN
    INSERT INTO marketing_metrics_snapshot (platform, metric_key, metric_value, previous_period_value, recorded_date, metadata)
    VALUES (p_platform, p_metric_key, p_metric_value, p_previous_period_value, p_recorded_date, p_metadata)
    ON CONFLICT (platform, metric_key, recorded_date)
    DO UPDATE SET
        metric_value = EXCLUDED.metric_value,
        previous_period_value = EXCLUDED.previous_period_value,
        metadata = EXCLUDED.metadata,
        created_at = NOW()
    RETURNING id INTO result_id;

    RETURN result_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC: Bulk upsert metrics (JSON array)
CREATE OR REPLACE FUNCTION fn_upsert_marketing_bulk(p_metrics JSONB)
RETURNS INT AS $$
DECLARE
    item JSONB;
    inserted INT := 0;
BEGIN
    FOR item IN SELECT * FROM jsonb_array_elements(p_metrics)
    LOOP
        INSERT INTO marketing_metrics_snapshot (platform, metric_key, metric_value, previous_period_value, recorded_date, metadata)
        VALUES (
            item->>'platform',
            item->>'metric_key',
            (item->>'metric_value')::NUMERIC,
            COALESCE((item->>'previous_period_value')::NUMERIC, 0),
            COALESCE((item->>'recorded_date')::DATE, CURRENT_DATE),
            COALESCE(item->'metadata', '{}'::jsonb)
        )
        ON CONFLICT (platform, metric_key, recorded_date)
        DO UPDATE SET
            metric_value = EXCLUDED.metric_value,
            previous_period_value = EXCLUDED.previous_period_value,
            metadata = EXCLUDED.metadata,
            created_at = NOW();
        inserted := inserted + 1;
    END LOOP;

    RETURN inserted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
