-- 039_inventory_unified_sync.sql
-- Puente de sincronización unificado entre el schema 019 (inventory_stock, UUID)
-- y el schema 027 (variant_stock, BIGINT + tiendanube_sync_queue).
--
-- NOTA IMPORTANTE: en producción la migración 027 NUNCA se aplicó (no existe
-- variant_stock ni tiendanube_sync_queue). Por eso:
--   1) La cola tiendanube_sync_queue se CREA aquí sobre el schema 019 (UUID),
--      con product_id como referencia principal (no depende de variant_stock).
--   2) Si algún día 027 se aplica, la cola ya existe y este script la ajusta
--      (relaja variant_id, agrega product_id si faltara).
--   3) El realtime de variant_stock solo se publica si la tabla existe.
--
-- Defensiva: cada bloque usa to_regclass para no fallar si falta 027.

-- ── 1. Cola de sync (sobre schema 019, UUID) ─────────────────────────────────
-- Crea la tabla si no existe. Si ya existe (p.ej. porque 027 se aplicó),
-- solo agrega product_id y relaja variant_id.
DO $$
BEGIN
  IF to_regclass('public.tiendanube_sync_queue') IS NULL THEN
    EXECUTE $ddl$
      CREATE TABLE tiendanube_sync_queue (
        id              BIGSERIAL PRIMARY KEY,
        -- Referencia principal al flujo UUID (schema 019).
        product_id      UUID REFERENCES inventory_products(id) ON DELETE CASCADE,
        -- Referencia opcional al schema 027 (variant_stock.variant_id, BIGINT).
        variant_id      BIGINT,
        tn_product_id   BIGINT,
        tn_variant_id   BIGINT,
        new_stock       INT,
        status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
        attempts        INT DEFAULT 0,
        max_attempts    INT DEFAULT 3,
        last_error      TEXT,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        processed_at    TIMESTAMPTZ,
        next_retry_at   TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX idx_tsq_status ON tiendanube_sync_queue(status, next_retry_at) WHERE status IN ('pending', 'failed');
      CREATE INDEX idx_tsq_product ON tiendanube_sync_queue(product_id) WHERE product_id IS NOT NULL;

      ALTER TABLE tiendanube_sync_queue ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Service role full access" ON tiendanube_sync_queue FOR ALL USING (true);
    $ddl$;
  ELSE
    -- Ya existe: soporte dual schema (027 ya aplicada antes).
    EXECUTE $ddl$
      ALTER TABLE tiendanube_sync_queue
        ALTER COLUMN variant_id DROP NOT NULL;

      ALTER TABLE tiendanube_sync_queue
        ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES inventory_products(id) ON DELETE CASCADE;

      CREATE INDEX IF NOT EXISTS idx_tsq_product ON tiendanube_sync_queue(product_id)
        WHERE product_id IS NOT NULL;
    $ddl$;
  END IF;
END $$;

-- ── 2. Realtime para variant_stock (schema 027) ──────────────────────────────
-- Solo aplica si 027 está presente; la UI principal usa inventory_stock (019),
-- que ya publica en el canal inv-stock-realtime.
DO $$
BEGIN
  IF to_regclass('public.variant_stock') IS NOT NULL THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE variant_stock;
  END IF;
END $$;

-- ── 3. RPC: encolar push a TiendaNube desde el flujo UUID (019) ──────────────
--    Crea/actualiza una fila pendiente para la variante; no hace reintento
--    inmediato (el procesador /api/inventory/sync-queue lo reintenta).
CREATE OR REPLACE FUNCTION public.fn_enqueue_tiendanube_sync(
  p_product_id     UUID,
  p_new_stock      INTEGER,
  p_reference_type TEXT DEFAULT 'taller_manual'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product inventory_products%ROWTYPE;
  v_queue_id BIGINT;
BEGIN
  SELECT * INTO v_product
  FROM inventory_products
  WHERE id = p_product_id;

  IF v_product IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Product not found');
  END IF;

  IF v_product.tiendanube_product_id IS NULL OR v_product.tiendanube_variant_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Product %s has no TiendaNube mapping', v_product.sku)
    );
  END IF;

  -- Prefer a pending/failed queue row to avoid duplicates for the same product.
  SELECT id INTO v_queue_id
  FROM tiendanube_sync_queue
  WHERE product_id = p_product_id
    AND status IN ('pending', 'failed')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_queue_id IS NOT NULL THEN
    UPDATE tiendanube_sync_queue
    SET new_stock = p_new_stock,
        tn_product_id = v_product.tiendanube_product_id,
        tn_variant_id = v_product.tiendanube_variant_id,
        status = 'pending',
        attempts = 0,
        last_error = NULL,
        next_retry_at = NOW(),
        processed_at = NULL,
        created_at = NOW()
    WHERE id = v_queue_id;
  ELSE
    INSERT INTO tiendanube_sync_queue (
      product_id, tn_product_id, tn_variant_id, new_stock,
      status, attempts, next_retry_at
    ) VALUES (
      p_product_id, v_product.tiendanube_product_id, v_product.tiendanube_variant_id,
      p_new_stock, 'pending', 0, NOW()
    )
    RETURNING id INTO v_queue_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'queue_id', v_queue_id,
    'product_id', p_product_id,
    'tn_product_id', v_product.tiendanube_product_id,
    'tn_variant_id', v_product.tiendanube_variant_id,
    'new_stock', p_new_stock,
    'reference_type', p_reference_type
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_enqueue_tiendanube_sync TO authenticated, service_role;
