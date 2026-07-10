-- 007_taller_tiendanube_sync.sql
-- Link production batches to Tiendanube products for automatic stock sync

ALTER TABLE production_batches
  ADD COLUMN IF NOT EXISTS tiendanube_product_id INTEGER,
  ADD COLUMN IF NOT EXISTS tiendanube_product_name TEXT,
  ADD COLUMN IF NOT EXISTS tiendanube_product_image TEXT,
  ADD COLUMN IF NOT EXISTS batch_variants JSONB;

CREATE INDEX IF NOT EXISTS idx_production_batches_tiendanube_product
  ON production_batches(tiendanube_product_id)
  WHERE tiendanube_product_id IS NOT NULL;
