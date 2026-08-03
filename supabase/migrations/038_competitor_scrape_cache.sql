-- Migration 038: Competitor scrape cache for Firecrawl data
-- Stores scraped competitor product/pricing/messaging data

CREATE TABLE IF NOT EXISTS competitor_scrape_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competitor TEXT NOT NULL, -- topara, qulybet, laskabran, columbia
    url TEXT NOT NULL,
    data JSONB NOT NULL, -- Firecrawl extracted data
    scraped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique index for upsert by competitor
CREATE UNIQUE INDEX IF NOT EXISTS idx_competitor_scrape_cache_competitor 
    ON competitor_scrape_cache (competitor);

-- Enable RLS
ALTER TABLE competitor_scrape_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Allow read for authenticated users in same workspace
CREATE POLICY "competitor_scrape_cache_read" ON competitor_scrape_cache
    FOR SELECT USING (true); -- Global read for now

-- Policy: Service role can insert/update
CREATE POLICY "competitor_scrape_cache_write" ON competitor_scrape_cache
    FOR ALL USING (auth.role() = 'service_role');

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_competitor_scrape_cache_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Updated_at trigger
CREATE TRIGGER trg_competitor_scrape_cache_updated_at
    BEFORE UPDATE ON competitor_scrape_cache
    FOR EACH ROW EXECUTE FUNCTION update_competitor_scrape_cache_updated_at();

-- Comment
COMMENT ON TABLE competitor_scrape_cache IS 'Cache de datos scrapeados de competidores via Firecrawl';
COMMENT ON COLUMN competitor_scrape_cache.competitor IS 'Identificador del competidor (topara, qulybet, laskabran, columbia)';
COMMENT ON COLUMN competitor_scrape_cache.data IS 'Datos extraidos por Firecrawl: productos, precios, messaging, CTAs, etc.';