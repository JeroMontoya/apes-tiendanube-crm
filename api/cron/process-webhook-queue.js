import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import axios from 'axios';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CAPI_VERSION = 'v21.0';

const BATCH_SIZE = 10;
const LOCK_TIMEOUT_MINUTES = 5;

function sha256Hash(data) {
  if (!data) return undefined;
  return crypto.createHash('sha256').update(data.trim().toLowerCase()).digest('hex');
}

function sha256PhoneForMeta(phone) {
  if (!phone) return undefined;
  const countryCode = process.env.META_COUNTRY_CODE || '54';
  const normalized = phone.replace(/\D/g, '');
  const withCode = normalized.startsWith(countryCode) ? normalized : `${countryCode}${normalized}`;
  return crypto.createHash('sha256').update(withCode).digest('hex');
}

async function claimQueueItems() {
  const lockId = `processor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const lockExpires = new Date(Date.now() + LOCK_TIMEOUT_MINUTES * 60 * 1000).toISOString();

  const { data, error } = await supabase.rpc('fn_claim_webhook_queue_items', {
    p_batch_size: BATCH_SIZE,
    p_locked_by: lockId,
    p_lock_expires: lockExpires,
  });

  if (error) {
    console.error('[Webhook Queue] Claim error:', error.message);
    return [];
  }
  return data || [];
}

async function processItem(item) {
  const payload = item.payload;
  const eventType = item.event_type;

  console.log(`[Webhook Queue] Processing ${eventType} (${item.event_key})`);

  try {
    if (eventType.startsWith('order/')) {
      await processOrderEvent(payload, eventType);
    } else if (eventType === 'product/updated') {
      await processProductUpdated(payload);
    } else if (eventType === 'variant/stock_updated') {
      await processVariantStockUpdated(payload);
    }
    await markCompleted(item);
  } catch (err) {
    console.error(`[Webhook Queue] Error processing ${item.event_key}:`, err.message);
    await markFailed(item.id, err.message);
  }
}

const ATTRIBUTION_KEYS = ['fbclid', 'gclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'session_id', 'referrer', 'captured_at'];

function extractAttribution(payload) {
  if (!payload || typeof payload !== 'object') return null;

  const found = {};

  if (Array.isArray(payload.attributes)) {
    for (const attr of payload.attributes) {
      if (!attr || typeof attr !== 'object') continue;
      const name = String(attr.name || attr.id || '');
      const value = attr.value !== undefined ? String(attr.value) : (attr.value_name ? String(attr.value_name) : '');
      if (!name || !value) continue;
      const clean = name.replace(/^apes_/, '').toLowerCase();
      if (ATTRIBUTION_KEYS.includes(clean)) found[clean] = value;
    }
  }

  if (typeof payload.note === 'string' && payload.note.startsWith('[apes]')) {
    try {
      const parsed = JSON.parse(payload.note.slice('[apes]'.length).trim());
      if (parsed && typeof parsed === 'object') {
        for (const [k, v] of Object.entries(parsed)) {
          const clean = String(k).toLowerCase();
          if (ATTRIBUTION_KEYS.includes(clean) && typeof v === 'string') found[clean] = v;
        }
      }
    } catch (e) { /* invalid JSON in note, ignore */ }
  }

  if (Object.keys(found).length === 0) return null;
  return found;
}

async function saveOrderAttribution(payload, orderId) {
  try {
    const attribution = extractAttribution(payload);
    if (!attribution) return;
    const { error } = await supabase
      .from('tiendanube_orders')
      .update({ attribution })
      .eq('tiendanube_order_id', Number(orderId));
    if (error) {
      console.warn(`[Webhook Queue] Attribution update failed for order ${orderId}:`, error.message);
    } else {
      console.log(`[Webhook Queue] Attribution saved for order ${orderId}:`, JSON.stringify(attribution));
    }
  } catch (e) {
    console.warn(`[Webhook Queue] Attribution error for order ${orderId}:`, e.message);
  }
}

async function processOrderEvent(payload, eventType) {
  const orderId = payload.id;
  if (!orderId) return;

  const { data, error } = await supabase.rpc('fn_upsert_tiendanube_order', {
    p_tn_order_id: Number(orderId),
    p_order_number: String(payload.order_number || orderId),
    p_tn_customer_id: payload.customer?.id ? Number(payload.customer.id) : null,
    p_status: payload.status,
    p_payment_status: payload.payment_status,
    p_payment_gateway: payload.payment_gateway,
    p_currency: payload.currency,
    p_total: Number(payload.total || 0),
    p_subtotal: Number(payload.subtotal || 0),
    p_tax: Number(payload.tax || 0),
    p_shipping: Number(payload.shipping || 0),
    p_discount: Number(payload.discount || 0),
    p_customer_email: payload.customer?.email || payload.contact_email,
    p_customer_name: payload.customer?.name || payload.contact_name || payload.billing_name,
    p_customer_phone: payload.customer?.phone || payload.contact_phone || payload.billing_phone,
    p_customer_document: payload.customer?.identification || payload.billing_identification,
    p_shipping_address: payload.shipping_address || {},
    p_billing_address: payload.billing_address || {},
    p_line_items: payload.products || payload.line_items || [],
    p_raw_payload: payload,
  });

  if (error) {
    console.error('[Webhook Queue] fn_upsert_tiendanube_order failed:', error.message);
    return;
  }

  await saveOrderAttribution(payload, orderId);

  const isPaidEvent = eventType === 'order/paid' || payload.payment_status === 'paid' || payload.payment_status === 'authorized';

  if (isPaidEvent) {
    await sendPurchaseCAPI(payload, orderId);
    await sendPostPurchaseWhatsApp(payload, orderId);
    await updateRfmIncremental(payload);
    await markCartCompleted(orderId);
  } else {
    await queueAbandonedCartRecovery(payload, orderId);
  }

  await broadcastOrderChanged(orderId, eventType);
}

async function sendPurchaseCAPI(payload, orderId) {
  const pixelId = process.env.META_PIXEL_ID;
  const capiToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!pixelId || !capiToken) return;

  const event = {
    event_name: 'Purchase',
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'website',
    user_data: {
      client_ip_address: '0.0.0.0',
      client_user_agent: 'server',
    },
    custom_data: {
      value: Number(payload.total || 0),
      currency: payload.currency || 'ARS',
      order_id: String(orderId),
      content_ids: (payload.products || payload.line_items || []).map(i => String(i.id || i.product_id)),
      content_type: 'product',
      num_items: (payload.products || payload.line_items || []).length,
    },
    event_id: `tn_purchase_${orderId}`,
  };

  if (payload.customer?.email || payload.contact_email) {
    event.user_data.em = [sha256Hash(payload.customer?.email || payload.contact_email)];
  }
  if (payload.customer?.phone || payload.contact_phone) {
    event.user_data.ph = [sha256PhoneForMeta(payload.customer?.phone || payload.contact_phone)];
  }

  try {
    await axios.post(
      `https://graph.facebook.com/${CAPI_VERSION}/${pixelId}/events`,
      { data: [event] },
      { params: { access_token: capiToken }, timeout: 10000 }
    );
    console.log(`[CAPI Queue] Purchase sent for order ${orderId}`);
  } catch (e) {
    console.warn(`[CAPI Queue] Error: ${e.response?.data?.error?.message || e.message}`);
  }
}

