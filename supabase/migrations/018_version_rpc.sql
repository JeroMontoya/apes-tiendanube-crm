-- =============================================
-- 018_version_rpc.sql
-- Add version RPC function for health checks
-- =============================================

CREATE OR REPLACE FUNCTION public.version()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT '1.0.0'::text;
$$;

GRANT EXECUTE ON FUNCTION public.version() TO anon, authenticated, service_role;