import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Core metrics from the snapshot view
    const { data: metrics } = await supabase
      .from('v_marketing_latest')
      .select('*')
      .order('platform', { ascending: true });

    const platforms = {};
    for (const m of (metrics || [])) {
      if (!platforms[m.platform]) platforms[m.platform] = {};
      platforms[m.platform][m.metric_key] = {
        value: Number(m.metric_value),
        previous: Number(m.previous_period_value),
        delta: Number(m.delta_pct || 0),
        date: m.recorded_date,
        metadata: m.metadata,
      };
    }

    // Sync logs
    const { data: syncLogs } = await supabase
      .from('marketing_sync_log')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(10);

    // GSC keywords (production table)
    let gscKeywords = [];
    try {
      const { data } = await supabase
        .from('v_gsc_latest_keywords')
        .select('*')
        .order('clicks', { ascending: false })
        .limit(25);
      gscKeywords = data || [];
    } catch {}

    // Merchant Center products (production table)
    let merchantProducts = [];
    let mcSummary = {};
    try {
      const { data } = await supabase
        .from('merchant_center_products')
        .select('*')
        .order('last_synced_at', { ascending: false })
        .limit(50);
      merchantProducts = data || [];
      mcSummary = {
        total: merchantProducts.length,
        approved: merchantProducts.filter(p => p.approval_status === 'APPROVED').length,
        disapproved: merchantProducts.filter(p => p.approval_status === 'DISAPPROVED').length,
        pending: merchantProducts.filter(p => p.approval_status === 'PENDING').length,
      };
    } catch {}

    // Benchmark index (production view)
    let benchmarks = [];
    try {
      const { data } = await supabase
        .from('v_benchmark_index')
        .select('*');
      benchmarks = data || [];
    } catch {}

    // Competitor registry
    let competitors = [];
    try {
      const { data } = await supabase
        .from('competitor_registry')
        .select('*')
        .eq('is_active', true);
      competitors = data || [];
    } catch {}

    return res.status(200).json({
      platforms,
      syncLogs: syncLogs || [],
      gscKeywords,
      merchantProducts,
      mcSummary,
      benchmarks,
      competitors,
      lastUpdate: metrics?.[0]?.created_at || null,
    });
  } catch (e) {
    console.error('[Unified Metrics] Error:', e);
    return res.status(500).json({ error: e.message });
  }
}
