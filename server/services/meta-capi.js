/**
 * meta-capi.js
 * Meta Conversions API (CAPI) — Server-Side Event Tracking
 * Elimina la pérdida de tracking por bloqueadores de anuncios (iOS 14.5+)
 * Envía eventos de conversión directamente desde el servidor a Meta.
 *
 * ONYX v5.0 - Industrial Software Architecture
 */

import axios from 'axios';
import crypto from 'crypto';

const CAPI_VERSION = 'v21.0';
const CAPI_BASE_URL = 'https://graph.facebook.com';

/**
 * Hashea datos con SHA-256 para envío seguro a Meta CAPI
 */
function hashData(data) {
  if (!data) return undefined;
  return crypto.createHash('sha256').update(data.trim().toLowerCase()).digest('hex');
}

/**
 * Obtiene las credenciales de Meta CAPI desde env o system_config
 */
function getCredentials() {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;

  if (!pixelId || !accessToken) {
    console.warn('[META CAPI WARN]: Credenciales no configuradas (META_PIXEL_ID / META_CAPI_ACCESS_TOKEN)');
    return null;
  }

  return { pixelId, accessToken };
}

/**
 * Construye el payload base para un evento CAPI
 */
function buildEventPayload(eventName, userData, customData, options = {}) {
  const event = {
    event_name: eventName,
    event_time: options.eventTime || Math.floor(Date.now() / 1000),
    action_source: 'website',
    user_data: {
      client_ip_address: userData.clientIp || '0.0.0.0',
      client_user_agent: userData.userAgent || 'unknown',
    },
    custom_data: {
      ...customData,
    },
  };

  // Hash PII data for privacy compliance
  if (userData.email) {
    event.user_data.em = [hashData(userData.email)];
  }
  if (userData.phone) {
    event.user_data.ph = [hashData(userData.phone)];
  }
  if (userData.firstName) {
    event.user_data.fn = [hashData(userData.firstName)];
  }
  if (userData.lastName) {
    event.user_data.ln = [hashData(userData.lastName)];
  }
  if (userData.city) {
    event.user_data.ct = [hashData(userData.city)];
  }
  if (userData.country) {
    event.user_data.country = [hashData(userData.country)];
  }
  if (userData.zipCode) {
    event.user_data.zp = [hashData(userData.zipCode)];
  }
  if (userData.externalId) {
    event.user_data.external_id = [hashData(userData.externalId)];
  }

  // Add event ID for deduplication (pairs with pixel events)
  if (options.eventId) {
    event.event_id = options.eventId;
  }

  // Add attribution data
  if (options.attributionData) {
    event.custom_data.attribution_data = options.attributionData;
  }

  return event;
}

/**
 * Envía un evento de conversión a Meta CAPI
 * @param {string} eventName - Purchase | InitiateCheckout | AddToCart | ViewContent | Lead
 * @param {Object} userData - Datos del usuario {email, phone, firstName, lastName, ...}
 * @param {Object} customData - Datos custom {value, currency, orderId, contentIds, ...}
 * @param {Object} options - Opciones {eventId, attributionData, eventTime}
 * @returns {boolean} true si fue exitoso
 */
export async function sendConversionEvent(eventName, userData, customData, options = {}) {
  const creds = getCredentials();
  if (!creds) return false;

  const event = buildEventPayload(eventName, userData, customData, options);

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

    const result = response.data;
    if (result.events_received > 0) {
      console.log(`[META CAPI OK]: ${eventName} enviado. Events received: ${result.events_received}`);
      return true;
    }

    console.warn(`[META CAPI WARN]: ${eventName} — 0 events received. Response:`, JSON.stringify(result));
    return false;
  } catch (error) {
    const errData = error.response?.data?.error || {};
    console.error(`[META CAPI ERROR]: ${eventName} — ${errData.message || error.message}`);
    if (errData.error_subcode) {
      console.error(`[META CAPI ERROR] Subcode: ${errData.error_subcode} — ${errData.error_submsg || ''}`);
    }
    return false;
  }
}

/**
 * Evento: Purchase (Compra completada)
 */
export async function sendPurchaseEvent(order, user, options = {}) {
  return sendConversionEvent(
    'Purchase',
    {
      email: user.email,
      phone: user.phone,
      firstName: user.first_name,
      lastName: user.last_name,
      city: user.city,
      country: user.country,
      externalId: user.id?.toString(),
      clientIp: user.clientIp || '0.0.0.0',
      userAgent: user.userAgent || 'server',
    },
    {
      value: parseFloat(order.total_price || order.total || 0),
      currency: order.currency || 'ARS',
      order_id: order.id?.toString() || order.number?.toString(),
      content_ids: order.line_items?.map(item => item.product_id?.toString()) || [],
      content_type: 'product',
      num_items: order.line_items?.length || 0,
    },
    {
      eventId: options.eventId || `tn_purchase_${order.id}_${Date.now()}`,
      attributionData: options.attributionData || undefined,
    }
  );
}

