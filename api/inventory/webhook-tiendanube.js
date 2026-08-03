import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const WEBHOOK_SECRET = process.env.TIENDANUBE_WEBHOOK_SECRET;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tiendanube-Signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function setCors(res) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
}

function ok(res, data, status = 200) {
  setCors(res);
  return res.status(status).json(data);
}

function err(res, message, status = 500, details = null) {
  setCors(res);
  const body = { error: message };
  if (details) body.details = details;
  return res.status(status).json(body);
}

function verifySignature(rawBody, signature) {
  if (!WEBHOOK_SECRET) {
    console.warn('[webhook] No WEBHOOK_SECRET configured, cannot verify HMAC — rejecting');
    return false;
  }
  if (!signature) return false;
  try {
    const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
    hmac.update(rawBody, 'utf8');
    const expected = hmac.digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expected, 'hex')
    );
  } catch (e) {
    console.error('[webhook] Signature verification failed:', e.message);
    return false;
  }
}

async function alreadyProcessed(eventKey) {
  const { data } = await supabase
    .from('inventory_webhook_events')
    .select('id')
    .eq('event_key', eventKey)
    .maybeSingle();
  return !!data;
}

async function enqueueProcessing(eventKey, eventType, payload) {
  const { error } = await supabase.from('webhook_processing_queue').upsert({
    event_key: eventKey,
    event_type: eventType,
    payload: payload,
    status: 'pending',
    created_at: new Date().toISOString(),
  }, { onConflict: 'event_key' });

  if (error) {
    console.error('[webhook] Enqueue error:', error.message);
  }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    setCors(res);
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return err(res, 'Method not allowed', 405);
  }

  try {
    let rawBody = '';
    if (typeof req.body === 'string') {
      rawBody = req.body;
    } else if (Buffer.isBuffer(req.body)) {
      rawBody = req.body.toString('utf8');
    } else {
      rawBody = JSON.stringify(req.body);
    }

    const signature = req.headers['x-tiendanube-signature'] || req.headers['x-webhook-signature'] || '';
    if (!verifySignature(rawBody, signature)) {
      console.warn('[webhook] Invalid HMAC signature, rejecting');
      return err(res, 'Invalid signature', 401);
    }

    let payload;
    try {
      payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (parseErr) {
      return err(res, 'Invalid JSON payload', 400, parseErr.message);
    }

    const eventType = payload.event || payload.type || '';
    const resourceId = payload.id || payload.resource_id || '';

    let eventKey = `${eventType}:${resourceId}`;
    if (eventType === 'product/updated' && payload.updated_at) {
      eventKey = `${eventType}:${resourceId}:${payload.updated_at}`;
    } else if (eventType === 'variant/stock_updated') {
      eventKey = `stock:${payload.product_id}:${payload.variant_id || 0}`;
    }

    if (eventType.startsWith('order/') || eventType.startsWith('product/') || eventType === 'variant/stock_updated') {
      if (await alreadyProcessed(eventKey)) {
        return ok(res, { status: 'ok', event: eventType, deduplicated: true });
      }

      await enqueueProcessing(eventKey, eventType, payload);
    }

    return ok(res, { status: 'ok', event: eventType, queued: true });
  } catch (error) {
    console.error('[webhook] Unhandled error:', error);
    return ok(res, { status: 'error', message: 'Internal error' }, 200);
  }
}
