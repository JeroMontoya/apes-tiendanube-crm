import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const GRAPH_API = 'https://graph.facebook.com';
const GRAPH_VERSION = 'v21.0';

const PURCHASE_ACTION_TYPES = [
  'purchase',
  'omni_purchase',
  'offsite_conversion.fb_pixel_purchase',
];

function parseActions(actions, types) {
  if (!Array.isArray(actions)) return 0;
  let total = 0;
  for (const a of actions) {
    if (types.includes(a.action_type)) {
      total += parseInt(a.value, 10) || 0;
    }
  }
  return total;
}

function parseActionValues(actionValues, types) {
  if (!Array.isArray(actionValues)) return 0;
  let total = 0;
  for (const a of actionValues) {
    if (types.includes(a.action_type)) {
      total += parseFloat(a.value) || 0;
    }
  }
  return total;
}

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

export default async function handler(req, res) {
  const startTime = Date.now();

  const corsOrigin = process.env.CORS_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cronSecret = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET;
  const authHeader = req.headers['authorization'] || '';
  const querySecret = req.query.secret || '';
  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && querySecret !== cronSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const accessToken = process.env.META_ACCESS_TOKEN;
  const adAccountId = process.env.META_AD_ACCOUNT_ID;

  if (!accessToken || !adAccountId) {
    return res.status(500).json({ error: 'META_ACCESS_TOKEN y META_AD_ACCOUNT_ID requeridos' });
  }

  const pullDays = Math.min(parseInt(req.query.days, 10) || 3, 7);
  const since = new Date();
  since.setDate(since.getDate() - pullDays);
  const until = new Date();

  console.log(`[Meta Ads Sync] Pulling act_${adAccountId} ${formatDate(since)} → ${formatDate(until)} (${pullDays}d)`);

  try {
    // campaign_objective NO es válido como field de insights (error #100, ni a nivel ad ni campaign).
    // Se trae del endpoint de campaigns (campos válidos: id, objective) y se hace merge por campaign_id.
    const objectiveByCampaign = {};
    try {
      const campUrl = `${GRAPH_API}/${GRAPH_VERSION}/act_${adAccountId}/campaigns`;
      const campParams = { fields: 'id,objective', access_token: accessToken, limit: 500 };
      let campNext = null;
      while (true) {
        const cRes = campNext
          ? await axios.get(campNext, { timeout: 60000 })
          : await axios.get(campUrl, { params: campParams, timeout: 60000 });
        for (const row of cRes.data.data || []) {
          if (row.id && row.objective) {
            objectiveByCampaign[row.id] = row.objective;
          }
        }
        campNext = cRes.data.paging?.next || null;
        if (!campNext) break;
      }
      console.log(`[Meta Ads Sync] Campaign objectives: ${Object.keys(objectiveByCampaign).length} campaigns`);
    } catch (e) {
      console.warn('[Meta Ads Sync] Campaign objective fetch failed (non-fatal):', e.message);
    }

    const allRows = [];
    let nextUrl = null;
    let params = {
      level: 'ad',
      fields: [
        'campaign_id', 'campaign_name',
        'adset_id', 'adset_name',
        'ad_id', 'ad_name',
        'spend', 'impressions', 'reach', 'clicks', 'ctr', 'cpc',
        'actions', 'action_values',
      ].join(','),
      time_range: JSON.stringify({
        since: formatDate(since),
        until: formatDate(until),
      }),
      time_increment: 1,
      access_token: accessToken,
      limit: 500,
    };

    let pageCount = 0;
    while (true) {
      const response = nextUrl
        ? await axios.get(nextUrl, { timeout: 60000 })
        : await axios.get(`${GRAPH_API}/${GRAPH_VERSION}/act_${adAccountId}/insights`, { params, timeout: 60000 });

      pageCount++;

      for (const row of response.data.data || []) {
        const date = row.date_start;
        if (!date) continue;

        const purchases = parseActions(row.actions, PURCHASE_ACTION_TYPES);
        const purchaseValue = parseActionValues(row.action_values, PURCHASE_ACTION_TYPES);

        allRows.push({
          date,
          campaign_id: row.campaign_id,
          campaign_name: row.campaign_name || null,
          campaign_objective: objectiveByCampaign[row.campaign_id] || null,
          adset_id: row.adset_id,
          adset_name: row.adset_name || null,
          ad_id: row.ad_id,
          ad_name: row.ad_name || null,
          spend: parseFloat(row.spend) || 0,
          impressions: parseInt(row.impressions, 10) || 0,
          reach: parseInt(row.reach, 10) || 0,
          clicks: parseInt(row.clicks, 10) || 0,
          ctr: parseFloat(row.ctr) || 0,
          cpc: parseFloat(row.cpc) || 0,
          meta_purchases: purchases,
          meta_purchase_value: purchaseValue,
        });
      }

      nextUrl = response.data.paging?.next || null;
      if (!nextUrl) break;
    }

    console.log(`[Meta Ads Sync] Fetched ${allRows.length} rows across ${pageCount} page(s)`);

    if (allRows.length === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      return res.status(200).json({
        status: 'ok',
        rows_synced: 0,
        since: formatDate(since),
        until: formatDate(until),
        elapsed_seconds: parseFloat(elapsed),
        note: 'No ad data in this period (campaigns may be paused or period too short)',
      });
    }

    const BATCH_SIZE = 100;
    let synced = 0;
    for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
      const batch = allRows.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.rpc('fn_upsert_meta_ads_daily', {
        p_rows: JSON.stringify(batch),
      });
      if (error) {
        console.error(`[Meta Ads Sync] Batch upsert error at offset ${i}:`, error.message);
      } else {
        synced += batch.length;
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Meta Ads Sync] Done: ${synced} rows in ${elapsed}s`);

    return res.status(200).json({
      status: 'ok',
      rows_fetched: allRows.length,
      rows_synced: synced,
      since: formatDate(since),
      until: formatDate(until),
      pull_days: pullDays,
      elapsed_seconds: parseFloat(elapsed),
    });
  } catch (err) {
    const detail = err.response?.data?.error?.message || err.message;
    console.error(`[Meta Ads Sync] Error: ${detail}`);
    return res.status(500).json({
      status: 'error',
      error: detail,
      code: err.response?.data?.error?.code || null,
      type: err.response?.data?.error?.type || null,
    });
  }
}
