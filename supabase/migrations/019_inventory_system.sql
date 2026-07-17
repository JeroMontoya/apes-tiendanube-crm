-- ============================================================================
-- 019_inventory_system.sql
-- Unified inventory control system for 3 locations:
--   R5  (Local Principal - physical store)
--   APES (Local Secundario - physical store)
--   WEB  (Online store via TiendaNueve)
--
-- Compatible with existing tables:
--   team_members, stock_movements, workshop_inventory,
--   product_status, system_config, server_cache
-- ============================================================================

-- ═════════════════════════════════════════════════════════════════════════════
-- 1. inventory_locations — Physical/virtual locations with config
-- ═════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS inventory_locations (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  description   TEXT DEFAULT '',
  type          TEXT NOT NULL DEFAULT 'physical'
    CHECK (type IN ('physical', 'virtual', 'warehouse')),
  address       TEXT DEFAULT '',
  is_active     BOOLEAN DEFAULT true,
  is_default    BOOLEAN DEFAULT false,
  config        JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_il_code ON inventory_locations(code);
CREATE INDEX IF NOT EXISTS idx_il_type ON inventory_locations(type);
CREATE INDEX IF NOT EXISTS idx_il_active ON inventory_locations(is_active) WHERE is_active = true;

-- ═════════════════════════════════════════════════════════════════════════════
-- 2. inventory_products — Unified product catalog with TiendaNueve mapping
-- ═════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS inventory_products (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sku                   TEXT DEFAULT '' UNIQUE,
  barcode               TEXT DEFAULT '',
  name                  TEXT NOT NULL,
  description           TEXT DEFAULT '',
  category              TEXT DEFAULT 'otro',
  color                 TEXT DEFAULT '',
  size                  TEXT DEFAULT '',
  image_url             TEXT DEFAULT '',
  supplier              TEXT DEFAULT '',

  -- TiendaNueve sync fields
  tiendanube_product_id INTEGER,
  tiendanube_variant_id INTEGER,

  -- Pricing
  unit_cost             NUMERIC DEFAULT 0,
  sell_price            NUMERIC DEFAULT 0,

  -- Status
  is_active             BOOLEAN DEFAULT true,
  tags                  JSONB DEFAULT '[]'::jsonb,
  metadata              JSONB DEFAULT '{}'::jsonb,

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ip_sku ON inventory_products(sku) WHERE sku != '';
CREATE INDEX IF NOT EXISTS idx_ip_barcode ON inventory_products(barcode) WHERE barcode != '';
CREATE INDEX IF NOT EXISTS idx_ip_category ON inventory_products(category);
CREATE INDEX IF NOT EXISTS idx_ip_tn_product ON inventory_products(tiendanube_product_id) WHERE tiendanube_product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ip_tn_variant ON inventory_products(tiendanube_product_id, tiendanube_variant_id)
  WHERE tiendanube_product_id IS NOT NULL AND tiendanube_variant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ip_active ON inventory_products(is_active) WHERE is_active = true;

-- ═════════════════════════════════════════════════════════════════════════════
-- 3. inventory_stock — Stock levels per product per location
-- ═════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS inventory_stock (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id           UUID NOT NULL REFERENCES inventory_products(id) ON DELETE CASCADE,
  location_id          UUID NOT NULL REFERENCES inventory_locations(id) ON DELETE CASCADE,

  quantity             INTEGER DEFAULT 0,
  reserved             INTEGER DEFAULT 0,
  incoming             INTEGER DEFAULT 0,

  low_stock_threshold  INTEGER DEFAULT 5,
  unlimited_stock      BOOLEAN DEFAULT false,

  last_counted_at      TIMESTAMPTZ,
  last_received_at     TIMESTAMPTZ,

  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Enforce one stock record per product per location
ALTER TABLE inventory_stock ADD CONSTRAINT uq_inventory_stock_product_location
  UNIQUE (product_id, location_id);

CREATE INDEX IF NOT EXISTS idx_is_product ON inventory_stock(product_id);
CREATE INDEX IF NOT EXISTS idx_is_location ON inventory_stock(location_id);
CREATE INDEX IF NOT EXISTS idx_is_low_stock ON inventory_stock(product_id, location_id, quantity)
  WHERE quantity <= low_stock_threshold AND unlimited_stock = false;

-- ═════════════════════════════════════════════════════════════════════════════
-- 4. inventory_movements — All stock movements with polymorphic references
-- ═════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS inventory_movements (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id            UUID NOT NULL REFERENCES inventory_products(id) ON DELETE CASCADE,
  location_id           UUID NOT NULL REFERENCES inventory_locations(id) ON DELETE CASCADE,

  type                  TEXT NOT NULL
    CHECK (type IN ('receive', 'dispatch', 'transfer', 'adjustment',
                    'production_in', 'production_out', 'return', 'sync',
                    'defect', 'reserved', 'unreserved')),

  quantity              INTEGER NOT NULL,

  -- For transfers
  from_location_id      UUID REFERENCES inventory_locations(id) ON DELETE SET NULL,
  to_location_id        UUID REFERENCES inventory_locations(id) ON DELETE SET NULL,

  -- Polymorphic references
  reference_type        TEXT DEFAULT '',
  reference_id          UUID,

  notes                 TEXT DEFAULT '',
  performed_by          UUID REFERENCES team_members(id) ON DELETE SET NULL,
  performed_by_name     TEXT DEFAULT '',

  -- TiendaNueve sync tracking
  tiendanube_synced     BOOLEAN DEFAULT false,
  synced_at             TIMESTAMPTZ,

  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_im_product ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_im_location ON inventory_movements(location_id);
CREATE INDEX IF NOT EXISTS idx_im_type ON inventory_movements(type);
CREATE INDEX IF NOT EXISTS idx_im_date ON inventory_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_im_performed_by ON inventory_movements(performed_by);
CREATE INDEX IF NOT EXISTS idx_im_reference ON inventory_movements(reference_type, reference_id)
  WHERE reference_type != '';
CREATE INDEX IF NOT EXISTS idx_im_product_location ON inventory_movements(product_id, location_id);
CREATE INDEX IF NOT EXISTS idx_im_from_location ON inventory_movements(from_location_id)
  WHERE from_location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_im_to_location ON inventory_movements(to_location_id)
  WHERE to_location_id IS NOT NULL;

-- ═════════════════════════════════════════════════════════════════════════════
-- 5. inventory_alerts — Stock alerts with severity levels
-- ═════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS inventory_alerts (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id        UUID NOT NULL REFERENCES inventory_products(id) ON DELETE CASCADE,
  location_id       UUID NOT NULL REFERENCES inventory_locations(id) ON DELETE CASCADE,

  type              TEXT NOT NULL
    CHECK (type IN ('low_stock', 'out_of_stock', 'overstock', 'sync_error')),

  severity          TEXT NOT NULL DEFAULT 'info'
    CHECK (severity IN ('info', 'warning', 'critical')),

  message           TEXT NOT NULL DEFAULT '',
  acknowledged      BOOLEAN DEFAULT false,
  acknowledged_by   UUID REFERENCES team_members(id) ON DELETE SET NULL,
  acknowledged_at   TIMESTAMPTZ,

  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ia_product ON inventory_alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_ia_location ON inventory_alerts(location_id);
CREATE INDEX IF NOT EXISTS idx_ia_type ON inventory_alerts(type);
CREATE INDEX IF NOT EXISTS idx_ia_unack ON inventory_alerts(acknowledged)
  WHERE acknowledged = false;
CREATE INDEX IF NOT EXISTS idx_ia_severity ON inventory_alerts(severity)
  WHERE acknowledged = false;

-- ═════════════════════════════════════════════════════════════════════════════
-- 6. inventory_snapshots — Daily snapshots for reporting/analytics
-- ═════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS inventory_snapshots (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date              DATE NOT NULL DEFAULT CURRENT_DATE,
  location_id       UUID NOT NULL REFERENCES inventory_locations(id) ON DELETE CASCADE,
  product_id        UUID NOT NULL REFERENCES inventory_products(id) ON DELETE CASCADE,

  quantity          INTEGER DEFAULT 0,
  unit_cost         NUMERIC DEFAULT 0,
  value             NUMERIC DEFAULT 0,
  movements_count   INTEGER DEFAULT 0,

  created_at        TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(date, location_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_isnap_date ON inventory_snapshots(date DESC);
CREATE INDEX IF NOT EXISTS idx_isnap_location ON inventory_snapshots(location_id);
CREATE INDEX IF NOT EXISTS idx_isnap_product ON inventory_snapshots(product_id);
CREATE INDEX IF NOT EXISTS idx_isnap_date_location ON inventory_snapshots(date DESC, location_id);

-- ═════════════════════════════════════════════════════════════════════════════
-- 7. inventory_user_roles — RBAC for inventory access control
-- ═════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS inventory_user_roles (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

  role              TEXT NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('admin', 'manager', 'operator', 'viewer')),

  locations_granted TEXT[] DEFAULT '{}',
  can_transfer      BOOLEAN DEFAULT false,
  can_adjust        BOOLEAN DEFAULT false,
  can_delete        BOOLEAN DEFAULT false,
  can_manage_roles  BOOLEAN DEFAULT false,

  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_iur_user ON inventory_user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_iur_role ON inventory_user_roles(role);

-- ═════════════════════════════════════════════════════════════════════════════
-- 8. inventory_audit_log — Complete audit trail
-- ═════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS inventory_audit_log (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action          TEXT NOT NULL,
  table_name      TEXT NOT NULL,
  record_id       UUID,
  old_data        JSONB,
  new_data        JSONB,
  performed_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_by_name TEXT DEFAULT '',
  ip_address      TEXT DEFAULT '',
  user_agent      TEXT DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ial_table ON inventory_audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_ial_record ON inventory_audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_ial_action ON inventory_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_ial_date ON inventory_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ial_performed_by ON inventory_audit_log(performed_by);

-- ═════════════════════════════════════════════════════════════════════════════
-- 9. RLS Policies — Per-user access based on inventory_user_roles
-- ═════════════════════════════════════════════════════════════════════════════

-- Helper function: check if user has a specific inventory role or higher
CREATE OR REPLACE FUNCTION public.fn_user_has_inventory_role(min_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM inventory_user_roles
    WHERE user_id = auth.uid()
    AND (
      role = 'admin'
      OR (min_role = 'viewer' AND role IN ('admin', 'manager', 'operator', 'viewer'))
      OR (min_role = 'operator' AND role IN ('admin', 'manager', 'operator'))
      OR (min_role = 'manager' AND role IN ('admin', 'manager'))
      OR (min_role = 'admin' AND role = 'admin')
    )
  );
$$;

-- Helper: check if user can access a specific location
CREATE OR REPLACE FUNCTION public.fn_user_can_access_location(loc_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM inventory_user_roles
    WHERE user_id = auth.uid()
    AND (
      role = 'admin'
      OR loc_id::TEXT = ANY(locations_granted)
    )
  );
$$;

-- ── inventory_locations ─────────────────────────────────────────────
ALTER TABLE inventory_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "locations_select" ON inventory_locations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "locations_insert" ON inventory_locations
  FOR INSERT TO authenticated
  WITH CHECK (fn_user_has_inventory_role('admin'));

CREATE POLICY "locations_update" ON inventory_locations
  FOR UPDATE TO authenticated
  USING (fn_user_has_inventory_role('admin'))
  WITH CHECK (fn_user_has_inventory_role('admin'));

CREATE POLICY "locations_delete" ON inventory_locations
  FOR DELETE TO authenticated
  USING (fn_user_has_inventory_role('admin'));

-- ── inventory_products ──────────────────────────────────────────────
ALTER TABLE inventory_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_select" ON inventory_products
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "products_insert" ON inventory_products
  FOR INSERT TO authenticated
  WITH CHECK (fn_user_has_inventory_role('operator'));

CREATE POLICY "products_update" ON inventory_products
  FOR UPDATE TO authenticated
  USING (fn_user_has_inventory_role('manager'))
  WITH CHECK (fn_user_has_inventory_role('manager'));

CREATE POLICY "products_delete" ON inventory_products
  FOR DELETE TO authenticated
  USING (fn_user_has_inventory_role('admin'));

-- ── inventory_stock ─────────────────────────────────────────────────
ALTER TABLE inventory_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_select" ON inventory_stock
  FOR SELECT TO authenticated
  USING (fn_user_can_access_location(location_id));

CREATE POLICY "stock_insert" ON inventory_stock
  FOR INSERT TO authenticated
  WITH CHECK (fn_user_can_access_location(location_id) AND fn_user_has_inventory_role('operator'));

CREATE POLICY "stock_update" ON inventory_stock
  FOR UPDATE TO authenticated
  USING (fn_user_can_access_location(location_id) AND fn_user_has_inventory_role('operator'))
  WITH CHECK (fn_user_can_access_location(location_id));

CREATE POLICY "stock_delete" ON inventory_stock
  FOR DELETE TO authenticated
  USING (fn_user_has_inventory_role('admin'));

-- ── inventory_movements ─────────────────────────────────────────────
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "movements_select" ON inventory_movements
  FOR SELECT TO authenticated
  USING (fn_user_can_access_location(location_id));

CREATE POLICY "movements_insert" ON inventory_movements
  FOR INSERT TO authenticated
  WITH CHECK (fn_user_can_access_location(location_id) AND fn_user_has_inventory_role('operator'));

-- ── inventory_alerts ────────────────────────────────────────────────
ALTER TABLE inventory_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alerts_select" ON inventory_alerts
  FOR SELECT TO authenticated
  USING (fn_user_can_access_location(location_id));

CREATE POLICY "alerts_insert" ON inventory_alerts
  FOR INSERT TO authenticated
  WITH CHECK (fn_user_has_inventory_role('operator'));

CREATE POLICY "alerts_update" ON inventory_alerts
  FOR UPDATE TO authenticated
  USING (fn_user_has_inventory_role('manager'))
  WITH CHECK (fn_user_has_inventory_role('manager'));

-- ── inventory_snapshots ─────────────────────────────────────────────
ALTER TABLE inventory_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "snapshots_select" ON inventory_snapshots
  FOR SELECT TO authenticated
  USING (fn_user_can_access_location(location_id));

CREATE POLICY "snapshots_insert" ON inventory_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (fn_user_has_inventory_role('admin'));

-- ── inventory_user_roles ────────────────────────────────────────────
ALTER TABLE inventory_user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_roles_select_own" ON inventory_user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR fn_user_has_inventory_role('admin'));

CREATE POLICY "user_roles_insert" ON inventory_user_roles
  FOR INSERT TO authenticated
  WITH CHECK (fn_user_has_inventory_role('admin') OR fn_user_has_inventory_role('manager'));

CREATE POLICY "user_roles_update" ON inventory_user_roles
  FOR UPDATE TO authenticated
  USING (fn_user_has_inventory_role('admin') OR (user_id = auth.uid() AND fn_user_has_inventory_role('manager')))
  WITH CHECK (fn_user_has_inventory_role('admin'));

CREATE POLICY "user_roles_delete" ON inventory_user_roles
  FOR DELETE TO authenticated
  USING (fn_user_has_inventory_role('admin'));

-- ── inventory_audit_log ─────────────────────────────────────────────
ALTER TABLE inventory_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_select_admin" ON inventory_audit_log
  FOR SELECT TO authenticated
  USING (fn_user_has_inventory_role('admin'));

CREATE POLICY "audit_insert_service" ON inventory_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ═════════════════════════════════════════════════════════════════════════════
-- 10. Database Functions (SECURITY DEFINER)
-- ═════════════════════════════════════════════════════════════════════════════

-- ── fn_update_stock: Atomic stock update with movement logging ──────
CREATE OR REPLACE FUNCTION public.fn_update_stock(
  p_product_id     UUID,
  p_location_id    UUID,
  p_quantity_change INTEGER,
  p_movement_type  TEXT,
  p_reference_type TEXT DEFAULT '',
  p_reference_id   UUID DEFAULT NULL,
  p_notes          TEXT DEFAULT '',
  p_performed_by   UUID DEFAULT NULL,
  p_performed_by_name TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_quantity INTEGER;
  v_stock_record inventory_stock%ROWTYPE;
  v_movement_id UUID;
BEGIN
  -- Get or create stock record
  INSERT INTO inventory_stock (product_id, location_id, quantity)
  VALUES (p_product_id, p_location_id, 0)
  ON CONFLICT (product_id, location_id) DO NOTHING;

  -- Lock and update stock atomically
  SELECT * INTO v_stock_record
  FROM inventory_stock
  WHERE product_id = p_product_id AND location_id = p_location_id
  FOR UPDATE;

  IF v_stock_record.unlimited_stock THEN
    v_new_quantity := v_stock_record.quantity;
  ELSE
    v_new_quantity := GREATEST(0, v_stock_record.quantity + p_quantity_change);
  END IF;

  UPDATE inventory_stock
  SET quantity = v_new_quantity,
      updated_at = NOW(),
      last_received_at = CASE
        WHEN p_movement_type = 'receive' THEN NOW()
        ELSE last_received_at
      END
  WHERE product_id = p_product_id AND location_id = p_location_id;

  -- Log the movement
  INSERT INTO inventory_movements (
    product_id, location_id, type, quantity,
    reference_type, reference_id, notes,
    performed_by, performed_by_name
  ) VALUES (
    p_product_id, p_location_id, p_movement_type, p_quantity_change,
    p_reference_type, p_reference_id, p_notes,
    p_performed_by, p_performed_by_name
  ) RETURNING id INTO v_movement_id;

  -- Audit log
  INSERT INTO inventory_audit_log (
    action, table_name, record_id, new_data, performed_by, performed_by_name
  ) VALUES (
    'stock_update', 'inventory_stock', v_stock_record.id,
    jsonb_build_object(
      'product_id', p_product_id,
      'location_id', p_location_id,
      'old_quantity', v_stock_record.quantity,
      'new_quantity', v_new_quantity,
      'change', p_quantity_change,
      'type', p_movement_type
    ),
    p_performed_by, p_performed_by_name
  );

  RETURN jsonb_build_object(
    'success', true,
    'movement_id', v_movement_id,
    'old_quantity', v_stock_record.quantity,
    'new_quantity', v_new_quantity
  );
END;
$$;

-- ── fn_transfer_stock: Atomic transfer between locations ─────────────
CREATE OR REPLACE FUNCTION public.fn_transfer_stock(
  p_product_id       UUID,
  p_from_location_id UUID,
  p_to_location_id   UUID,
  p_quantity         INTEGER,
  p_performed_by     UUID DEFAULT NULL,
  p_performed_by_name TEXT DEFAULT '',
  p_notes            TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_stock inventory_stock%ROWTYPE;
  v_to_stock   inventory_stock%ROWTYPE;
BEGIN
  IF p_from_location_id = p_to_location_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot transfer to same location');
  END IF;

  IF p_quantity <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quantity must be positive');
  END IF;

  -- Get source stock with lock
  SELECT * INTO v_from_stock
  FROM inventory_stock
  WHERE product_id = p_product_id AND location_id = p_from_location_id
  FOR UPDATE;

  IF v_from_stock IS NULL OR (NOT v_from_stock.unlimited_stock AND v_from_stock.quantity < p_quantity) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient stock at source location');
  END IF;

  -- Ensure destination stock record exists
  INSERT INTO inventory_stock (product_id, location_id, quantity)
  VALUES (p_product_id, p_to_location_id, 0)
  ON CONFLICT (product_id, location_id) DO NOTHING;

  SELECT * INTO v_to_stock
  FROM inventory_stock
  WHERE product_id = p_product_id AND location_id = p_to_location_id
  FOR UPDATE;

  -- Deduct from source
  IF NOT v_from_stock.unlimited_stock THEN
    UPDATE inventory_stock
    SET quantity = quantity - p_quantity, updated_at = NOW()
    WHERE product_id = p_product_id AND location_id = p_from_location_id;
  END IF;

  -- Add to destination
  UPDATE inventory_stock
  SET quantity = quantity + p_quantity, updated_at = NOW()
  WHERE product_id = p_product_id AND location_id = p_to_location_id;

  -- Log outgoing movement
  INSERT INTO inventory_movements (
    product_id, location_id, type, quantity,
    from_location_id, to_location_id,
    notes, performed_by, performed_by_name
  ) VALUES (
    p_product_id, p_from_location_id, 'dispatch', -p_quantity,
    p_from_location_id, p_to_location_id,
    'Transfer to ' || (SELECT code FROM inventory_locations WHERE id = p_to_location_id) || ': ' || p_notes,
    p_performed_by, p_performed_by_name
  );

  -- Log incoming movement
  INSERT INTO inventory_movements (
    product_id, location_id, type, quantity,
    from_location_id, to_location_id,
    notes, performed_by, performed_by_name
  ) VALUES (
    p_product_id, p_to_location_id, 'receive', p_quantity,
    p_from_location_id, p_to_location_id,
    'Transfer from ' || (SELECT code FROM inventory_locations WHERE id = p_from_location_id) || ': ' || p_notes,
    p_performed_by, p_performed_by_name
  );

  -- Audit log
  INSERT INTO inventory_audit_log (
    action, table_name, new_data, performed_by, performed_by_name
  ) VALUES (
    'stock_transfer', 'inventory_stock',
    jsonb_build_object(
      'product_id', p_product_id,
      'from_location', p_from_location_id,
      'to_location', p_to_location_id,
      'quantity', p_quantity
    ),
    p_performed_by, p_performed_by_name
  );

  RETURN jsonb_build_object(
    'success', true,
    'from_quantity', v_from_stock.quantity - p_quantity,
    'to_quantity', v_to_stock.quantity + p_quantity
  );
END;
$$;

-- ── fn_check_alerts: Check all products against thresholds ──────────
CREATE OR REPLACE FUNCTION public.fn_check_alerts()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
  v_alert_type TEXT;
  v_severity TEXT;
  v_message TEXT;
  v_created INTEGER := 0;
BEGIN
  FOR v_row IN
    SELECT
      s.product_id,
      s.location_id,
      s.quantity,
      s.low_stock_threshold,
      s.unlimited_stock,
      p.name AS product_name,
      l.code AS location_code
    FROM inventory_stock s
    JOIN inventory_products p ON p.id = s.product_id
    JOIN inventory_locations l ON l.id = s.location_id
    WHERE p.is_active = true
      AND l.is_active = true
      AND s.unlimited_stock = false
  LOOP
    IF v_row.quantity = 0 THEN
      v_alert_type := 'out_of_stock';
      v_severity := 'critical';
      v_message := format('%s agotado en %s', v_row.product_name, v_row.location_code);
    ELSIF v_row.quantity <= v_row.low_stock_threshold THEN
      v_alert_type := 'low_stock';
      v_severity := CASE
        WHEN v_row.quantity <= v_row.low_stock_threshold / 2 THEN 'critical'
        ELSE 'warning'
      END;
      v_message := format('%s con stock bajo (%s) en %s', v_row.product_name, v_row.quantity, v_row.location_code);
    ELSE
      -- No alert needed, skip or acknowledge existing
      CONTINUE;
    END IF;

    -- Upsert alert: avoid duplicates for same product/location/type
    INSERT INTO inventory_alerts (product_id, location_id, type, severity, message)
    VALUES (v_row.product_id, v_row.location_id, v_alert_type, v_severity, v_message)
    ON CONFLICT DO NOTHING;

    -- Actually check for existing unacknowledged alerts before inserting
    IF NOT EXISTS (
      SELECT 1 FROM inventory_alerts
      WHERE product_id = v_row.product_id
        AND location_id = v_row.location_id
        AND type = v_alert_type
        AND acknowledged = false
    ) THEN
      INSERT INTO inventory_alerts (product_id, location_id, type, severity, message)
      VALUES (v_row.product_id, v_row.location_id, v_alert_type, v_severity, v_message);
      v_created := v_created + 1;
    END IF;
  END LOOP;

  -- Acknowledge alerts that are no longer valid (stock recovered)
  UPDATE inventory_alerts a
  SET acknowledged = true,
      acknowledged_at = NOW()
  WHERE a.acknowledged = false
    AND a.type IN ('low_stock', 'out_of_stock')
    AND EXISTS (
      SELECT 1 FROM inventory_stock s
      WHERE s.product_id = a.product_id
        AND s.location_id = a.location_id
        AND s.unlimited_stock = false
        AND s.quantity > s.low_stock_threshold
    );

  RETURN jsonb_build_object(
    'success', true,
    'alerts_created', v_created
  );
END;
$$;

-- ── fn_daily_snapshot: Snapshot all current stock levels ────────────
CREATE OR REPLACE FUNCTION public.fn_daily_snapshot(
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted INTEGER := 0;
  v_row RECORD;
BEGIN
  FOR v_row IN
    SELECT
      s.product_id,
      s.location_id,
      s.quantity,
      p.unit_cost,
      (s.quantity * p.unit_cost) AS value,
      (SELECT COUNT(*)
       FROM inventory_movements m
       WHERE m.product_id = s.product_id
         AND m.location_id = s.location_id
         AND m.created_at::DATE = p_date
      ) AS movements_count
    FROM inventory_stock s
    JOIN inventory_products p ON p.id = s.product_id
    WHERE p.is_active = true
  LOOP
    INSERT INTO inventory_snapshots (date, location_id, product_id, quantity, unit_cost, value, movements_count)
    VALUES (p_date, v_row.location_id, v_row.product_id, v_row.quantity, v_row.unit_cost, v_row.value, v_row.movements_count)
    ON CONFLICT (date, location_id, product_id)
    DO UPDATE SET
      quantity = EXCLUDED.quantity,
      unit_cost = EXCLUDED.unit_cost,
      value = EXCLUDED.value,
      movements_count = EXCLUDED.movements_count;
    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'snapshots_created', v_inserted,
    'date', p_date
  );
END;
$$;

-- ── fn_apply_tiendanube_stock: Apply stock from TN webhook ──────────
CREATE OR REPLACE FUNCTION public.fn_apply_tiendanube_stock(
  p_tn_product_id  INTEGER,
  p_tn_variant_id  INTEGER,
  p_new_quantity   INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product inventory_products%ROWTYPE;
  v_location_id UUID;
  v_result JSONB;
BEGIN
  -- Find the product by TiendaNueve IDs
  SELECT * INTO v_product
  FROM inventory_products
  WHERE tiendanube_product_id = p_tn_product_id
    AND tiendanube_variant_id = p_tn_variant_id;

  IF v_product IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Product not found for TN IDs %s/%s', p_tn_product_id, p_tn_variant_id)
    );
  END IF;

  -- Get WEB location
  SELECT id INTO v_location_id
  FROM inventory_locations
  WHERE code = 'WEB' AND is_active = true;

  IF v_location_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'WEB location not found');
  END IF;

  -- Calculate current stock difference
  DECLARE
    v_current INTEGER;
    v_change  INTEGER;
  BEGIN
    SELECT COALESCE(quantity, 0) INTO v_current
    FROM inventory_stock
    WHERE product_id = v_product.id AND location_id = v_location_id;

    v_change := p_new_quantity - COALESCE(v_current, 0);

    IF v_change = 0 THEN
      RETURN jsonb_build_object('success', true, 'message', 'No change needed');
    END IF;

    v_result := fn_update_stock(
      v_product.id,
      v_location_id,
      v_change,
      'sync',
      'tiendanube',
      NULL,
      format('TN webhook sync: %s -> %s', COALESCE(v_current, 0), p_new_quantity),
      NULL,
      'TiendaNueve Webhook'
    );

    -- Mark as synced
    UPDATE inventory_movements
    SET tiendanube_synced = true, synced_at = NOW()
    WHERE id = (v_result->>'movement_id')::UUID;

    RETURN jsonb_build_object(
      'success', true,
      'product_id', v_product.id,
      'old_quantity', COALESCE(v_current, 0),
      'new_quantity', p_new_quantity,
      'change', v_change
    );
  END;
END;
$$;

-- ── fn_get_inventory_summary: Aggregated inventory stats ────────────
CREATE OR REPLACE FUNCTION public.fn_get_inventory_summary(
  p_location_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_products', COUNT(DISTINCT s.product_id),
    'total_stock', COALESCE(SUM(s.quantity), 0),
    'total_value', COALESCE(SUM(s.quantity * p.unit_cost), 0),
    'total_retail_value', COALESCE(SUM(s.quantity * p.sell_price), 0),
    'low_stock_count', COUNT(*) FILTER (
      WHERE s.quantity <= s.low_stock_threshold
        AND s.unlimited_stock = false
        AND s.quantity > 0
    ),
    'out_of_stock_count', COUNT(*) FILTER (
      WHERE s.quantity = 0 AND s.unlimited_stock = false
    ),
    'locations', (
      SELECT jsonb_agg(loc_summary)
      FROM (
        SELECT jsonb_build_object(
          'location_id', l.id,
          'code', l.code,
          'name', l.name,
          'products', COUNT(DISTINCT s2.product_id),
          'total_stock', COALESCE(SUM(s2.quantity), 0),
          'total_value', COALESCE(SUM(s2.quantity * p2.unit_cost), 0)
        ) AS loc_summary
        FROM inventory_locations l
        LEFT JOIN inventory_stock s2 ON s2.location_id = l.id
        LEFT JOIN inventory_products p2 ON p2.id = s2.product_id
        WHERE l.is_active = true
          AND (p_location_id IS NULL OR l.id = p_location_id)
        GROUP BY l.id, l.code, l.name
      ) locs
    )
  ) INTO v_result
  FROM inventory_stock s
  JOIN inventory_products p ON p.id = s.product_id
  JOIN inventory_locations l ON l.id = s.location_id
  WHERE l.is_active = true
    AND p.is_active = true
    AND (p_location_id IS NULL OR s.location_id = p_location_id);

  RETURN v_result;
END;
$$;

-- ── fn_get_movement_history: Movement history with filters ──────────
CREATE OR REPLACE FUNCTION public.fn_get_movement_history(
  p_product_id  UUID DEFAULT NULL,
  p_location_id UUID DEFAULT NULL,
  p_limit       INTEGER DEFAULT 50
)
RETURNS TABLE (
  id              UUID,
  product_id      UUID,
  product_name    TEXT,
  location_id     UUID,
  location_code   TEXT,
  type            TEXT,
  quantity        INTEGER,
  from_location   TEXT,
  to_location     TEXT,
  reference_type  TEXT,
  reference_id    UUID,
  notes           TEXT,
  performed_by    UUID,
  performed_by_name TEXT,
  created_at      TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.product_id,
    p.name AS product_name,
    m.location_id,
    l.code AS location_code,
    m.type,
    m.quantity,
    fl.code AS from_location,
    tl.code AS to_location,
    m.reference_type,
    m.reference_id,
    m.notes,
    m.performed_by,
    m.performed_by_name,
    m.created_at
  FROM inventory_movements m
  JOIN inventory_products p ON p.id = m.product_id
  JOIN inventory_locations l ON l.id = m.location_id
  LEFT JOIN inventory_locations fl ON fl.id = m.from_location_id
  LEFT JOIN inventory_locations tl ON tl.id = m.to_location_id
  WHERE (p_product_id IS NULL OR m.product_id = p_product_id)
    AND (p_location_id IS NULL OR m.location_id = p_location_id)
  ORDER BY m.created_at DESC
  LIMIT p_limit;
END;
$$;

-- ═════════════════════════════════════════════════════════════════════════════
-- 11. Triggers
-- ═════════════════════════════════════════════════════════════════════════════

-- ── Trigger: Auto-update updated_at on inventory_products ───────────
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
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

CREATE TRIGGER trg_inventory_products_updated_at
  BEFORE UPDATE ON inventory_products
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_inventory_stock_updated_at
  BEFORE UPDATE ON inventory_stock
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_inventory_locations_updated_at
  BEFORE UPDATE ON inventory_locations
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_inventory_user_roles_updated_at
  BEFORE UPDATE ON inventory_user_roles
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ── Trigger: After INSERT on inventory_movements → auto-update stock ─
CREATE OR REPLACE FUNCTION public.fn_trigger_update_stock_on_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current INTEGER;
BEGIN
  -- Only auto-update for non-manual movement types
  -- (fn_update_stock handles the stock update for direct calls)
  -- This trigger catches any direct INSERT into inventory_movements
  -- that bypasses fn_update_stock (e.g., legacy data, external syncs)

  -- Get or create stock record
  INSERT INTO inventory_stock (product_id, location_id, quantity)
  VALUES (NEW.product_id, NEW.location_id, 0)
  ON CONFLICT (product_id, location_id) DO NOTHING;

  SELECT quantity INTO v_current
  FROM inventory_stock
  WHERE product_id = NEW.product_id AND location_id = NEW.location_id;

  UPDATE inventory_stock
  SET quantity = GREATEST(0, v_current + NEW.quantity),
      updated_at = NOW(),
      last_received_at = CASE
        WHEN NEW.type = 'receive' THEN NOW()
        ELSE last_received_at
      END
  WHERE product_id = NEW.product_id AND location_id = NEW.location_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_update_stock_on_movement
  AFTER INSERT ON inventory_movements
  FOR EACH ROW EXECUTE FUNCTION fn_trigger_update_stock_on_movement();

-- ── Trigger: After INSERT on inventory_stock → check for low stock alerts
CREATE OR REPLACE FUNCTION public.fn_trigger_check_stock_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_name TEXT;
  v_location_code TEXT;
  v_alert_type TEXT;
  v_severity TEXT;
  v_message TEXT;
BEGIN
  IF NEW.unlimited_stock = true THEN
    RETURN NEW;
  END IF;

  -- Get names for the alert
  SELECT p.name INTO v_product_name
  FROM inventory_products p WHERE p.id = NEW.product_id;

  SELECT l.code INTO v_location_code
  FROM inventory_locations l WHERE l.id = NEW.location_id;

  IF NEW.quantity = 0 THEN
    v_alert_type := 'out_of_stock';
    v_severity := 'critical';
    v_message := format('%s agotado en %s', v_product_name, v_location_code);
  ELSIF NEW.quantity <= NEW.low_stock_threshold THEN
    v_alert_type := 'low_stock';
    v_severity := CASE
      WHEN NEW.quantity <= NEW.low_stock_threshold / 2 THEN 'critical'
      ELSE 'warning'
    END;
    v_message := format('%s con stock bajo (%s/%s) en %s',
      v_product_name, NEW.quantity, NEW.low_stock_threshold, v_location_code);
  ELSE
    -- Stock is fine, acknowledge any existing alerts
    UPDATE inventory_alerts
    SET acknowledged = true, acknowledged_at = NOW()
    WHERE product_id = NEW.product_id
      AND location_id = NEW.location_id
      AND type IN ('low_stock', 'out_of_stock')
      AND acknowledged = false;
    RETURN NEW;
  END IF;

  -- Only create alert if no unacknowledged one exists
  IF NOT EXISTS (
    SELECT 1 FROM inventory_alerts
    WHERE product_id = NEW.product_id
      AND location_id = NEW.location_id
      AND type = v_alert_type
      AND acknowledged = false
  ) THEN
    INSERT INTO inventory_alerts (product_id, location_id, type, severity, message)
    VALUES (NEW.product_id, NEW.location_id, v_alert_type, v_severity, v_message);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_stock_alert
  AFTER INSERT OR UPDATE ON inventory_stock
  FOR EACH ROW EXECUTE FUNCTION fn_trigger_check_stock_alert();

-- ── Trigger: After INSERT on inventory_alerts → broadcast via pg_notify
CREATE OR REPLACE FUNCTION public.fn_trigger_notify_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_notify(
    'inventory_alert',
    jsonb_build_object(
      'id', NEW.id,
      'product_id', NEW.product_id,
      'location_id', NEW.location_id,
      'type', NEW.type,
      'severity', NEW.severity,
      'message', NEW.message,
      'created_at', NEW.created_at
    )::text
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_on_alert
  AFTER INSERT ON inventory_alerts
  FOR EACH ROW EXECUTE FUNCTION fn_trigger_notify_alert();

-- ═════════════════════════════════════════════════════════════════════════════
-- 12. Enable Realtime
-- ═════════════════════════════════════════════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_stock;
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_movements;
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_alerts;

-- ═════════════════════════════════════════════════════════════════════════════
-- 13. Seed Data — Default locations
-- ═════════════════════════════════════════════════════════════════════════════
INSERT INTO inventory_locations (code, name, description, type, is_default, config) VALUES
  (
    'R5',
    'R5 - Local Principal',
    'Tienda fisica principal. Stock de venta directa y showroom.',
    'physical',
    true,
    jsonb_build_object(
      'address', '',
      'phone', '',
      'manager', '',
      'allows_returns', true,
      'allows_transfers', true
    )
  ),
  (
    'APES',
    'APES - Local Secundario',
    'Segunda tienda fisica. Stock para segunda ubicacion de venta.',
    'physical',
    false,
    jsonb_build_object(
      'address', '',
      'phone', '',
      'manager', '',
      'allows_returns', true,
      'allows_transfers', true
    )
  ),
  (
    'WEB',
    'WEB - TiendaNueve Online',
    'Tienda online via TiendaNueve. Stock sincronizado con la plataforma.',
    'virtual',
    false,
    jsonb_build_object(
      'platform', 'tiendanueve',
      'auto_sync', true,
      'sync_interval_seconds', 90,
      'allows_returns', true,
      'allows_transfers', false
    )
  )
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  type = EXCLUDED.type,
  config = EXCLUDED.config,
  updated_at = NOW();

-- ═════════════════════════════════════════════════════════════════════════════
-- 14. Performance Indexes (additional)
-- ═════════════════════════════════════════════════════════════════════════════

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_is_product_location_qty ON inventory_stock(product_id, location_id, quantity);
CREATE INDEX IF NOT EXISTS idx_im_type_date ON inventory_movements(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ia_type_ack ON inventory_alerts(type, acknowledged) WHERE acknowledged = false;
CREATE INDEX IF NOT EXISTS idx_isnap_date_prod ON inventory_snapshots(date DESC, product_id);
CREATE INDEX IF NOT EXISTS idx_ip_name_gin ON inventory_products USING gin(to_tsvector('spanish', name));
CREATE INDEX IF NOT EXISTS idx_ip_sku_barcode ON inventory_products(sku, barcode) WHERE sku != '' OR barcode != '';

-- ═════════════════════════════════════════════════════════════════════════════
-- Grants for service_role and authenticated
-- ═════════════════════════════════════════════════════════════════════════════
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Revoke from anon for security
REVOKE ALL ON inventory_locations FROM anon;
REVOKE ALL ON inventory_products FROM anon;
REVOKE ALL ON inventory_stock FROM anon;
REVOKE ALL ON inventory_movements FROM anon;
REVOKE ALL ON inventory_alerts FROM anon;
REVOKE ALL ON inventory_snapshots FROM anon;
REVOKE ALL ON inventory_user_roles FROM anon;
REVOKE ALL ON inventory_audit_log FROM anon;

-- Grant function execution
GRANT EXECUTE ON FUNCTION public.fn_update_stock TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_transfer_stock TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_check_alerts TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_daily_snapshot TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_apply_tiendanube_stock TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_get_inventory_summary TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_get_movement_history TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_user_has_inventory_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_user_can_access_location TO authenticated;
