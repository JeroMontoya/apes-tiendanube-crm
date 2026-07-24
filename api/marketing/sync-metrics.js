import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function syncTiendanube() {
  const token = process.env.TIENDANUBE_ACCESS_TOKEN;
  const storeId = process.env.TIENDANUBE_STORE_ID;
  if (!token || !storeId) return { synced: 0, error: 'Missing credentials' };

  try {
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

    const ordersRes = await fetch(`https://api.tiendanube.com/v1/${storeId}/orders`, {
      headers: { 'Access-Token': token, 'Content-Type': 'application/json' },
    });
    if (!ordersRes.ok) throw new Error(`TiendaNube API ${ordersRes.status}`);
    const orders = await ordersRes.json();

    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const paidOrders = orders.filter(o => o.paid);
    const avgTicket = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;
    const totalOrders = orders.length;

    const metrics = [
      { platform: 'tiendanube', metric_key: 'total_revenue', metric_value: totalRevenue, previous_period_value: 0, recorded_date: today, metadata: { currency: 'ARS' } },
      { platform: 'tiendanube', metric_key: 'total_orders', metric_value: totalOrders, previous_period_value: 0, recorded_date: today },
      { platform: 'tiendanube', metric_key: 'paid_orders', metric_value: paidOrders.length, previous_period_value: 0, recorded_date: today },
      { platform: 'tiendanube', metric_key: 'avg_ticket', metric_value: avgTicket, previous_period_value: 0, recorded_date: today },
      { platform: 'tiendanube', metric_key: 'conversion_rate', metric_value: orders.length > 0 ? (paidOrders.length / orders.length * 100) : 0, previous_period_value: 0, recorded_date: today },
    ];

    const { error } = await supabase.rpc('fn_upsert_marketing_bulk', { p_metrics: JSON.stringify(metrics) });
    if (error) throw error;

    return { synced: metrics.length };
  } catch (e) {
    return { synced: 0, error: e.message };
  }
}

async function syncGoogleSearchConsole() {
  const clientId = process.env.GSC_CLIENT_ID;
  const clientSecret = process.env.GSC_CLIENT_SECRET;
  const refreshToken = process.env.GSC_REFRESH_TOKEN;
  const siteUrl = process.env.GSC_SITE_URL;

  if (!clientId || !refreshToken || !siteUrl) return { synced: 0, error: 'Missing GSC credentials' };

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
    });
    if (!tokenRes.ok) throw new Error('GSC token refresh failed');
    const { access_token } = await tokenRes.json();

    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 28 * 86400000).toISOString().split('T')[0];

    const queryRes = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate, endDate, dimensions: ['query'], rowLimit: 25 }),
    });
    if (!queryRes.ok) throw new Error(`GSC API ${queryRes.status}`);
    const gscData = await queryRes.json();

    const totalClicks = (gscData.rows || []).reduce((s, r) => s + (r.clicks || 0), 0);
    const totalImpressions = (gscData.rows || []).reduce((s, r) => s + (r.impressions || 0), 0);
    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions * 100) : 0;
    const avgPosition = (gscData.rows || []).reduce((s, r) => s + (r.position || 0), 0) / ((gscData.rows || []).length || 1);

    const today = new Date().toISOString().split('T')[0];
    const metrics = [
      { platform: 'gsc', metric_key: 'organic_clicks', metric_value: totalClicks, previous_period_value: 0, recorded_date: today },
      { platform: 'gsc', metric_key: 'organic_impressions', metric_value: totalImpressions, previous_period_value: 0, recorded_date: today },
      { platform: 'gsc', metric_key: 'avg_ctr', metric_value: avgCtr, previous_period_value: 0, recorded_date: today },
      { platform: 'gsc', metric_key: 'avg_position', metric_value: avgPosition, previous_period_value: 0, recorded_date: today },
    ];

    const { error } = await supabase.rpc('fn_upsert_marketing_bulk', { p_metrics: JSON.stringify(metrics) });
    if (error) throw error;

    return { synced: metrics.length };
  } catch (e) {
    return { synced: 0, error: e.message };
  }
}

