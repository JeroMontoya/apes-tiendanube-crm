-- 025_whatsapp_capi.sql
-- WhatsApp Cloud API — Log de mensajes + Métricas de recuperación de carritos
-- ONYX v9.0 — Industrial Software Architecture

-- ============================================================
-- WhatsApp Cloud API - Production Tables
-- Opt-Out, 24h Window, Cart Queue, Message Log
-- ============================================================

-- Opt-Out Registry (GDPR / LGPD compliance)
CREATE TABLE IF NOT EXISTS whatsapp_opt_outs (
  id BIGSERIAL PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  reason TEXT DEFAULT 'user_reply',
  opted_out_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_opt_outs_phone ON whatsapp_opt_outs(phone);

ALTER TABLE whatsapp_opt_outs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON whatsapp_opt_outs FOR ALL USING (true);

-- 24-Hour Conversation Window Tracker
CREATE TABLE IF NOT EXISTS whatsapp_conversation_windows (
  id BIGSERIAL PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  last_inbound_at TIMESTAMPTZ,
  last_outbound_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conv_window_phone ON whatsapp_conversation_windows(phone);

ALTER TABLE whatsapp_conversation_windows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON whatsapp_conversation_windows FOR ALL USING (true);

-- Message Log (audit trail for all sends + receives)
CREATE TABLE IF NOT EXISTS whatsapp_messages_log (
  id BIGSERIAL PRIMARY KEY,
  to_phone TEXT NOT NULL,
  message_id TEXT,
  message_type TEXT DEFAULT 'text', -- text | template | image | interactive
  category TEXT DEFAULT 'general', -- abandoned_cart | post_purchase | retargeting | template | general
  content_preview TEXT,
  status TEXT DEFAULT 'pending', -- pending | sent | delivered | read | failed
  error_message TEXT,
  customer_name TEXT,
  product_name TEXT,
  order_number TEXT,
  discount_code TEXT,
  response_received BOOLEAN DEFAULT false,
  response_text TEXT,
  converted BOOLEAN DEFAULT false,
  converted_order_id TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ
);

-- Índices para queries frecuentes
CREATE INDEX IF NOT EXISTS idx_whatsapp_log_status ON whatsapp_messages_log(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_log_category ON whatsapp_messages_log(category);
CREATE INDEX IF NOT EXISTS idx_whatsapp_log_sent ON whatsapp_messages_log(sent_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_log_phone ON whatsapp_messages_log(to_phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_log_converted ON whatsapp_messages_log(converted);

-- RLS
ALTER TABLE whatsapp_messages_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON whatsapp_messages_log FOR ALL USING (true);

-- Cola de carritos abandonados para follow-up WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_cart_queue (
  id BIGSERIAL PRIMARY KEY,
  tn_order_id BIGINT UNIQUE NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  product_names TEXT,
  cart_total NUMERIC DEFAULT 0,
  checkout_url TEXT,
  status TEXT DEFAULT 'pending', -- pending | sent | completed | expired
  send_after TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cart_queue_status ON whatsapp_cart_queue(status);
CREATE INDEX IF NOT EXISTS idx_cart_queue_send_after ON whatsapp_cart_queue(send_after);

ALTER TABLE whatsapp_cart_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON whatsapp_cart_queue FOR ALL USING (true);

-- Vista de métricas de recuperación de carritos
CREATE OR REPLACE VIEW whatsapp_cart_recovery_stats AS
SELECT
  DATE(sent_at) as day,
  COUNT(*) as total_sent,
  COUNT(*) FILTER (WHERE status = 'sent') as successfully_sent,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  COUNT(*) FILTER (WHERE converted = true) as recovered,
  ROUND(
    COUNT(*) FILTER (WHERE converted = true)::numeric /
    NULLIF(COUNT(*) FILTER (WHERE status = 'sent'), 0) * 100,
    1
  ) as recovery_rate
FROM whatsapp_messages_log
WHERE category = 'abandoned_cart'
  AND sent_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(sent_at)
ORDER BY day DESC;

-- Vista de métricas generales
CREATE OR REPLACE VIEW whatsapp_overall_stats AS
SELECT
  category,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'sent') as sent,
  COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
  COUNT(*) FILTER (WHERE status = 'read') as read_count,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  COUNT(*) FILTER (WHERE response_received = true) as responses,
  COUNT(*) FILTER (WHERE converted = true) as conversions,
  ROUND(
    COUNT(*) FILTER (WHERE converted = true)::numeric /
    NULLIF(COUNT(*) FILTER (WHERE status = 'sent'), 0) * 100,
    1
  ) as conversion_rate
FROM whatsapp_messages_log
WHERE sent_at > NOW() - INTERVAL '30 days'
GROUP BY category;
