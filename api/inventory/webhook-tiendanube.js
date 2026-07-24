import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import axios from 'axios';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const WEBHOOK_SECRET = process.env.TIENDANUBE_WEBHOOK_SECRET || process.env.TIENDANUBE_STORE_TOKEN;

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY
);

// ── Meta CAPI (Conversions API) ───────────────────────────────────────
const META_PIXEL_ID = process.env.META_PIXEL_ID;
const META_CAPI_TOKEN = process.env.META_CAPI_ACCESS_TOKEN;
const CAPI_VERSION = 'v21.0';

function sha256Hash(data) {
  if (!data) return undefined;
  return crypto.createHash('sha256').update(data.trim().toLowerCase()).digest('hex');
}

async function sendMetaCAPIEvent(eventName, userData, customData, eventId) {
  if (!META_PIXEL_ID || !META_CAPI_TOKEN) return false;
  try {
    const event = {
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'website',
      user_data: {
        client_ip_address: userData.clientIp || '0.0.0.0',
        client_user_agent: userData.userAgent || 'server',
      },
      custom_data: customData,
    };
    if (userData.email) event.user_data.em = [sha256Hash(userData.email)];
    if (userData.phone) event.user_data.ph = [sha256Hash(userData.phone)];
    if (userData.externalId) event.user_data.external_id = [sha256Hash(userData.externalId)];
    if (eventId) event.event_id = eventId;

    await axios.post(
      `https://graph.facebook.com/${CAPI_VERSION}/${META_PIXEL_ID}/events`,
      { data: [event] },
      { params: { access_token: META_CAPI_TOKEN }, timeout: 10000, headers: { 'Content-Type': 'application/json' } }
    );
    console.log(`[CAPI OK]: ${eventName} sent for order`);
    return true;
  } catch (e) {
    console.error(`[CAPI ERROR]: ${eventName} — ${e.response?.data?.error?.message || e.message}`);
    return false;
  }
}

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

// NOTA: Tiendanube no firma sus webhooks con HMAC por defecto en todas las
// integraciones — confirma en tu panel de app/integración si tu app tiene
// firma habilitada y con qué secreto. Si no la tiene, este check no aporta
// seguridad real; en ese caso valida por otro medio (ej. IP allowlist o
// simplemente confiar en la URL secreta del endpoint).
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

// ── Idempotencia: evita procesar el mismo evento dos veces ──────────────
// Tiendanube puede reintentar la entrega de un webhook. Sin esto, un
// order/created reenviado descontaría el stock dos veces.
async function alreadyProcessed(eventKey) {
  const { data, error } = await supabase
    .from('inventory_webhook_events')
    .select('id')
    .eq('event_key', eventKey)
    .maybeSingle();
  if (error) {
    console.error('[webhook] idempotency check failed:', error.message);
    return false; // fail-open: mejor procesar de más que bloquear el flujo
  }
  return !!data;
}

