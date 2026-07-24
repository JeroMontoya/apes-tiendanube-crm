-- ============================================================================
-- 022_tiendanube_idempotency.sql
-- Idempotent upserts for TiendaNube data + inventory deduplication
-- Run after: 019_inventory_system.sql, 020_suppliers_purchasing.sql
-- ============================================================================

-- ═════════════════════════════════════════════════════════════════════════════
-- 1. Add unique constraint on inventory_products for TiendaNube mapping
-- ═════════════════════════════════════════════════════════════════════════════
ALTER TABLE inventory_products
  DROP CONSTRAINT IF EXISTS uq_inventory_products_tn_mapping;

ALTER TABLE inventory_products
  ADD CONSTRAINT uq_inventory_products_tn_mapping
  UNIQUE (tiendanube_product_id, tiendanube_variant_id);

-- ═════════════════════════════════════════════════════════════════════════════
-- 2. tiendanube_orders — Canonical orders table with idempotent upsert
-- ═════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS tiendanube_orders (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tiendanube_order_id   BIGINT NOT NULL UNIQUE,
  order_number          TEXT NOT NULL DEFAULT '',
  tiendanube_customer_id BIGINT,

  status                TEXT DEFAULT 'unknown',
  payment_status        TEXT DEFAULT '',
  fulfillment_status    TEXT DEFAULT '',
  payment_gateway       TEXT DEFAULT '',

  currency              TEXT DEFAULT 'COP',
  total                 NUMERIC DEFAULT 0,
  subtotal              NUMERIC DEFAULT 0,
  tax                   NUMERIC DEFAULT 0,
  shipping              NUMERIC DEFAULT 0,
  discount              NUMERIC DEFAULT 0,

  -- Customer snapshot at order time
  customer_email        TEXT DEFAULT '',
  customer_name         TEXT DEFAULT '',
  customer_phone        TEXT DEFAULT '',
  customer_document     TEXT DEFAULT '',

  shipping_address      JSONB DEFAULT '{}'::jsonb,
  billing_address       JSONB DEFAULT '{}'::jsonb,
  line_items            JSONB DEFAULT '[]'::jsonb,

  raw_payload           JSONB DEFAULT '{}'::jsonb,
  last_webhook_event    TEXT DEFAULT '',
  webhook_received_at   TIMESTAMPTZ DEFAULT NOW(),

  -- Stock deduction tracking
  stock_deducted        BOOLEAN DEFAULT false,
  stock_deducted_at     TIMESTAMPTZ,

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tno_status ON tiendanube_orders(status);
CREATE INDEX IF NOT EXISTS idx_tno_customer_email ON tiendanube_orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_tno_created ON tiendanube_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tno_webhook ON tiendanube_orders(last_webhook_event);

-- ═════════════════════════════════════════════════════════════════════════════
-- 3. tiendanube_order_items — Normalized line items for analytics
-- ═════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS tiendanube_order_items (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id              UUID NOT NULL REFERENCES tiendanube_orders(id) ON DELETE CASCADE,
  tiendanube_order_id   BIGINT NOT NULL,
  tiendanube_item_id    BIGINT,
  tiendanube_product_id BIGINT NOT NULL,
  tiendanube_variant_id BIGINT,

  product_name          TEXT NOT NULL DEFAULT '',
  variant_name          TEXT DEFAULT '',
  sku                   TEXT DEFAULT '',
  quantity              INTEGER NOT NULL DEFAULT 1,
  unit_price            NUMERIC DEFAULT 0,
  total_price           NUMERIC DEFAULT 0,

  -- Link to our inventory
  inventory_product_id  UUID REFERENCES inventory_products(id) ON DELETE SET NULL,

  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tnoi_order ON tiendanube_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_tnoi_tn_product ON tiendanube_order_items(tiendanube_product_id, tiendanube_variant_id);
CREATE INDEX IF NOT EXISTS idx_tnoi_inventory_product ON tiendanube_order_items(inventory_product_id) WHERE inventory_product_id IS NOT NULL;

-- ═════════════════════════════════════════════════════════════════════════════
-- 4. tiendanube_clients — Customer deduplication & enrichment
-- ═════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS tiendanube_clients (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tiendanube_customer_id BIGINT NOT NULL UNIQUE,

  -- Core identity
  email                 TEXT NOT NULL DEFAULT '',
  name                  TEXT NOT NULL DEFAULT '',
  phone                 TEXT DEFAULT '',
  document              TEXT DEFAULT '',  -- DNI/CUIT

  -- Addresses
  default_address       JSONB DEFAULT '{}'::jsonb,
  addresses             JSONB DEFAULT '[]'::jsonb,

  -- Analytics
  total_spent           NUMERIC DEFAULT 0,
  orders_count          INTEGER DEFAULT 0,
  last_order_at         TIMESTAMPTZ,
  first_order_at        TIMESTAMPTZ,

  -- Segmentation
  tags                  JSONB DEFAULT '[]'::jsonb,
  note                  TEXT DEFAULT '',

  -- Sync
  raw_payload           JSONB DEFAULT '{}'::jsonb,
  last_synced_at        TIMESTAMPTZ DEFAULT NOW(),

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tnc_email ON tiendanube_clients(email) WHERE email != '';
CREATE INDEX IF NOT EXISTS idx_tnc_document ON tiendanube_clients(document) WHERE document != '';
CREATE INDEX IF NOT EXISTS idx_tnc_phone ON tiendanube_clients(phone) WHERE phone != '';
CREATE INDEX IF NOT EXISTS idx_tnc_last_order ON tiendanube_clients(last_order_at DESC) WHERE last_order_at IS NOT NULL;

-- ═════════════════════════════════════════════════════════════════════════════
-- 5. UPSERT FUNCTIONS — Idempotent writes using ON CONFLICT
-- ═════════════════════════════════════════════════════════════════════════════

-- ── fn_upsert_tiendanube_product: Upsert product mapping ───────────────
CREATE OR REPLACE FUNCTION public.fn_upsert_tiendanube_product(
  p_tn_product_id   INTEGER,
  p_tn_variant_id   INTEGER,
  p_sku             TEXT DEFAULT '',
  p_name            TEXT DEFAULT '',
  p_description     TEXT DEFAULT '',
  p_category        TEXT DEFAULT 'otro',
  p_color           TEXT DEFAULT '',
  p_size            TEXT DEFAULT '',
  p_image_url       TEXT DEFAULT '',
  p_unit_cost       NUMERIC DEFAULT 0,
  p_sell_price      NUMERIC DEFAULT 0,
  p_tags            JSONB DEFAULT '[]'::jsonb
)
RETURNS TABLE (
  id UUID,
  created BOOLEAN,
  updated BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_created BOOLEAN;
  v_updated BOOLEAN;
BEGIN
  INSERT INTO inventory_products (
    sku, name, description, category, color, size, image_url,
    unit_cost, sell_price,
    tiendanube_product_id, tiendanube_variant_id,
    tags, is_active
  ) VALUES (
    p_sku, p_name, p_description, p_category, p_color, p_size, p_image_url,
    p_unit_cost, p_sell_price,
    p_tn_product_id, p_tn_variant_id,
    p_tags, true
  )
  ON CONFLICT (tiendanube_product_id, tiendanube_variant_id)
  DO UPDATE SET
    sku = CASE WHEN inventory_products.sku = '' THEN EXCLUDED.sku ELSE inventory_products.sku END,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    color = EXCLUDED.color,
    size = EXCLUDED.size,
    image_url = EXCLUDED.image_url,
    unit_cost = EXCLUDED.unit_cost,
    sell_price = EXCLUDED.sell_price,
    tags = EXCLUDED.tags,
    is_active = true,
    updated_at = NOW()
  RETURNING id, (xmax = 0), (xmax != 0)
  INTO v_id, v_created, v_updated;

  RETURN QUERY SELECT v_id, v_created, v_updated;
END;
$$;

-- ── fn_upsert_tiendanube_client: Idempotent client upsert ──────────────
CREATE OR REPLACE FUNCTION public.fn_upsert_tiendanube_client(
  p_tn_customer_id   BIGINT,
  p_email            TEXT DEFAULT '',
  p_name             TEXT DEFAULT '',
  p_phone            TEXT DEFAULT '',
  p_document         TEXT DEFAULT '',
  p_address          JSONB DEFAULT '{}'::jsonb,
  p_tags             JSONB DEFAULT '[]'::jsonb,
  p_note             TEXT DEFAULT '',
  p_raw_payload      JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  id UUID,
  created BOOLEAN,
  updated BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_created BOOLEAN;
  v_updated BOOLEAN;
BEGIN
  INSERT INTO tiendanube_clients (
    tiendanube_customer_id, email, name, phone, document,
    default_address, tags, note, raw_payload, last_synced_at
  ) VALUES (
    p_tn_customer_id, p_email, p_name, p_phone, p_document,
    p_address, p_tags, p_note, p_raw_payload, NOW()
  )
  ON CONFLICT (tiendanube_customer_id)
  DO UPDATE SET
    email = COALESCE(NULLIF(EXCLUDED.email, ''), tiendanube_clients.email),
    name = EXCLUDED.name,
    phone = COALESCE(NULLIF(EXCLUDED.phone, ''), tiendanube_clients.phone),
    document = COALESCE(NULLIF(EXCLUDED.document, ''), tiendanube_clients.document),
    default_address = EXCLUDED.default_address,
    tags = EXCLUDED.tags,
    note = EXCLUDED.note,
    raw_payload = EXCLUDED.raw_payload,
    last_synced_at = NOW(),
    updated_at = NOW()
  RETURNING id, (xmax = 0), (xmax != 0)
  INTO v_id, v_created, v_updated;

  RETURN QUERY SELECT v_id, v_created, v_updated;
END;
$$;

-- ── fn_upsert_tiendanube_order: Atomic order + client + items + stock deduction ──
CREATE OR REPLACE FUNCTION public.fn_upsert_tiendanube_order(
  p_tn_order_id       BIGINT,
  p_order_number      TEXT DEFAULT '',
  p_tn_customer_id    BIGINT DEFAULT NULL,
  p_status            TEXT DEFAULT 'unknown',
  p_payment_status    TEXT DEFAULT '',
  p_payment_gateway   TEXT DEFAULT '',
  p_currency          TEXT DEFAULT 'COP',
  p_total             NUMERIC DEFAULT 0,
  p_subtotal          NUMERIC DEFAULT 0,
  p_tax               NUMERIC DEFAULT 0,
  p_shipping          NUMERIC DEFAULT 0,
  p_discount          NUMERIC DEFAULT 0,
  p_customer_email    TEXT DEFAULT '',
  p_customer_name     TEXT DEFAULT '',
  p_customer_phone    TEXT DEFAULT '',
  p_customer_document TEXT DEFAULT '',
  p_shipping_address  JSONB DEFAULT '{}'::jsonb,
  p_billing_address   JSONB DEFAULT '{}'::jsonb,
  p_line_items        JSONB DEFAULT '[]'::jsonb,
  p_raw_payload       JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  order_id UUID,
  client_id UUID,
  stock_deducted BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_client_id UUID;
  v_stock_deducted BOOLEAN := false;
  v_web_loc_id UUID;
  v_item JSONB;
  v_inventory_id UUID;
  v_qty INTEGER;
  v_tn_product_id BIGINT;
  v_tn_variant_id BIGINT;
  v_client_data JSONB;
BEGIN
  -- Get WEB location ID
  SELECT id INTO v_web_loc_id
  FROM inventory_locations
  WHERE code = 'WEB' AND is_active = true
  LIMIT 1;

  -- 1. Upsert client if we have customer ID
  IF p_tn_customer_id IS NOT NULL THEN
    INSERT INTO tiendanube_clients (
      tiendanube_customer_id, email, name, phone, document,
      default_address, tags, note, raw_payload, last_synced_at
    ) VALUES (
      p_tn_customer_id,
      p_customer_email, p_customer_name, p_customer_phone, p_customer_document,
      p_shipping_address, '[]'::jsonb, '', p_raw_payload, NOW()
    )
    ON CONFLICT (tiendanube_customer_id)
    DO UPDATE SET
      email = COALESCE(NULLIF(EXCLUDED.email, ''), tiendanube_clients.email),
      name = EXCLUDED.name,
      phone = COALESCE(NULLIF(EXCLUDED.phone, ''), tiendanube_clients.phone),
      document = COALESCE(NULLIF(EXCLUDED.document, ''), tiendanube_clients.document),
      default_address = EXCLUDED.default_address,
      raw_payload = EXCLUDED.raw_payload,
      last_synced_at = NOW(),
      updated_at = NOW()
    RETURNING id INTO v_client_id;
  END IF;

  -- 2. Upsert order
  INSERT INTO tiendanube_orders (
    tiendanube_order_id, order_number, tiendanube_customer_id,
    status, payment_status, fulfillment_status, payment_gateway,
    currency, total, subtotal, tax, shipping, discount,
    customer_email, customer_name, customer_phone, customer_document,
    shipping_address, billing_address, line_items, raw_payload,
    last_webhook_event, webhook_received_at
  ) VALUES (
    p_tn_order_id, p_order_number, p_tn_customer_id,
    p_status, p_payment_status, '', p_payment_gateway,
    p_currency, p_total, p_subtotal, p_tax, p_shipping, p_discount,
    p_customer_email, p_customer_name, p_customer_phone, p_customer_document,
    p_shipping_address, p_billing_address, p_line_items, p_raw_payload,
    'order/created', NOW()
  )
  ON CONFLICT (tiendanube_order_id)
  DO UPDATE SET
    order_number = EXCLUDED.order_number,
    tiendanube_customer_id = EXCLUDED.tiendanube_customer_id,
    status = CASE
      WHEN tiendanube_orders.status IN ('paid', 'refunded', 'cancelled') THEN tiendanube_orders.status
      ELSE EXCLUDED.status
    END,
    payment_status = EXCLUDED.payment_status,
    payment_gateway = EXCLUDED.payment_gateway,
    currency = EXCLUDED.currency,
    total = EXCLUDED.total,
    subtotal = EXCLUDED.subtotal,
    tax = EXCLUDED.tax,
    shipping = EXCLUDED.shipping,
    discount = EXCLUDED.discount,
    customer_email = EXCLUDED.customer_email,
    customer_name = EXCLUDED.customer_name,
    customer_phone = EXCLUDED.customer_phone,
    customer_document = EXCLUDED.customer_document,
    shipping_address = EXCLUDED.shipping_address,
    billing_address = EXCLUDED.billing_address,
    line_items = EXCLUDED.line_items,
    raw_payload = EXCLUDED.raw_payload,
    last_webhook_event = EXCLUDED.last_webhook_event,
    webhook_received_at = NOW(),
    updated_at = NOW()
  RETURNING id INTO v_order_id;

  -- 3. Upsert line items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_line_items)
  LOOP
    -- Extract fields (Tiendanube uses different field names)
    v_tn_product_id := (v_item->>'product_id')::BIGINT;
    v_tn_variant_id := CASE WHEN v_item->>'variant_id' IS NOT NULL THEN (v_item->>'variant_id')::BIGINT ELSE NULL END;
    v_qty := (v_item->>'quantity')::INT;

    -- Try to find inventory product
    SELECT id INTO v_inventory_id
    FROM inventory_products
    WHERE tiendanube_product_id = v_tn_product_id
      AND (tiendanube_variant_id = v_tn_variant_id OR (v_tn_variant_id IS NULL AND tiendanube_variant_id IS NULL))
    LIMIT 1;

    INSERT INTO tiendanube_order_items (
      order_id, tiendanube_order_id, tiendanube_item_id,
      tiendanube_product_id, tiendanube_variant_id,
      product_name, variant_name, sku,
      quantity, unit_price, total_price,
      inventory_product_id
    ) VALUES (
      v_order_id, p_tn_order_id, (v_item->>'id')::BIGINT,
      v_tn_product_id, v_tn_variant_id,
      v_item->>'name', v_item->>'variant', v_item->>'sku',
      v_qty, (v_item->>'unit_price')::NUMERIC, (v_item->>'total_price')::NUMERIC,
      v_inventory_id
    )
    ON CONFLICT DO NOTHING;  -- No unique constraint on items yet

    -- 4. Deduct stock from WEB location for paid orders
    IF v_web_loc_id IS NOT NULL AND v_inventory_id IS NOT NULL AND v_qty > 0 AND p_payment_status IN ('paid', 'authorized') THEN
      -- Use fn_update_stock to atomically deduct
      PERFORM fn_update_stock(
        v_inventory_id,
        v_web_loc_id,
        -v_qty,
        'dispatch',
        'tiendanube_order',
        v_order_id,
        format('TN order #%s', p_tn_order_id),
        NULL,
        'TiendaNube Webhook'
      );
      v_stock_deducted := true;
    END IF;
  END LOOP;

  -- Update order with stock_deducted flag
  IF v_stock_deducted THEN
    UPDATE tiendanube_orders
    SET stock_deducted = true, stock_deducted_at = NOW()
    WHERE id = v_order_id;
  END IF;

  RETURN QUERY SELECT v_order_id, v_client_id, v_stock_deducted;
END;
$$;

-- ═════════════════════════════════════════════════════════════════════════════
-- 6. VIEWS — Dedicated views for common query patterns
-- ═════════════════════════════════════════════════════════════════════════════

-- v_web_stock — Real-time stock for WEB location (frontend fast path)
CREATE OR REPLACE VIEW public.v_web_stock AS
SELECT
  ip.id AS product_id,
  ip.sku,
  ip.name,
  ip.category,
  ip.color,
  ip.size,
  ip.image_url,
  ip.sell_price,
  ip.tiendanube_product_id,
  ip.tiendanube_variant_id,
  COALESCE(s.quantity, 0) AS quantity,
  COALESCE(s.reserved, 0) AS reserved,
  GREATEST(0, COALESCE(s.quantity, 0) - COALESCE(s.reserved, 0)) AS available,
  s.unlimited_stock,
  s.low_stock_threshold,
  s.last_counted_at,
  s.updated_at AS stock_updated_at
FROM inventory_products ip
LEFT JOIN inventory_stock s
  ON s.product_id = ip.id
  AND s.location_id = (SELECT id FROM inventory_locations WHERE code = 'WEB' AND is_active = true)
WHERE ip.is_active = true;

-- v_cold_weather_line — Products tagged for cold weather
CREATE OR REPLACE VIEW public.v_cold_weather_line AS
SELECT *
FROM public.v_web_stock
WHERE category ILIKE '%frío%' OR category ILIKE '%cold%'
   OR 'frío' = ANY(tags) OR 'cold' = ANY(tags)
   OR name ILIKE '%frío%' OR name ILIKE '%thermal%' OR name ILIKE '%buzo%' OR name ILIKE '%chompa%';

-- v_tiendanube_orders_enriched — Orders with client + items for analytics
CREATE OR REPLACE VIEW public.v_tiendanube_orders_enriched AS
SELECT
  o.*,
  c.name AS client_name,
  c.email AS client_email,
  c.document AS client_document,
  c.total_spent AS client_total_spent,
  c.orders_count AS client_orders_count,
  (
    SELECT jsonb_agg(jsonb_build_object(
      'product_name', oi.product_name,
      'variant_name', oi.variant_name,
      'sku', oi.sku,
      'quantity', oi.quantity,
      'unit_price', oi.unit_price,
      'total_price', oi.total_price,
      'inventory_product_id', oi.inventory_product_id
    ))
    FROM tiendanube_order_items oi
    WHERE oi.order_id = o.id
  ) AS items
FROM tiendanube_orders o
LEFT JOIN tiendanube_clients c ON c.tiendanube_customer_id = o.tiendanube_customer_id;

-- v_client_ltv — Lifetime value per client (for dashboard)
CREATE OR REPLACE VIEW public.v_client_ltv AS
SELECT
  c.id,
  c.tiendanube_customer_id,
  c.name,
  c.email,
  c.phone,
  c.document,
  c.total_spent,
  c.orders_count,
  c.first_order_at,
  c.last_order_at,
  CASE
    WHEN c.orders_count >= 5 THEN 'vip'
    WHEN c.orders_count >= 2 THEN 'recurring'
    WHEN c.orders_count = 1 THEN 'one_time'
    ELSE 'prospect'
  END AS segment,
  EXTRACT(DAY FROM (NOW() - c.last_order_at)) AS days_since_last_order,
  c.total_spent / NULLIF(c.orders_count, 0) AS avg_order_value
FROM tiendanube_clients c
WHERE c.orders_count > 0;

-- ═════════════════════════════════════════════════════════════════════════════
-- 7. RLS POLICIES
-- ═════════════════════════════════════════════════════════════════════════════
ALTER TABLE tiendanube_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiendanube_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiendanube_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tno_select" ON tiendanube_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "tnoi_select" ON tiendanube_order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "tnc_select" ON tiendanube_clients FOR SELECT TO authenticated USING (true);

CREATE POLICY "tno_service_write" ON tiendanube_orders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "tnoi_service_write" ON tiendanube_order_items FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "tnc_service_write" ON tiendanube_clients FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON tiendanube_orders FROM anon;
REVOKE ALL ON tiendanube_order_items FROM anon;
REVOKE ALL ON tiendanube_clients FROM anon;

-- ═════════════════════════════════════════════════════════════════════════════
-- 8. GRANTS
-- ═════════════════════════════════════════════════════════════════════════════
GRANT EXECUTE ON FUNCTION public.fn_upsert_tiendanube_product TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_upsert_tiendanube_order TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_upsert_tiendanube_client TO service_role;

GRANT SELECT ON tiendanube_orders, tiendanube_order_items, tiendanube_clients TO authenticated;
GRANT ALL ON tiendanube_orders, tiendanube_order_items, tiendanube_clients TO service_role;

GRANT SELECT ON v_web_stock, v_cold_weather_line, v_tiendanube_orders_enriched, v_client_ltv TO authenticated;