async function sendPostPurchaseWhatsApp(payload, orderId) {
  const phone = payload.customer?.phone || payload.contact_phone;
  if (!phone) return;

  const WA_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const WA_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!WA_PHONE_ID || !WA_TOKEN) return;

  const orderNumber = String(payload.order_number || orderId);
  const { data: alreadySent } = await supabase
    .from('whatsapp_messages_log')
    .select('id')
    .eq('order_number', orderNumber)
    .eq('category', 'post_purchase')
    .limit(1);
  if (alreadySent && alreadySent.length > 0) {
    console.log(`[WhatsApp Queue] Skipping duplicate post_purchase for order ${orderNumber}`);
    return;
  }

  const formattedPhone = phone.replace(/\D/g, '');
  const finalPhone = formattedPhone.startsWith('54') ? formattedPhone : `54${formattedPhone}`;
  const customerName = payload.customer?.name || payload.contact_name || 'Cliente';
  // Build message (or send template)

  const thankYouMsg = `Gracias por tu compra, ${customerName}! Tu pedido #${orderNumber} esta siendo procesado. Si tenes alguna consulta, responde este mensaje.`;

  try {
    const r = await axios.post(
      `https://graph.facebook.com/v21.0/${WA_PHONE_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: finalPhone,
        type: 'text',
        text: { preview_url: true, body: thankYouMsg },
      },
      { headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' }, timeout: 10000 }
    );

    const msgId = r.data.messages?.[0]?.id;
    await supabase.from('whatsapp_messages_log').insert({
      to_phone: finalPhone, message_id: msgId, message_type: 'text',
      category: 'post_purchase', content_preview: thankYouMsg.substring(0, 200),
      status: 'sent', customer_name: customerName, order_number: String(orderNumber),
      sent_at: new Date().toISOString(),
    }).catch(() => {});
  } catch (e) {
    console.warn('[WhatsApp Queue] Post-purchase error:', e.message);
  }
}

async function updateRfmIncremental(payload) {
  const customerId = payload.customer?.id;
  if (!customerId) return;

  try {
    await supabase.rpc('fn_calculate_rfm_for_customer', {
      p_tn_customer_id: Number(customerId),
    });
    console.log(`[RFM Queue] Incremental update for customer ${customerId}`);
  } catch (e) {
    console.warn(`[RFM Queue] Error: ${e.message}`);
  }
}

async function markCartCompleted(orderId) {
  await supabase.from('whatsapp_cart_queue')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('tn_order_id', Number(orderId))
    .eq('status', 'pending')
    .catch(() => {});
}

async function queueAbandonedCartRecovery(payload, orderId) {
  const cartPhone = payload.customer?.phone || payload.contact_phone;
  const cartEmail = payload.customer?.email || payload.contact_email;
  if (!cartPhone && !cartEmail) return;

  await supabase.from('whatsapp_cart_queue').upsert({
    tn_order_id: Number(orderId),
    customer_name: payload.customer?.name || payload.contact_name || 'Cliente',
    customer_phone: cartPhone,
    customer_email: cartEmail,
    product_names: (payload.products || payload.line_items || []).map(p => p.name || p.title).join(', '),
    cart_total: Number(payload.total || 0),
    checkout_url: `https://www.tiendanube.com/checkout/${orderId}`,
    status: 'pending',
    send_after: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  }, { onConflict: 'tn_order_id' }).catch(() => {});
}

