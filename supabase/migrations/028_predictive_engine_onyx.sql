-- 028_predictive_engine_onyx.sql
-- Predictive Intelligence Engine: Stock Velocity + Budget Governance
-- ONYX v16.0 — Industrial Software Architecture
-- Builds on 027_multi_inventory.sql (variant_stock, inventory_transfers)

BEGIN;

-- 1. stock_velocity — Rolling velocity tracker per variant
CREATE TABLE IF NOT EXISTS stock_velocity (
  id                BIGSERIAL PRIMARY KEY,
  variant_id        BIGINT NOT NULL REFERENCES variant_stock(variant_id) ON DELETE CASCADE,
  velocity_1d       INT DEFAULT 0,
  velocity_7d       INT DEFAULT 0,
  velocity_30d      INT DEFAULT 0,
  trend_pct         NUMERIC DEFAULT 0,
  trend_direction   TEXT DEFAULT 'stable' CHECK (trend_direction IN ('accelerating','stable','decelerating','dormant')),
  days_to_stockout  NUMERIC,
  projected_stockout_date TIMESTAMPTZ,
  confidence        NUMERIC DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  revenue_1d        NUMERIC DEFAULT 0,
  revenue_7d        NUMERIC DEFAULT 0,
  revenue_30d       NUMERIC DEFAULT 0,
  avg_sell_price    NUMERIC DEFAULT 0,
  alert_threshold_days INT DEFAULT 14,
  is_alert_active   BOOLEAN DEFAULT false,
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sv_variant ON stock_velocity(variant_id);
CREATE INDEX IF NOT EXISTS idx_sv_alert ON stock_velocity(is_alert_active) WHERE is_alert_active = true;
CREATE INDEX IF NOT EXISTS idx_sv_stockout ON stock_velocity(projected_stockout_date) WHERE projected_stockout_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sv_trend ON stock_velocity(trend_direction) WHERE trend_direction != 'stable';

-- 2. ad_budget_governance — Pacing log for Meta Ads spend control
CREATE TABLE IF NOT EXISTS ad_budget_governance (
  id                BIGSERIAL PRIMARY KEY,
  ad_account_id     TEXT NOT NULL,
  campaign_id       TEXT NOT NULL,
  adset_id          TEXT NOT NULL,
  adset_name        TEXT DEFAULT '',
  daily_budget      NUMERIC DEFAULT 0,
  spent_today       NUMERIC DEFAULT 0,
  spend_rate        NUMERIC DEFAULT 0,
  pacing_status     TEXT DEFAULT 'on_track' CHECK (pacing_status IN ('under_pacing','on_track','over_pacing','capped')),
  impressions       INT DEFAULT 0,
  clicks            INT DEFAULT 0,
  cpc               NUMERIC DEFAULT 0,
  cpm               NUMERIC DEFAULT 0,
  ctr               NUMERIC DEFAULT 0,
  conversions       INT DEFAULT 0,
  cpa               NUMERIC DEFAULT 0,
  roas              NUMERIC DEFAULT 0,
  revenue_generated NUMERIC DEFAULT 0,
  linked_variant_id BIGINT REFERENCES variant_stock(variant_id),
  variant_stock_remaining INT,
  stockout_risk     TEXT DEFAULT 'low' CHECK (stockout_risk IN ('low','medium','high','critical')),
  auto_paused       BOOLEAN DEFAULT false,
  auto_pause_reason TEXT,
  action_taken      TEXT DEFAULT 'none' CHECK (action_taken IN ('none','scaled_up','scaled_down','paused','resumed')),
  action_reason     TEXT,
  action_at         TIMESTAMPTZ,
  date_range_start  DATE,
  date_range_end    DATE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_abg_adset ON ad_budget_governance(adset_id);
CREATE INDEX IF NOT EXISTS idx_abg_date ON ad_budget_governance(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_abg_pacing ON ad_budget_governance(pacing_status);
CREATE INDEX IF NOT EXISTS idx_abg_variant ON ad_budget_governance(linked_variant_id) WHERE linked_variant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_abg_risk ON ad_budget_governance(stockout_risk) WHERE stockout_risk IN ('high','critical');

-- 3. stock_alerts_log — Historical alert log
CREATE TABLE IF NOT EXISTS stock_alerts_log (
  id                BIGSERIAL PRIMARY KEY,
  variant_id        BIGINT NOT NULL REFERENCES variant_stock(variant_id) ON DELETE CASCADE,
  alert_type        TEXT NOT NULL CHECK (alert_type IN ('stockout_imminent','velocity_spike','overstock','budget_paused','restock_needed')),
  severity          TEXT DEFAULT 'info' CHECK (severity IN ('info','warning','critical')),
  message           TEXT NOT NULL,
  current_stock     INT,
  projected_days    NUMERIC,
  metadata          JSONB DEFAULT '{}'::jsonb,
  acknowledged      BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sal_variant ON stock_alerts_log(variant_id);
CREATE INDEX IF NOT EXISTS idx_sal_unack ON stock_alerts_log(acknowledged) WHERE acknowledged = false;
CREATE INDEX IF NOT EXISTS idx_sal_date ON stock_alerts_log(created_at DESC);

-- 4. RPC: Recalculate velocity for a variant
CREATE OR REPLACE FUNCTION fn_recalculate_velocity_for_variant(p_variant_id BIGINT)
RETURNS VOID LANGUAGE plpgsql AS $DECLARE
  v_stock RECORD;
  v_sold_1d INT; v_sold_7d INT; v_sold_30d INT;
  v_rev_1d NUMERIC; v_rev_7d NUMERIC; v_rev_30d NUMERIC;
  v_prev_7d INT;
  v_trend NUMERIC; v_trend_dir TEXT;
  v_total_stock INT; v_velocity_daily NUMERIC;
  v_days_out NUMERIC; v_out_date TIMESTAMPTZ; v_alert BOOLEAN;
  v_avg_price NUMERIC;
BEGIN
  SELECT * INTO v_stock FROM variant_stock WHERE variant_id = p_variant_id;
  IF NOT FOUND THEN RETURN; END IF;
  v_total_stock := v_stock.stock_web + v_stock.stock_apes + v_stock.stock_r5;

  SELECT COALESCE(SUM(ABS(quantity)), 0) INTO v_sold_1d
  FROM inventory_transfers WHERE variant_id = p_variant_id
    AND created_at > NOW() - INTERVAL '1 day'
    AND (destination_location = 'merma' OR source_location = 'stock_web');

  SELECT COALESCE(SUM(ABS(quantity)), 0) INTO v_sold_7d
  FROM inventory_transfers WHERE variant_id = p_variant_id
    AND created_at > NOW() - INTERVAL '7 days'
    AND (destination_location = 'merma' OR source_location = 'stock_web');

  SELECT COALESCE(SUM(ABS(quantity)), 0) INTO v_sold_30d
  FROM inventory_transfers WHERE variant_id = p_variant_id
    AND created_at > NOW() - INTERVAL '30 days'
    AND (destination_location = 'merma' OR source_location = 'stock_web');

  SELECT COALESCE(SUM(ABS(quantity)), 0) INTO v_prev_7d
  FROM inventory_transfers WHERE variant_id = p_variant_id
    AND created_at > NOW() - INTERVAL '14 days'
    AND created_at <= NOW() - INTERVAL '7 days'
    AND (destination_location = 'merma' OR source_location = 'stock_web');

  v_avg_price := 0;
  SELECT COALESCE(ip.sell_price, 0) INTO v_avg_price
  FROM inventory_products ip WHERE ip.tiendanube_variant_id = p_variant_id LIMIT 1;

  v_rev_1d := v_sold_1d * v_avg_price;
  v_rev_7d := v_sold_7d * v_avg_price;
  v_rev_30d := v_sold_30d * v_avg_price;

  IF v_prev_7d > 0 THEN
    v_trend := ((v_sold_7d::NUMERIC - v_prev_7d) / v_prev_7d) * 100;
  ELSIF v_sold_7d > 0 THEN v_trend := 100;
  ELSE v_trend := 0;
  END IF;

  IF v_trend > 20 THEN v_trend_dir := 'accelerating';
  ELSIF v_trend < -20 THEN v_trend_dir := 'decelerating';
  ELSIF v_sold_7d = 0 AND v_sold_30d = 0 THEN v_trend_dir := 'dormant';
  ELSE v_trend_dir := 'stable';
  END IF;

  v_velocity_daily := v_sold_7d::NUMERIC / 7;
  IF v_velocity_daily > 0 THEN
    v_days_out := v_total_stock::NUMERIC / v_velocity_daily;
    v_out_date := NOW() + (v_days_out || ' days')::INTERVAL;
  ELSE v_days_out := NULL; v_out_date := NULL;
  END IF;

  v_alert := false;
  IF v_days_out IS NOT NULL AND v_days_out <= 14 THEN
    v_alert := true;
    INSERT INTO stock_alerts_log (variant_id, alert_type, severity, message, current_stock, projected_days)
    VALUES (p_variant_id,
      CASE WHEN v_days_out <= 3 THEN 'stockout_imminent' ELSE 'restock_needed' END,
      CASE WHEN v_days_out <= 3 THEN 'critical' WHEN v_days_out <= 7 THEN 'warning' ELSE 'info' END,
      format('Stock se agota en %s dias. Velocidad: %s u/dia. Stock: %s', ROUND(v_days_out, 1), ROUND(v_velocity_daily, 2), v_total_stock),
      v_total_stock, v_days_out);
  END IF;

  INSERT INTO stock_velocity (
    variant_id, velocity_1d, velocity_7d, velocity_30d,
    trend_pct, trend_direction, days_to_stockout, projected_stockout_date, confidence,
    revenue_1d, revenue_7d, revenue_30d, avg_sell_price, is_alert_active, last_calculated_at, updated_at
  ) VALUES (
    p_variant_id, v_sold_1d, v_sold_7d, v_sold_30d,
    v_trend, v_trend_dir, v_days_out, v_out_date, LEAST(1.0, 0.3 + (v_sold_30d::NUMERIC / 30)),
    v_rev_1d, v_rev_7d, v_rev_30d, v_avg_price, v_alert, NOW(), NOW()
  )
  ON CONFLICT (variant_id) DO UPDATE SET
    velocity_1d = EXCLUDED.velocity_1d, velocity_7d = EXCLUDED.velocity_7d, velocity_30d = EXCLUDED.velocity_30d,
    trend_pct = EXCLUDED.trend_pct, trend_direction = EXCLUDED.trend_direction,
    days_to_stockout = EXCLUDED.days_to_stockout, projected_stockout_date = EXCLUDED.projected_stockout_date,
    confidence = EXCLUDED.confidence, revenue_1d = EXCLUDED.revenue_1d, revenue_7d = EXCLUDED.revenue_7d,
    revenue_30d = EXCLUDED.revenue_30d, avg_sell_price = EXCLUDED.avg_sell_price,
    is_alert_active = EXCLUDED.is_alert_active, last_calculated_at = NOW(), updated_at = NOW();
END;$;

-- 5. Trigger: Auto-recalculate on stock change
CREATE OR REPLACE FUNCTION trg_variant_stock_velocity()
RETURNS TRIGGER LANGUAGE plpgsql AS $BEGIN
  IF OLD.stock_web IS DISTINCT FROM NEW.stock_web
     OR OLD.stock_apes IS DISTINCT FROM NEW.stock_apes
     OR OLD.stock_r5 IS DISTINCT FROM NEW.stock_r5 THEN
    PERFORM fn_recalculate_velocity_for_variant(NEW.variant_id);
  END IF;
  RETURN NEW;
END;$;

DROP TRIGGER IF EXISTS trigger_variant_stock_velocity ON variant_stock;
CREATE TRIGGER trigger_variant_stock_velocity
  AFTER UPDATE ON variant_stock
  FOR EACH ROW EXECUTE FUNCTION trg_variant_stock_velocity();

-- 6. RPC: Budget pacing check + auto-governance
CREATE OR REPLACE FUNCTION fn_check_budget_pacing(
  p_adset_id TEXT, p_daily_budget NUMERIC, p_spent_today NUMERIC,
  p_impressions INT DEFAULT 0, p_clicks INT DEFAULT 0, p_conversions INT DEFAULT 0,
  p_revenue NUMERIC DEFAULT 0, p_linked_variant_id BIGINT DEFAULT NULL
)
RETURNS TABLE (pacing_status TEXT, stockout_risk TEXT, action_needed TEXT, reason TEXT)
LANGUAGE plpgsql AS $DECLARE
  v_spend_rate NUMERIC; v_cpc NUMERIC; v_cpm NUMERIC; v_ctr NUMERIC;
  v_cpa NUMERIC; v_roas NUMERIC; v_stock_remaining INT;
  v_stockout_risk TEXT := 'low'; v_action TEXT := 'none'; v_reason TEXT := ''; v_pacing TEXT;
  v_velocity RECORD;
BEGIN
  v_spend_rate := CASE WHEN p_daily_budget > 0 THEN p_spent_today / p_daily_budget ELSE 0 END;
  v_cpc := CASE WHEN p_clicks > 0 THEN p_spent_today / p_clicks ELSE 0 END;
  v_cpm := CASE WHEN p_impressions > 0 THEN (p_spent_today / p_impressions) * 1000 ELSE 0 END;
  v_ctr := CASE WHEN p_impressions > 0 THEN (p_clicks::NUMERIC / p_impressions) * 100 ELSE 0 END;
  v_cpa := CASE WHEN p_conversions > 0 THEN p_spent_today / p_conversions ELSE 0 END;
  v_roas := CASE WHEN p_spent_today > 0 THEN p_revenue / p_spent_today ELSE 0 END;

  IF v_spend_rate < 0.7 THEN v_pacing := 'under_pacing';
  ELSIF v_spend_rate <= 1.1 THEN v_pacing := 'on_track';
  ELSIF v_spend_rate <= 1.5 THEN v_pacing := 'over_pacing';
  ELSE v_pacing := 'capped';
  END IF;

  IF p_linked_variant_id IS NOT NULL THEN
    SELECT stock_web + stock_apes + stock_r5 INTO v_stock_remaining
    FROM variant_stock WHERE variant_id = p_linked_variant_id;
    SELECT * INTO v_velocity FROM stock_velocity WHERE variant_id = p_linked_variant_id;

    IF v_stock_remaining IS NOT NULL AND v_velocity IS NOT NULL THEN
      IF v_velocity.days_to_stockout IS NOT NULL AND v_velocity.days_to_stockout <= 3 THEN
        v_stockout_risk := 'critical'; v_action := 'paused';
        v_reason := format('Stock se agota en %s dias. Pausando anuncios.', ROUND(v_velocity.days_to_stockout, 1));
      ELSIF v_velocity.days_to_stockout IS NOT NULL AND v_velocity.days_to_stockout <= 7 THEN
        v_stockout_risk := 'high'; v_action := 'scaled_down';
        v_reason := format('Stock bajo (%s dias). Reduciendo presupuesto 50%%.', ROUND(v_velocity.days_to_stockout, 1));
      ELSIF v_velocity.days_to_stockout IS NOT NULL AND v_velocity.days_to_stockout <= 14 THEN
        v_stockout_risk := 'medium';
      END IF;
    END IF;
    IF v_velocity.trend_direction = 'dormant' AND v_stock_remaining > 50 THEN
      v_stockout_risk := 'low'; v_action := 'scaled_up';
      v_reason := 'Stock estancado con alta disponibilidad. Aumentar pauta.';
    END IF;
  END IF;

  INSERT INTO ad_budget_governance (
    ad_account_id, campaign_id, adset_id, daily_budget, spent_today, spend_rate, pacing_status,
    impressions, clicks, cpc, cpm, ctr, conversions, cpa, roas, revenue_generated,
    linked_variant_id, variant_stock_remaining, stockout_risk,
    action_taken, action_reason, action_at, date_range_start, date_range_end
  ) VALUES (
    '', '', p_adset_id, p_daily_budget, p_spent_today, v_spend_rate, v_pacing,
    p_impressions, p_clicks, v_cpc, v_cpm, v_ctr, p_conversions, v_cpa, v_roas, p_revenue,
    p_linked_variant_id, v_stock_remaining, v_stockout_risk,
    v_action, v_reason, CASE WHEN v_action != 'none' THEN NOW() ELSE NULL END,
    CURRENT_DATE, CURRENT_DATE
  );

  RETURN QUERY SELECT v_pacing, v_stockout_risk, v_action, v_reason;
END;$;

-- 7. RLS
ALTER TABLE stock_velocity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON stock_velocity FOR ALL USING (true);
ALTER TABLE ad_budget_governance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON ad_budget_governance FOR ALL USING (true);
ALTER TABLE stock_alerts_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON stock_alerts_log FOR ALL USING (true);

-- 8. Dashboard Views
CREATE OR REPLACE VIEW v_velocity_dashboard AS
SELECT sv.*, vs.stock_web, vs.stock_apes, vs.stock_r5,
  (vs.stock_web + vs.stock_apes + vs.stock_r5) AS total_stock
FROM stock_velocity sv
JOIN variant_stock vs ON vs.variant_id = sv.variant_id
ORDER BY sv.days_to_stockout NULLS LAST, sv.velocity_7d DESC;

CREATE OR REPLACE VIEW v_budget_pacing_summary AS
SELECT adset_id, adset_name,
  MAX(created_at) AS last_check,
  AVG(spend_rate) AS avg_pacing,
  MAX(pacing_status) AS current_pacing,
  MAX(stockout_risk) AS current_risk,
  MAX(action_taken) AS last_action,
  SUM(spent_today) AS total_spent,
  SUM(revenue_generated) AS total_revenue
FROM ad_budget_governance
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY adset_id, adset_name
ORDER BY total_spent DESC;

COMMIT;
