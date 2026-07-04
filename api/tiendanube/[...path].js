import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Supabase admin client (service role — never exposed to the browser)
// ---------------------------------------------------------------------------
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kxhdslhgvuvpoxgffssv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ---------------------------------------------------------------------------
// CORS helper — allow all origins for SPA consumption; tighten in production
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

  // Preflight
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    // ------------------------------------------------------------------
    // 1. Authenticate the caller via their Supabase JWT
    // ------------------------------------------------------------------
    const bearerToken = req.headers.authorization?.replace('Bearer ', '');
    if (!bearerToken) {
      return res.status(401).json({ error: 'Missing Authorization header' });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(bearerToken);
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized — invalid or expired token' });
    }

    // ------------------------------------------------------------------
    // 2. Fetch the user's workspace to obtain the TiendaNube token
    // ------------------------------------------------------------------
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (wsError || !workspace) {
      return res.status(404).json({ error: 'Workspace not found for this user' });
    }

    const tiendanubeToken = workspace.tiendanube_access_token;
    if (!tiendanubeToken) {
      return res.status(400).json({ error: 'TiendaNube access token not configured in workspace' });
    }

    // ------------------------------------------------------------------
    // 3. Build the upstream URL from the catch-all path segments
    // ------------------------------------------------------------------
    const pathSegments = req.query.path || [];
    const upstreamPath = Array.isArray(pathSegments) ? pathSegments.join('/') : pathSegments;

    // Preserve original query string (minus the internal "path" param)
    const url = new URL(`https://api.tiendanube.com/v1/${upstreamPath}`);
    Object.entries(req.query).forEach(([key, value]) => {
      if (key !== 'path') url.searchParams.append(key, value);
    });

    // ------------------------------------------------------------------
    // 4. Forward the request to TiendaNube
    // ------------------------------------------------------------------
    const upstreamRes = await fetch(url.toString(), {
      method: req.method,
      headers: {
        'Authentication': `bearer ${tiendanubeToken}`,
        'User-Agent': 'APES CRM (contact@apesdigital.com)',
        'Content-Type': 'application/json',
      },
      // Forward body for mutating methods
      ...(req.method !== 'GET' && req.method !== 'HEAD' && req.body
        ? { body: JSON.stringify(req.body) }
        : {}),
    });

    // ------------------------------------------------------------------
    // 5. Relay the upstream response back to the client
    // ------------------------------------------------------------------
    const contentType = upstreamRes.headers.get('content-type') || 'application/json';
    res.setHeader('Content-Type', contentType);

    const data = await upstreamRes.text();
    return res.status(upstreamRes.status).send(data);

  } catch (err) {
    console.error('[tiendanube-proxy]', err);
    return res.status(500).json({ error: 'Internal proxy error', detail: err.message });
  }
}