async function processProductUpdated(payload) {
  const { id: tnProductId, variants } = payload;
  if (!tnProductId) return;

  const { data: existing } = await supabase
    .from('inventory_products')
    .select('id')
    .eq('tiendanube_product_id', Number(tnProductId))
    .single();

  if (!existing) return;

  if (variants && Array.isArray(variants)) {
    for (const variant of variants) {
      if (variant.stock === undefined || variant.stock === null) continue;
      await supabase.rpc('fn_apply_tiendanube_stock', {
        p_tn_product_id: Number(tnProductId),
        p_tn_variant_id: Number(variant.id),
        p_new_quantity: variant.stock,
      }).catch(() => {});
    }
  }
}

async function processVariantStockUpdated(payload) {
  const { product_id: tnProductId, variant_id: tnVariantId, stock } = payload;
  if (!tnProductId || stock === undefined) return;

  const { data: existing } = await supabase
    .from('inventory_products')
    .select('id')
    .eq('tiendanube_product_id', Number(tnProductId))
    .single();

  if (!existing) return;

  await supabase.rpc('fn_apply_tiendanube_stock', {
    p_tn_product_id: Number(tnProductId),
    p_tn_variant_id: tnVariantId ? Number(tnVariantId) : 0,
    p_new_quantity: stock,
  }).catch(() => {});
}

