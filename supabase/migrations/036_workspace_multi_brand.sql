-- ============================================================================
-- 036_workspace_multi_brand.sql
-- Adds multi-brand columns to the existing workspaces table so the
-- WorkspaceSelector can create, list, and switch between businesses.
-- ============================================================================

-- 1. Add identity / display columns
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '🏢';
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS owner_id UUID;

-- 2. Backfill owner_id from existing user_id so current rows are visible
UPDATE workspaces SET owner_id = user_id WHERE owner_id IS NULL AND user_id IS NOT NULL;

-- 3. Backfill name with a sensible default for rows that already exist
UPDATE workspaces SET name = 'Mi Negocio' WHERE name IS NULL;

-- 4. Make sure the primary key is UUID (the table might already use uuid)
--    If the PK is TEXT we can't change it live, but we ensure id column exists.
--    Most Supabase tables auto-create a uuid PK via gen_random_uuid().

-- 5. Add updated_at if missing
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 6. Create index for owner_id lookups
CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON workspaces(owner_id);

-- 7. RLS policies — allow authenticated users to manage their own workspaces
--    (The table likely already has RLS enabled; we add workspace-level policies)
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Read: users can see workspaces they own OR are assigned to (via user_id or owner_id)
DROP POLICY IF EXISTS "Users can view own workspaces" ON workspaces;
CREATE POLICY "Users can view own workspaces" ON workspaces
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR owner_id = auth.uid());

-- Insert: users can create workspaces for themselves
DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
CREATE POLICY "Users can create workspaces" ON workspaces
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR owner_id = auth.uid());

-- Update: users can edit their own workspaces
DROP POLICY IF EXISTS "Users can update own workspaces" ON workspaces;
CREATE POLICY "Users can update own workspaces" ON workspaces
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR owner_id = auth.uid());

-- Delete: users can remove their own workspaces
DROP POLICY IF EXISTS "Users can delete own workspaces" ON workspaces;
CREATE POLICY "Users can delete own workspaces" ON workspaces
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR owner_id = auth.uid());
