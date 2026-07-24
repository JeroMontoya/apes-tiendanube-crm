/**
 * /api/meta-capi/events.js
 * Meta Conversions API (CAPI) — Server-Side Event Tracking
 * Bridge: TiendaNube Webhooks → Meta CAPI Events
 *
 * POST /api/meta-capi/events — Envía un evento de conversión a Meta CAPI
 * POST /api/meta-capi/webhook-bridge — Recibe webhook TN y envía a CAPI automáticamente
 * GET /api/meta-capi/events — Health check / test connection
 */

import crypto from 'crypto';
import axios from 'axios';

const CAPI_VERSION = 'v21.0';
const CAPI_BASE_URL = 'https://graph.facebook.com';

function hashData(data) {
  if (!data) return undefined;
  return crypto.createHash('sha256').update(data.trim().toLowerCase()).digest('hex');
}

function getCredentials() {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!pixelId || !accessToken) return null;
  return { pixelId, accessToken };
}

async function sendEvent(eventName, userData, customData, options = {}) {
  const creds = getCredentials();
  if (!creds) return { success: false, error: 'Meta CAPI credentials not configured' };

  const event = {
    event_name: eventName,
    event_time: options.eventTime || Math.floor(Date.now() / 1000),
    action_source: 'website',
    user_data: {
      client_ip_address: userData.clientIp || '0.0.0.0',
      client_user_agent: userData.userAgent || 'server',
    },
    custom_data: { ...customData },
  };

  if (userData.email) event.user_data.em = [hashData(userData.email)];
  if (userData.phone) event.user_data.ph = [hashData(userData.phone)];
  if (userData.firstName) event.user_data.fn = [hashData(userData.firstName)];
  if (userData.lastName) event.user_data.ln = [hashData(userData.lastName)];
  if (userData.externalId) event.user_data.external_id = [hashData(userData.externalId)];

  if (options.eventId) event.event_id = options.eventId;

  const payload = { data: [event] };

  try {
    const response = await axios.post(
      `${CAPI_BASE_URL}/${CAPI_VERSION}/${creds.pixelId}/events`,
      null,
      {
        params: { access_token: creds.accessToken },
        data: payload,
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      }
    );

    const received = response.data.events_received || 0;
    console.log(`[CAPI OK]: ${eventName} — ${received} events received`);
    return { success: true, events_received: received };
  } catch (error) {
    const errData = error.response?.data?.error || {};
    console.error(`[CAPI ERROR]: ${eventName} — ${errData.message || error.message}`);
    return { success: false, error: errData.message || error.message };
  }
}

/**
 * POST /api/meta-capi/events — Envío manual de eventos
 */
async function handleManualEvent(req, res) {
  const { eventName, userData, customData, options } = req.body;

  if (!eventName || !userData) {
    return res.status(400).json({ error: 'Se requieren eventName y userData' });
  }

  const validEvents = ['Purchase', 'InitiateCheckout', 'AddToCart', 'ViewContent', 'Lead'];
  if (!validEvents.includes(eventName)) {
    return res.status(400).json({ error: `eventName debe ser uno de: ${validEvents.join(', ')}` });
  }

  const result = await sendEvent(eventName, userData || {}, customData || {}, options || {});
  return res.status(result.success ? 200 : 500).json(result);
}

/**
 * POST /api/meta-capi/webhook-bridge — Bridge automático TN → CAPI
 * Recibe el webhook de TiendaNube y envía el evento correspondiente a Meta CAPI
 */
async function handleWebhookBridge(req, res) {
  const { event, order, user } = req.body;

  if (!event || !order) {
    return res.status(400).json({ error: 'Se requieren event y order del webhook' });
  }

  let eventName;
  const customData = {
    value: parseFloat(order.total_price || order.total || 0),
    currency: order.currency || 'ARS',
    order_id: order.id?.toString(),
  };

  switch (event) {
    case 'order/paid':
    case 'order/created':
      eventName = 'Purchase';
      customData.content_ids = order.line_items?.map(i => i.product_id?.toString()) || [];
      customData.content_type = 'product';
      customData.num_items = order.line_items?.length || 0;
      break;
    case 'order/updated':
      eventName = 'InitiateCheckout';
      break;
    default:
      return res.status(200).json({ skipped: true, message: `Evento '${event}' no mapeado a CAPI` });
  }

  const userData = {
    email: user?.email,
    phone: user?.phone_number,
    firstName: user?.first_name,
    lastName: user?.last_name,
    externalId: user?.id?.toString(),
    clientIp: req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '0.0.0.0',
    userAgent: req.headers['user-agent'] || 'server',
  };

  const result = await sendEvent(eventName, userData, customData, {
    eventId: `tn_${event}_${order.id}_${Date.now()}`,
  });

  return res.status(result.success ? 200 : 500).json({
    bridge: true,
    tiendanube_event: event,
    capi_event: eventName,
    ...result,
  });
}

/**
 * GET /api/meta-capi/events — Health check
 */
async function handleHealthCheck(req, res) {
  const creds = getCredentials();
  if (!creds) {
    return res.status(200).json({
      status: 'unconfigured',
      message: 'Meta CAPI credentials not set (META_PIXEL_ID, META_CAPI_ACCESS_TOKEN)',
    });
  }

  try {
    const response = await axios.get(
      `${CAPI_BASE_URL}/${CAPI_VERSION}/${creds.pixelId}`,
      { params: { access_token: creds.accessToken }, timeout: 5000 }
    );
    return res.status(200).json({
      status: 'connected',
      pixel_name: response.data.name,
      pixel_id: creds.pixelId,
    });
  } catch (error) {
    return res.status(200).json({
      status: 'error',
      error: error.response?.data?.error?.message || error.message,
    });
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') return handleHealthCheck(req, res);
    if (req.method === 'POST') {
      if (req.query.bridge === 'true' || req.body.bridge === true) {
        return handleWebhookBridge(req, res);
      }
      return handleManualEvent(req, res);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[META CAPI API ERROR]:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
