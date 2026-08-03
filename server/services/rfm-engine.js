import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function runFullRfmCalculation() {
  const supabase = getSupabase();

  console.log('[RFM] Starting full recalculation...');
  const startTime = Date.now();

  const { data, error } = await supabase.rpc('fn_calculate_rfm');

  if (error) {
    console.error('[RFM] RPC error:', error.message);
    return { success: false, error: error.message };
  }

  const elapsed = Date.now() - startTime;
  console.log(`[RFM] Complete: ${data ? data.length : 0} customers classified in ${elapsed}ms`);

  return {
    success: true,
    customers_classified: data ? data.length : 0,
    elapsed_ms: elapsed,
    segments: countSegments(data || []),
  };
}

export async function runIncrementalRfmForCustomer(tnCustomerId) {
  const supabase = getSupabase();

  const { data, error } = await supabase.rpc('fn_calculate_rfm_for_customer', {
    p_tn_customer_id: Number(tnCustomerId),
  });

  if (error) {
    console.error(`[RFM] Incremental error for customer ${tnCustomerId}:`, error.message);
    return { success: false, error: error.message };
  }

  const result = data && data[0] ? data[0] : null;
  console.log(`[RFM] Incremental: customer ${tnCustomerId} → ${result ? result.segment : 'no data'}`);
  return { success: true, segment: result ? result.segment : null };
}

export async function getRfmSummary() {
  const supabase = getSupabase();

  const { data, error } = await supabase.from('rfm_segments')
    .select('segment, rfm_total, recency_days, frequency, monetary, tiendanube_customer_id')
    .order('rfm_total', { ascending: false })
    .limit(5000);

  if (error) return { success: false, error: error.message };

  const segments = {};
  for (const r of data) {
    segments[r.segment] = (segments[r.segment] || 0) + 1;
  }

  const topAlfa = data.filter(r => r.segment === 'alfa').slice(0, 50);
  const riskCount = data.filter(r => r.segment === 'riesgo_churn').length;

  return {
    success: true,
    total_classified: data.length,
    segments,
    top_alfa_count: topAlfa.length,
    risk_count: riskCount,
  };
}

function countSegments(rows) {
  const counts = {};
  for (const r of rows) {
    counts[r.segment] = (counts[r.segment] || 0) + 1;
  }
  return counts;
}

export async function getVipUsersForAudience() {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('rfm_segments')
    .select('tiendanube_customer_id, customer_email, customer_phone, customer_name, segment, monetary, frequency')
    .in('segment', ['alfa', 'vip'])
    .gt('monetary', 0)
    .order('monetary', { ascending: false });

  if (error) return { success: false, error: error.message };

  return {
    success: true,
    users: (data || []).map(u => ({
      id: u.tiendanube_customer_id,
      email: u.customer_email,
      phone: u.customer_phone,
      name: u.customer_name,
      segment: u.segment,
      monetary: u.monetary,
      frequency: u.frequency,
    })),
  };
}
