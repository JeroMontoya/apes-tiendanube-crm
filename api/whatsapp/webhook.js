/**
 * /api/whatsapp/webhook.js
 * ONYX v11.0 — Intelligent Inbound Webhook + Objection Classifier
 *
 * Capas:
 * 1. Opt-Out detection (STOP/BAJA/CANCELAR)
 * 2. 24h Conversation Window tracking
 * 3. AI Objection Classifier (clasificacion semantica de dudas de compra)
 * 4. Hot Lead creation para cierre manual de ventas
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_API_BASE = 'https://graph.facebook.com';

const STOP_TRIGGERS = ['STOP', 'BAJA', 'CANCELAR', 'CANCEL', 'REMOVER', 'NO ENVIAR', 'SALIR', 'DESUSCRIBIR', 'NO QUIERO'];

// Objection categories for classification
const OBJECTION_CATEGORIES = {
  PRECIO: ['precio', 'costo', 'caro', 'barato', 'descuento', 'cuanto', 'vale', 'presupuesto', 'financiacion', 'cuotas', 'pago'],
  ENVIO: ['envio', 'entrega', 'llega', 'mandan', 'envian', 'flete', 'correo', 'domicilio', 'direccion', 'medellin', 'bogota', 'capital'],
  TALLA: ['talla', 'medida', 'size', 'tamanio', 'grande', 'chico', 'ajusta', 'calza', 'cuadro'],
  DISPONIBILIDAD: ['stock', 'disponible', 'queda', 'agotado', 'surtido', 'colores', 'color', 'variante'],
  GARANTIA: ['garantia', 'devolucion', 'cambio', 'defecto', 'roto', 'problema', 'reclamo'],
  CONFIANZA: ['seguro', 'confiable', 'original', 'copia', 'calidad', 'maraca', 'bueno'],
  COMPRA: ['comprar', 'compra', 'pedir', 'orden', 'carrito', 'checkout', 'pagar', 'factura'],
};

function formatPhone(phone) {
  if (!phone) return null;
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 10) return null;
  return cleaned.startsWith('54') ? cleaned : '54' + cleaned;
}

function getConfig() {
  return {
    phoneAccountId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  };
}

// -- Fast Keyword-Based Objection Classifier (no AI call needed for classification) --
// This runs in <1ms and avoids the OpenAI latency/cost for every inbound message
function classifyObjection(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  const scores = {};

  for (const [category, keywords] of Object.entries(OBJECTION_CATEGORIES)) {
    scores[category] = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) scores[category]++;
    }
  }

  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) return null;

  const bestCategory = Object.entries(scores).find(([, v]) => v === maxScore)?.[0];
  return { category: bestCategory, confidence: Math.min(maxScore / 3, 1), matched_keywords: maxScore };
}

function isPurchaseIntent(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  const intentWords = ['quiero comprar', 'como compro', 'lo llevo', 'agrego', 'comprarlo', 'pagar', 'factura', 'cuanto sale', 'disponible'];
  return intentWords.some(w => lower.includes(w));
}

// -- Opt-Out Detection --
function isStopMessage(text) {
  if (!text) return false;
  const upper = text.toUpperCase().trim();
  return STOP_TRIGGERS.some(kw => upper === kw || upper.startsWith(kw));
}

// -- Send auto-reply for objections --
async function sendAutoReply(phone, text) {
  const cfg = getConfig();
  if (!cfg.phoneAccountId || !cfg.accessToken) return;
  const formatted = formatPhone(phone);
  if (!formatted) return;

  try {
    await fetch(GRAPH_API_BASE + '/' + GRAPH_API_VERSION + '/' + cfg.phoneAccountId + '/messages', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + cfg.accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp', recipient_type: 'individual', to: formatted,
        type: 'text', text: { preview_url: false, body: text },
      }),
    });
  } catch (e) { /* non-critical */ }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET = Meta webhook verification
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === (process.env.WHATSAPP_VERIFY_TOKEN || 'apes_webhook_verify')) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    // Validate Meta inbound structure
    const messages = body.entry?.[0]?.changes?.[0]?.value?.messages || [];
    const statuses = body.entry?.[0]?.changes?.[0]?.value?.statuses || [];

    // Handle status updates (delivered, read, failed)
    for (const status of statuses) {
      if (status.id && status.status) {
        const updateFields = {};
        if (status.status === 'delivered') updateFields.delivered_at = new Date().toISOString();
        if (status.status === 'read') updateFields.read_at = new Date().toISOString();
        if (status.status === 'failed') {
          updateFields.status = 'failed';
          updateFields.error_message = status.errors?.[0]?.message || 'delivery_failed';
        }
        if (Object.keys(updateFields).length > 0) {
          await supabase.from('whatsapp_messages_log').update(updateFields).eq('message_id', status.id).catch(() => {});
        }
      }
    }

    // Handle inbound messages
    for (const msg of messages) {
      const from = msg.from;
      const text = msg.text?.body?.trim() || '';
      const msgId = msg.id;
      const formatted = formatPhone(from);

      if (!text || !formatted) continue;

      // Update 24h conversation window
      await supabase.from('whatsapp_conversation_windows').upsert({
        phone: formatted, last_inbound_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }, { onConflict: 'phone' });

      // Log inbound message
      await supabase.from('whatsapp_messages_log').insert({
        to_phone: formatted, message_id: msgId, message_type: 'inbound',
        category: 'inbound_reply', content_preview: text.substring(0, 200),
        status: 'received', sent_at: new Date().toISOString(),
      }).catch(() => {});

      // === OPT-OUT CHECK ===
      if (isStopMessage(text)) {
        await supabase.from('whatsapp_opt_outs').upsert({
          phone: formatted, reason: 'user_reply: ' + text.substring(0, 50),
          opted_out_at: new Date().toISOString(),
        }, { onConflict: 'phone' });

        // Cancel all pending carts for this phone
        await supabase.from('whatsapp_cart_queue')
          .update({ status: 'expired', error_message: 'opt_out_by_user' })
          .eq('customer_phone', from)
          .eq('status', 'pending');

        await sendAutoReply(from, 'Listo, no recibiras mas mensajes de nuestra parte. Si queres reactivarte, contactanos por este canal en cualquier momento.');
        continue;
      }

      // === OBJECTION CLASSIFICATION ===
      const objection = classifyObjection(text);
      const purchaseIntent = isPurchaseIntent(text);

      if (objection || purchaseIntent) {
        // Find related cart for context
        const { data: relatedCart } = await supabase
          .from('whatsapp_cart_queue')
          .select('tn_order_id, product_names, cart_total')
          .eq('customer_phone', from)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Create Hot Lead
        const leadData = {
          phone: formatted,
          customer_name: relatedCart ? null : formatted, // Will be enriched later
          objection_type: objection?.category || (purchaseIntent ? 'COMPRA_INTENT' : 'GENERIC'),
          message_text: text.substring(0, 500),
          confidence: objection?.confidence || (purchaseIntent ? 0.9 : 0.5),
          related_order_id: relatedCart?.tn_order_id || null,
          product_context: relatedCart?.product_names || null,
          cart_total: relatedCart?.cart_total || null,
          status: purchaseIntent ? 'URGENT' : 'NEW', // Purchase intent = urgent priority
          priority: purchaseIntent ? 1 : (objection?.confidence > 0.6 ? 2 : 3),
          created_at: new Date().toISOString(),
        };

        await supabase.from('whatsapp_hot_leads').insert(leadData).catch(() => {});

        // Auto-reply based on objection type
        const autoReplies = {
          PRECIO: 'Gracias por tu consulta! Tenemos opciones de pago en cuotas sin interes. Un asesor te contactara con los precios exactos.',
          ENVIO: 'Buenas! El envio a todo el pais tiene costo segun zona. Un asesor te confirma el detalle al instante.',
          TALLA: 'Para recomendarte la talla perfecta, decime tu estatura y peso aproximado. Un asesor te asesora ya!',
          DISPONIBILIDAD: 'Ese producto esta disponible! Un asesor te confirma stock y te ayuda con la compra.',
          GARANTIA: 'Todos nuestros productos tienen garantia. Un asesor te explica los detalles.',
          CONFIANZA: 'Somos vendedores verificados con miles de clientes satisfechos. Un asesor te envia testimonios.',
          COMPRA_INTENT: 'Excelente! Un asesor te contacta ahora mismo para cerrar tu compra.',
        };

        if (autoReplies[objection?.category] || purchaseIntent) {
          await sendAutoReply(from, autoReplies[objection?.category] || autoReplies['COMPRA_INTENT']);
        }
      }
    }

    return res.status(200).json({ status: 'ok', messages: messages.length, statuses: statuses.length });
  } catch (error) {
    console.error('[WHATSAPP WEBHOOK ERROR]:', error.message);
    return res.status(200).json({ status: 'error' }); // Always 200 for Meta
  }
}
