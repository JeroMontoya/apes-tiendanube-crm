/**
 * /api/whatsapp/cart-recovery.js
 * Disparador de mensajes de recuperación de carrito abandonado
 * Genera copy dinámico con IA CRO y envía por WhatsApp Cloud API
 *
 * POST /api/whatsapp/cart-recovery — Envía mensaje a carrito abandonado
 * POST /api/whatsapp/cart-recovery/batch — Envío batch de recuperación
 * GET /api/whatsapp/cart-recovery — Health check
 */

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_API_BASE = 'https://graph.facebook.com';

function getConfig() {
  return {
    phoneAccountId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  };
}

function formatPhone(phone) {
  if (!phone) return null;
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 10) return null;
  return cleaned.startsWith('54') ? cleaned : `54${cleaned}`;
}

async function logMessage(data) {
  try {
    await supabase.from('whatsapp_messages_log').insert({
      to_phone: data.to,
      message_id: data.message_id || null,
      message_type: 'text',
      category: data.category || 'abandoned_cart',
      content_preview: (data.content || '').substring(0, 200),
      status: data.status || 'unknown',
      error_message: data.error || null,
      customer_name: data.customer_name || null,
      product_name: data.product_name || null,
      sent_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('[WHATSAPP LOG] Failed:', e.message);
  }
}

/**
 * Genera copy persuasivo para carrito abandonado usando IA CRO
 */
async function generateRecoveryCopy(customerName, productName, productPrice) {
  if (!process.env.OPENAI_API_KEY) {
    return `Tu carrito te espera. ${productName} — $${parseFloat(productPrice || 0).toLocaleString('es-AR')}. Compralo ahora antes de que se agote.`;
  }

  try {
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Sos un copywriter CRO experto en recuperación de carritos abandonados para e-commerce LATAM. Generás mensajes de WhatsApp persuasivos y concisos (máx 300 caracteres) usando PAS (Problem-Agitate-Solution). Incluís urgencia sutil y prueba social. respondés SOLO con el copy, sin explicaciones.`,
        },
        {
          role: 'user',
          content: `Generá un mensaje de WhatsApp para recuperar un carrito abandonado.\n\nCliente: ${customerName}\nProducto: ${productName}\nPrecio: $${parseFloat(productPrice || 0).toLocaleString('es-AR')}\n\nCopy persuasivo en español (máx 300 caracteres, formato WhatsApp).`,
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    return response.choices[0].message.content || `Tu carrito te espera. ${productName} lo está esperando.`;
  } catch (e) {
    console.error('[CRO COPY ERROR]:', e.message);
    return `Hola ${customerName}, tu carrito te espera. ${productName} se está agotando. Finalizá tu compra ahora.`;
  }
}

/**
 * Envía mensaje de recuperación por WhatsApp
 */
async function sendRecoveryMessage(phoneNumber, customerName, productName, productPrice, checkoutUrl) {
  const cfg = getConfig();
  if (!cfg.phoneAccountId || !cfg.accessToken) {
    return { success: false, error: 'WhatsApp credentials not configured' };
  }

  const formattedTo = formatPhone(phoneNumber);
  if (!formattedTo) {
    return { success: false, error: 'Invalid phone number' };
  }

  const copy = await generateRecoveryCopy(customerName, productName, productPrice);
  const message = `Hola ${customerName}, notamos que dejaste tu *${productName}* en el carrito.\n\n${copy}\n\nFinalizá tu pedido aquí: ${checkoutUrl}`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: formattedTo,
    type: 'text',
    text: { preview_url: true, body: message },
  };

  try {
    const response = await axios.post(
      `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/${cfg.phoneAccountId}/messages`,
      payload,
      {
        headers: { Authorization: `Bearer ${cfg.accessToken}`, 'Content-Type': 'application/json' },
        timeout: 15000,
      }
    );

    const msgId = response.data.messages?.[0]?.id;
    console.log(`[WHATSAPP CART OK]: Sent to ${customerName}. ID: ${msgId}`);

    await logMessage({
      to: formattedTo,
      message_id: msgId,
      category: 'abandoned_cart',
      content: message,
      status: 'sent',
      customer_name: customerName,
      product_name: productName,
    });

    return { success: true, message_id: msgId, copy_used: copy };
  } catch (error) {
    const errData = error.response?.data?.error || {};
    console.error(`[WHATSAPP CART ERROR]: ${errData.message || error.message}`);

    await logMessage({
      to: formattedTo,
      category: 'abandoned_cart',
      content: message,
      status: 'failed',
      error: errData.message || error.message,
      customer_name: customerName,
      product_name: productName,
    });

    return { success: false, error: errData.message || error.message };
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const cfg = getConfig();
      if (!cfg.phoneAccountId || !cfg.accessToken) {
        return res.status(200).json({ status: 'unconfigured', message: 'Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN' });
      }
      try {
        const r = await axios.get(`${GRAPH_API_BASE}/${GRAPH_API_VERSION}/${cfg.phoneAccountId}`, { params: { access_token: cfg.accessToken } });
        return res.status(200).json({ status: 'connected', phone: r.data.display_phone_number, name: r.data.verified_name });
      } catch (e) {
        return res.status(200).json({ status: 'error', error: e.response?.data?.error?.message || e.message });
      }
    }

    if (req.method === 'POST') {
      const { phoneNumber, customerName, productName, productPrice, checkoutUrl } = req.body;
      if (!phoneNumber || !customerName || !productName) {
        return res.status(400).json({ error: 'Se requieren phoneNumber, customerName, productName' });
      }
      const result = await sendRecoveryMessage(phoneNumber, customerName, productName, productPrice || 0, checkoutUrl || '#');
      return res.status(result.success ? 200 : 500).json(result);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[WHATSAPP API ERROR]:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
