import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import {
  createAudience,
  addUsersToAudience,
  createLookalikeAudience,
  getAudienceSize,
} from '../../server/services/meta-custom-audiences.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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

  const segmentFilter = req.query.segment || 'vip';
  const createLookalike = req.query.lookalike === 'true';
  const startTime = Date.now();

  try {
    const { data: rfmUsers, error: rfmError } = await supabase
      .from('rfm_segments')
      .select('tiendanube_customer_id, customer_email, customer_phone, customer_name, segment, monetary')
      .in('segment', [segmentFilter, segmentFilter === 'vip' ? 'alfa' : ''].filter(Boolean))
      .gt('monetary', 0)
      .order('monetary', { ascending: false });

    if (rfmError) throw new Error(`RFM query error: ${rfmError.message}`);

    if (!rfmUsers || rfmUsers.length === 0) {
      return res.status(200).json({ status: 'skipped', reason: `No users found in segment '${segmentFilter}'` });
    }

    const users = rfmUsers.map(u => ({
      id: u.tiendanube_customer_id,
      email: u.customer_email,
      phone: u.customer_phone,
      name: u.customer_name,
    }));

    const audienceName = `APES ${segmentFilter.toUpperCase()} — ${new Date().toISOString().split('T')[0]}`;
    const audienceDesc = `Segmento ${segmentFilter} de CRM APES — ${users.length} clientes — RFM automático`;

    const auditId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random()}`;

    await supabase.from('meta_custom_audience_syncs').insert({
      id: auditId,
      audience_name: audienceName,
      segment_filter: segmentFilter,
      user_count: users.length,
      status: 'creating',
    });

    const audience = await createAudience(audienceName, audienceDesc);
    if (!audience.success) {
      await supabase.from('meta_custom_audience_syncs')
        .update({ status: 'failed', error_message: audience.error, completed_at: new Date().toISOString() })
        .eq('id', auditId);
      return res.status(500).json({ error: audience.error });
    }

    await supabase.from('meta_custom_audience_syncs')
      .update({ audience_id: audience.audience_id, status: 'adding_users' })
      .eq('id', auditId);

    const uploadResult = await addUsersToAudience(audience.audience_id, users, auditId);

    if (!uploadResult.success) {
      await supabase.from('meta_custom_audience_syncs')
        .update({ status: 'failed', error_message: uploadResult.error, hashes_sent: uploadResult.users_added || 0, completed_at: new Date().toISOString() })
        .eq('id', auditId);
      return res.status(500).json({ error: uploadResult.error });
    }

    const sizeInfo = await getAudienceSize(audience.audience_id);

    await supabase.from('meta_custom_audience_syncs')
      .update({
        status: 'completed',
        hashes_sent: uploadResult.users_added || 0,
        completed_at: new Date().toISOString(),
      })
      .eq('id', auditId);

    let lookalikeResult = null;
    if (createLookalike) {
      const matchedSize = sizeInfo.success ? sizeInfo.audience.approximate_count : 0;
      if (matchedSize < 100) {
        lookalikeResult = { skipped: true, reason: `Audience too small for lookalike: ${matchedSize} matched (minimum 100, recommended 1000+)` };
        console.warn(`[Custom Audience] ${lookalikeResult.reason}`);
      } else {
        const lookalikeName = `APES Lookalike ${segmentFilter.toUpperCase()} — ${new Date().toISOString().split('T')[0]}`;
        lookalikeResult = await createLookalikeAudience(audience.audience_id, lookalikeName, 'CO', 0.01);
      }
    }

    return res.status(200).json({
      status: 'ok',
      elapsed_ms: Date.now() - startTime,
      segment: segmentFilter,
      users_in_segment: users.length,
      users_uploaded: uploadResult.users_added,
      audience_id: audience.audience_id,
      audience_name: audienceName,
      audience_size: sizeInfo.success ? sizeInfo.audience.approximate_count : null,
      lookalike: lookalikeResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Custom Audience Sync] Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
