/**
 * server/services/whatsapp-capi.js
 * WhatsApp Cloud API - Production-Hardened
 * Blindaje: Opt-Out, 24h Window Tracking, Meta Approved Templates
 * ONYX v9.0 - Industrial Software Architecture
 */

import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_API_BASE = 'https://graph.facebook.com';
const HOURS_24_MS = 24 * 60 * 60 * 1000;
const OPT_OUT_KEYWORDS = ['stop', 'cancelar', 'cancel', 'baja', 'no quiero', 'salir', 'opt out', 'desuscribir'];

function getConfig() {
  return {
    phoneAccountId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    verifiedName: process.env.WHATSAPP_BUSINESS_NAME || 'Apes',
  };
}

function formatPhone(phone) {
  if (!phone) return null;
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 10) return null;
  return cleaned.startsWith('54') ? cleaned : '54' + cleaned;
}

// -- Opt-Out Engine --

export async function isOptedOut(phoneNumber) {
  const formatted = formatPhone(phoneNumber);
  if (!formatted) return true;
  const { data } = await supabase.from('whatsapp_opt_outs').select('id').eq('phone', formatted).maybeSingle();
  return !!data;
}

export async function addOptOut(phoneNumber, reason = 'user_reply') {
  const formatted = formatPhone(phoneNumber);
  if (!formatted) return;
  await supabase.from('whatsapp_opt_outs').upsert({ phone: formatted, reason, opted_out_at: new Date().toISOString() }, { onConflict: 'phone' });
}

export function isOptOutMessage(text) {
  if (!text) return false;
  const lower = text.toLowerCase().trim();
  return OPT_OUT_KEYWORDS.some(kw => lower === kw || lower.startsWith(kw));
}

// -- 24-Hour Window Tracker --

async function getLastConversationTimestamp(phoneNumber) {
  const formatted = formatPhone(phoneNumber);
  if (!formatted) return null;
  const { data } = await supabase.from('whatsapp_conversation_windows').select('last_inbound_at').eq('phone', formatted).order('last_inbound_at', { ascending: false }).limit(1).maybeSingle();
  return data?.last_inbound_at ? new Date(data.last_inbound_at) : null;
}

async function updateConversationTimestamp(phoneNumber, source = 'inbound') {
  const formatted = formatPhone(phoneNumber);
  if (!formatted) return;
  const update = { phone: formatted, updated_at: new Date().toISOString() };
  if (source === 'inbound') update.last_inbound_at = new Date().toISOString();
  if (source === 'outbound') update.last_outbound_at = new Date().toISOString();
  await supabase.from('whatsapp_conversation_windows').upsert(update, { onConflict: 'phone' });
}

export async function isWithin24hWindow(phoneNumber) {
  const lastInbound = await getLastConversationTimestamp(phoneNumber);
  if (!lastInbound) return false;
  return (Date.now() - lastInbound.getTime()) < HOURS_24_MS;
}

// -- Core Send Engine --

async function sendRaw(to, payload, options = {}) {
  const cfg = getConfig();
  if (!cfg.phoneAccountId || !cfg.accessToken) return { success: false, error: 'NOT_CONFIGURED' };

  const formattedTo = formatPhone(to);
  if (!formattedTo) return { success: false, error: 'INVALID_PHONE', phone: to };

  if (await isOptedOut(formattedTo)) {
    console.warn('[WHATSAPP BLOCKED]: ' + formattedTo + ' is opted out');
    return { success: false, error: 'OPTED_OUT', phone: formattedTo };
  }

  const usesTemplate = payload.type === 'template';
  if (!usesTemplate) {
    const inWindow = await isWithin24hWindow(formattedTo);
    if (!inWindow) {
      console.warn('[WHATSAPP BLOCKED]: ' + formattedTo + ' outside 24h window');
      return { success: false, error: 'OUTSIDE_24H_WINDOW', phone: formattedTo, requiresTemplate: true };
    }
  }

  try {
    const fullPayload = Object.assign({}, payload, { messaging_product: 'whatsapp', recipient_type: 'individual', to: formattedTo });
    const response = await axios.post(GRAPH_API_BASE + '/' + GRAPH_API_VERSION + '/' + cfg.phoneAccountId + '/messages', fullPayload, {
      headers: { Authorization: 'Bearer ' + cfg.accessToken, 'Content-Type': 'application/json' },
      timeout: 15000,
    });

    const msgId = response.data.messages?.[0]?.id;
    console.log('[WHATSAPP OK]: ' + msgId);

    await updateConversationTimestamp(formattedTo, 'outbound');
    await logMessage(Object.assign({ to: formattedTo, message_id: msgId, status: 'sent' }, options));

    return { success: true, message_id: msgId };
  } catch (error) {
    const errData = error.response?.data?.error || {};
    console.error('[WHATSAPP ERROR]: ' + (errData.message || error.message));
    await logMessage(Object.assign({ to: formattedTo, status: 'failed', error: errData.message || error.message }, options));
    return { success: false, error: errData.message || error.message };
  }
}

// -- Public Senders --

export async function sendTextMessage(to, text, options = {}) {
  return sendRaw(to, { type: 'text', text: { preview_url: true, body: text } }, Object.assign({ message_type: 'text', content: text.substring(0, 200) }, options));
}

export async function sendTemplateMessage(to, templateName, languageCode = 'es', components = [], options = {}) {
  return sendRaw(to, { type: 'template', template: { name: templateName, language: { code: languageCode }, components: components } }, Object.assign({ message_type: 'template', content: templateName, category: 'template' }, options));
}

