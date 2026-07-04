import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

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
// Google OAuth2 — mint an access token from a service account JSON key
// Uses the standard JWT-bearer flow (RFC 7523) without any external library.
// ---------------------------------------------------------------------------
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GA_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';

/**
 * Base64url encode a buffer or string (no padding).
 */
function base64url(input) {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64url');
}

/**
 * Build a signed JWT assertion for Google's OAuth2 token endpoint.
 * @param {object} serviceAccount — parsed service account JSON
 * @returns {string} signed JWT
 */
function buildGoogleJwt(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccount.client_email,
    scope: GA_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600, // 1-hour lifetime (Google maximum)
  };

  const segments = [base64url(JSON.stringify(header)), base64url(JSON.stringify(payload))];
  const signingInput = segments.join('.');

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signingInput);
  const signature = sign.sign(serviceAccount.private_key, 'base64url');

  return `${signingInput}.${signature}`;
}

/**
 * Exchange the signed JWT for a short-lived Google access token.
 */
async function getGoogleAccessToken(serviceAccount) {
  const assertion = buildGoogleJwt(serviceAccount);

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!tokenRes.ok) {
    const detail = await tokenRes.text();
    throw new Error(`Google token exchange failed (${tokenRes.status}): ${detail}`);
  }

  const { access_token } = await tokenRes.json();
  return access_token;
}

// ---------------------------------------------------------------------------
// Handler — /api/google/[...path] → https://analyticsdata.googleapis.com/v1beta/*
// ---------------------------------------------------------------------------
export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    // ------------------------------------------------------------------
    // 1. Authenticate the caller
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
    // 2. Workspace lookup — obtain GA4 service account credentials
    // ------------------------------------------------------------------
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (wsError || !workspace) {
      return res.status(404).json({ error: 'Workspace not found for this user' });
    }

    const credentialsRaw = workspace.ga4_credentials_json;
    if (!credentialsRaw) {
      return res.status(400).json({ error: 'GA4 credentials not configured in workspace' });
    }

    // Parse — supports both a JSON string and a pre-parsed object
    const serviceAccount =
      typeof credentialsRaw === 'string' ? JSON.parse(credentialsRaw) : credentialsRaw;

    // ------------------------------------------------------------------
    // 3. Mint a short-lived Google access token via JWT assertion
    // ------------------------------------------------------------------
    const googleToken = await getGoogleAccessToken(serviceAccount);

    // ------------------------------------------------------------------
    // 4. Build upstream URL
    // ------------------------------------------------------------------
    const pathSegments = req.query.path || [];
    const upstreamPath = Array.isArray(pathSegments) ? pathSegments.join('/') : pathSegments;

    const url = new URL(`https://analyticsdata.googleapis.com/v1beta/${upstreamPath}`);
    Object.entries(req.query).forEach(([key, value]) => {
      if (key !== 'path') url.searchParams.append(key, value);
    });

    // ------------------------------------------------------------------
    // 5. Forward
    // ------------------------------------------------------------------
    const fetchOptions = {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${googleToken}`,
        'Content-Type': 'application/json',
      },
    };

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const upstreamRes = await fetch(url.toString(), fetchOptions);

    // ------------------------------------------------------------------
    // 6. Relay
    // ------------------------------------------------------------------
    const contentType = upstreamRes.headers.get('content-type') || 'application/json';
    res.setHeader('Content-Type', contentType);

    const data = await upstreamRes.text();
    return res.status(upstreamRes.status).send(data);

  } catch (err) {
    console.error('[google-proxy]', err);
    return res.status(500).json({ error: 'Internal proxy error', detail: err.message });
  }
}
