/**
 * /api/whatsapp/process-queue.js
 * ONYX v11.0 — Production-Hardened Queue Processor
 *
 * Blindaje:
 * 1. Batch processing con limite de concurrencia (max 5/batch) para evitar timeout Vercel (10s)
 * 2. Atomic CAS (compare-and-swap) para prevenir race condition order/paid vs cron
 * 3. Meta param sanitizer para evitar HTTP 400 por caracteres invalidos en templates
 *
 * Vercel Cron: */5 * * * * ( cada 5 minutos)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_API_BASE = 'https://graph.facebook.com';

// Batch config — max items per invocation to stay within Vercel 10s timeout
const BATCH_SIZE = 5;
const PER_MSG_DELAY_MS = 200; // 200ms between sends to avoid rate limits

// -- Meta Template Parameter Sanitizer --
// Meta rejects: newlines, markdown (**, __, ##), special chars, emojis in some contexts
function sanitizeForMetaTemplate(text) {
  if (!text) return '';
  return text
    .replace(/\*\*/g, '')           // Bold markdown
    .replace(/__/g, '')             // Italic markdown
    .replace(/#{1,6}\s/g, '')       // Headings
    .replace(/[`~]/g, '')           // Code blocks
    .replace(/\n+/g, ' ')           // Newlines to single space
    .replace(/\r/g, '')             // Carriage returns
    .replace(/\t/g, ' ')            // Tabs
    .replace(/\s+/g, ' ')           // Collapse multiple spaces
    .replace(/[<>{}]/g, '')         // Angle/curly brackets (Meta restricted)
    .trim()
    .substring(0, 150);             // Meta template body param max ~150 chars
}

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

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// -- Atomic CAS: Mark as processing ONLY if still pending --
// This prevents race condition: if order/paid fires at the same time,
// the UPDATE returns 0 rows affected (already completed by webhook).
async function claimCartAtomic(cartId) {
  const { data, error } = await supabase
    .from('whatsapp_cart_queue')
    .update({
      status: 'processing',
      processing_started_at: new Date().toISOString(),
    })
    .eq('id', cartId)
    .eq('status', 'pending')  // CAS condition: only if still pending
    .select('id')
    .maybeSingle();

  if (error) return false;
  return !!data; // true = we claimed it, false = someone else already did
}

async function markSent(cartId, messageId) {
  await supabase.from('whatsapp_cart_queue').update({
    status: 'sent',
    sent_at: new Date().toISOString(),
    message_id: messageId,
  }).eq('id', cartId).eq('status', 'processing');
}

async function markFailed(cartId, error) {
  await supabase.from('whatsapp_cart_queue').update({
    status: 'failed',
    error_message: error,
    failed_at: new Date().toISOString(),
  }).eq('id', cartId);
}

async function markExpired(cartId) {
  await supabase.from('whatsapp_cart_queue').update({ status: 'expired' }).eq('id', cartId);
}

async function logMessage(data) {
  try {
    await supabase.from('whatsapp_messages_log').insert({
      to_phone: data.to, message_id: data.message_id || null,
      message_type: 'template', category: 'abandoned_cart',
      content_preview: (data.content || '').substring(0, 200),
      status: data.status || 'unknown', error_message: data.error || null,
      customer_name: data.customer_name || null, product_name: data.product_name || null,
      order_number: data.order_number || null, sent_at: new Date().toISOString(),
    });
  } catch (e) { /* non-critical */ }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const startTime = Date.now();

  // Auth guard
  const cronSecret = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.authorization;
    if (authHeader !== 'Bearer ' + cronSecret && req.query.secret !== cronSecret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const cfg = getConfig();
  if (!cfg.phoneAccountId || !cfg.accessToken) {
    return res.status(200).json({ status: 'skipped', reason: 'WhatsApp not configured' });
  }

  try {
    const now = new Date().toISOString();

    // Fetch ONLY batch_size pending carts (paginated, deterministic)
    const { data: pendingCarts, error: fetchError } = await supabase
      .from('whatsapp_cart_queue')
      .select('id, tn_order_id, customer_name, customer_phone, product_names, cart_total, checkout_url')
      .eq('status', 'pending')
      .lte('send_after', now)
      .order('send_after', { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchError) throw fetchError;

    if (!pendingCarts || pendingCarts.length === 0) {
      return res.status(200).json({ status: 'ok', processed: 0, batch: 0, elapsed_ms: Date.now() - startTime });
    }

    // Check remaining items for next batch indicator
    const { count: remainingCount } = await supabase
      .from('whatsapp_cart_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .lte('send_after', now);

    const results = [];

    for (const cart of pendingCarts) {
      // Check elapsed time — bail out if approaching timeout (8s safety margin)
      if (Date.now() - startTime > 8000) {
        results.push({ id: cart.id, status: 'timeout_deferred' });
        continue;
      }

      // ATOMIC CAS: claim this cart (prevents race with order/paid webhook)
      const claimed = await claimCartAtomic(cart.id);
      if (!claimed) {
        results.push({ id: cart.id, status: 'skipped', reason: 'already_claimed_by_webhook' });
        continue;
      }

      // Validate phone
      const phone = cart.customer_phone;
      if (!phone) {
        await markExpired(cart.id);
        results.push({ id: cart.id, status: 'skipped', reason: 'no_phone' });
        continue;
      }

      const formatted = formatPhone(phone);
      if (!formatted) {
        await markExpired(cart.id);
        results.push({ id: cart.id, status: 'skipped', reason: 'invalid_phone' });
        continue;
      }

      // Check opt-out (batch check)
      const { data: optOut } = await supabase
        .from('whatsapp_opt_outs')
        .select('id')
        .eq('phone', formatted)
        .maybeSingle();

      if (optOut) {
        await markExpired(cart.id);
        results.push({ id: cart.id, status: 'skipped', reason: 'opted_out' });
        continue;
      }

      // Sanitize all template params
      const customerName = sanitizeForMetaTemplate(cart.customer_name || 'Cliente');
      const productNames = sanitizeForMetaTemplate(cart.product_names || 'tu producto');
      const copyLine = sanitizeForMetaTemplate('Tu carrito te espera. Finaliza tu pedido antes de que se agote.');
      const checkoutUrl = (cart.checkout_url || '#').substring(0, 200); // URLs: only truncate, don't sanitize

      // Send template message
      const templatePayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formatted,
        type: 'template',
        template: {
          name: 'abandoned_cart_recovery',
          language: { code: 'es' },
          components: [{
            type: 'body',
            parameters: [
              { type: 'text', text: customerName },
              { type: 'text', text: productNames },
              { type: 'text', text: copyLine },
              { type: 'text', text: checkoutUrl },
            ],
          }],
        },
      };

      try {
        const response = await fetch(
          GRAPH_API_BASE + '/' + GRAPH_API_VERSION + '/' + cfg.phoneAccountId + '/messages',
          {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + cfg.accessToken, 'Content-Type': 'application/json' },
            body: JSON.stringify(templatePayload),
          }
        );

        const respData = await response.json();

        if (response.ok && respData.messages?.[0]?.id) {
          const msgId = respData.messages[0].id;
          await markSent(cart.id, msgId);
          await logMessage({
            to: formatted, message_id: msgId, status: 'sent',
            content: 'Template: abandoned_cart_recovery',
            customer_name: cart.customer_name, product_name: cart.product_names,
            order_number: String(cart.tn_order_id),
          });
          results.push({ id: cart.id, status: 'sent', message_id: msgId });
        } else {
          const errMsg = respData.error?.message || 'Template rejected by Meta';
          // If Meta says the template is invalid, mark as failed (don't retry indefinitely)
          const isPermanentFail = response.status === 400 || response.status === 404;
          if (isPermanentFail) {
            await markFailed(cart.id, errMsg);
          } else {
            // Transient error: revert to pending for retry
            await supabase.from('whatsapp_cart_queue').update({ status: 'pending' }).eq('id', cart.id).eq('status', 'processing');
          }
          results.push({ id: cart.id, status: 'failed', error: errMsg, http_status: response.status });
        }
      } catch (sendErr) {
        // Network error: revert to pending for retry
        await supabase.from('whatsapp_cart_queue').update({ status: 'pending' }).eq('id', cart.id).eq('status', 'processing');
        results.push({ id: cart.id, status: 'retry', error: sendErr.message });
      }

      // Rate limit: delay between sends
      await sleep(PER_MSG_DELAY_MS);
    }

    const hasMore = (remainingCount || 0) > pendingCarts.length;

    return res.status(200).json({
      status: 'ok',
      batch_size: pendingCarts.length,
      processed: results.length,
      sent: results.filter(r => r.status === 'sent').length,
      failed: results.filter(r => r.status === 'failed').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      retried: results.filter(r => r.status === 'retry').length,
      timeout_deferred: results.filter(r => r.status === 'timeout_deferred').length,
      has_more_pending: hasMore,
      remaining_count: remainingCount || 0,
      elapsed_ms: Date.now() - startTime,
      details: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[QUEUE PROCESSOR ERROR]:', error.message);
    return res.status(500).json({ error: error.message, elapsed_ms: Date.now() - startTime });
  }
}
