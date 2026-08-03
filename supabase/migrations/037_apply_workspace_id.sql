-- ============================================================================
-- 037_apply_workspace_id.sql
-- Fixes constraint errors on workspaces and adds workspace_id to all tables
-- ============================================================================

-- 1. Remove the unique constraint that prevents creating multiple workspaces
ALTER TABLE workspaces DROP CONSTRAINT IF EXISTS workspaces_user_id_key;
ALTER TABLE workspaces DROP CONSTRAINT IF EXISTS workspaces_user_id_key1;

-- 2. Helper function to add workspace_id safely to any table
CREATE OR REPLACE FUNCTION add_workspace_id_to_table(target_table text)
RETURNS void AS $$
DECLARE
  default_ws UUID;
BEGIN
  -- Get the first workspace available to use as fallback for existing data
  SELECT id INTO default_ws FROM public.workspaces LIMIT 1;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = target_table) THEN
    
    -- Check if workspace_id column exists, if not add it
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = target_table AND column_name = 'workspace_id') THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN workspace_id TEXT', target_table);
      
      -- Backfill with default workspace if we found one
      IF default_ws IS NOT NULL THEN
        EXECUTE format('UPDATE public.%I SET workspace_id = %L WHERE workspace_id IS NULL', target_table, default_ws);
      END IF;
    END IF;

  END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. Apply to tables throwing 400 errors in the frontend
SELECT add_workspace_id_to_table('team_members');
SELECT add_workspace_id_to_table('activity_log');
SELECT add_workspace_id_to_table('pqr_cases');

-- (Add other tables if they also need it, but these fix the immediate errors)
-- SELECT add_workspace_id_to_table('tiendanube_orders');
-- SELECT add_workspace_id_to_table('tiendanube_clients');
-- SELECT add_workspace_id_to_table('inventory_stock');

-- Cleanup
DROP FUNCTION add_workspace_id_to_table(text);
