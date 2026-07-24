import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const results = {};
  const logEntries = [];

  const syncPlatform = async (platform, fn) => {
    const started = new Date().toISOString();
    try {
      const result = await fn();
      results[platform] = { status: 'success', ...result };
      logEntries.push({ platform, status: 'success', records_synced: result.synced || 0, started_at: started, completed_at: new Date().toISOString() });
    } catch (e) {
      results[platform] = { status: 'error', error: e.message };
      logEntries.push({ platform, status: 'error', error_message: e.message, started_at: started, completed_at: new Date().toISOString() });
    }
  };

  await syncPlatform('tiendanube', async () => {
    const { syncTiendanube } = await import('./sync-metrics.js');
    return syncTiendanube ? await syncTiendanube() : { synced: 0 };
  });

  await syncPlatform('google', async () => {
    const { syncAllGoogleData } = await import('../../server/services/google-suite.js');
    const data = await syncAllGoogleData();
    let synced = 0;
    const today = new Date().toISOString().split('T')[0];

    if (data.gsc?.summary) {
      const gscMetrics = [
        { platform: 'gsc', metric_key: 'organic_clicks', metric_value: data.gsc.summary.total_clicks, previous_period_value: 0, recorded_date: today },
        { platform: 'gsc', metric_key: 'organic_impressions', metric_value: data.gsc.summary.total_impressions, previous_period_value: 0, recorded_date: today },
        { platform: 'gsc', metric_key: 'avg_ctr', metric_value: data.gsc.summary.avg_ctr, previous_period_value: 0, recorded_date: today },
        { platform: 'gsc', metric_key: 'avg_position', metric_value: data.gsc.summary.avg_position, previous_period_value: 0, recorded_date: today },
      ];
      await supabase.rpc('fn_upsert_marketing_bulk', { p_metrics: JSON.stringify(gscMetrics) });
      synced += gscMetrics.length;

      if (data.gsc.keywords.length > 0) {
        await supabase.rpc('fn_upsert_gsc_keywords', { p_keywords: JSON.stringify(data.gsc.keywords) });
        synced += data.gsc.keywords.length;
      }
    }

    if (data.merchant?.length > 0) {
      await supabase.rpc('fn_upsert_mc_products', { p_products: JSON.stringify(data.merchant) });
      synced += data.merchant.length;
    }

    if (data.ga4) {
      const ga4Metrics = Object.entries(data.ga4).map(([key, val]) => ({
        platform: 'ga4', metric_key: key, metric_value: val, previous_period_value: 0, recorded_date: today,
      }));
      await supabase.rpc('fn_upsert_marketing_bulk', { p_metrics: JSON.stringify(ga4Metrics) });
      synced += ga4Metrics.length;
    }

    return { synced, errors: data.errors };
  });

  await syncPlatform('instagram', async () => {
    const { syncAllInstagramData, calculateEngagement } = await import('../../server/services/instagram-graph.js');
    const data = await syncAllInstagramData();
    const engagement = calculateEngagement(data.media);
    const today = new Date().toISOString().split('T')[0];
    let synced = 0;

    const metrics = [
      { platform: 'instagram', metric_key: 'followers', metric_value: data.profile?.followers_count || 0, previous_period_value: 0, recorded_date: today },
      { platform: 'instagram', metric_key: 'media_count', metric_value: data.profile?.media_count || 0, previous_period_value: 0, recorded_date: today },
      { platform: 'instagram', metric_key: 'total_likes', metric_value: engagement.total_likes, previous_period_value: 0, recorded_date: today },
      { platform: 'instagram', metric_key: 'total_comments', metric_value: engagement.total_comments, previous_period_value: 0, recorded_date: today },
      { platform: 'instagram', metric_key: 'engagement_rate', metric_value: data.profile?.followers_count > 0 ? (engagement.total_engagement / data.profile.followers_count * 100) : 0, previous_period_value: 0, recorded_date: today },
    ];

    await supabase.rpc('fn_upsert_marketing_bulk', { p_metrics: JSON.stringify(metrics) });
    synced = metrics.length;
    return { synced, errors: data.errors };
  });

  try {
    await supabase.from('marketing_sync_log').insert(logEntries);
  } catch {}

  return res.status(200).json({ results, timestamp: new Date().toISOString() });
}
