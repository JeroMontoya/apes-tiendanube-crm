-- 026_whatsapp_hot_leads.sql
-- WhatsApp Objection Classifier — Hot Leads para cierre de ventas
-- ONYX v11.0 — Industrial Software Architecture

CREATE TABLE IF NOT EXISTS whatsapp_hot_leads (
  id BIGSERIAL PRIMARY KEY,
  phone TEXT NOT NULL,
  customer_name TEXT,
  objection_type TEXT NOT NULL, -- PRECIO | ENVIO | TALLA | DISPONIBILIDAD | GARANTIA | CONFIANZA | COMPRA_INTENT | GENERIC
  message_text TEXT,
  confidence NUMERIC DEFAULT 0.5,
  related_order_id BIGINT,
  product_context TEXT,
  cart_total NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'NEW', -- NEW | CONTACTED | CONVERTED | CLOSED | EXPIRED
  priority INTEGER DEFAULT 3, -- 1=URGENT (purchase intent) | 2=HIGH (high confidence objection) | 3=NORMAL
  assigned_to TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  contacted_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_hot_leads_status ON whatsapp_hot_leads(status);
CREATE INDEX IF NOT EXISTS idx_hot_leads_priority ON whatsapp_hot_leads(priority);
CREATE INDEX IF NOT EXISTS idx_hot_leads_phone ON whatsapp_hot_leads(phone);
CREATE INDEX IF NOT EXISTS idx_hot_leads_type ON whatsapp_hot_leads(objection_type);
CREATE INDEX IF NOT EXISTS idx_hot_leads_created ON whatsapp_hot_leads(created_at);

ALTER TABLE whatsapp_hot_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON whatsapp_hot_leads FOR ALL USING (true);

-- Add processing_started_at to cart queue for CAS tracking
ALTER TABLE whatsapp_cart_queue ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;
ALTER TABLE whatsapp_cart_queue ADD COLUMN IF NOT EXISTS message_id TEXT;
ALTER TABLE whatsapp_cart_queue ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE whatsapp_cart_queue ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ;

-- Dashboard view: Hot Leads stats
CREATE OR REPLACE VIEW whatsapp_hot_leads_stats AS
SELECT
  objection_type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'NEW') as new_leads,
  COUNT(*) FILTER (WHERE status = 'CONTACTED') as contacted,
  COUNT(*) FILTER (WHERE status = 'CONVERTED') as converted,
  COUNT(*) FILTER (WHERE status = 'URGENT' OR priority = 1) as urgent,
  ROUND(AVG(confidence), 2) as avg_confidence,
  ROUND(AVG(cart_total), 0) as avg_cart_value
FROM whatsapp_hot_leads
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY objection_type
ORDER BY total DESC;

-- Dashboard view: Queue processor health
CREATE OR REPLACE VIEW whatsapp_queue_health AS
SELECT
  DATE(created_at) as day,
  COUNT(*) as total_enqueued,
  COUNT(*) FILTER (WHERE status = 'sent') as sent,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  COUNT(*) FILTER (WHERE status = 'expired') as expired,
  COUNT(*) FILTER (WHERE status = 'processing') as stuck_processing,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'sent')::numeric /
    NULLIF(COUNT(*) FILTER (WHERE status IN ('sent', 'failed', 'expired')), 0) * 100,
    1
  ) as success_rate
FROM whatsapp_cart_queue
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY day DESC;
