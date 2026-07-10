import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Supabase admin client (only works if SUPABASE_SERVICE_ROLE_KEY is set)
// ---------------------------------------------------------------------------
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const hasAdminClient = !!(process.env.SUPABASE_SERVICE_ROLE_KEY && supabaseUrl);
const supabase = hasAdminClient ? createClient(supabaseUrl, supabaseKey) : null;

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ---------------------------------------------------------------------------
// Handler — /api/tiendanube/[...path] → https://api.tiendanube.com/v1/*
// ---------------------------------------------------------------------------
export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    let tiendanubeToken = null;

    // ── Path A: Read credentials from database (secure, server-side only) ──
    if (supabase) {
      const { data: sysConfig } = await supabase
        .from('system_config')
        .select('tiendanube_access_token')
        .eq('id', 'main')
        .single();

      tiendanubeToken = sysConfig?.tiendanube_access_token || null;

      if (!tiendanubeToken) {
        const { data: ws } = await supabase
          .from('workspaces')
          .select('tiendanube_access_token')
          .not('tiendanube_access_token', 'is', null)
          .limit(1)
          .single();
        tiendanubeToken = ws?.tiendanube_access_token || null;
      }
    }

    // ── Path B: Forward client's token directly (fallback) ──
    if (!tiendanubeToken) {
      const authHeader = req.headers.authorization || req.headers.Authentication || '';
      tiendanubeToken = authHeader.replace(/^Bearer\s+/i, '').trim();
    }

    if (!tiendanubeToken) {
      return res.status(400).json({ error: 'No TiendaNube token available.' });
    }

    // ── Build upstream URL ──
    const pathSegments = req.query.path || [];
    const upstreamPath = Array.isArray(pathSegments) ? pathSegments.join('/') : pathSegments;
    const url = new URL(`https://api.tiendanube.com/v1/${upstreamPath}`);
    Object.entries(req.query).forEach(([key, value]) => {
      if (key !== 'path') url.searchParams.append(key, value);
    });

    // ── Forward to TiendaNube ──
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
