-- ============================================================================
-- 020_suppliers_purchasing.sql
-- Módulo de proveedores, órdenes de compra, reorder automático,
-- e idempotencia de webhooks de Tiendanube.
-- ============================================================================

-- ═════════════════════════════════════════════════════════════════════════════
-- 1. inventory_suppliers — Catálogo de proveedores
-- ═════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS inventory_suppliers (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name              TEXT NOT NULL,
  contact_name      TEXT DEFAULT '',
  phone             TEXT DEFAULT '',
  whatsapp          TEXT DEFAULT '',
  email             TEXT DEFAULT '',
  address           TEXT DEFAULT '',
  lead_time_days    INTEGER DEFAULT 15,
  payment_terms     TEXT DEFAULT '',
  notes             TEXT DEFAULT '',
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_isup_active ON inventory_suppliers(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_isup_name_gin ON inventory_suppliers USING gin(to_tsvector('spanish', name));

-- Vincular productos a proveedor (mantiene el campo de texto legado por compatibilidad)
ALTER TABLE inventory_products ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES inventory_suppliers(id) ON DELETE SET NULL;
ALTER TABLE inventory_products ADD COLUMN IF NOT EXISTS reorder_quantity INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_ip_supplier ON inventory_products(supplier_id) WHERE supplier_id IS NOT NULL;

-- ═════════════════════════════════════════════════════════════════════════════
-- 2. purchase_orders — Órdenes de compra a proveedores
-- ═════════════════════════════════════════════════════════════════════════════
CREATE SEQUENCE IF NOT EXISTS purchase_order_seq START 1;

CREATE TABLE IF NOT EXISTS purchase_orders (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  po_number         TEXT NOT NULL UNIQUE DEFAULT ('PO-' || LPAD(nextval('purchase_order_seq')::TEXT, 5, '0')),
  supplier_id       UUID NOT NULL REFERENCES inventory_suppliers(id) ON DELETE RESTRICT,
  destination_location_id UUID NOT NULL REFERENCES inventory_locations(id) ON DELETE RESTRICT,

  status            TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'confirmed', 'partially_received', 'received', 'cancelled')),

  expected_date     DATE,
  total_cost        NUMERIC DEFAULT 0,
  notes             TEXT DEFAULT '',

  created_by        UUID REFERENCES team_members(id) ON DELETE SET NULL,
  created_by_name   TEXT DEFAULT '',

  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  received_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_destination ON purchase_orders(destination_location_id);
CREATE INDEX IF NOT EXISTS idx_po_created ON purchase_orders(created_at DESC);

-- ═════════════════════════════════════════════════════════════════════════════
-- 3. purchase_order_items — Líneas de producto de cada orden de compra
-- ═════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id     UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id            UUID NOT NULL REFERENCES inventory_products(id) ON DELETE RESTRICT,

  quantity_ordered      INTEGER NOT NULL CHECK (quantity_ordered > 0),
  quantity_received     INTEGER NOT NULL DEFAULT 0,
  unit_cost             NUMERIC DEFAULT 0,

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_poi_po ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_poi_product ON purchase_order_items(product_id);

-- ═════════════════════════════════════════════════════════════════════════════
-- 4. inventory_webhook_events — Idempotencia de webhooks (evita doble procesamiento)
-- ═════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS inventory_webhook_events (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_key         TEXT NOT NULL UNIQUE,
  event_type        TEXT NOT NULL,
  payload_summary   JSONB DEFAULT '{}'::jsonb,
  processed_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_iwe_key ON inventory_webhook_events(event_key);
CREATE INDEX IF NOT EXISTS idx_iwe_processed ON inventory_webhook_events(processed_at DESC);

-- ═════════════════════════════════════════════════════════════════════════════
-- 5. RLS
-- ═════════════════════════════════════════════════════════════════════════════
ALTER TABLE inventory_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "suppliers_select" ON inventory_suppliers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "suppliers_insert" ON inventory_suppliers
  FOR INSERT TO authenticated WITH CHECK (fn_user_has_inventory_role('manager'));

CREATE POLICY "suppliers_update" ON inventory_suppliers
  FOR UPDATE TO authenticated
  USING (fn_user_has_inventory_role('manager'))
  WITH CHECK (fn_user_has_inventory_role('manager'));

CREATE POLICY "suppliers_delete" ON inventory_suppliers
  FOR DELETE TO authenticated USING (fn_user_has_inventory_role('admin'));

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "po_select" ON purchase_orders
  FOR SELECT TO authenticated USING (fn_user_can_access_location(destination_location_id));

CREATE POLICY "po_insert" ON purchase_orders
  FOR INSERT TO authenticated WITH CHECK (fn_user_has_inventory_role('manager'));

CREATE POLICY "po_update" ON purchase_orders
  FOR UPDATE TO authenticated
  USING (fn_user_has_inventory_role('manager'))
  WITH CHECK (fn_user_has_inventory_role('manager'));

CREATE POLICY "po_delete" ON purchase_orders
  FOR DELETE TO authenticated USING (fn_user_has_inventory_role('admin'));

ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "poi_select" ON purchase_order_items
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM purchase_orders po WHERE po.id = purchase_order_id AND fn_user_can_access_location(po.destination_location_id))
  );

