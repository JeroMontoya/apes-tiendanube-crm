import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const STORES_FILE = path.join(__dirname, 'stores.json');

app.use(cors({ origin: 'http://localhost:5173' })); // Allow Vite dev server
// Custom middleware para guardar el rawBody necesario para HMAC
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// Funciones para manejar stores.json
const getStores = () => {
  if (!fs.existsSync(STORES_FILE)) return [];
  return JSON.parse(fs.readFileSync(STORES_FILE, 'utf8'));
};

const saveStore = (storeId, accessToken) => {
  const stores = getStores();
  const existing = stores.find(s => s.storeId === storeId);
  if (existing) {
    existing.accessToken = accessToken;
  } else {
    stores.push({ storeId, accessToken });
  }
  fs.writeFileSync(STORES_FILE, JSON.stringify(stores, null, 2));
};

const getStoreToken = (storeId) => {
  const stores = getStores();
  const store = stores.find(s => String(s.storeId) === String(storeId));
  return store ? store.accessToken : null;
};

// ── Rutas OAuth ─────────────────────────────────────────────

app.get('/api/auth/install', (req, res) => {
  const { store_id } = req.query;
  if (!store_id) return res.status(400).send('Falta store_id');

  const clientId = process.env.TN_CLIENT_ID;
  const redirectUri = process.env.TN_REDIRECT_URI;
  
  const authUrl = `https://www.tiendanube.com/apps/${clientId}/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${store_id}`;
  res.redirect(authUrl);
});

app.get('/api/auth/callback', async (req, res) => {
  const { code, state: storeId } = req.query;
  
  if (!code) return res.status(400).send('No se recibió el código de autorización');

  try {
    const response = await fetch('https://www.tiendanube.com/apps/authorize/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: process.env.TN_CLIENT_ID,
        client_secret: process.env.TN_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Error obteniendo token:', data);
      return res.status(500).send('Error obteniendo token de acceso');
    }

    saveStore(data.store_id || storeId, data.access_token);
    
    // Redirigir de vuelta al frontend
    res.redirect(`http://localhost:5173?installed=true&store=${data.store_id || storeId}`);
  } catch (error) {
    console.error('Error OAuth callback:', error);
    res.status(500).send('Error interno');
  }
});

// ── Rutas API ─────────────────────────────────────────────

app.get('/api/stores', (req, res) => {
  res.json(getStores().map(s => ({ storeId: s.storeId }))); // Omitir tokens por seguridad
});

const proxyTiendaNube = async (req, res, endpoint) => {
  const { storeId } = req.params;
  const token = getStoreToken(storeId);
  
  if (!token) return res.status(404).send('Tienda no encontrada o no autorizada');

  // Construir query string de los parámetros entrantes
  const qs = new URLSearchParams(req.query).toString();
  const url = `https://api.tiendanube.com/v1/${storeId}/${endpoint}${qs ? '?' + qs : ''}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Authentication': `bearer ${token}`,
        'User-Agent': 'APES CRM (tu@email.com)'
      }
    });

    if (response.status === 404 && endpoint === 'customers') {
       return res.json([]);
    }

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).send(errorText);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error(`Error proxying ${endpoint}:`, error);
    res.status(500).send('Error interno del servidor');
  }
};

app.get('/api/stores/:storeId/orders', (req, res) => proxyTiendaNube(req, res, 'orders'));
app.get('/api/stores/:storeId/customers', (req, res) => proxyTiendaNube(req, res, 'customers'));

// ── Webhooks ─────────────────────────────────────────────

app.post('/api/webhooks/orders', (req, res) => {
  const signature = req.headers['x-linkedstore-hmac-sha256'];
  const clientSecret = process.env.TN_CLIENT_SECRET;

  if (!signature || !req.rawBody) {
    return res.status(401).send('Firma o cuerpo faltante');
  }

  const expectedHmac = crypto
    .createHmac('sha256', clientSecret)
    .update(req.rawBody)
    .digest('hex');

  const isValid = crypto.timingSafeEqual(Buffer.from(expectedHmac), Buffer.from(signature));

  if (!isValid) {
    console.error('Webhook HMAC inválido');
    return res.status(401).send('No autorizado');
  }

  // Responder inmediatamente (Requisito TiendaNube: < 3 segs)
  res.status(200).send('OK');

  // Procesar evento asincrónicamente
  console.log('Webhook orden recibida:', req.body.event, 'ID:', req.body.id);
  // Aquí podríamos encolar un job para procesar la nueva orden
});

app.listen(PORT, () => {
  console.log(`Backend TiendaNube APES escuchando en http://localhost:${PORT}`);
});
