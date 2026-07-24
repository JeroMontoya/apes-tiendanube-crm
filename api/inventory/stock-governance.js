/**
 * /api/inventory/stock-governance.js
 * ONYX v16.0 — Predictive Intelligence: Stock Governance + Meta Ads Pacing
 *
 * GET  /api/inventory/stock-governance               — Dashboard data
 * POST /api/inventory/stock-governance/pacing         — Check budget pacing
 * POST /api/inventory/stock-governance/recalculate    — Force velocity recalc
 * GET  /api/inventory/stock-governance/alerts         — Active stock alerts
 * POST /api/inventory/stock-governance/alerts/:id/ack — Acknowledge alert
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // GET — Dashboard overview
    if (req.method === 'GET') {
      const { action } = req.query;

      // Active alerts
      if (action === 'alerts') {
        const { data, error } = await supabase
          .from('stock_alerts_log')
          .select('*')
          .eq('acknowledged', false)
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        return res.status(200).json({ alerts: data || [] });
      }

      // Full dashboard data
      const [velocityRes, pacingRes, overviewRes, alertsRes] = await Promise.all([
        supabase.from('stock_velocity').select('*, variant_stock!inner(stock_web, stock_apes, stock_r5, sku, name)').order('days_to_stockout', { ascending: true, nullsFirst: false }).limit(50),
        supabase.from('ad_budget_governance').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('v_stock_overview').select('*').maybeSingle(),
        supabase.from('stock_alerts_log').select('*').eq('acknowledged', false).order('created_at', { ascending: false }).limit(10),
      ]);

      return res.status(200).json({
        velocity: velocityRes.data || [],
        pacing: pacingRes.data || [],
        overview: overviewRes.data || {},
        active_alerts: alertsRes.data || [],
        timestamp: new Date().toISOString(),
      });
    }

    // POST — Budget pacing check
    if (req.method === 'POST') {
      const { action } = req.query;

      // Force recalculate all velocities
      if (action === 'recalculate') {
        const { data, error } = await supabase.rpc('fn_recalculate_all_velocity');
        if (error) throw error;
        return res.status(200).json({ status: 'ok', variants_recalculated: data });
      }

      // Pacing check
      if (action === 'pacing') {
        const { adset_id, daily_budget, spent_today, impressions, clicks, conversions, revenue, linked_variant_id } = req.body;
        if (!adset_id) return res.status(400).json({ error: 'adset_id required' });

        const { data, error } = await supabase.rpc('fn_check_budget_pacing', {
          p_adset_id: adset_id,
          p_daily_budget: daily_budget || 0,
          p_spent_today: spent_today || 0,
          p_impressions: impressions || 0,
          p_clicks: clicks || 0,
          p_conversions: conversions || 0,
          p_revenue: revenue || 0,
          p_linked_variant_id: linked_variant_id || null,
        });
        if (error) throw error;
        return res.status(200).json({ result: data?.[0] || {} });
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    // PATCH — Acknowledge alert
    if (req.method === 'PATCH') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Alert ID required' });

      const { error } = await supabase.from('stock_alerts_log').update({ acknowledged: true }).eq('id', id);
      if (error) throw error;
      return res.status(200).json({ status: 'acknowledged' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[GOVERNANCE ERROR]:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
