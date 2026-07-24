-- ============================================================================
-- 023_multitenant_setup.sql
-- Description: Evolves the architecture to support multiple tenants (businesses)
-- ============================================================================

-- 1. Create Core Multi-tenant Tables
CREATE TABLE IF NOT EXISTS businesses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_businesses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'manager', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, business_id)
);

-- 2. Insert Initial Tenant for existing data
INSERT INTO businesses (id, name) 
VALUES ('00000000-0000-0000-0000-000000000000', 'APES Digital')
ON CONFLICT DO NOTHING;

-- 3. Assign all existing users to the default business
INSERT INTO user_businesses (user_id, business_id, role)
SELECT id, '00000000-0000-0000-0000-000000000000', 'admin'
FROM auth.users
ON CONFLICT DO NOTHING;

-- 4. Function to add business_id to tables and set up basic RLS
CREATE OR REPLACE FUNCTION setup_multitenancy_for_table(table_name text)
RETURNS void AS $$
BEGIN
  -- Check if table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1) THEN
    
    -- Check if column exists, if not add it
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'business_id') THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN business_id UUID REFERENCES public.businesses(id)', table_name);
      
      -- Backfill with default business
      EXECUTE format('UPDATE public.%I SET business_id = %L WHERE business_id IS NULL', table_name, '00000000-0000-0000-0000-000000000000');
      
      -- Make it NOT NULL
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN business_id SET NOT NULL', table_name);
    END IF;

    -- Enable RLS
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);

    -- Drop existing default policies if they exist (to avoid conflicts, though this might need manual care)
    -- Instead, we just add the multi-tenant policy. We will name it specifically.
    
    -- Read policy
    EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation Policy Select" ON public.%I', table_name);
    EXECUTE format('CREATE POLICY "Tenant Isolation Policy Select" ON public.%I FOR SELECT TO authenticated USING (business_id IN (SELECT business_id FROM public.user_businesses WHERE user_id = auth.uid()))', table_name);
    
    -- Insert policy
    EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation Policy Insert" ON public.%I', table_name);
    EXECUTE format('CREATE POLICY "Tenant Isolation Policy Insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (business_id IN (SELECT business_id FROM public.user_businesses WHERE user_id = auth.uid()))', table_name);
    
    -- Update policy
    EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation Policy Update" ON public.%I', table_name);
    EXECUTE format('CREATE POLICY "Tenant Isolation Policy Update" ON public.%I FOR UPDATE TO authenticated USING (business_id IN (SELECT business_id FROM public.user_businesses WHERE user_id = auth.uid()))', table_name);
    
    -- Delete policy
    EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation Policy Delete" ON public.%I', table_name);
    EXECUTE format('CREATE POLICY "Tenant Isolation Policy Delete" ON public.%I FOR DELETE TO authenticated USING (business_id IN (SELECT business_id FROM public.user_businesses WHERE user_id = auth.uid()))', table_name);

  END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. Apply multi-tenancy to all known operational tables
SELECT setup_multitenancy_for_table('pqr_cases');
SELECT setup_multitenancy_for_table('team_members');
SELECT setup_multitenancy_for_table('activity_log');
SELECT setup_multitenancy_for_table('product_status');
SELECT setup_multitenancy_for_table('reorder_alerts');
SELECT setup_multitenancy_for_table('materials');
SELECT setup_multitenancy_for_table('production_batches');
SELECT setup_multitenancy_for_table('batch_sizes');
SELECT setup_multitenancy_for_table('batch_materials');
SELECT setup_multitenancy_for_table('material_usage_log');
SELECT setup_multitenancy_for_table('system_config');
SELECT setup_multitenancy_for_table('workshop_inventory');
SELECT setup_multitenancy_for_table('stock_movements');
SELECT setup_multitenancy_for_table('workshop_locations');
SELECT setup_multitenancy_for_table('inventory_locations');
SELECT setup_multitenancy_for_table('inventory_products');
SELECT setup_multitenancy_for_table('inventory_stock');
SELECT setup_multitenancy_for_table('inventory_movements');
SELECT setup_multitenancy_for_table('inventory_alerts');
SELECT setup_multitenancy_for_table('inventory_snapshots');
SELECT setup_multitenancy_for_table('inventory_suppliers');
SELECT setup_multitenancy_for_table('purchase_orders');
SELECT setup_multitenancy_for_table('purchase_order_items');
SELECT setup_multitenancy_for_table('tiendanube_orders');
SELECT setup_multitenancy_for_table('tiendanube_order_items');
SELECT setup_multitenancy_for_table('tiendanube_clients');

-- 6. Setup RLS for the core tables themselves
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their businesses" ON businesses;
CREATE POLICY "Users can view their businesses" ON businesses FOR SELECT TO authenticated
USING (id IN (SELECT business_id FROM user_businesses WHERE user_id = auth.uid()));

ALTER TABLE user_businesses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own business mappings" ON user_businesses;
CREATE POLICY "Users can view their own business mappings" ON user_businesses FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Cleanup function to not pollute the schema
DROP FUNCTION setup_multitenancy_for_table(text);
