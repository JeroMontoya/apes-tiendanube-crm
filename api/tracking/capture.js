import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ALLOWED_KEYS = new Set([
  'fbclid', 'gclid', 'utm_source', 'utm_medium', 'utm_campaign',
  'utm_content', 'utm_term', 'referrer', 'captured_at',
]);

function sanitizeAttribution(input) {
  if (!input || typeof input !== 'object') return {};
  const clean = {};
  for (const [k, v] of Object.entries(input)) {
    if (ALLOWED_KEYS.has(k) && typeof v === 'string' && v.length <= 500) {
      clean[k] = v;
    }
  }
  return clean;
}

export default async function handler(req, res) {
  const corsOrigin = process.env.CORS_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};
  const sessionId = String(body.session_id || '').slice(0, 64);
  const attribution = sanitizeAttribution(body.attribution);

  if (!sessionId || Object.keys(attribution).length === 0) {
    return res.status(400).json({ error: 'session_id y attribution requeridos' });
  }

  const { error } = await supabase.rpc('fn_upsert_tracking_session', {
    p_session_id: sessionId,
    p_attribution: attribution,
  });

  if (error) {
    console.error('[Tracking Capture] Upsert error:', error.message);
    return res.status(500).json({ error: 'store_failed' });
  }

  res.status(204).end();
}