async function markProcessed(eventKey, eventType, payloadSummary) {
  await supabase.from('inventory_webhook_events').insert({
    event_key: eventKey,
    event_type: eventType,
    payload_summary: payloadSummary,
  }).select().maybeSingle();
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

// NUEVO: descuenta stock de la ubicación WEB apenas se crea/paga un pedido,
// en vez de esperar a que Tiendanube reenvíe el stock final por su cuenta.
// Esto cierra la ventana de tiempo donde se podía vender lo mismo dos veces
// entre canales (local vs. web) mientras Tiendanube procesaba la orden.
async function handleOrderEvent(payload, eventType) {
  const orderId = payload.id;
  if (!orderId) return { handled: false, reason: 'no order id' };

  // Solo procesamos pedidos ya pagados/confirmados, no borradores/abandonos
  const status = payload.payment_status || payload.status;
  const isPaidOrConfirmed = status === 'paid' || status === 'authorized' || eventType === 'order/paid';
  if (!isPaidOrConfirmed) {
    return { handled: false, reason: `order status '${status}' does not trigger stock deduction yet` };
  }

  const eventKey = `order:${orderId}:${eventType}`;
  if (await alreadyProcessed(eventKey)) {
    return { handled: false, reason: 'already processed' };
  }

  // Upsert order + client + items atomically via RPC
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
    console.error('[webhook] fn_upsert_tiendanube_order failed:', error.message);
    return { handled: false, error: error.message };
  }

  const { order_id, client_id, stock_deducted } = data[0] || {};
  
  await markProcessed(eventKey, eventType, { orderId, stockDeducted: stock_deducted });

    // ── Bridge to Meta CAPI: Send Purchase event server-side ──
  if (eventType === 'order/paid' || (eventType === 'order/created' && (payload.payment_status === 'paid' || payload.payment_status === 'authorized'))) {
    sendMetaCAPIEvent(
      'Purchase',
      {
        email: payload.customer?.email || payload.contact_email,
        phone: payload.customer?.phone || payload.contact_phone,
        externalId: payload.customer?.id?.toString(),
        clientIp: req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '0.0.0.0',
        userAgent: req.headers['user-agent'] || 'server',
      },
      {
        value: Number(payload.total || 0),
        currency: payload.currency || 'ARS',
        order_id: String(orderId),
        content_ids: (payload.products || payload.line_items || []).map(i => String(i.id || i.product_id || '')),
        content_type: 'product',
        num_items: (payload.products || payload.line_items || []).length,
      },
      `tn_purchase_${orderId}_${Date.now()}`
    ).catch(() => {});

    // ── WhatsApp Post-Purchase: Send thank-you message ──
    if (payload.customer?.phone || payload.contact_phone) {
      const WA_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
      const WA_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
      if (WA_PHONE_ID && WA_TOKEN) {
        const phone = (payload.customer?.phone || payload.contact_phone).replace(/\D/g, '');
        const formattedPhone = phone.startsWith('54') ? phone : `54${phone}`;
        const customerName = payload.customer?.name || payload.contact_name || 'Cliente';
        const orderNumber = payload.order_number || orderId;
        const thankYouMsg = `¡Gracias por tu compra, ${customerName}! 🎉\n\nTu pedido #${orderNumber} está siendo procesado.\n\nSi tenés alguna consulta, respondé este mensaje y te atendemos al instante.`;

        axios.post(
          `https://graph.facebook.com/v21.0/${WA_PHONE_ID}/messages`,
          {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: formattedPhone,
            type: 'text',
            text: { preview_url: true, body: thankYouMsg },
          },
          { headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' }, timeout: 10000 }
        ).then(r => {
          const msgId = r.data.messages?.[0]?.id;
          console.log(`[WHATSAPP POST-PURCHASE OK]: ${customerName}. ID: ${msgId}`);
          supabase.from('whatsapp_messages_log').insert({
            to_phone: formattedPhone, message_id: msgId, message_type: 'text',
            category: 'post_purchase', content_preview: thankYouMsg.substring(0, 200),
            status: 'sent', customer_name: customerName, order_number: String(orderNumber),
            sent_at: new Date().toISOString(),
          }).catch(() => {});
        }).catch(e => console.warn('[WHATSAPP POST-PURCHASE WARN]:', e.message));
      }
    }
  }
  
  return { handled: true, order_id: orderId, client_id, stock_deducted };
}

async function broadcastStockSync(productId, stock) {
  try {
    await supabase.channel('inventory-sync').send({
      type: 'broadcast',
      event: 'stock-updated',
      payload: { product_id: productId, stock, source: 'tiendanube', timestamp: new Date().toISOString() },
    });
    // Also notify frontend dashboard
    await supabase.channel('cross-tab-sync').send({
      type: 'broadcast',
      event: 'data-changed',
      payload: { type: 'product-changed', source: 'tiendanube', timestamp: new Date().toISOString() },
    });
  } catch (e) {
    console.error('[webhook] Broadcast error (non-critical):', e.message);
  }
}

async function broadcastOrderChanged(orderId, eventType) {
  try {
    await supabase.channel('cross-tab-sync').send({
      type: 'broadcast',
      event: 'data-changed',
      payload: { type: 'order-changed', orderId, eventType, source: 'tiendanube', timestamp: new Date().toISOString() },
    });
  } catch (e) {
    console.error('[webhook] Order broadcast error:', e.message);
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
        await broadcastStockSync(result.product_id, null);
      }
    } else if (eventType === 'variant/stock_updated') {
      result = { ...result, ...(await handleVariantStockUpdated(payload)) };
      if (result.handled) {
        await broadcastStockSync(result.product_id, payload.stock);
      }
    } else if (eventType === 'order/created' || eventType === 'order/paid' || eventType === 'order/updated') {
      result = { ...result, ...(await handleOrderEvent(payload, eventType)) };
      
      if (result.handled) {
        await broadcastOrderChanged(payload.id, eventType);
      }

      // ── WhatsApp Abandoned Cart: Track new unpaid orders for follow-up ──
      if (eventType === 'order/created' && payload.payment_status !== 'paid') {
        const cartPhone = payload.customer?.phone || payload.contact_phone;
        const cartEmail = payload.customer?.email || payload.contact_email;
        if (cartPhone || cartEmail) {
          supabase.from('whatsapp_cart_queue').upsert({
            tn_order_id: Number(orderId),
            customer_name: payload.customer?.name || payload.contact_name || 'Cliente',
            customer_phone: cartPhone || null,
            customer_email: cartEmail || null,
            product_names: (payload.products || payload.line_items || []).map(p => p.name || p.title).join(', '),
            cart_total: Number(payload.total || 0),
            checkout_url: `https://www.tiendanube.com/checkout/${orderId}`,
            status: 'pending',
            created_at: new Date().toISOString(),
            send_after: new Date(Date.now() + 30 * 60000).toISOString(), // 30 min delay
          }, { onConflict: 'tn_order_id' }).catch(e => console.warn('[CART QUEUE WARN]:', e.message));
        }
      }

      // ── WhatsApp Abandoned Cart: Mark as completed if order is now paid ──
      if (eventType === 'order/paid' || payload.payment_status === 'paid') {
        supabase.from('whatsapp_cart_queue')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('tn_order_id', Number(orderId))
          .eq('status', 'pending')
          .catch(() => {});
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