async function syncGA4() {
  const propertyId = process.env.GA4_PROPERTY_ID;
  const clientId = process.env.GA4_CLIENT_ID;
  const clientSecret = process.env.GA4_CLIENT_SECRET;
  const refreshToken = process.env.GA4_REFRESH_TOKEN;

  if (!propertyId || !clientId || !refreshToken) return { synced: 0, error: 'Missing GA4 credentials' };

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
    });
    if (!tokenRes.ok) throw new Error('GA4 token refresh failed');
    const { access_token } = await tokenRes.json();

    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 28 * 86400000).toISOString().split('T')[0];

    const reportRes = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        metrics: [
          { name: 'sessions' },
          { name: 'totalUsers' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
          { name: 'conversions' },
        ],
      }),
    });
    if (!reportRes.ok) throw new Error(`GA4 API ${reportRes.status}`);
    const ga4Data = await reportRes.json();

    const rows = ga4Data.rows || [];
    const today = new Date().toISOString().split('T')[0];
    const metrics = [];

    for (const metric of (ga4Data.metricHeaders || [])) {
      const idx = (ga4Data.metricHeaders || []).indexOf(metric);
      const val = rows[0]?.metricValues?.[idx]?.value || 0;
      metrics.push({
        platform: 'ga4',
        metric_key: metric.name,
        metric_value: Number(val),
        previous_period_value: 0,
        recorded_date: today,
      });
    }

    if (metrics.length > 0) {
      const { error } = await supabase.rpc('fn_upsert_marketing_bulk', { p_metrics: JSON.stringify(metrics) });
      if (error) throw error;
    }

    return { synced: metrics.length };
  } catch (e) {
    return { synced: 0, error: e.message };
  }
}

async function syncInstagram() {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const igUserId = process.env.INSTAGRAM_USER_ID;

  if (!accessToken || !igUserId) return { synced: 0, error: 'Missing Instagram credentials' };

  try {
    const profileRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}?fields=followers_count,media_count&access_token=${accessToken}`);
    if (!profileRes.ok) throw new Error(`Instagram API ${profileRes.status}`);
    const profile = await profileRes.json();

    const mediaRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media?fields=like_count,comments_count,timestamp,media_type&limit=25&access_token=${accessToken}`);
    if (!mediaRes.ok) throw new Error(`Instagram media API ${mediaRes.status}`);
    const media = await mediaRes.json();

    const totalLikes = (media.data || []).reduce((s, m) => s + (m.like_count || 0), 0);
    const totalComments = (media.data || []).reduce((s, m) => s + (m.comments_count || 0), 0);
    const avgEngagement = profile.followers_count > 0 ? ((totalLikes + totalComments) / profile.followers_count * 100) : 0;

    const today = new Date().toISOString().split('T')[0];
    const metrics = [
      { platform: 'instagram', metric_key: 'followers', metric_value: profile.followers_count || 0, previous_period_value: 0, recorded_date: today },
      { platform: 'instagram', metric_key: 'media_count', metric_value: profile.media_count || 0, previous_period_value: 0, recorded_date: today },
      { platform: 'instagram', metric_key: 'total_likes', metric_value: totalLikes, previous_period_value: 0, recorded_date: today },
      { platform: 'instagram', metric_key: 'total_comments', metric_value: totalComments, previous_period_value: 0, recorded_date: today },
      { platform: 'instagram', metric_key: 'engagement_rate', metric_value: avgEngagement, previous_period_value: 0, recorded_date: today },
    ];

    const { error } = await supabase.rpc('fn_upsert_marketing_bulk', { p_metrics: JSON.stringify(metrics) });
    if (error) throw error;

    return { synced: metrics.length };
  } catch (e) {
    return { synced: 0, error: e.message };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const results = {};

  const syncFn = async (platform, fn) => {
    const logEntry = { platform, status: 'running', started_at: new Date().toISOString() };
    try {
      const result = await fn();
      logEntry.status = result.error ? 'error' : 'success';
      logEntry.records_synced = result.synced;
      logEntry.error_message = result.error || null;
      logEntry.completed_at = new Date().toISOString();
      results[platform] = result;
    } catch (e) {
      logEntry.status = 'error';
      logEntry.error_message = e.message;
      logEntry.completed_at = new Date().toISOString();
      results[platform] = { synced: 0, error: e.message };
    }
    try {
      await supabase.from('marketing_sync_log').insert([logEntry]);
    } catch {}
  };

  await Promise.all([
    syncFn('tiendanube', syncTiendanube),
    syncFn('gsc', syncGoogleSearchConsole),
    syncFn('ga4', syncGA4),
    syncFn('instagram', syncInstagram),
  ]);

  return res.status(200).json({ results, timestamp: new Date().toISOString() });
}
