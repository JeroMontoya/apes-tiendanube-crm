-- ============================================================================
-- 021_merge_taller_inventory.sql
-- Migrates data from workshop_inventory → unified inventory_products + inventory_stock
-- All products are assigned to locations based on source:
--   - source='tiendanube' → WEB location
--   - source='local' or 'other_store' → R5 location
-- ============================================================================

-- 1. Migrate products from workshop_inventory into inventory_products
--    Each workshop_inventory row = one inventory_products row + one inventory_stock row
--    We merge by (name, color, size, sku) to avoid duplicates.

DO $$
DECLARE
  v_web_loc UUID;
  v_r5_loc UUID;
  v_rec RECORD;
  v_product_id UUID;
  v_upserted_count INTEGER := 0;
BEGIN
  -- Get location IDs
  SELECT id INTO v_web_loc FROM inventory_locations WHERE code = 'WEB';
  SELECT id INTO v_r5_loc FROM inventory_locations WHERE code = 'R5';

  IF v_web_loc IS NULL OR v_r5_loc IS NULL THEN
    RAISE EXCEPTION 'inventory_locations not seeded. Run 019 first.';
  END IF;

  FOR v_rec IN
    SELECT
      wi.id AS wi_id,
      wi.name,
      wi.description,
      wi.sku,
      wi.color,
      wi.size,
      wi.category,
      wi.image_url,
      wi.cost_price,
      wi.sell_price,
      wi.current_stock,
      wi.source,
      wi.tiendanube_product_id,
      wi.tiendanube_variant_id,
      wi.tags,
      wi.status,
      CASE
        WHEN wi.source = 'tiendanube' THEN v_web_loc
        ELSE v_r5_loc
      END AS target_location
    FROM workshop_inventory wi
    WHERE wi.status = 'active'
  LOOP
    -- Upsert product into inventory_products
    INSERT INTO inventory_products (
      sku, name, description, category, color, size, image_url,
      unit_cost, sell_price, tiendanube_product_id, tiendanube_variant_id,
      tags, is_active
    ) VALUES (
      v_rec.sku,
      v_rec.name,
      v_rec.description,
      COALESCE(v_rec.category, 'otro'),
      COALESCE(v_rec.color, ''),
      COALESCE(v_rec.size, ''),
      COALESCE(v_rec.image_url, ''),
      COALESCE(v_rec.cost_price, 0),
      COALESCE(v_rec.sell_price, 0),
      v_rec.tiendanube_product_id,
      v_rec.tiendanube_variant_id,
      COALESCE(v_rec.tags, '[]'::jsonb),
      true
    )
    ON CONFLICT (sku) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      category = EXCLUDED.category,
      color = EXCLUDED.color,
      size = EXCLUDED.size,
      image_url = EXCLUDED.image_url,
      unit_cost = EXCLUDED.unit_cost,
      sell_price = EXCLUDED.sell_price,
      tiendanube_product_id = COALESCE(EXCLUDED.tiendanube_product_id, inventory_products.tiendanube_product_id),
      tiendanube_variant_id = COALESCE(EXCLUDED.tiendanube_variant_id, inventory_products.tiendanube_variant_id),
      updated_at = NOW()
    RETURNING id INTO v_product_id;

    -- Insert stock record at target location
    INSERT INTO inventory_stock (product_id, location_id, quantity, low_stock_threshold)
    VALUES (v_product_id, v_target_location, COALESCE(v_rec.current_stock, 0), 5)
    ON CONFLICT (product_id, location_id) DO UPDATE SET
      quantity = GREATEST(inventory_stock.quantity, EXCLUDED.quantity),
      updated_at = NOW();

    v_upserted_count := v_upserted_count + 1;
  END LOOP;

  RAISE NOTICE 'Migrated % products from workshop_inventory', v_upserted_count;
END $$;

-- 2. Migrate historical stock_movements (old format) into inventory_movements
--    Old stock_movements uses inventory_item_id → workshop_inventory.id
--    We need to map workshop_inventory.id → inventory_products.id + location

DO $$
DECLARE
  v_rec RECORD;
  v_product UUID;
  v_loc UUID;
  v_count INTEGER := 0;
BEGIN
  FOR v_rec IN
    SELECT sm.*, wi.tiendanube_product_id, wi.source
    FROM stock_movements sm
    JOIN workshop_inventory wi ON wi.id = sm.inventory_item_id
    WHERE sm.created_at > NOW() - INTERVAL '90 days'
  LOOP
    -- Find the product
    SELECT id INTO v_product
    FROM inventory_products
    WHERE tiendanube_product_id = v_rec.tiendanube_product_id
      AND tiendanube_variant_id IS NOT NULL
    LIMIT 1;

    IF v_product IS NULL AND v_rec.sku != '' THEN
      SELECT id INTO v_product
      FROM inventory_products
      WHERE sku = v_rec.sku
      LIMIT 1;
    END IF;

    IF v_product IS NULL THEN
      CONTINUE;
    END IF;

    -- Determine location
    IF v_rec.source = 'tiendanube' THEN
      SELECT id INTO v_loc FROM inventory_locations WHERE code = 'WEB';
    ELSE
      SELECT id INTO v_loc FROM inventory_locations WHERE code = 'R5';
    END IF;

    -- Map old movement_type to new type
    INSERT INTO inventory_movements (
      product_id, location_id, type, quantity,
      notes, performed_by_name, created_at
    ) VALUES (
      v_product,
      v_loc,
      CASE
        WHEN v_rec.movement_type IN ('receive', 'production', 'restock') THEN 'receive'
        WHEN v_rec.movement_type IN ('dispatch', 'sale', 'shipping') THEN 'dispatch'
        WHEN v_rec.movement_type IN ('adjust', 'adjustment') THEN 'adjustment'
        WHEN v_rec.movement_type IN ('defect', 'damaged', 'return') THEN 'return'
        ELSE 'adjustment'
      END,
      COALESCE(v_rec.quantity, 0),
      COALESCE(v_rec.notes, ''),
      COALESCE(v_rec.performed_by_name, ''),
      v_rec.created_at
    );
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Migrated % stock movements', v_count;
END $$;

-- 3. Create initial stock snapshots for current state
SELECT fn_daily_snapshot(CURRENT_DATE);
