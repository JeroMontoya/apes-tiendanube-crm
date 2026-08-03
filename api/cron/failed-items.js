import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers['authorization'] !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const since = req.query.since || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: failed, error, count } = await supabase
    .from('webhook_processing_queue')
    .select('id, event_key, event_type, attempts, last_error, created_at, failed_at, payload', { count: 'exact' })
    .eq('status', 'failed')
    .gte('failed_at', since)
    .order('failed_at', { ascending: false })
    .limit(limit);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const summary = (failed || []).reduce((acc, item) => {
    acc[item.event_type] = (acc[item.event_type] || 0) + 1;
    return acc;
  }, {});

  return res.status(200).json({
    total_failed: count,
    since,
    summary,
    items: (failed || []).map(({ payload, ...rest }) => ({
      ...rest,
      payload_snippet: payload ? JSON.stringify(payload).substring(0, 200) : null,
    })),
  });
}
