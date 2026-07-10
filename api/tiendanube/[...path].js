import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Supabase admin client (service role — never exposed to the browser)
// ---------------------------------------------------------------------------
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://kxhdslhgvuvpoxgffssv.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// ---------------------------------------------------------------------------
// CORS helper
// ---------------------------------------------------------------------------
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function setCors(res) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
}

// ---------------------------------------------------------------------------
// Handler — /api/tiendanube/[...path] → https://api.tiendanube.com/v1/*
// ---------------------------------------------------------------------------
export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    let tiendanubeToken = null;
    let storeId = null;

    // ---------------------------------------------------------------
    // 1. Try to get token from system_config (shared across all users)
    // ---------------------------------------------------------------
    const { data: sysConfig } = await supabase
      .from('system_config')
      .select('tiendanube_access_token, tiendanube_store_id')
      .eq('id', 'main')
      .single();

    if (sysConfig?.tiendanube_access_token) {
      tiendanubeToken = sysConfig.tiendanube_access_token;
      storeId = sysConfig.tiendanube_store_id;
    }

    // ---------------------------------------------------------------
    // 2. Fall back to user's workspace
    // ---------------------------------------------------------------
    if (!tiendanubeToken) {
      const bearerToken = req.headers.authorization?.replace('Bearer ', '');
      if (bearerToken) {
        const { data: { user } } = await supabase.auth.getUser(bearerToken);
        if (user) {
          const { data: workspace } = await supabase
            .from('workspaces')
            .select('tiendanube_access_token, tiendanube_store_id')
            .eq('user_id', user.id)
            .single();
          if (workspace?.tiendanube_access_token) {
            tiendanubeToken = workspace.tiendanube_access_token;
            storeId = workspace.tiendanube_store_id;
          }
        }
      }
    }

    if (!tiendanubeToken) {
      return res.status(400).json({ error: 'TiendaNube not configured. Admin must set credentials in Settings.' });
    }

    // ---------------------------------------------------------------
    // 3. Build upstream URL
    // ---------------------------------------------------------------
    const pathSegments = req.query.path || [];
    const upstreamPath = Array.isArray(pathSegments) ? pathSegments.join('/') : pathSegments;
    const url = new URL(`https://api.tiendanube.com/v1/${upstreamPath}`);
    Object.entries(req.query).forEach(([key, value]) => {
      if (key !== 'path') url.searchParams.append(key, value);
    });

    // ---------------------------------------------------------------
    // 4. Forward to TiendaNube
    // ---------------------------------------------------------------
    const upstreamRes = await fetch(url.toString(), {
      method: req.method,
      headers: {
        'Authentication': `bearer ${tiendanubeToken}`,
        'User-Agent': 'APES CRM (contact@apesdigital.com)',
        'Content-Type': 'application/json',
      },
      ...(req.method !== 'GET' && req.method !== 'HEAD' && req.body
        ? { body: JSON.stringify(req.body) }
        : {}),
    });

    const contentType = upstreamRes.headers.get('content-type') || 'application/json';
    res.setHeader('Content-Type', contentType);
    const data = await upstreamRes.text();
    return res.status(upstreamRes.status).send(data);

  } catch (err) {
    console.error('[tiendanube-proxy]', err);
    return res.status(500).json({ error: 'Internal proxy error', detail: err.message });
  }
}
