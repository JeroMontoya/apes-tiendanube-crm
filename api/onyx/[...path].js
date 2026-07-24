// api/onyx/[...path].js
//
// Proxy server-side entre SuperDashboard (Vercel) y Onyx Brain (FastAPI en Render/Railway).
// El navegador SOLO habla con este endpoint (/api/onyx/*). Nunca conoce ONYX_API_KEY
// ni la URL real del backend Python.
//
// Variables de entorno requeridas EN VERCEL (sin prefijo VITE_, o sea invisibles al bundle):
//   PYTHON_API_URL   -> ej. https://tu-onyx-brain.onrender.com
//   ONYX_API_KEY     -> la misma key que espera dependencies.py en el backend
//
// IMPORTANTE: borrar VITE_ONYX_API_KEY y VITE_PYTHON_API_URL del frontend.
// Cualquier variable VITE_* queda embebida en el JS del navegador = pública.

const PYTHON_API_URL = process.env.PYTHON_API_URL;
const ONYX_API_KEY = process.env.ONYX_API_KEY;

// --- Rate limit básico en memoria ---
// Sirve como freno mínimo, NO como control de abuso serio: en serverless
// cada invocación puede correr en una instancia/cold-start distinta, así
// que el contador no es compartido de forma confiable entre requests.
// Para un límite real y persistente, mover esto a Upstash Redis
// (@upstash/ratelimit) o usar Vercel Firewall / WAF rules a nivel de proyecto.
const hits = new Map();
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 30;

function isRateLimited(ip) {
  const now = Date.now();
  const entry = hits.get(ip) || { count: 0, start: now };
  if (now - entry.start > WINDOW_MS) {
    entry.count = 0;
    entry.start = now;
  }
  entry.count += 1;
  hits.set(ip, entry);
  return entry.count > MAX_REQUESTS_PER_WINDOW;
}

export default async function handler(req, res) {
  if (!PYTHON_API_URL || !ONYX_API_KEY) {
    console.error('[onyx-proxy] Faltan PYTHON_API_URL o ONYX_API_KEY en las env vars de Vercel');
    return res.status(500).json({ error: 'Proxy mal configurado' });
  }

  const ip =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Demasiadas solicitudes, esperá un momento' });
  }

  const pathSegments = Array.isArray(req.query.path) ? req.query.path.join('/') : '';
  const targetUrl = `${PYTHON_API_URL}/api/v1/intelligence/${pathSegments}`;

  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'X-ONYX-API-KEY': ONYX_API_KEY,
      },
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
    });

    const contentType = upstream.headers.get('content-type') || 'application/json';
    const data = await upstream.text();

    res.status(upstream.status);
    res.setHeader('Content-Type', contentType);
    return res.send(data);
  } catch (err) {
    console.error('[onyx-proxy] Error contactando Onyx Brain:', err.message);
    return res.status(502).json({ error: 'No se pudo conectar con Onyx Brain' });
  }
}
