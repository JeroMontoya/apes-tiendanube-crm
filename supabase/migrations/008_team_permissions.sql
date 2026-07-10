-- 008_team_permissions.sql
-- Granular permissions system for team members

ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS permissions JSONB;
