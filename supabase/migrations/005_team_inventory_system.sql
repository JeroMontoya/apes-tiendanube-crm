-- 005_team_inventory_system.sql
-- Team management, activity logging, product status, and reorder alerts

-- ── Team Members ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'taller', 'ventas', 'atencion_cliente')),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Activity Log ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES team_members(id) ON DELETE SET NULL,
  member_name TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  target_name TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Product Status (taller/production tracking) ───────────────────
CREATE TABLE IF NOT EXISTS product_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tiendanube_product_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'in_production', 'low_stock', 'out_of_stock', 'ready_to_ship')),
  stock_override INTEGER,
  assigned_to UUID REFERENCES team_members(id) ON DELETE SET NULL,
  notes TEXT,
  updated_by UUID REFERENCES team_members(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Reorder Alerts ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reorder_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tiendanube_product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  threshold INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  last_notified_at TIMESTAMPTZ,
  created_by UUID REFERENCES team_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON team_members(role);
CREATE INDEX IF NOT EXISTS idx_activity_log_member_id ON activity_log(member_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_status_product_id ON product_status(tiendanube_product_id);
CREATE INDEX IF NOT EXISTS idx_reorder_alerts_product_id ON reorder_alerts(tiendanube_product_id);

-- ── RLS Policies ──────────────────────────────────────────────────
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE reorder_alerts ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all team data
CREATE POLICY "Team members visible to authenticated" ON team_members
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Activity log visible to authenticated" ON activity_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Product status visible to authenticated" ON product_status
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Reorder alerts visible to authenticated" ON reorder_alerts
  FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert/update
CREATE POLICY "Team members manage" ON team_members
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Activity log insert" ON activity_log
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Product status manage" ON product_status
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Reorder alerts manage" ON reorder_alerts
  FOR ALL TO authenticated USING (true);
