-- Fix PQR visibility: allow all authenticated users to see all cases
-- Run this in Supabase SQL Editor

-- Drop the restrictive per-user policy
DROP POLICY IF EXISTS "Users can CRUD their own PQR cases" ON pqr_cases;

-- Allow all authenticated users to view all PQR cases
CREATE POLICY "Authenticated users can view all PQR cases"
  ON pqr_cases FOR SELECT TO authenticated USING (true);

-- Allow all authenticated users to insert PQR cases
CREATE POLICY "Authenticated users can insert PQR cases"
  ON pqr_cases FOR INSERT TO authenticated WITH CHECK (true);

-- Allow all authenticated users to update PQR cases
CREATE POLICY "Authenticated users can update PQR cases"
  ON pqr_cases FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Allow all authenticated users to delete PQR cases
CREATE POLICY "Authenticated users can delete PQR cases"
  ON pqr_cases FOR DELETE TO authenticated USING (true);
