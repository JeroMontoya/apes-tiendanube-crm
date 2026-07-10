-- 006_production_system.sql
-- Production batches, size breakdown, materials inventory

-- ── Materials (insumos/telas) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'tela' CHECK (category IN ('tela', 'hilo', 'etiqueta', 'boton', 'cierre', 'tinte', 'otro')),
  color TEXT,
  unit TEXT NOT NULL DEFAULT 'metro' CHECK (unit IN ('metro', 'yarda', 'kilogramo', 'unidad', 'rollo')),
  stock_quantity NUMERIC DEFAULT 0,
  min_stock NUMERIC DEFAULT 5,
  cost_per_unit NUMERIC DEFAULT 0,
  supplier TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES team_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Production Batches (lotes de producción) ──────────────────────
CREATE TABLE IF NOT EXISTS production_batches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_code TEXT UNIQUE NOT NULL,
  product_name TEXT NOT NULL,
  product_description TEXT,
  category TEXT DEFAULT 'camiseta' CHECK (category IN ('camiseta', 'buzo', 'pants', 'gorra', 'short', 'chaqueta', 'otro')),
  material TEXT DEFAULT 'algodon' CHECK (material IN ('algodon', 'poliéster', 'licra', 'mezclilla', 'cuero', 'tela_fria', 'otro')),
  color TEXT,
  color_hex TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'cutting', 'sewing', 'printing', 'quality', 'ready', 'shipped')),
  total_quantity INTEGER DEFAULT 0,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('urgente', 'alta', 'normal', 'baja')),
  notes TEXT,
  due_date DATE,
  assigned_to UUID REFERENCES team_members(id) ON DELETE SET NULL,
  created_by UUID REFERENCES team_members(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Batch Sizes (tallas por lote) ────────────────────────────────
CREATE TABLE IF NOT EXISTS batch_sizes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID REFERENCES production_batches(id) ON DELETE CASCADE,
  size TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  produced INTEGER DEFAULT 0,
  defect INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Batch Materials (materiales usados por lote) ──────────────────
CREATE TABLE IF NOT EXISTS batch_materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID REFERENCES production_batches(id) ON DELETE CASCADE,
  material_id UUID REFERENCES materials(id) ON DELETE SET NULL,
  material_name TEXT,
  quantity_used NUMERIC DEFAULT 0,
  unit TEXT DEFAULT 'metro',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Material Usage Log ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS material_usage_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID REFERENCES materials(id) ON DELETE SET NULL,
  material_name TEXT,
  batch_id UUID REFERENCES production_batches(id) ON DELETE SET NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('added', 'used', 'adjusted', 'returned')),
  quantity NUMERIC NOT NULL,
  previous_stock NUMERIC,
  new_stock NUMERIC,
  notes TEXT,
  created_by UUID REFERENCES team_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_production_batches_status ON production_batches(status);
CREATE INDEX IF NOT EXISTS idx_production_batches_created ON production_batches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_batch_sizes_batch_id ON batch_sizes(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_materials_batch_id ON batch_materials(batch_id);
CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category);
CREATE INDEX IF NOT EXISTS idx_material_usage_log_material ON material_usage_log(material_id);

-- ── RLS ───────────────────────────────────────────────────────────
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Materials visible" ON materials FOR SELECT TO authenticated USING (true);
CREATE POLICY "Materials manage" ON materials FOR ALL TO authenticated USING (true);
CREATE POLICY "Batches visible" ON production_batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Batches manage" ON production_batches FOR ALL TO authenticated USING (true);
CREATE POLICY "Batch sizes manage" ON batch_sizes FOR ALL TO authenticated USING (true);
CREATE POLICY "Batch materials manage" ON batch_materials FOR ALL TO authenticated USING (true);
CREATE POLICY "Material usage visible" ON material_usage_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Material usage insert" ON material_usage_log FOR INSERT TO authenticated WITH CHECK (true);