async function markCompleted(item) {
  await supabase.from('webhook_processing_queue')
    .update({ status: 'completed', processed_at: new Date().toISOString() })
    .eq('id', item.id);

  await supabase.from('inventory_webhook_events').upsert({
    event_key: item.event_key,
    event_type: item.event_type,
    payload_summary: { processed: true, source: 'webhook_processing_queue' },
    processed_at: new Date().toISOString(),
  }, { onConflict: 'event_key' }).catch(() => {});
}

async function markFailed(itemId, errorMessage) {
  const { data: item } = await supabase.from('webhook_processing_queue')
    .select('attempts, max_attempts, created_at')
    .eq('id', itemId)
    .single();

  const newAttempts = (item?.attempts || 0) + 1;
  const maxAttempts = item?.max_attempts || 3;

  if (newAttempts >= maxAttempts) {
    await supabase.from('webhook_processing_queue').update({
      status: 'failed',
      attempts: newAttempts,
      last_error: errorMessage,
      failed_at: new Date().toISOString(),
      locked_at: null,
      locked_by: null,
    }).eq('id', itemId);

    console.error(`[Webhook Queue] PERMANENT FAILURE after ${newAttempts} attempts: ${itemId} — ${errorMessage}`);
  } else {
    const baseDelaySeconds = Math.pow(2, newAttempts) * 10;
    const retryAt = new Date(Date.now() + baseDelaySeconds * 1000).toISOString();
    console.log(`[Webhook Queue] Retry #${newAttempts} for ${itemId} in ${baseDelaySeconds}s (backoff): ${errorMessage}`);

    await supabase.from('webhook_processing_queue').update({
      status: 'pending',
      attempts: newAttempts,
      last_error: errorMessage,
      locked_at: null,
      locked_by: null,
    }).eq('id', itemId);
  }
}

async function checkStuckItems() {
  const stuckSince = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: stuck, error } = await supabase
    .from('webhook_processing_queue')
    .select('id, event_key, event_type, attempts, last_error, created_at')
    .eq('status', 'processing')
    .lt('locked_at', stuckSince)
    .limit(20);

  if (error) {
    console.error('[Webhook Queue] Stuck check error:', error.message);
    return;
  }

  if (!stuck || stuck.length === 0) return;

  console.warn(`[Webhook Queue] Found ${stuck.length} stuck items (locked >30min without completion)`);
  for (const item of stuck) {
    await supabase.from('webhook_processing_queue').update({
      status: 'pending',
      last_error: `Stale lock released — previous error: ${item.last_error || 'unknown'}`,
      locked_at: null,
      locked_by: null,
    }).eq('id', item.id);
  }
}

function broadcastOrderChanged(orderId, eventType) {
  try {
    supabase.channel('cross-tab-sync').send({
      type: 'broadcast',
      event: 'data-changed',
      payload: { type: 'order-changed', orderId, eventType, source: 'tiendanube', timestamp: new Date().toISOString() },
    }).catch(() => {});
  } catch (e) {}
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const cronSecret = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.authorization;
    if (authHeader !== 'Bearer ' + cronSecret && req.query.secret !== cronSecret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const startTime = Date.now();

  try {
    await checkStuckItems();
    const items = await claimQueueItems();
    if (!items || items.length === 0) {
      return res.status(200).json({ status: 'ok', processed: 0, elapsed_ms: Date.now() - startTime });
    }

    const results = [];
    for (const item of items) {
      await processItem(item);
      results.push({ id: item.id, event: item.event_type, status: 'processed' });
    }

    const remaining = await supabase
      .from('webhook_processing_queue')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');

    return res.status(200).json({
      status: 'ok',
      batch_size: items.length,
      processed: results.length,
      remaining: remaining.count || 0,
      results,
      elapsed_ms: Date.now() - startTime,
    });
  } catch (error) {
    console.error('[Webhook Queue] Handler error:', error.message);
    return res.status(500).json({ error: error.message, elapsed_ms: Date.now() - startTime });
  }
}