/**
 * Evento: InitiateCheckout (Inicio de checkout / carrito abandonado)
 */
export async function sendInitiateCheckoutEvent(cart, user, options = {}) {
  return sendConversionEvent(
    'InitiateCheckout',
    {
      email: user.email,
      phone: user.phone,
      firstName: user.first_name,
      lastName: user.last_name,
      externalId: user.id?.toString(),
      clientIp: user.clientIp || '0.0.0.0',
      userAgent: user.userAgent || 'server',
    },
    {
      value: parseFloat(cart.total_price || cart.total || 0),
      currency: cart.currency || 'ARS',
      num_items: cart.items?.length || 0,
      content_ids: cart.items?.map(item => item.product_id?.toString()) || [],
    },
    {
      eventId: options.eventId || `tn_checkout_${cart.id}_${Date.now()}`,
    }
  );
}

/**
 * Evento: AddToCart (Producto añadido al carrito)
 */
export async function sendAddToCartEvent(product, user, options = {}) {
  return sendConversionEvent(
    'AddToCart',
    {
      email: user.email,
      phone: user.phone,
      externalId: user.id?.toString(),
      clientIp: user.clientIp || '0.0.0.0',
      userAgent: user.userAgent || 'server',
    },
    {
      value: parseFloat(product.price || 0),
      currency: product.currency || 'ARS',
      content_ids: [product.id?.toString()],
      content_type: 'product',
      content_name: product.name,
    },
    {
      eventId: options.eventId || `tn_addcart_${product.id}_${Date.now()}`,
    }
  );
}

/**
 * Evento: ViewContent (Vista de producto PDP)
 */
export async function sendViewContentEvent(product, user, options = {}) {
  return sendConversionEvent(
    'ViewContent',
    {
      email: user.email,
      externalId: user.id?.toString(),
      clientIp: user.clientIp || '0.0.0.0',
      userAgent: user.userAgent || 'server',
    },
    {
      value: parseFloat(product.price || 0),
      currency: product.currency || 'ARS',
      content_ids: [product.id?.toString()],
      content_type: 'product',
      content_name: product.name,
    },
    {
      eventId: options.eventId || `tn_view_${product.id}_${Date.now()}`,
    }
  );
}

/**
 * Evento: Lead (Registro de cliente nuevo)
 */
export async function sendLeadEvent(user, source, options = {}) {
  return sendConversionEvent(
    'Lead',
    {
      email: user.email,
      phone: user.phone,
      firstName: user.first_name,
      lastName: user.last_name,
      externalId: user.id?.toString(),
      clientIp: user.clientIp || '0.0.0.0',
      userAgent: user.userAgent || 'server',
    },
    {
      content_name: source || 'organic',
      lead_source: source || 'tiendanube',
    },
    {
      eventId: options.eventId || `tn_lead_${user.id}_${Date.now()}`,
    }
  );
}

/**
 * Envía eventos en lote (máx 1000 por request según documentación de Meta)
 */
export async function sendBatchEvents(events) {
  const creds = getCredentials();
  if (!creds) return { success: false, events_received: 0 };

  const payload = {
    data: events.map(evt => buildEventPayload(
      evt.eventName,
      evt.userData,
      evt.customData,
      { eventId: evt.eventId, attributionData: evt.attributionData }
    )),
  };

  try {
    const response = await axios.post(
      `${CAPI_BASE_URL}/${CAPI_VERSION}/${creds.pixelId}/events`,
      null,
      {
        params: { access_token: creds.accessToken },
        data: payload,
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      }
    );

    const result = response.data;
    console.log(`[META CAPI BATCH]: ${events.length} eventos enviados. Received: ${result.events_received}`);
    return { success: true, events_received: result.events_received };
  } catch (error) {
    console.error(`[META CAPI BATCH ERROR]:`, error.response?.data || error.message);
    return { success: false, events_received: 0, error: error.message };
  }
}

/**
 * Verifica la conexión con Meta CAPI (test endpoint)
 */
export async function testConnection() {
  const creds = getCredentials();
  if (!creds) {
    return { connected: false, error: 'Credenciales no configuradas' };
  }

  try {
    const response = await axios.get(
      `${CAPI_BASE_URL}/${CAPI_VERSION}/${creds.pixelId}`,
      { params: { access_token: creds.accessToken } }
    );

    return {
      connected: true,
      pixel_name: response.data.name,
      pixel_id: creds.pixelId,
      status: response.data.code,
    };
  } catch (error) {
    return {
      connected: false,
      error: error.response?.data?.error?.message || error.message,
    };
  }
}
