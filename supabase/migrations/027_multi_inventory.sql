-- 027_multi_inventory.sql
-- Multi-Warehouse Inventory: CAS Optimistic Control + TiendaNube Sync Queue
-- ONYX v15.0 — Industrial Software Architecture
-- Builds on top of 019_inventory_system.sql (inventory_locations, inventory_products, inventory_stock)

BEGIN;

-- ═════════════════════════════════════════════════════════════════════════════
-- 1. variant_stock — Per-variant stock across 3 locations with CAS version
-- ═════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS variant_stock (
  id              BIGSERIAL PRIMARY KEY,
  product_id      BIGINT NOT NULL,
  variant_id      BIGINT NOT NULL UNIQUE,
  sku             TEXT DEFAULT '',
  name            TEXT DEFAULT '',

  -- Stock per location (all >= 0 enforced by CHECK)
  stock_web       INT NOT NULL DEFAULT 0 CHECK (stock_web >= 0),
  stock_apes      INT NOT NULL DEFAULT 0 CHECK (stock_apes >= 0),
  stock_r5        INT NOT NULL DEFAULT 0 CHECK (stock_r5 >= 0),

  -- CAS Optimistic Locking: increments on every write
  version         INT NOT NULL DEFAULT 1,

  -- Idle detection: tracks last stock movement per location
  last_movement_web   TIMESTAMPTZ DEFAULT NOW(),
  last_movement_apes  TIMESTAMPTZ DEFAULT NOW(),
  last_movement_r5    TIMESTAMPTZ DEFAULT NOW(),

  -- TiendaNube mapping
  tn_product_id   BIGINT,
  tn_variant_id   BIGINT,

  -- Auto-sync config
  auto_sync_enabled BOOLEAN DEFAULT true,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vs_variant ON variant_stock(variant_id);
CREATE INDEX IF NOT EXISTS idx_vs_sku ON variant_stock(sku) WHERE sku != '';
CREATE INDEX IF NOT EXISTS idx_vs_tn ON variant_stock(tn_product_id, tn_variant_id) WHERE tn_product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vs_low_web ON variant_stock(stock_web) WHERE stock_web = 0 AND auto_sync_enabled = true;

-- ═════════════════════════════════════════════════════════════════════════════
-- 2. inventory_transfers — Full audit trail for every transfer
-- ═════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS inventory_transfers (
  id                  BIGSERIAL PRIMARY KEY,
  variant_id          BIGINT NOT NULL REFERENCES variant_stock(variant_id) ON DELETE CASCADE,
  source_location     TEXT NOT NULL CHECK (source_location IN ('stock_web', 'stock_apes', 'stock_r5')),
  destination_location TEXT NOT NULL CHECK (destination_location IN ('stock_web', 'stock_apes', 'stock_r5', 'merma')),
  quantity            INT NOT NULL CHECK (quantity > 0),

  -- Pre-transfer snapshot (for audit)
  source_before       INT NOT NULL,
  source_after        INT NOT NULL,
  dest_before         INT NOT NULL,
  dest_after          INT NOT NULL,

  -- CAS version at time of transfer
  version_before      INT NOT NULL,
  version_after       INT NOT NULL,

  reason              TEXT DEFAULT 'Traslado interno',
  performed_by        UUID,
  performed_by_name   TEXT DEFAULT '',

  -- TiendaNube sync status
  tn_synced           BOOLEAN DEFAULT false,
  tn_sync_at          TIMESTAMPTZ,
  tn_sync_error       TEXT,

  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_it_variant ON inventory_transfers(variant_id);
CREATE INDEX IF NOT EXISTS idx_it_date ON inventory_transfers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_it_performer ON inventory_transfers(performed_by);
CREATE INDEX IF NOT EXISTS idx_it_unsynced ON inventory_transfers(tn_synced) WHERE tn_synced = false;

-- ═════════════════════════════════════════════════════════════════════════════
-- 3. tiendanube_sync_queue — Async queue for TN API updates
-- ═════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS tiendanube_sync_queue (
  id              BIGSERIAL PRIMARY KEY,
  variant_id      BIGINT NOT NULL REFERENCES variant_stock(variant_id) ON DELETE CASCADE,
  tn_product_id   BIGINT NOT NULL,
  tn_variant_id   BIGINT NOT NULL,
  new_stock       INT NOT NULL,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts        INT DEFAULT 0,
  max_attempts    INT DEFAULT 3,
  last_error      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  processed_at    TIMESTAMPTZ,
  next_retry_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tsq_status ON tiendanube_sync_queue(status, next_retry_at) WHERE status IN ('pending', 'failed');
CREATE INDEX IF NOT EXISTS idx_tsq_variant ON tiendanube_sync_queue(variant_id);

-- ═════════════════════════════════════════════════════════════════════════════
-- 4. idle_stock_alerts — Auto-detect: web=0, local>0, 14+ days idle
-- ═════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS idle_stock_alerts (
  id              BIGSERIAL PRIMARY KEY,
  variant_id      BIGINT NOT NULL REFERENCES variant_stock(variant_id) ON DELETE CASCADE,
  location        TEXT NOT NULL,
  current_stock   INT NOT NULL,
  idle_days       INT NOT NULL,
  suggested_qty   INT NOT NULL DEFAULT 1,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'auto_transferred')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_isa_status ON idle_stock_alerts(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_isa_variant ON idle_stock_alerts(variant_id);

-- ═════════════════════════════════════════════════════════════════════════════
-- 5. RPC: Atomic transfer with CAS (compare-and-swap)
-- ═════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION fn_transfer_stock(
  p_variant_id BIGINT,
  p_source TEXT,
  p_destination TEXT,
  p_quantity INT,
  p_reason TEXT DEFAULT 'Traslado interno',
  p_performed_by UUID DEFAULT NULL,
  p_performed_by_name TEXT DEFAULT ''
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  transfer_id BIGINT,
  new_version INT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_current variant_stock%ROWTYPE;
  v_src_before INT;
  v_dst_before INT;
  v_new_src INT;
  v_new_dst INT;
  v_src_col TEXT;
  v_dst_col TEXT;
  v_transfer_id BIGINT;
BEGIN
  -- Lock row for update (prevents concurrent transfers on same variant)
  SELECT * INTO v_current
  FROM variant_stock
  WHERE variant_id = p_variant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Variante no encontrada'::TEXT, 0::BIGINT, 0;
    RETURN;
  END IF;

  -- Map location to column
  v_src_col := p_source;
  v_dst_col := p_destination;

  -- Get current values
  EXECUTE format('SELECT %I FROM variant_stock WHERE variant_id = $1', v_src_col)
    INTO v_src_before USING p_variant_id;
  EXECUTE format('SELECT %I FROM variant_stock WHERE variant_id = $1', v_dst_col)
    INTO v_dst_before USING p_variant_id;

  IF v_src_before IS NULL OR v_dst_before IS NULL THEN
    RETURN QUERY SELECT false, 'Ubicacion invalida'::TEXT, 0::BIGINT, 0;
    RETURN;
  END IF;

  -- Check sufficient stock
  IF v_src_before < p_quantity THEN
    RETURN QUERY SELECT false,
      format('Stock insuficiente en %s. Disponible: %s, Solicitado: %s', p_source, v_src_before, p_quantity)::TEXT,
      0::BIGINT, 0;
    RETURN;
  END IF;

  v_new_src := v_src_before - p_quantity;
  v_new_dst := v_dst_before + p_quantity;

  -- Atomic CAS update: increment version
  UPDATE variant_stock SET
    (v_src_col) = v_new_src,
    (v_dst_col) = v_new_dst,
    version = version + 1,
    updated_at = NOW(),
    last_movement_web = CASE WHEN p_source = 'stock_web' OR p_destination = 'stock_web' THEN NOW() ELSE last_movement_web END,
    last_movement_apes = CASE WHEN p_source = 'stock_apes' OR p_destination = 'stock_apes' THEN NOW() ELSE last_movement_apes END,
    last_movement_r5 = CASE WHEN p_source = 'stock_r5' OR p_destination = 'stock_r5' THEN NOW() ELSE last_movement_r5 END
  WHERE variant_id = p_variant_id
    AND version = v_current.version  -- CAS condition
  RETURNING version INTO v_new_version;

  IF NOT FOUND THEN
    -- CAS failed: another transfer modified this variant
    RETURN QUERY SELECT false, 'Conflicto de concurrencia. Reintente la operacion.'::TEXT, 0::BIGINT, 0;
    RETURN;
  END IF;

  -- Record transfer
  INSERT INTO inventory_transfers (
    variant_id, source_location, destination_location, quantity,
    source_before, source_after, dest_before, dest_after,
    version_before, version_after, reason, performed_by, performed_by_name
  ) VALUES (
    p_variant_id, p_source, p_destination, p_quantity,
    v_src_before, v_new_src, v_dst_before, v_new_dst,
    v_current.version, v_new_version, p_reason, p_performed_by, p_performed_by_name
  ) RETURNING id INTO v_transfer_id;

  -- Queue TiendaNube sync if web stock changed
  IF p_source = 'stock_web' OR p_destination = 'stock_web' THEN
    INSERT INTO tiendanube_sync_queue (variant_id, tn_product_id, tn_variant_id, new_stock)
    SELECT p_variant_id, tn_product_id, tn_variant_id,
           CASE WHEN p_destination = 'stock_web' THEN v_new_dst ELSE v_new_src END
    FROM variant_stock
    WHERE variant_id = p_variant_id
      AND tn_product_id IS NOT NULL
      AND auto_sync_enabled = true;
  END IF;

  RETURN QUERY SELECT true, 'Transferencia completada'::TEXT, v_transfer_id, v_new_version;
END;
$$;

-- ═════════════════════════════════════════════════════════════════════════════
-- 6. RPC: Detect idle stock (web=0, local>0, 14+ days without movement)
-- ═════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION fn_detect_idle_stock()
RETURNS TABLE (
  variant_id BIGINT,
  sku TEXT,
  name TEXT,
  location TEXT,
  current_stock INT,
  idle_days INT,
  suggested_transfer INT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    vs.variant_id,
    vs.sku,
    vs.name,
    loc.location,
    loc.stock,
    loc.idle_days,
    LEAST(loc.stock, GREATEST(1, loc.stock / 2)) AS suggested_transfer
  FROM variant_stock vs
  CROSS JOIN LATERAL (
    VALUES
      ('stock_apes', vs.stock_apes, vs.last_movement_apes),
      ('stock_r5', vs.stock_r5, vs.last_movement_r5)
  ) AS loc(location, stock, last_move)
  CROSS JOIN LATERAL (
    SELECT EXTRACT(DAY FROM NOW() - loc.last_move)::INT AS idle_days
  ) AS idle
  WHERE vs.stock_web = 0
    AND loc.stock > 0
    AND idle.idle_days >= 14
    AND vs.auto_sync_enabled = true
$$;

-- ═════════════════════════════════════════════════════════════════════════════
-- 7. RLS
-- ═════════════════════════════════════════════════════════════════════════════
ALTER TABLE variant_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON variant_stock FOR ALL USING (true);

ALTER TABLE inventory_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON inventory_transfers FOR ALL USING (true);

ALTER TABLE tiendanube_sync_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON tiendanube_sync_queue FOR ALL USING (true);

ALTER TABLE idle_stock_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON idle_stock_alerts FOR ALL USING (true);

-- ═════════════════════════════════════════════════════════════════════════════
-- 8. Dashboard Views
-- ═════════════════════════════════════════════════════════════════════════════

-- Overview: total stock per location
CREATE OR REPLACE VIEW v_stock_overview AS
SELECT
  COUNT(*) AS total_variants,
  SUM(stock_web) AS total_web,
  SUM(stock_apes) AS total_apes,
  SUM(stock_r5) AS total_r5,
  SUM(stock_web + stock_apes + stock_r5) AS total_all,
  COUNT(*) FILTER (WHERE stock_web = 0 AND (stock_apes > 0 OR stock_r5 > 0)) AS web_out_of_stock,
  COUNT(*) FILTER (WHERE stock_web = 0 AND stock_apes = 0 AND stock_r5 = 0) AS completely_out
FROM variant_stock;

-- Transfer history
CREATE OR REPLACE VIEW v_transfer_history AS
SELECT
  t.id,
  t.variant_id,
  vs.sku,
  vs.name,
  t.source_location,
  t.destination_location,
  t.quantity,
  t.reason,
  t.performed_by_name,
  t.tn_synced,
  t.created_at
FROM inventory_transfers t
JOIN variant_stock vs ON vs.variant_id = t.variant_id
ORDER BY t.created_at DESC;

-- Sync queue health
CREATE OR REPLACE VIEW v_sync_queue_health AS
SELECT
  status,
  COUNT(*) AS count,
  MIN(created_at) AS oldest,
  MAX(created_at) AS newest
FROM tiendanube_sync_queue
GROUP BY status;

COMMIT;