CREATE POLICY "poi_insert" ON purchase_order_items
  FOR INSERT TO authenticated WITH CHECK (fn_user_has_inventory_role('manager'));

CREATE POLICY "poi_update" ON purchase_order_items
  FOR UPDATE TO authenticated
  USING (fn_user_has_inventory_role('operator'))
  WITH CHECK (fn_user_has_inventory_role('operator'));

-- Webhook events: solo backend (service_role) los toca, nadie más necesita verlos
ALTER TABLE inventory_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "webhook_events_admin_only" ON inventory_webhook_events
  FOR SELECT TO authenticated USING (fn_user_has_inventory_role('admin'));

REVOKE ALL ON inventory_suppliers FROM anon;
REVOKE ALL ON purchase_orders FROM anon;
REVOKE ALL ON purchase_order_items FROM anon;
REVOKE ALL ON inventory_webhook_events FROM anon;

-- ═════════════════════════════════════════════════════════════════════════════
-- 6. Funciones
-- ═════════════════════════════════════════════════════════════════════════════

-- ── fn_receive_po_item: recibe mercancía de una línea de PO, actualiza stock ──
CREATE OR REPLACE FUNCTION public.fn_receive_po_item(
  p_po_item_id      UUID,
  p_quantity_received INTEGER,
  p_performed_by    UUID DEFAULT NULL,
  p_performed_by_name TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item purchase_order_items%ROWTYPE;
  v_po purchase_orders%ROWTYPE;
  v_remaining INTEGER;
  v_all_received BOOLEAN;
  v_any_received BOOLEAN;
BEGIN
  SELECT * INTO v_item FROM purchase_order_items WHERE id = p_po_item_id FOR UPDATE;
  IF v_item IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'PO item not found');
  END IF;

  v_remaining := v_item.quantity_ordered - v_item.quantity_received;
  IF p_quantity_received > v_remaining THEN
    RETURN jsonb_build_object('success', false, 'error',
      format('Cannot receive %s, only %s pending', p_quantity_received, v_remaining));
  END IF;

  SELECT * INTO v_po FROM purchase_orders WHERE id = v_item.purchase_order_id FOR UPDATE;

  -- Aumenta el stock en la ubicación destino de la orden de compra
  PERFORM fn_update_stock(
    v_item.product_id,
    v_po.destination_location_id,
    p_quantity_received,
    'receive',
    'purchase_order',
    v_po.id,
    format('Received from PO %s', v_po.po_number),
    p_performed_by,
    p_performed_by_name
  );

  UPDATE purchase_order_items
  SET quantity_received = quantity_received + p_quantity_received, updated_at = NOW()
  WHERE id = p_po_item_id;

  -- Actualiza el estado global de la orden de compra
  SELECT
    bool_and(quantity_received >= quantity_ordered),
    bool_or(quantity_received > 0)
  INTO v_all_received, v_any_received
  FROM purchase_order_items WHERE purchase_order_id = v_po.id;

  UPDATE purchase_orders
  SET status = CASE
        WHEN v_all_received THEN 'received'
        WHEN v_any_received THEN 'partially_received'
        ELSE status
      END,
      received_at = CASE WHEN v_all_received THEN NOW() ELSE received_at END,
      updated_at = NOW()
  WHERE id = v_po.id;

  RETURN jsonb_build_object('success', true, 'item_id', p_po_item_id, 'received_now', p_quantity_received);
