import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Supabase admin client (service role — never exposed to the browser)
// ---------------------------------------------------------------------------
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kxhdslhgvuvpoxgffssv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ---------------------------------------------------------------------------
// CORS
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
// Handler — /api/meta/[...path] → https://graph.facebook.com/v19.0/*
// ---------------------------------------------------------------------------
export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    // ------------------------------------------------------------------
    // 1. Authenticate
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
    // 2. Workspace lookup — obtain Meta access token
    // ------------------------------------------------------------------
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (wsError || !workspace) {
      return res.status(404).json({ error: 'Workspace not found for this user' });
    }

    const metaToken = workspace.meta_access_token;
    if (!metaToken) {
      return res.status(400).json({ error: 'Meta access token not configured in workspace' });
    }

    // ------------------------------------------------------------------
    // 3. Build upstream URL — token goes as query param per Graph API convention
    // ------------------------------------------------------------------
    const pathSegments = req.query.path || [];
    const upstreamPath = Array.isArray(pathSegments) ? pathSegments.join('/') : pathSegments;

    const url = new URL(`https://graph.facebook.com/v19.0/${upstreamPath}`);

    // Append all original query params first
    Object.entries(req.query).forEach(([key, value]) => {
      if (key !== 'path') url.searchParams.append(key, value);
    });

    // Inject the access_token (after user params so it's not overwritten)
    url.searchParams.set('access_token', metaToken);

    // ------------------------------------------------------------------
    // 4. Forward
    // ------------------------------------------------------------------
    const fetchOptions = {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
    };

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const upstreamRes = await fetch(url.toString(), fetchOptions);

    // ------------------------------------------------------------------
    // 5. Relay
    // ------------------------------------------------------------------
    const contentType = upstreamRes.headers.get('content-type') || 'application/json';
    res.setHeader('Content-Type', contentType);

    const data = await upstreamRes.text();
    return res.status(upstreamRes.status).send(data);

  } catch (err) {
    console.error('[meta-proxy]', err);
    return res.status(500).json({ error: 'Internal proxy error', detail: err.message });
  }
}
