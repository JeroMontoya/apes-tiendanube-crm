import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

function getClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY);
}

function getClientAuth(token) {
  if (!token) return getClient();
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY || SUPABASE_SERVICE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Content-Type': 'application/json',
};

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    const supabase = getClientAuth(token);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { data: sysCfg } = await supabase
      .from('system_config')
      .select('tiendanube_store_id, tiendanube_access_token')
      .eq('id', 'main')
      .single();

    const storeId = sysCfg?.tiendanube_store_id;
    const accessToken = sysCfg?.tiendanube_access_token;

    if (!storeId || !accessToken) {
      return res.status(400).json({ error: 'Credenciales de TiendaNube no configuradas en system_config' });
    }

    if (req.method === 'GET') {
      const listRes = await fetch(`https://api.tiendanube.com/v1/${storeId}/webhooks`, {
        headers: {
          'Authentication': `bearer ${accessToken}`,
          'User-Agent': 'Apes Tiendanube CRM',
          'Content-Type': 'application/json',
        },
      });
      const listData = await listRes.json();
      return res.status(200).json({ success: true, webhooks: listData, storeId });
    }

    const baseUrl = req.headers.origin || req.headers.referer?.replace(/\/$/, '') || 'https://apes-tiendanuebe-crm.vercel.app';
    const webhookUrl = `${baseUrl}/api/inventory/webhook-tiendanube`;

    const body = req.body || {};
    const action = body.action || 'register';

    if (action === 'register') {
      const { data: existing } = await supabase
        .from('system_config')
        .select('webhook_config')
        .eq('id', 'main')
        .single();

      const existingWebhooks = existing?.webhook_config?.registered_webhooks || [];

      const events = [
        'product/updated',
        'variant/updated',
        'order/created',
        'order/updated',
        'order/cancelled',
      ];

      const results = [];

      for (const event of events) {
        const alreadyRegistered = existingWebhooks.some(w => w.event === event && w.url === webhookUrl);
        if (alreadyRegistered) {
          results.push({ event, status: 'already_registered' });
          continue;
        }

        const tnRes = await fetch(`https://api.tiendanube.com/v1/${storeId}/webhooks`, {
          method: 'POST',
          headers: {
            'Authentication': `bearer ${accessToken}`,
            'User-Agent': 'Apes Tiendanube CRM',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event,
            url: webhookUrl,
          }),
        });

        const tnData = await tnRes.json();

        if (tnRes.ok) {
          results.push({ event, status: 'registered', id: tnData.id });
          existingWebhooks.push({ event, url: webhookUrl, id: tnData.id });
        } else {
          results.push({ event, status: 'error', error: tnData });
        }

        await new Promise(r => setTimeout(r, 600));
      }

      await supabase
        .from('system_config')
        .upsert({
          id: 'main',
          webhook_config: { registered_webhooks: existingWebhooks, last_registered: new Date().toISOString() },
        }, { onConflict: 'id' });

      return res.status(200).json({ success: true, results, webhookUrl });
    }

    if (action === 'delete' && body.webhookId) {
      const delRes = await fetch(`https://api.tiendanube.com/v1/${storeId}/webhooks/${body.webhookId}`, {
        method: 'DELETE',
        headers: {
          'Authentication': `bearer ${accessToken}`,
          'User-Agent': 'Apes Tiendanube CRM',
        },
      });
      return res.status(200).json({ success: delRes.ok, status: delRes.status });
    }

    return res.status(400).json({ error: 'Acción no válida' });

  } catch (err) {
    console.error('[register-webhook] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