export async function sendAbandonedCartMessage(phoneNumber, customerName, productName, checkoutUrl, customizedCopy) {
  const inWindow = await isWithin24hWindow(phoneNumber);
  const formatted = formatPhone(phoneNumber);

  if (!inWindow && formatted && !(await isOptedOut(formatted))) {
    return sendTemplateMessage(phoneNumber, 'abandoned_cart_recovery', 'es', [
      { type: 'body', parameters: [
        { type: 'text', text: customerName },
        { type: 'text', text: productName },
        { type: 'text', text: customizedCopy || 'Tu carrito te espera.' },
        { type: 'text', text: checkoutUrl },
      ]},
    ], { category: 'abandoned_cart', customer_name: customerName, product_name: productName });
  }

  var message = 'Hola ' + customerName + ', notamos que dejaste tu *' + productName + '* en el carrito.\n\n' + (customizedCopy || 'Tu carrito te espera.') + '\n\nFinaliza tu pedido aqui: ' + checkoutUrl;
  return sendTextMessage(phoneNumber, message, { category: 'abandoned_cart', customer_name: customerName, product_name: productName });
}

export async function sendPostPurchaseMessage(phoneNumber, customerName, orderNumber) {
  var message = 'Gracias por tu compra, ' + customerName + '! Tu pedido #' + orderNumber + ' esta siendo procesado. Si tenes alguna consulta, respondes este mensaje y te atendemos al instante.';
  return sendTextMessage(phoneNumber, message, { category: 'post_purchase', customer_name: customerName, order_number: String(orderNumber) });
}

export async function sendRetargetingMessage(phoneNumber, customerName, discountCode, discountPercent) {
  const inWindow = await isWithin24hWindow(phoneNumber);
  const formatted = formatPhone(phoneNumber);

  if (!inWindow && formatted && !(await isOptedOut(formatted))) {
    return sendTemplateMessage(phoneNumber, 'retargeting_offer', 'es', [
      { type: 'body', parameters: [
        { type: 'text', text: customerName },
        { type: 'text', text: discountCode },
        { type: 'text', text: String(discountPercent) },
      ]},
    ], { category: 'retargeting', customer_name: customerName, discount_code: discountCode });
  }

  var message = customerName + ', tenemos algo especial para vos\n\nUsa el codigo *' + discountCode + '* y obtenes un *' + discountPercent + '% de descuento* en tu proxima compra. Esta oferta vence en 48 horas.';
  return sendTextMessage(phoneNumber, message, { category: 'retargeting', customer_name: customerName, discount_code: discountCode });
}

// -- Inbound Webhook Handler (replies + opt-out detection) --

export async function handleInboundWebhook(payload) {
  try {
    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0];
    const messages = changes?.value?.messages || [];

    for (const msg of messages) {
      const from = msg.from;
      const text = msg.text?.body || '';
      await updateConversationTimestamp(from, 'inbound');
      if (isOptOutMessage(text)) {
        await addOptOut(from, 'user_reply');
        console.log('[WHATSAPP OPT-OUT]: ' + from);
        await sendRaw(from, { type: 'text', text: { body: 'Listo, no recibiras mas mensajes. Si queres reactivarte, contactanos por este canal.' } }, { category: 'opt_out_confirmation' });
      }
    }
    return { processed: messages.length };
  } catch (e) {
    console.error('[WHATSAPP INBOUND ERROR]:', e.message);
    return { processed: 0, error: e.message };
  }
}

// -- Utilities --

export async function getMessageStatus(messageId) {
  const cfg = getConfig();
  if (!cfg.accessToken) return null;
  try {
    const r = await axios.get(GRAPH_API_BASE + '/' + GRAPH_API_VERSION + '/' + messageId, { params: { access_token: cfg.accessToken } });
    return r.data;
  } catch (e) { return null; }
}

export async function testConnection() {
  const cfg = getConfig();
  if (!cfg.phoneAccountId || !cfg.accessToken) return { connected: false, error: 'Credenciales no configuradas' };
  try {
    const r = await axios.get(GRAPH_API_BASE + '/' + GRAPH_API_VERSION + '/' + cfg.phoneAccountId, { params: { access_token: cfg.accessToken } });
    return { connected: true, phone_number: r.data.display_phone_number, verified_name: r.data.verified_name, quality_rating: r.data.quality_rating };
  } catch (e) {
    return { connected: false, error: e.response?.data?.error?.message || e.message };
  }
}

export async function getOptOutCount() {
  const { count } = await supabase.from('whatsapp_opt_outs').select('*', { count: 'exact', head: true });
  return count || 0;
}

export function isConfigured() {
  const cfg = getConfig();
  return !!(cfg.phoneAccountId && cfg.accessToken);
}

async function logMessage(data) {
  try {
    await supabase.from('whatsapp_messages_log').insert({
      to_phone: data.to, message_id: data.message_id || null,
      message_type: data.message_type || 'text', category: data.category || 'general',
      content_preview: (data.content || '').substring(0, 200), status: data.status || 'unknown',
      error_message: data.error || null, customer_name: data.customer_name || null,
      product_name: data.product_name || null, order_number: data.order_number || null,
      discount_code: data.discount_code || null, sent_at: new Date().toISOString(),
    });
  } catch (e) { console.warn('[WHATSAPP LOG] Non-critical:', e.message); }
}

export default {
  sendAbandonedCartMessage, sendPostPurchaseMessage, sendRetargetingMessage,
  sendTemplateMessage, getMessageStatus, testConnection, isConfigured,
  sendTextMessage, isOptedOut, addOptOut, isOptOutMessage,
  isWithin24hWindow, handleInboundWebhook, getOptOutCount,
};
