-- Migration 010: Fix team_member user_id values
-- Previously, createMember() assigned the logged-in user's user_id to ALL members
-- they created. Only the admin's own record should have user_id set.
--
-- Fix: For any user_id that appears on multiple members, keep only the
-- earliest (by created_at) member and clear user_id from the rest.

WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY created_at ASC
    ) AS rn
  FROM team_members
  WHERE user_id IS NOT NULL
)
UPDATE team_members
SET user_id = NULL
WHERE id IN (
  SELECT id FROM ranked WHERE rn > 1
);
