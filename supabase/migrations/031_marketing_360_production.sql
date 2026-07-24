/**
 * @file 031_marketing_360_production.sql
 * @description Production schema: GSC Keywords, Merchant Center Feed, Competitor Benchmark, GA4 Events
 * @author ANTIGRAVITY / ONYX v21.0
 */

BEGIN;

-- 1. GSC Keywords Log (Search Console raw keyword data)
CREATE TABLE IF NOT EXISTS public.gsc_keywords_log (
    id BIGSERIAL PRIMARY KEY,
    query VARCHAR(255) NOT NULL,
    page_url TEXT,
    clicks INT DEFAULT 0,
    impressions INT DEFAULT 0,
    ctr NUMERIC(7, 4) DEFAULT 0.0000,
    position NUMERIC(5, 2) DEFAULT 0.00,
    recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
    CONSTRAINT unique_gsc_query_date UNIQUE (query, recorded_at)
);
CREATE INDEX IF NOT EXISTS idx_gsc_date ON public.gsc_keywords_log(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_clicks ON public.gsc_keywords_log(clicks DESC);

-- 2. Merchant Center Product Status
CREATE TABLE IF NOT EXISTS public.merchant_center_products (
    id BIGSERIAL PRIMARY KEY,
    product_id VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    link TEXT,
    image_link TEXT,
    availability VARCHAR(50) DEFAULT 'in stock',
    approval_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    click_potential VARCHAR(50) DEFAULT 'UNKNOWN',
    disapproval_reasons JSONB DEFAULT '[]'::jsonb,
    price_amount NUMERIC(12, 2),
    price_currency VARCHAR(10) DEFAULT 'COP',
    brand VARCHAR(200),
    gtin VARCHAR(100),
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_mc_product UNIQUE (product_id)
);
CREATE INDEX IF NOT EXISTS idx_mc_status ON public.merchant_center_products(approval_status);
CREATE INDEX IF NOT EXISTS idx_mc_sync ON public.merchant_center_products(last_synced_at DESC);

-- 3. Competitor Price Benchmark
CREATE TABLE IF NOT EXISTS public.competitor_price_benchmark (
    id BIGSERIAL PRIMARY KEY,
    apes_sku VARCHAR(50) NOT NULL,
    apes_product_name VARCHAR(500) NOT NULL,
    apes_price NUMERIC(12, 2) NOT NULL,
    competitor_name VARCHAR(200) NOT NULL,
    competitor_url TEXT,
    competitor_price NUMERIC(12, 2) NOT NULL,
    price_difference_pct NUMERIC(7, 2) NOT NULL,
    keyword_overlap JSONB DEFAULT '[]'::jsonb,
    serp_position INT,
    last_checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_benchmark_sku ON public.competitor_price_benchmark(apes_sku);
CREATE INDEX IF NOT EXISTS idx_benchmark_competitor ON public.competitor_price_benchmark(competitor_name);
CREATE INDEX IF NOT EXISTS idx_benchmark_checked ON public.competitor_price_benchmark(last_checked_at DESC);

-- 4. GA4 Events Log (high-value server-side events)
CREATE TABLE IF NOT EXISTS public.ga4_events_log (
    id BIGSERIAL PRIMARY KEY,
    event_name VARCHAR(100) NOT NULL,
    client_id VARCHAR(100),
    session_id VARCHAR(100),
    event_params JSONB DEFAULT '{}'::jsonb,
    user_properties JSONB DEFAULT '{}'::jsonb,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ga4_event ON public.ga4_events_log(event_name, recorded_at DESC);

-- 5. Competitor Domain Registry
CREATE TABLE IF NOT EXISTS public.competitor_registry (
    id BIGSERIAL PRIMARY KEY,
    domain VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100) DEFAULT 'streetwear',
    city VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    last_scraped_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. View: Latest GSC keywords
CREATE OR REPLACE VIEW v_gsc_latest_keywords AS
SELECT DISTINCT ON (query)
    query, clicks, impressions, ctr, position, recorded_at
FROM gsc_keywords_log
ORDER BY query, recorded_at DESC;

-- 7. View: Merchant Center health summary
CREATE OR REPLACE VIEW v_mc_health_summary AS
SELECT
    approval_status,
    COUNT(*) AS product_count,
    AVG(price_amount)::NUMERIC(12,2) AS avg_price,
    MAX(last_synced_at) AS last_sync
FROM merchant_center_products
GROUP BY approval_status;

-- 8. View: Benchmark competitiveness index per APES product
CREATE OR REPLACE VIEW v_benchmark_index AS
SELECT DISTINCT ON (apes_sku)
    apes_sku,
    apes_product_name,
    apes_price,
    competitor_name,
    competitor_price,
    price_difference_pct,
    CASE
        WHEN price_difference_pct < -10 THEN 'VERY_COMPETITIVE'
        WHEN price_difference_pct < 0 THEN 'COMPETITIVE'
        WHEN price_difference_pct = 0 THEN 'PARITY'
        WHEN price_difference_pct < 10 THEN 'BELOW_MARKET'
        ELSE 'ABOVE_MARKET'
    END AS competitiveness,
    last_checked_at
FROM competitor_price_benchmark
ORDER BY apes_sku, last_checked_at DESC;

-- 9. RPC: Bulk upsert GSC keywords
CREATE OR REPLACE FUNCTION fn_upsert_gsc_keywords(p_keywords JSONB)
RETURNS INT AS $$
DECLARE
    item JSONB;
    inserted INT := 0;
BEGIN
    FOR item IN SELECT * FROM jsonb_array_elements(p_keywords)
    LOOP
        INSERT INTO gsc_keywords_log (query, page_url, clicks, impressions, ctr, position, recorded_at)
        VALUES (
            item->>'query',
            item->>'page_url',
            COALESCE((item->>'clicks')::INT, 0),
            COALESCE((item->>'impressions')::INT, 0),
            COALESCE((item->>'ctr')::NUMERIC, 0),
            COALESCE((item->>'position')::NUMERIC, 0),
            COALESCE((item->>'recorded_at')::DATE, CURRENT_DATE)
        )
        ON CONFLICT (query, recorded_at)
        DO UPDATE SET
            clicks = EXCLUDED.clicks,
            impressions = EXCLUDED.impressions,
            ctr = EXCLUDED.ctr,
            position = EXCLUDED.position,
            page_url = EXCLUDED.page_url;
        inserted := inserted + 1;
    END LOOP;
    RETURN inserted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. RPC: Bulk upsert Merchant Center products
CREATE OR REPLACE FUNCTION fn_upsert_mc_products(p_products JSONB)
RETURNS INT AS $$
DECLARE
    item JSONB;
    inserted INT := 0;
BEGIN
    FOR item IN SELECT * FROM jsonb_array_elements(p_products)
    LOOP
        INSERT INTO merchant_center_products (product_id, title, link, image_link, availability, approval_status, click_potential, disapproval_reasons, price_amount, price_currency, brand, gtin)
        VALUES (
            item->>'product_id',
            item->>'title',
            item->>'link',
            item->>'image_link',
            COALESCE(item->>'availability', 'in stock'),
            COALESCE(item->>'approval_status', 'PENDING'),
            COALESCE(item->>'click_potential', 'UNKNOWN'),
            COALESCE(item->'disapproval_reasons', '[]'::jsonb),
            COALESCE((item->>'price_amount')::NUMERIC, 0),
            COALESCE(item->>'price_currency', 'COP'),
            item->>'brand',
            item->>'gtin'
        )
        ON CONFLICT (product_id)
        DO UPDATE SET
            title = EXCLUDED.title,
            link = EXCLUDED.link,
            image_link = EXCLUDED.image_link,
            availability = EXCLUDED.availability,
            approval_status = EXCLUDED.approval_status,
            click_potential = EXCLUDED.click_potential,
            disapproval_reasons = EXCLUDED.disapproval_reasons,
            price_amount = EXCLUDED.price_amount,
            brand = EXCLUDED.brand,
            last_synced_at = NOW();
        inserted := inserted + 1;
    END LOOP;
    RETURN inserted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. RPC: Bulk upsert competitor benchmarks
CREATE OR REPLACE FUNCTION fn_upsert_benchmarks(p_benchmarks JSONB)
RETURNS INT AS $$
DECLARE
    item JSONB;
    inserted INT := 0;
BEGIN
    FOR item IN SELECT * FROM jsonb_array_elements(p_benchmarks)
    LOOP
        INSERT INTO competitor_price_benchmark (apes_sku, apes_product_name, apes_price, competitor_name, competitor_url, competitor_price, price_difference_pct, keyword_overlap, serp_position)
        VALUES (
            item->>'apes_sku',
            item->>'apes_product_name',
            (item->>'apes_price')::NUMERIC,
            item->>'competitor_name',
            item->>'competitor_url',
            (item->>'competitor_price')::NUMERIC,
            (item->>'price_difference_pct')::NUMERIC,
            COALESCE(item->'keyword_overlap', '[]'::jsonb),
            COALESCE((item->>'serp_position')::INT, 0)
        );
        inserted := inserted + 1;
    END LOOP;
    RETURN inserted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Seed competitor domains for APES
INSERT INTO public.competitor_registry (domain, name, category, city) VALUES
    ('marcaworkout.com', 'Marca Workout', 'streetwear', 'Medellín'),
    ('shopamag.com', 'Shopamag', 'streetwear', 'Bogotá'),
    ('the-streetwear.co', 'The Streetwear Co', 'streetwear', 'Bogotá'),
    ('hypestore.com.co', 'HypeStore', 'streetwear', 'Medellín'),
    ('urbanstreet.co', 'Urban Street', 'streetwear', 'Cali')
ON CONFLICT (domain) DO NOTHING;

COMMIT;
