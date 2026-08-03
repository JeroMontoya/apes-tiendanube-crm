-- 032_rfm_abandoned_checkouts.sql
-- RFM Classification + Abandoned Checkout Polling + Webhook Processing Queue
-- Depende de: 022_tiendanube_idempotency.sql, 025_whatsapp_capi.sql

-- ============================================================
-- 1. WEBHOOK PROCESSING QUEUE
-- Permite al webhook ack rápido (200 OK) y procesar en background
-- ============================================================
CREATE TABLE IF NOT EXISTS webhook_processing_queue (
  id              BIGSERIAL PRIMARY KEY,
  event_key       TEXT UNIQUE NOT NULL,
  event_type      TEXT NOT NULL,
  payload         JSONB NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  attempts        INTEGER NOT NULL DEFAULT 0,
  max_attempts    INTEGER NOT NULL DEFAULT 3,
  last_error      TEXT,
  locked_at       TIMESTAMPTZ,
  locked_by       TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  processed_at    TIMESTAMPTZ,
  failed_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_wpq_status ON webhook_processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_wpq_created ON webhook_processing_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_wpq_locked ON webhook_processing_queue(locked_at) WHERE locked_at IS NOT NULL;

ALTER TABLE webhook_processing_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wpq_service_write" ON webhook_processing_queue FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT ALL ON webhook_processing_queue TO service_role;

-- ============================================================
-- 2. RFM SEGMENTS — Clasificación Alfa/VIP/Riesgo
-- Segmentos (evaluados en este orden, primera coincidencia):
--   alfa:            R≥4 ∧ F≥4 ∧ M≥4          (top 5%, mejores clientes)
--   vip:             F≥4 ∧ M≥4                (alto gasto + frecuencia)
--                    ∨ R≥4 ∧ F≥3 ∧ M≥3        (reciente + frecuente + buen gasto)
--   riesgo_churn:    R≤2 ∧ (F≥3 ∨ M≥3)        (antes compraban, ya no)
--   nuevo:           R≥4 ∧ F=1                (primera compra reciente)
--   nuevo_recurrente: R≥4 ∧ F=2               (segunda compra reciente)
--   promesa:         F≥3 ∧ M≤2                (frecuente pero bajo ticket)
--   fiel:            F≥3                      (consistentes, no califican arriba)
--   dormido:         R=1 ∧ F=1                (una compra hace mucho)
--   regular:         ELSE                     (catch-all obligatorio)
-- ============================================================
CREATE TABLE IF NOT EXISTS rfm_segments (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tiendanube_customer_id BIGINT NOT NULL UNIQUE,
  customer_email    TEXT DEFAULT '',
  customer_name     TEXT DEFAULT '',
  customer_phone    TEXT DEFAULT '',

  -- Raw RFM values
  recency_days      INTEGER,        -- Días desde última compra
  frequency         INTEGER,        -- Cantidad de órdenes
  monetary          NUMERIC,        -- Gasto total

  -- RFM scores 1-5 (percentiles)
  r_score           INTEGER CHECK (r_score BETWEEN 1 AND 5),
  f_score           INTEGER CHECK (f_score BETWEEN 1 AND 5),
  m_score           INTEGER CHECK (m_score BETWEEN 1 AND 5),
  rfm_total         INTEGER GENERATED ALWAYS AS (r_score + f_score + m_score) STORED,

  -- Business segment
  segment           TEXT NOT NULL DEFAULT 'regular',
  segment_reason    TEXT DEFAULT '',

  -- Metadatos
  calculated_at     TIMESTAMPTZ DEFAULT NOW(),
  last_order_at     TIMESTAMPTZ,
  first_order_at    TIMESTAMPTZ,
  avg_order_value   NUMERIC DEFAULT 0,

  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rfm_segment ON rfm_segments(segment);
CREATE INDEX IF NOT EXISTS idx_rfm_rfm_total ON rfm_segments(rfm_total DESC);
CREATE INDEX IF NOT EXISTS idx_rfm_monetary ON rfm_segments(monetary DESC);
CREATE INDEX IF NOT EXISTS idx_rfm_calculated ON rfm_segments(calculated_at DESC);

ALTER TABLE rfm_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rfm_select" ON rfm_segments FOR SELECT TO authenticated USING (true);
CREATE POLICY "rfm_service_write" ON rfm_segments FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT SELECT ON rfm_segments TO authenticated;
GRANT ALL ON rfm_segments TO service_role;

-- ============================================================
-- 3. ABANDONED CHECKOUTS — Cache de checkouts abandonados (polling)
-- ============================================================
CREATE TABLE IF NOT EXISTS abandoned_checkouts (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tn_abandoned_checkout_id BIGINT NOT NULL UNIQUE,
  tn_store_id           INTEGER,

  -- Customer info
  customer_email        TEXT DEFAULT '',
  customer_name         TEXT DEFAULT '',
  customer_phone        TEXT DEFAULT '',
  customer_document     TEXT DEFAULT '',

  -- Cart
  cart_total            NUMERIC DEFAULT 0,
  currency              TEXT DEFAULT 'COP',
  product_names         TEXT DEFAULT '',
  line_items            JSONB DEFAULT '[]'::jsonb,
  checkout_url          TEXT DEFAULT '',

  -- Status tracking
  recovered             BOOLEAN DEFAULT false,
  recovered_order_id    BIGINT,
  notified              BOOLEAN DEFAULT false,
  notified_at           TIMESTAMPTZ,
  whatsapp_sent         BOOLEAN DEFAULT false,

  -- Sync
  first_detected_at     TIMESTAMPTZ DEFAULT NOW(),
  abandoned_at          TIMESTAMPTZ,
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ac_email ON abandoned_checkouts(customer_email);
CREATE INDEX IF NOT EXISTS idx_ac_recovered ON abandoned_checkouts(recovered);
CREATE INDEX IF NOT EXISTS idx_ac_notified ON abandoned_checkouts(notified);
CREATE INDEX IF NOT EXISTS idx_ac_abandoned ON abandoned_checkouts(abandoned_at);

ALTER TABLE abandoned_checkouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ac_select" ON abandoned_checkouts FOR SELECT TO authenticated USING (true);
CREATE POLICY "ac_service_write" ON abandoned_checkouts FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT SELECT ON abandoned_checkouts TO authenticated;
GRANT ALL ON abandoned_checkouts TO service_role;

-- ============================================================
-- 4. META CUSTOM AUDIENCES — Log de uploads a Custom Audiences
-- ============================================================
CREATE TABLE IF NOT EXISTS meta_custom_audience_syncs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  audience_name   TEXT NOT NULL,
  audience_id     TEXT,
  segment_filter  TEXT NOT NULL,       -- ej: 'vip', 'riesgo_churn', 'alfa'
  user_count      INTEGER DEFAULT 0,
  hashes_sent     INTEGER DEFAULT 0,
  status          TEXT DEFAULT 'pending',
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

ALTER TABLE meta_custom_audience_syncs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mcas_select" ON meta_custom_audience_syncs FOR SELECT TO authenticated USING (true);
CREATE POLICY "mcas_service_write" ON meta_custom_audience_syncs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 5. VIEW: v_rfm_summary — Dashboard de segmentos
-- ============================================================
CREATE OR REPLACE VIEW public.v_rfm_summary AS
SELECT
  segment,
  COUNT(*) AS customer_count,
  SUM(monetary) AS total_value,
  AVG(monetary) AS avg_value,
  AVG(recency_days) AS avg_recency,
  AVG(frequency) AS avg_frequency,
  AVG(avg_order_value) AS avg_order_value
FROM rfm_segments
GROUP BY segment
ORDER BY SUM(monetary) DESC NULLS LAST;

-- ============================================================
-- 6. RPC: fn_calculate_rfm — Recalcula RFM para todos los clientes
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_calculate_rfm()
RETURNS TABLE (
  customer_id BIGINT,
  segment     TEXT,
  r_score     INTEGER,
  f_score     INTEGER,
  m_score     INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now DATE := CURRENT_DATE;
  v_r_breaks INTEGER[] := '{30, 60, 90, 180, 365}';
  v_f_breaks INTEGER[] := '{1, 2, 3, 5, 10}';
  v_m_breaks  NUMERIC[];
  v_avg_m     NUMERIC;
BEGIN
  -- Get monetary percentiles for scoring
  SELECT PERCENTILE_CONT(0.2) WITHIN GROUP (ORDER BY total_spent),
         PERCENTILE_CONT(0.4) WITHIN GROUP (ORDER BY total_spent),
         PERCENTILE_CONT(0.6) WITHIN GROUP (ORDER BY total_spent),
         PERCENTILE_CONT(0.8) WITHIN GROUP (ORDER BY total_spent)
  INTO v_m_breaks[1], v_m_breaks[2], v_m_breaks[3], v_m_breaks[4]
  FROM tiendanube_clients
  WHERE orders_count > 0 AND total_spent > 0;

  RETURN QUERY
  WITH rfm_raw AS (
    SELECT
      c.tiendanube_customer_id,
      c.email,
      c.name,
      c.phone,
      c.total_spent,
      c.orders_count,
      c.last_order_at,
      c.first_order_at,
      COALESCE(EXTRACT(DAY FROM (v_now - c.last_order_at::DATE)), 999) AS recency_days,
      c.total_spent / NULLIF(c.orders_count, 0) AS avg_order_value
    FROM tiendanube_clients c
    WHERE c.orders_count > 0
  ),
  rfm_scored AS (
    SELECT
      tiendanube_customer_id,
      email,
      name,
      phone,
      total_spent AS monetary,
      orders_count AS frequency,
      recency_days,
      avg_order_value,
      last_order_at,
      first_order_at,
      -- R score: more recent = higher score
      CASE
        WHEN recency_days <= 30 THEN 5
        WHEN recency_days <= 60 THEN 4
        WHEN recency_days <= 90 THEN 3
        WHEN recency_days <= 180 THEN 2
        ELSE 1
      END AS r_score,
      -- F score: more orders = higher score
      CASE
        WHEN orders_count >= 10 THEN 5
        WHEN orders_count >= 5 THEN 4
        WHEN orders_count >= 3 THEN 3
        WHEN orders_count >= 2 THEN 2
        ELSE 1
      END AS f_score,
      -- M score: more spent = higher score
      CASE
        WHEN v_m_breaks[4] IS NOT NULL AND total_spent >= v_m_breaks[4] THEN 5
        WHEN v_m_breaks[3] IS NOT NULL AND total_spent >= v_m_breaks[3] THEN 4
        WHEN v_m_breaks[2] IS NOT NULL AND total_spent >= v_m_breaks[2] THEN 3
        WHEN v_m_breaks[1] IS NOT NULL AND total_spent >= v_m_breaks[1] THEN 2
        ELSE 1
      END AS m_score
    FROM rfm_raw
  ),
  rfm_segmented AS (
    SELECT *,
      (r_score + f_score + m_score) AS rfm_total,
      CASE
        -- ALFA: Top 5% — más recientes, más frecuentes, más gasto
        WHEN r_score >= 4 AND f_score >= 4 AND m_score >= 4 THEN 'alfa'
        -- VIP: Frecuentes y de alto gasto (excluye Alfa que ya matcheó arriba)
        WHEN f_score >= 4 AND m_score >= 4 THEN 'vip'
        WHEN r_score >= 4 AND f_score >= 3 AND m_score >= 3 THEN 'vip'
        -- RIESGO: Solían comprar pero no vuelven
        WHEN r_score <= 2 AND f_score >= 3 THEN 'riesgo_churn'
        WHEN r_score <= 2 AND m_score >= 3 THEN 'riesgo_churn'
        -- NUEVO: Primera compra reciente
        WHEN r_score >= 4 AND f_score = 1 THEN 'nuevo'
        -- NUEVO_RECURRENTE: Segunda compra reciente (gap entre Nuevo y Promesa)
        WHEN r_score >= 4 AND f_score = 2 THEN 'nuevo_recurrente'
        -- PROMESA: Buena frecuencia pero bajo ticket
        WHEN f_score >= 3 AND m_score <= 2 THEN 'promesa'
        -- FIEL: 3+ compras, ticket medio-alto (no es VIP pero consistentes)
        WHEN f_score >= 3 THEN 'fiel'
        -- DORMIDO: Una compra hace mucho
        WHEN r_score = 1 AND f_score = 1 THEN 'dormido'
        -- REGULAR: Todo lo demás (catch-all obligatorio)
        ELSE 'regular'
      END AS segment
    FROM rfm_scored
  )
  INSERT INTO rfm_segments (
    tiendanube_customer_id, customer_email, customer_name, customer_phone,
    recency_days, frequency, monetary,
    r_score, f_score, m_score,
    segment, segment_reason,
    calculated_at, last_order_at, first_order_at, avg_order_value
  )
  SELECT
    tiendanube_customer_id, email, name, phone,
    recency_days, frequency, monetary,
    r_score, f_score, m_score,
    segment,
    CASE segment
      WHEN 'alfa' THEN 'Top 5%: reciente + frecuente + alto gasto'
      WHEN 'vip' THEN 'Alto valor: frecuente o alto gasto'
      WHEN 'riesgo_churn' THEN 'Alto riesgo: solía comprar, no vuelve'
      WHEN 'dormido' THEN 'Inactivo: una compra hace mucho'
      WHEN 'nuevo' THEN 'Primera compra reciente'
      WHEN 'nuevo_recurrente' THEN 'Segunda compra reciente, enganchando'
      WHEN 'promesa' THEN 'Buena frecuencia, bajo ticket'
      WHEN 'fiel' THEN 'Consistente: 3+ compras, ticket medio-alto'
      ELSE 'Regular: perfil de compra estándar'
    END,
    NOW(), last_order_at, first_order_at, avg_order_value
  FROM rfm_segmented
  ON CONFLICT (tiendanube_customer_id)
  DO UPDATE SET
    customer_email = EXCLUDED.customer_email,
    customer_name = EXCLUDED.customer_name,
    customer_phone = EXCLUDED.customer_phone,
    recency_days = EXCLUDED.recency_days,
    frequency = EXCLUDED.frequency,
    monetary = EXCLUDED.monetary,
    r_score = EXCLUDED.r_score,
    f_score = EXCLUDED.f_score,
    m_score = EXCLUDED.m_score,
    segment = EXCLUDED.segment,
    segment_reason = EXCLUDED.segment_reason,
    calculated_at = NOW(),
    last_order_at = EXCLUDED.last_order_at,
    first_order_at = EXCLUDED.first_order_at,
    avg_order_value = EXCLUDED.avg_order_value,
    updated_at = NOW()
  RETURNING tiendanube_customer_id, segment, r_score, f_score, m_score;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_calculate_rfm TO service_role;

-- ============================================================
-- 7. RPC: fn_calculate_rfm_for_customer — RFM incremental
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_calculate_rfm_for_customer(
  p_tn_customer_id BIGINT
)
RETURNS TABLE (
  segment TEXT,
  r_score INTEGER,
  f_score INTEGER,
  m_score INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now DATE := CURRENT_DATE;
  v_m_breaks NUMERIC[];
BEGIN
  SELECT PERCENTILE_CONT(0.2) WITHIN GROUP (ORDER BY total_spent),
         PERCENTILE_CONT(0.4) WITHIN GROUP (ORDER BY total_spent),
         PERCENTILE_CONT(0.6) WITHIN GROUP (ORDER BY total_spent),
         PERCENTILE_CONT(0.8) WITHIN GROUP (ORDER BY total_spent)
  INTO v_m_breaks[1], v_m_breaks[2], v_m_breaks[3], v_m_breaks[4]
  FROM tiendanube_clients
  WHERE orders_count > 0 AND total_spent > 0;

  RETURN QUERY
  WITH customer_data AS (
    SELECT
      tiendanube_customer_id, email, name, phone,
      total_spent, orders_count, last_order_at, first_order_at,
      COALESCE(EXTRACT(DAY FROM (v_now - last_order_at::DATE)), 999) AS recency_days,
      total_spent / NULLIF(orders_count, 0) AS avg_order_value
    FROM tiendanube_clients
    WHERE tiendanube_customer_id = p_tn_customer_id
  ),
  scored AS (
    SELECT *,
      CASE
        WHEN recency_days <= 30 THEN 5
        WHEN recency_days <= 60 THEN 4
        WHEN recency_days <= 90 THEN 3
        WHEN recency_days <= 180 THEN 2
        ELSE 1
      END AS r_score,
      CASE
        WHEN orders_count >= 10 THEN 5
        WHEN orders_count >= 5 THEN 4
        WHEN orders_count >= 3 THEN 3
        WHEN orders_count >= 2 THEN 2
        ELSE 1
      END AS f_score,
      CASE
        WHEN v_m_breaks[4] IS NOT NULL AND total_spent >= v_m_breaks[4] THEN 5
        WHEN v_m_breaks[3] IS NOT NULL AND total_spent >= v_m_breaks[3] THEN 4
        WHEN v_m_breaks[2] IS NOT NULL AND total_spent >= v_m_breaks[2] THEN 3
        WHEN v_m_breaks[1] IS NOT NULL AND total_spent >= v_m_breaks[1] THEN 2
        ELSE 1
      END AS m_score
    FROM customer_data
  )
  INSERT INTO rfm_segments (
    tiendanube_customer_id, customer_email, customer_name, customer_phone,
    recency_days, frequency, monetary,
    r_score, f_score, m_score,
    segment, segment_reason,
    calculated_at, last_order_at, first_order_at, avg_order_value
  )
  SELECT
    tiendanube_customer_id, email, name, phone,
    recency_days, orders_count, total_spent,
    r_score, f_score, m_score,
    CASE
      WHEN r_score >= 4 AND f_score >= 4 AND m_score >= 4 THEN 'alfa'
      WHEN f_score >= 4 AND m_score >= 4 THEN 'vip'
      WHEN r_score >= 4 AND f_score >= 3 AND m_score >= 3 THEN 'vip'
      WHEN r_score <= 2 AND f_score >= 3 THEN 'riesgo_churn'
      WHEN r_score <= 2 AND m_score >= 3 THEN 'riesgo_churn'
      WHEN r_score >= 4 AND f_score = 1 THEN 'nuevo'
      WHEN r_score >= 4 AND f_score = 2 THEN 'nuevo_recurrente'
      WHEN f_score >= 3 AND m_score <= 2 THEN 'promesa'
      WHEN f_score >= 3 THEN 'fiel'
      WHEN r_score = 1 AND f_score = 1 THEN 'dormido'
      ELSE 'regular'
    END,
    CASE
      WHEN r_score >= 4 AND f_score >= 4 AND m_score >= 4 THEN 'Alfa: top performer'
      WHEN f_score >= 4 AND m_score >= 4 THEN 'VIP: high spender'
      WHEN r_score >= 4 AND f_score = 2 THEN 'Nuevo recurrente: segunda compra'
      WHEN r_score >= 4 AND f_score = 1 THEN 'Nuevo: primera compra reciente'
      WHEN f_score >= 3 AND m_score <= 2 THEN 'Promesa: frecuente, bajo ticket'
      WHEN f_score >= 3 THEN 'Fiel: compras consistentes'
      WHEN r_score = 1 AND f_score = 1 THEN 'Dormido: una compra hace mucho'
      ELSE 'Regular: perfil estándar'
    END,
    NOW(), last_order_at, first_order_at, avg_order_value
  FROM scored
  ON CONFLICT (tiendanube_customer_id)
  DO UPDATE SET
    recency_days = EXCLUDED.recency_days,
    frequency = EXCLUDED.frequency,
    monetary = EXCLUDED.monetary,
    r_score = EXCLUDED.r_score,
    f_score = EXCLUDED.f_score,
    m_score = EXCLUDED.m_score,
    segment = EXCLUDED.segment,
    segment_reason = EXCLUDED.segment_reason,
    calculated_at = NOW(),
    last_order_at = EXCLUDED.last_order_at,
    first_order_at = EXCLUDED.first_order_at,
    avg_order_value = EXCLUDED.avg_order_value,
    updated_at = NOW()
  RETURNING segment, r_score, f_score, m_score;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_calculate_rfm_for_customer TO service_role;

-- ============================================================
-- 8. RPC: fn_claim_webhook_queue_items — Atomic claim for queue
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_claim_webhook_queue_items(
  p_batch_size INTEGER,
  p_locked_by TEXT,
  p_lock_expires TIMESTAMPTZ
)
RETURNS TABLE (
  id BIGINT,
  event_key TEXT,
  event_type TEXT,
  payload JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH claimed AS (
    SELECT q.id, q.event_key, q.event_type, q.payload
    FROM webhook_processing_queue q
    WHERE q.status = 'pending'
      AND (q.locked_at IS NULL OR q.locked_at < NOW() - INTERVAL '10 minutes')
    ORDER BY q.created_at ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  UPDATE webhook_processing_queue q
  SET
    status = 'processing',
    locked_at = p_lock_expires,
    locked_by = p_locked_by
  FROM claimed
  WHERE q.id = claimed.id
  RETURNING
    q.id,
    q.event_key,
    q.event_type,
    q.payload;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_claim_webhook_queue_items TO service_role;

-- ============================================================
-- 9. WhatsApp idempotency — evitar duplicados de post-purchase
-- ============================================================
ALTER TABLE whatsapp_messages_log
  ADD CONSTRAINT uq_whatsapp_order_category
  UNIQUE (order_number, category);
