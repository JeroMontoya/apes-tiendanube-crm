import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const WEBHOOK_SECRET = process.env.TIENDANUBE_WEBHOOK_SECRET || process.env.TIENDANUBE_STORE_TOKEN;

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY
);

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
    console.warn('[webhook] No secret configured, skipping signature check');
    return true;
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

async function handleProductUpdated(payload) {
  const { id: tnProductId, variants } = payload;
  if (!tnProductId) return { handled: false, reason: 'no product id' };

  const { data: existing } = await supabase
    .from('inventory_products')
    .select('id, name')
    .eq('tiendanube_product_id', Number(tnProductId))
    .single();

  if (!existing) {
    return { handled: false, reason: 'product not mapped in inventory' };
  }

  if (variants && Array.isArray(variants)) {
    for (const variant of variants) {
      if (variant.stock === undefined || variant.stock === null) continue;
      const { error } = await supabase.rpc('fn_apply_tiendanube_stock', {
        p_tn_product_id: Number(tnProductId),
        p_tn_variant_id: Number(variant.id),
        p_new_quantity: variant.stock,
      });
      if (error) {
        console.error('[webhook] fn_apply_tiendanube_stock error:', error.message);
      }
    }
  }

  return { handled: true, product_id: existing.id };
}

async function handleVariantStockUpdated(payload) {
  const { product_id: tnProductId, variant_id: tnVariantId, stock } = payload;
  if (!tnProductId || stock === undefined) {
    return { handled: false, reason: 'missing product_id or stock' };
  }

  const { data: existing } = await supabase
    .from('inventory_products')
    .select('id, name')
    .eq('tiendanube_product_id', Number(tnProductId))
    .single();

  if (!existing) {
    return { handled: false, reason: 'product not mapped in inventory' };
  }

  const { error } = await supabase.rpc('fn_apply_tiendanube_stock', {
    p_tn_product_id: Number(tnProductId),
    p_tn_variant_id: tnVariantId ? Number(tnVariantId) : 0,
    p_new_quantity: stock,
  });

  if (error) {
    console.error('[webhook] fn_apply_tiendanube_stock error:', error.message);
  }

  return { handled: true, product_id: existing.id };
}

async function broadcastSync(productId, stock) {
  try {
    await supabase.channel('inventory-sync').send({
      type: 'broadcast',
      event: 'stock-updated',
      payload: { product_id: productId, stock, source: 'tiendanube', timestamp: new Date().toISOString() },
    });
  } catch (e) {
    console.error('[webhook] Broadcast error (non-critical):', e.message);
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
      console.warn('[webhook] Invalid signature, rejecting');
      return err(res, 'Invalid signature', 401);
    }

    let payload;
    try {
      payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (parseErr) {
      return err(res, 'Invalid JSON payload', 400, parseErr.message);
    }

    const eventType = payload.event || payload.type || '';
    let result = { event: eventType, processed: false };

    if (eventType === 'product/updated') {
      result = { ...result, ...(await handleProductUpdated(payload)) };
      if (result.handled) {
        await broadcastSync(result.product_id, null);
      }
    } else if (eventType === 'variant/stock_updated') {
      result = { ...result, ...(await handleVariantStockUpdated(payload)) };
      if (result.handled) {
        await broadcastSync(result.product_id, payload.stock);
      }
    } else {
      console.log('[webhook] Unhandled event type:', eventType);
      result = { event: eventType, processed: false, reason: 'unhandled event type' };
    }

    return ok(res, { status: 'ok', ...result });
  } catch (error) {
    console.error('[webhook] Unhandled error:', error);
    return ok(res, { status: 'error', message: 'Internal error' }, 200);
  }
}
