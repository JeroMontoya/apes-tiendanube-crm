import { createClient } from '@supabase/supabase-js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Authentication',
};

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    // ── Get TiendaNube token ──
    let tiendanubeToken = null;

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: sysConfig, error: sysErr } = await supabase
          .from('system_config')
          .select('tiendanube_access_token')
          .eq('id', 'main')
          .single();

        if (!sysErr && sysConfig?.tiendanube_access_token) {
          tiendanubeToken = sysConfig.tiendanube_access_token;
        }

        if (!tiendanubeToken) {
          const { data: ws, error: wsErr } = await supabase
            .from('workspaces')
            .select('tiendanube_access_token')
            .not('tiendanube_access_token', 'is', null)
            .limit(1)
            .single();

          if (!wsErr && ws?.tiendanube_access_token) {
            tiendanubeToken = ws.tiendanube_access_token;
          }
        }
      } catch (dbErr) {
        console.warn('[proxy] DB lookup failed:', dbErr.message);
      }
    }

    // Fallback: use client's token
    if (!tiendanubeToken) {
      const authHeader = req.headers.authentication || req.headers.authorization || '';
      tiendanubeToken = authHeader.replace(/^Bearer\s+/i, '').trim();
    }

    if (!tiendanubeToken) {
      return res.status(400).json({ error: 'No TiendaNube token.' });
    }

    // ── Forward to TiendaNube ──
    const { tnpath, ...queryParams } = req.query;
    const upstreamPath = Array.isArray(tnpath) ? tnpath.join('/') : (tnpath || '');
    const url = new URL(`https://api.tiendanube.com/v1/${upstreamPath}`);
    Object.entries(queryParams).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const upstreamRes = await fetch(url.toString(), {
      method: req.method,
      headers: {
        'Authentication': `bearer ${tiendanubeToken}`,
        'User-Agent': 'Apes Tiendanube CRM',
        'Content-Type': 'application/json',
      },
      ...(req.method !== 'GET' && req.method !== 'HEAD' && req.body
        ? { body: JSON.stringify(req.body) }
        : {}),
    });

    res.setHeader('Content-Type', upstreamRes.headers.get('content-type') || 'application/json');
    const data = await upstreamRes.text();
    return res.status(upstreamRes.status).send(data);

  } catch (err) {
    console.error('[tiendanube-proxy]', err);
    return res.status(500).json({ error: 'Proxy error', detail: err.message });
  }
}

export const config = {
  runtime: 'nodejs',
};
