/**
 * Vercel Serverless Proxy for TiendaNube API.
 * 
 * Catches all requests to /api/tiendanube/* and forwards them
 * to https://api.tiendanube.com/v1/* with the proper auth header.
 * 
 * This avoids CORS issues since the browser talks to our own domain.
 */
export default async function handler(req, res) {
  // Extract the dynamic path segments after /api/tiendanube/
  // Vercel catch-all routes provide the path as an array
  const pathSegments = req.query.path;

  if (!pathSegments || pathSegments.length === 0) {
    return res.status(400).json({ error: 'Missing API path' });
  }

  // Reconstruct the TiendaNube API URL
  const tnPath = Array.isArray(pathSegments) ? pathSegments.join('/') : pathSegments;
  const tnUrl = `https://api.tiendanube.com/v1/${tnPath}`;

  // Forward the Authentication header from the client
  const authHeader = req.headers['authentication'] || req.headers['Authorization'] || '';

  try {
    const response = await fetch(tnUrl, {
      method: req.method || 'GET',
      headers: {
        'Authentication': authHeader,
        'User-Agent': 'APES CRM (contact@apesdigital.com)',
        'Content-Type': 'application/json',
      },
      // Forward body for POST/PUT/PATCH
      ...(req.method !== 'GET' && req.method !== 'HEAD' && req.body
        ? { body: JSON.stringify(req.body) }
        : {}),
    });

    const data = await response.text();

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authentication, Authorization, Content-Type, User-Agent');

    // Handle preflight
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // Forward the status and response
    res.status(response.status);
    
    // Try to parse as JSON and forward
    try {
      const jsonData = JSON.parse(data);
      res.json(jsonData);
    } catch {
      // If not JSON, send as text
      res.send(data);
    }
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(502).json({ 
      error: 'Proxy error', 
      message: error.message 
    });
  }
}
