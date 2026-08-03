-- 034_order_attribution.sql
-- Captura de atribución (fbclid / UTM) asociada a órdenes de Tiendanube
-- Depende de: 022_tiendanube_idempotency.sql (tiendanube_orders, raw_payload)

-- ============================================================
-- 1. tiendanube_orders.attribution
-- Datos estructurados de atribución extraídos del payload del webhook:
--   { fbclid, gclid, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
--     referrer, session_id, captured_at }
-- Fuente: campo "note" prefijado con [apes] o lista "attributes" de la orden
-- ============================================================
ALTER TABLE tiendanube_orders
  ADD COLUMN IF NOT EXISTS attribution JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_tno_attr_fbclid
  ON tiendanube_orders ((attribution->>'fbclid'))
  WHERE attribution ? 'fbclid';

CREATE INDEX IF NOT EXISTS idx_tno_attr_utm_source
  ON tiendanube_orders ((attribution->>'utm_source'))
  WHERE attribution ? 'utm_source';

-- ============================================================
-- 2. tracking_sessions
-- El script del storefront captura UTM/fbclid al landing y hace beacon
-- con un session_id de primera parte. Sirve como respaldo si la inyección
-- al checkout de Tiendanube falla (los campos no llegan a la orden).
-- ============================================================
CREATE TABLE IF NOT EXISTS tracking_sessions (
  session_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attribution   JSONB NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at  TIMESTAMPTZ DEFAULT NOW(),
  ip_hash       TEXT,
  user_agent    TEXT
);

CREATE INDEX IF NOT EXISTS idx_tracking_seen ON tracking_sessions(last_seen_at DESC);

ALTER TABLE tracking_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tracking_service_write" ON tracking_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 3. RPC: fn_upsert_tracking_session — beacon del storefront
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_upsert_tracking_session(
  p_session_id UUID,
  p_attribution JSONB
)
RETURNS tracking_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row tracking_sessions;
BEGIN
  INSERT INTO tracking_sessions (session_id, attribution, last_seen_at)
  VALUES (p_session_id, p_attribution, NOW())
  ON CONFLICT (session_id) DO UPDATE SET
    attribution = EXCLUDED.attribution,
    last_seen_at = NOW()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_upsert_tracking_session TO service_role;

-- ============================================================
-- 4. Vista de cruce por sesión (para debug y reconciliación futura)
-- ============================================================
CREATE OR REPLACE VIEW v_order_attribution AS
SELECT
  o.tiendanube_order_id,
  o.order_number,
  o.created_at,
  o.customer_email,
  o.total,
  o.attribution->>'fbclid'       AS fbclid,
  o.attribution->>'utm_source'   AS utm_source,
  o.attribution->>'utm_medium'   AS utm_medium,
  o.attribution->>'utm_campaign' AS utm_campaign,
  o.attribution->>'utm_content'  AS utm_content,
  o.attribution->>'session_id'   AS session_id,
  o.attribution->>'captured_at'  AS captured_at
FROM tiendanube_orders o
WHERE o.attribution != '{}'::jsonb;
