-- PQR Soft Delete + Papelera System
-- Adds deleted_at column for soft-delete, trash view, and restore RPC

-- 1. Add deleted_at column
ALTER TABLE pqr_cases ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Index for filtering active vs trashed cases
CREATE INDEX IF NOT EXISTS idx_pqr_cases_deleted_at ON pqr_cases(deleted_at);

-- 2. View: Active cases (not deleted)
CREATE OR REPLACE VIEW v_pqr_active AS
SELECT * FROM pqr_cases WHERE deleted_at IS NULL ORDER BY created_at DESC;

-- 3. View: Trashed cases (deleted, with auto-purge after 30 days)
CREATE OR REPLACE VIEW v_pqr_trash AS
SELECT *,
  EXTRACT(DAY FROM NOW() - deleted_at)::int AS days_in_trash,
  CASE
    WHEN deleted_at < NOW() - INTERVAL '30 days' THEN true
    ELSE false
  END AS purge_eligible
FROM pqr_cases
WHERE deleted_at IS NOT NULL
ORDER BY deleted_at DESC;

-- 4. RPC: Soft-delete a case (sets deleted_at = NOW())
CREATE OR REPLACE FUNCTION fn_pqr_soft_delete(p_case_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE pqr_cases SET deleted_at = NOW() WHERE id = p_case_id AND deleted_at IS NULL;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC: Restore a case from trash (sets deleted_at = NULL)
CREATE OR REPLACE FUNCTION fn_pqr_restore(p_case_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE pqr_cases SET deleted_at = NULL WHERE id = p_case_id AND deleted_at IS NOT NULL;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC: Permanent purge of cases older than 30 days in trash
CREATE OR REPLACE FUNCTION fn_pqr_purge_old_trash()
RETURNS INT AS $$
DECLARE
  purged INT;
BEGIN
  DELETE FROM pqr_cases WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS purged = ROW_COUNT;
  RETURN purged;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