END;
$$;

-- ── fn_get_reorder_suggestions: sugiere qué reabastecer según velocidad de venta ──
CREATE OR REPLACE FUNCTION public.fn_get_reorder_suggestions(
  p_days_lookback INTEGER DEFAULT 30
)
RETURNS TABLE (
  product_id        UUID,
  product_name      TEXT,
  sku               TEXT,
  location_id       UUID,
  location_code     TEXT,
  current_stock     INTEGER,
  low_stock_threshold INTEGER,
  units_sold_period  BIGINT,
  daily_velocity     NUMERIC,
  supplier_id        UUID,
  supplier_name      TEXT,
  lead_time_days     INTEGER,
  days_of_stock_left NUMERIC,
  suggested_reorder_qty INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH sales AS (
    SELECT
      m.product_id,
      m.location_id,
      SUM(ABS(m.quantity)) AS units_sold
    FROM inventory_movements m
    WHERE m.type IN ('dispatch')
      AND m.created_at >= NOW() - (p_days_lookback || ' days')::INTERVAL
    GROUP BY m.product_id, m.location_id
  )
  SELECT
    p.id,
    p.name,
    p.sku,
    l.id,
    l.code,
    s.quantity,
    s.low_stock_threshold,
    COALESCE(sa.units_sold, 0),
    ROUND(COALESCE(sa.units_sold, 0)::NUMERIC / GREATEST(p_days_lookback, 1), 2) AS daily_velocity,
    p.supplier_id,
    sup.name,
    COALESCE(sup.lead_time_days, 15),
    CASE
      WHEN COALESCE(sa.units_sold, 0) = 0 THEN NULL
      ELSE ROUND(s.quantity / (sa.units_sold::NUMERIC / p_days_lookback), 1)
    END AS days_of_stock_left,
    GREATEST(
      p.reorder_quantity,
      CEIL(COALESCE(sa.units_sold, 0)::NUMERIC / GREATEST(p_days_lookback, 1) * COALESCE(sup.lead_time_days, 15) * 1.5)
    )::INTEGER AS suggested_reorder_qty
  FROM inventory_stock s
  JOIN inventory_products p ON p.id = s.product_id
  JOIN inventory_locations l ON l.id = s.location_id
  LEFT JOIN sales sa ON sa.product_id = s.product_id AND sa.location_id = s.location_id
  LEFT JOIN inventory_suppliers sup ON sup.id = p.supplier_id
  WHERE p.is_active = true
    AND l.is_active = true
    AND s.unlimited_stock = false
    AND (
      s.quantity <= s.low_stock_threshold
      OR (
        COALESCE(sa.units_sold, 0) > 0
        AND s.quantity / (sa.units_sold::NUMERIC / p_days_lookback) <= COALESCE(sup.lead_time_days, 15)
      )
    )
  ORDER BY days_of_stock_left ASC NULLS FIRST;
$$;

GRANT EXECUTE ON FUNCTION public.fn_receive_po_item TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_get_reorder_suggestions TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON inventory_suppliers, purchase_orders, purchase_order_items, inventory_webhook_events TO authenticated, service_role;
GRANT USAGE ON SEQUENCE purchase_order_seq TO authenticated, service_role;