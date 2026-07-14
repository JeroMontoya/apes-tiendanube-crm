-- 016_enable_realtime.sql
-- Enable Supabase Realtime (Postgres CDC) for cross-device real-time sync

ALTER PUBLICATION supabase_realtime ADD TABLE pqr_cases;
ALTER PUBLICATION supabase_realtime ADD TABLE server_cache;
