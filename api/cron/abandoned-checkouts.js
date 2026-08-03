import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TN_API_BASE = 'https://api.tiendanube.com/v1';

function getStoreCredentials() {
  return {
    storeId: process.env.TN_STORE_ID || process.env.VITE_TIENDANUBE_STORE_ID,
    token: process.env.TN_ACCESS_TOKEN || process.env.VITE_TIENDANUBE_TOKEN,
  };
}

async function fetchAbandonedCheckouts(storeId, token, sinceDate) {
  const params = new URLSearchParams({
    since: sinceDate,
    per_page: '100',
  });

  try {
    const response = await fetch(
      `${TN_API_BASE}/${storeId}/abandoned-checkouts?${params.toString()}`,
      {
        headers: {
          Authentication: `bearer ${token}`,
          'User-Agent': 'Apes Tiendanube CRM',
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`TN API ${response.status}: ${errBody.substring(0, 200)}`);
    }

    const checkouts = await response.json();
    console.log(`[Abandoned Checkouts] Fetched ${checkouts.length} records since ${sinceDate}`);
    return checkouts;
  } catch (e) {
    console.error('[Abandoned Checkouts] API error:', e.message);
    return [];
  }
}

async function storeAbandonedCheckouts(checkouts, storeId) {
  let inserted = 0;

  for (const co of checkouts) {
    if (!co.id) continue;

    const products = co.products || co.line_items || [];
    const customer = co.customer || {};

    const { error } = await supabase.from('abandoned_checkouts').upsert({
      tn_abandoned_checkout_id: Number(co.id),
      tn_store_id: storeId ? Number(storeId) : null,
      customer_email: customer.email || co.contact_email || '',
      customer_name: customer.name || co.contact_name || 'Cliente',
      customer_phone: customer.phone || co.contact_phone || '',
      customer_document: customer.identification || '',
      cart_total: Number(co.total || co.total_price || 0),
      currency: co.currency || 'COP',
      product_names: products.map(p => p.name || p.title).join(', '),
      line_items: products,
      checkout_url: co.checkout_url || co.abandoned_checkout_url || '',
      abandoned_at: co.created_at || co.updated_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'tn_abandoned_checkout_id' });

    if (!error) inserted++;
  }

  console.log(`[Abandoned Checkouts] Stored ${inserted}/${checkouts.length} new records`);
  return inserted;
}

async function enqueueWhatsAppRecovery() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data: candidates, error } = await supabase
    .from('abandoned_checkouts')
    .select('*')
    .eq('whatsapp_sent', false)
    .eq('recovered', false)
    .not('customer_phone', 'eq', '')
    .gte('first_detected_at', oneHourAgo)
    .limit(20);

  if (error) {
    console.error('[Abandoned Checkouts] Query error:', error.message);
    return 0;
  }

  if (!candidates || candidates.length === 0) return 0;

  let enqueued = 0;
  for (const co of candidates) {
    const { error: insertErr } = await supabase.from('whatsapp_cart_queue').upsert({
      tn_order_id: Number(`1000000000${co.tn_abandoned_checkout_id}`),
      customer_name: co.customer_name,
      customer_phone: co.customer_phone,
      customer_email: co.customer_email,
      product_names: co.product_names,
      cart_total: co.cart_total,
      checkout_url: co.checkout_url || '',
      status: 'pending',
      send_after: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
    }, { onConflict: 'tn_order_id' });

    if (!insertErr) {
      await supabase.from('abandoned_checkouts')
        .update({ whatsapp_sent: true, notified_at: new Date().toISOString() })
        .eq('id', co.id);
      enqueued++;
    }
  }

  console.log(`[Abandoned Checkouts] Enqueued ${enqueued} for WhatsApp recovery`);
  return enqueued;
}

export default async function handler(req, res) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(200).end();
  }

  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

  const cronSecret = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.authorization;
    if (authHeader !== 'Bearer ' + cronSecret && req.query.secret !== cronSecret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const { storeId, token } = getStoreCredentials();
  if (!storeId || !token) {
    return res.status(200).json({ status: 'skipped', reason: 'TN credentials not configured' });
  }

  const startTime = Date.now();

  try {
    const sinceMinutes = parseInt(req.query.since || '120', 10);
    const sinceDate = new Date(Date.now() - sinceMinutes * 60 * 1000).toISOString();

    const checkouts = await fetchAbandonedCheckouts(storeId, token, sinceDate);
    const stored = await storeAbandonedCheckouts(checkouts, storeId);
    const enqueued = await enqueueWhatsAppRecovery();

    return res.status(200).json({
      status: 'ok',
      elapsed_ms: Date.now() - startTime,
      fetched: checkouts.length,
      stored,
      whatsapp_enqueued: enqueued,
      since: sinceDate,
    });
  } catch (error) {
    console.error('[Abandoned Checkouts] Handler error:', error.message);
    return res.status(200).json({ status: 'error', message: error.message });
  }
}
