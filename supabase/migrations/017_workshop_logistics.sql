-- 017_workshop_logistics.sql
-- Unified workshop inventory + stock movements logistics system

-- ═══ Unified Product Catalog ═══
-- Sources: tiendanube (auto-synced), local (manual), other_store (manual)
CREATE TABLE IF NOT EXISTS workshop_inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('tiendanube', 'local', 'other_store')),
  source_store_name TEXT DEFAULT '',
  tiendanube_product_id INTEGER,
  tiendanube_variant_id INTEGER,
  sku TEXT DEFAULT '',
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT 'otro',
  color TEXT DEFAULT '',
  size TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  cost_price NUMERIC DEFAULT 0,
  sell_price NUMERIC DEFAULT 0,
  current_stock INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 0,
  location TEXT DEFAULT '',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  tags JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wi_source ON workshop_inventory(source);
CREATE INDEX IF NOT EXISTS idx_wi_tn_product ON workshop_inventory(tiendanube_product_id);
CREATE INDEX IF NOT EXISTS idx_wi_category ON workshop_inventory(category);
CREATE INDEX IF NOT EXISTS idx_wi_status ON workshop_inventory(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_wi_tn_variant ON workshop_inventory(tiendanube_product_id, tiendanube_variant_id) WHERE tiendanube_product_id IS NOT NULL;

-- ═══ Stock Movements (Logistics) ═══
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_item_id UUID REFERENCES workshop_inventory(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('receive', 'dispatch', 'transfer', 'adjust', 'production_in', 'production_out', 'return', 'defect')),
  quantity INTEGER NOT NULL,
  from_location TEXT DEFAULT '',
  to_location TEXT DEFAULT '',
  batch_id UUID REFERENCES production_batches(id) ON DELETE SET NULL,
  reference TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  performed_by UUID,
  performed_by_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sm_item ON stock_movements(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_sm_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_sm_date ON stock_movements(created_at DESC);

-- ═══ Workshop Locations ═══
CREATE TABLE IF NOT EXISTS workshop_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  type TEXT DEFAULT 'storage' CHECK (type IN ('storage', 'production', 'dispatch', 'returns', 'external')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default locations
INSERT INTO workshop_locations (name, description, type) VALUES
  ('Almacén General', 'Stock principal del taller', 'storage'),
  ('Zona de Producción', 'Área de corte, costura, estampado', 'production'),
  ('Despacho', 'Productos listos para envío', 'dispatch'),
  ('Devoluciones', 'Productos devueltos por clientes', 'returns')
ON CONFLICT (name) DO NOTHING;

-- RLS
ALTER TABLE workshop_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read workshop_inventory" ON workshop_inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage workshop_inventory" ON workshop_inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can read stock_movements" ON stock_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage stock_movements" ON stock_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can read workshop_locations" ON workshop_locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage workshop_locations" ON workshop_locations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ═══ Auto-update updated_at trigger ═══
CREATE OR REPLACE FUNCTION update_wi_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workshop_inventory_updated_at
  BEFORE UPDATE ON workshop_inventory
  FOR EACH ROW EXECUTE FUNCTION update_wi_updated_at();

-- ═══ Auto-update stock on movement insert ═══
CREATE OR REPLACE FUNCTION update_stock_on_movement()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE workshop_inventory
  SET current_stock = GREATEST(0, current_stock + NEW.quantity)
  WHERE id = NEW.inventory_item_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stock_movement
  AFTER INSERT ON stock_movements
  FOR EACH ROW EXECUTE FUNCTION update_stock_on_movement();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE workshop_inventory;
ALTER PUBLICATION supabase_realtime ADD TABLE stock_movements;
