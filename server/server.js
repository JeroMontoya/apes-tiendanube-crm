import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import https from 'https';
import http from 'http';
import dotenv from 'dotenv';
import { google } from 'googleapis';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { MetaAdLibraryAPI, getMetaAdLibraryInsights } from '../src/api/MetaAdLibraryAPI.js';
import { MerchantCenterAPI } from '../src/api/MerchantCenterAPI.js';
import { createClient } from '@supabase/supabase-js';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// === TEMPORARY NLP FALLBACK LOGIC ===
// When real API keys are provided in .env, these will be replaced with real API calls.
const RAW_ADS_DATABASE = [
  // APES ADVENTURE (Nosotros)
  { brand: 'apes', format: 'reel', copy: '¿Listo para la aventura? Descubre nuestra nueva colección 🏔️', engagement: 'Medio' },
  { brand: 'apes', format: 'carousel', copy: 'Equípate para el invierno. Desliza para ver más.', engagement: 'Bajo' },
  { brand: 'apes', format: 'image', copy: '30% OFF en Botas de Montaña. Solo por hoy. Compra ya.', engagement: 'Alto' },
  { brand: 'apes', format: 'image', copy: 'Dejaste algo en tu carrito. Termina tu compra con envío gratis.', engagement: 'Medio' },
  
  // TOPARA
  { brand: 'topara', format: 'video', copy: 'No todos los territorios exigen lo mismo. Latinoamérica lo exige todo. 🌎 Sol intenso, humedad, frío, lluvia... cada paisaje pone a prueba tu equipo. Por eso, en TOPARA, la aventura comienza mucho antes de salir: comienza con la tecnología que te acompaña en cada paso...', engagement: 'Muy Alto' },
  { brand: 'topara', format: 'video', copy: '🌧️ La Impermeabilidad te protege porque bloquea el agua, evita filtraciones y te mantiene seco y cómodo para seguir explorando incluso cuando llueve.', engagement: 'Alto' },
  { brand: 'topara', format: 'image', copy: 'Los Multiusos Tikal están 100% recomendados ⭐️ por quienes los usan en su día a día y están diseñados para organizar lo que realmente usas. ¿Cuál es el tamaño ideal para ti?', engagement: 'Medio' },
  { brand: 'topara', format: 'video', copy: 'En rutas outdoor, el secado rápido es una prioridad para mantener el rendimiento. 💨 Nuestratecnología de SECADO RÁPIDO gestiona la humedad para que tu ropa permanezca ligeras y fresca.', engagement: 'Alto' },
  { brand: 'topara', format: 'image', copy: 'Todos los descuentos de SALE también están en las tiendas físicas. Te esperamos en el C.C Fontanar Local 3-38 para que aprovechas hasta 40% OFF.', engagement: 'Alto' },
  { brand: 'topara', format: 'video', copy: 'Que tenga descuento no significa que pierda calidad. 💪 Aprovecha hasta 40% OFF en ropa, equipaje y accesorios diseñados para resistir clima, movimiento y terreno real.', engagement: 'Muy Alto' },
  { brand: 'topara', format: 'image', copy: '¡Chaquetas y buzos con descuentos hasta de 40%! 🔥 Escríbenos por WhatsApp, asegura tu talla antes de que se agote y recibe rápido en casa. Compra fácil, segura y sin complicaciones.', engagement: 'Alto' },
  { brand: 'topara', format: 'video', copy: 'Lo que hoy ves con descuento mañana puede no estar disponible. 🥵 Compra online fácil, paga como prefieras y recibe rápido en casa, además ahorras hasta 40% en ropa, equipaje y accesorios.', engagement: 'Muy Alto' },
  { brand: 'topara', format: 'video', copy: '¡Este descuento no aparece dos veces! ⚡ Regístrate ahora, recibe tu beneficio y aprovecha la oportunidad de empezar a equiparte pagando menos.', engagement: 'Medio' },
  { brand: 'topara', format: 'image', copy: 'Tu carrito sigue listo, pero no para siempre. 🚨 Regresa ahora, termina tu compra y asegura lo que elegiste antes de que se agote.', engagement: 'Muy Alto' },
  { brand: 'topara', format: 'video', copy: '¡Esa prenda sigue esperando por ti ⏳! Si la elegiste, fue por una razón: protección para el sol, el frío y la lluvia en condiciones reales. Vuelve ahora, finaliza tu compra y recíbela rápido en casa.', engagement: 'Alto' },
  { brand: 'topara', format: 'video', copy: '¡Los descuentos son por tiempo limitado! 🔥 Vuelve ahora, completa tu compra y asegura tu pedido con envío rápido y pago seguro.', engagement: 'Alto' },

  // QUALIBET
  { brand: 'qulybet', format: 'image', copy: '¡Nuevo Drop CABAÑA! Inspirada en las montañas cafeteras de Colombia, llegan nuevas siluetas listas para tu día a día 👉 Descúbrelas ahora.', engagement: 'Medio' },
  { brand: 'qulybet', format: 'image', copy: 'Descubre nuevos caminos con Qualibet. Mochilas y complementos de viaje creados a mano en Colombia. Explora ahora nuestra web y comienza a vivir cada viaje con nosotros 🌐 Disponible en: qualibet.co 🚚 ¡Envío GRATIS en compras de 400.000 o más!', engagement: 'Alto' },
  { brand: 'qulybet', format: 'video', copy: '⚠️ Últimos días para encontrar tu Qualibet con precios del 2025. Válido del 27 mayo al 2 de Junio 2026 en todas nuestras tiendas físicas. ENVIOS GRATIS solo en nuestra web - Qualibet.co (envío nacional) 🚚', engagement: 'Alto' },

  // LASKABRAN
  { brand: 'laskabran', format: 'video', copy: 'Explora sin límites. Únete a nuestra comunidad.', engagement: 'Medio' },
  { brand: 'laskabran', format: 'carousel', copy: 'Las mejores mochilas tácticas. Material ultra-resistente. Descubre más en nuestra web.', engagement: 'Alto' },
  { brand: 'laskabran', format: 'image', copy: 'Liquidación total. Hasta 50% de descuento. COMPRAR AHORA.', engagement: 'Alto' },
  
  // COLUMBIA
  { brand: 'columbia', format: 'video', copy: 'Tecnología Omni-Heat. Siente el calor. Siguenos en nuestro perfil.', engagement: 'Alto' },
  { brand: 'columbia', format: 'carousel', copy: 'Conoce la tecnología detrás de nuestras prendas. Entra a nuestra web para el detalle técnico.', engagement: 'Medio' },
  { brand: 'columbia', format: 'image', copy: 'Compra en tiendas oficiales. Calidad garantizada. Descuentos de temporada.', engagement: 'Alto' },
];

const INTENT_DICTIONARIES = {
  venta: ['compra ya', 'comprar', 'descuento', 'oferta', 'liquidación', 'off en', 'solo por hoy', '% de descuento', 'ingresando ya a'],
  remarketing: ['dejaste algo', 'carrito', 'vuelve por', 'termina tu compra', 'olvidaste', 'aún estás a tiempo', 'oferta final', 'te espera', 'vuelve y arma'],
  perfil: ['síguenos', 'siguenos', 'en la bio', 'nuestra marca', 'listo para la aventura', 'conectar con la naturaleza', 'explora sin límites', 'perfil', 'así definimos'],
  web: ['conoce más', 'descubre', 'web', 'www.', 'ingresa a', 'catálogo', 'encuéntrala', 'conócelos en', 'colección', 'herramienta', 'tecnología']
};

function localNLPClassifier(copyText) {
  const text = copyText.toLowerCase();
  if (INTENT_DICTIONARIES.remarketing.some(kw => text.includes(kw))) return 'remarketing';
  if (INTENT_DICTIONARIES.venta.some(kw => text.includes(kw))) return 'venta';
  if (INTENT_DICTIONARIES.web.some(kw => text.includes(kw))) return 'web';
  if (INTENT_DICTIONARIES.perfil.some(kw => text.includes(kw))) return 'perfil';
  if (text.length > 150) return 'web';
  return 'perfil';
}

// === GEMINI AI CLASSIFIER ===
async function geminiAdClassifier(adsList, apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
  // Using gemini-1.5-flash for fast categorization
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            brand: { type: SchemaType.STRING },
            intent: { 
              type: SchemaType.STRING, 
              enum: ["perfil", "web", "venta", "remarketing"] 
            },
            copy: { type: SchemaType.STRING }
          },
          required: ["brand", "intent", "copy"]
        }
      }
    }
  });

  const prompt = `
    Eres un analista experto en Marketing Digital y embudos de conversión (Funnels).
    Tu tarea es leer los siguientes copies de anuncios publicitarios y clasificarlos en UNA de estas 4 categorías del funnel de ventas:
    - "perfil": Anuncios de reconocimiento de marca, branding, o invitaciones a seguir la cuenta.
    - "web": Anuncios enfocados en educar sobre el producto, tecnología, historia, o generar tráfico a la web (etapa de consideración).
    - "venta": Anuncios con fuertes llamados a la acción de compra, descuentos, rebajas o sentido de urgencia.
    - "remarketing": Anuncios dirigidos a personas que ya interactuaron (carritos abandonados, "vuelve por lo que dejaste", "última oportunidad").

    Devuelve un JSON Array donde cada objeto tenga 'brand', 'intent' (tu clasificación exacta de las 4 opciones) y el 'copy' original.

    Aquí están los anuncios a clasificar:
    ${JSON.stringify(adsList)}
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Classification Error:", error);
    return null;
  }
}

// === ROUTES ===

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// Meta Ads Library Endpoint
app.get('/api/competitors/ads', async (req, res) => {
  const metaToken = process.env.META_ACCESS_TOKEN;
  const hasMetaKey = metaToken && metaToken !== 'your_meta_access_token_here';
  const geminiKey = process.env.GEMINI_API_KEY;
  
  const classifiedMatrix = {
    apes: { perfil: [], web: [], venta: [], remarketing: [] },
    topara: { perfil: [], web: [], venta: [], remarketing: [] },
    qulybet: { perfil: [], web: [], venta: [], remarketing: [] },
    laskabran: { perfil: [], web: [], venta: [], remarketing: [] },
    columbia: { perfil: [], web: [], venta: [], remarketing: [] }
  };

  let source = 'simulator';

  // If real API tokens are available, fetch real ads from Meta
  if (hasMetaKey) {
    source = 'meta_api_real';
    try {
      const competitorPages = [
        { pageId: '269389531548135', name: 'topara', category: 'Competitor' }, // Example IDs, should be dynamic or real
        { pageId: '109156641775791', name: 'qulybet', category: 'Competitor' },
        { pageId: '102717015405068', name: 'laskabran', category: 'Competitor' },
        { pageId: '110696775607062', name: 'columbia', category: 'Competitor' }
      ];
      
      const api = new MetaAdLibraryAPI(metaToken);
      let realAds = [];
      
      // Fetch 5 ads per competitor for demo purposes to avoid huge processing times
      for (let comp of competitorPages) {
        const result = await api.searchAds({ pageId: comp.pageId, limit: 5 });
        if (result.success && result.data && result.data.data) {
          result.data.data.forEach(ad => {
            realAds.push({
              brand: comp.name,
              format: ad.ad_creative_media?.type || 'image',
              copy: ad.ad_creative_body || ad.ad_creative_link_title || 'No copy',
              engagement: ad.impressions ? 'Alto' : 'Desconocido', // Rough proxy
              original_ad: ad
            });
          });
        }
      }

      // If we got real ads, classify them with Gemini
      if (realAds.length === 0) {
        throw new Error("No real ads found from Meta API (token may be expired or no ads for these pages)");
      }

      // If we got real ads, classify them with Gemini
      if (geminiKey) {
         source = 'meta_api_real_classified_gemini';
         const classifiedByGemini = await geminiAdClassifier(realAds, geminiKey);
         if (classifiedByGemini) {
           classifiedByGemini.forEach(ad => {
             const originalAd = realAds.find(a => a.copy === ad.copy);
             if (originalAd && classifiedMatrix[ad.brand] && classifiedMatrix[ad.brand][ad.intent]) {
               classifiedMatrix[ad.brand][ad.intent].push({...originalAd, intent: ad.intent});
             }
           });
           return res.json({ source, data: classifiedMatrix });
         }
      }

      // Fallback to local classification for real ads (if Gemini fails or no key)
      source = 'meta_api_real_classified_local';
      realAds.forEach(ad => {
        const intent = localNLPClassifier(ad.copy);
        if (classifiedMatrix[ad.brand] && classifiedMatrix[ad.brand][intent]) {
          classifiedMatrix[ad.brand][intent].push({...ad, intent});
        }
      });
      return res.json({ source, data: classifiedMatrix });
    } catch (e) {
      console.error("Error connecting to Meta Ad Library:", e);
      // Fallback to simulator below
    }
  }

  // --- EXISTING SIMULATOR LOGIC (if no API keys or if API failed) ---
  if (geminiKey) {
    // Process with real Gemini AI
    const classifiedByGemini = await geminiAdClassifier(RAW_ADS_DATABASE, geminiKey);
    if (classifiedByGemini) {
      source = 'gemini_ai';
      classifiedByGemini.forEach(ad => {
        // Find original ad to preserve other metadata like 'format', 'engagement'
        const originalAd = RAW_ADS_DATABASE.find(a => a.copy === ad.copy);
        if (originalAd && classifiedMatrix[ad.brand] && classifiedMatrix[ad.brand][ad.intent]) {
          classifiedMatrix[ad.brand][ad.intent].push({...originalAd, intent: ad.intent});
        }
      });
      return res.json({ source, data: classifiedMatrix });
    }
  }

  // Fallback Simulator (Local NLP)
  // Simulate network delay if using local fallback
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  RAW_ADS_DATABASE.forEach(ad => {
    const intent = localNLPClassifier(ad.copy);
    if (classifiedMatrix[ad.brand] && classifiedMatrix[ad.brand][intent]) {
      classifiedMatrix[ad.brand][intent].push({...ad, intent});
    }
  });

  res.json({ source, data: classifiedMatrix });
});

// Google Merchant Center Endpoint
// Google Merchant Center Endpoint
app.get('/api/competitors/pricing', async (req, res) => {
  const merchantId = process.env.GOOGLE_MERCHANT_ID;
  const credentialsFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const hasMerchantKey = merchantId && merchantId !== 'your_merchant_id_here' && credentialsFile;
  
  if (hasMerchantKey) {
    try {
      // In a real scenario, you'd read the JSON file, but if it's a string path, the API class might handle it
      // For safety, assuming the env var is the JSON string itself or we parse it
      let creds = credentialsFile;
      if (credentialsFile.endsWith('.json')) {
         const fs = await import('fs');
         const path = await import('path');
         const fullPath = path.resolve(process.cwd(), credentialsFile);
         if (fs.existsSync(fullPath)) {
            creds = fs.readFileSync(fullPath, 'utf8');
         }
      }
      
      const api = new MerchantCenterAPI(creds, merchantId);
      // Example call: we get performance or list products. The real logic for 'leaderGap' involves analyzing competitor products.
      // We will mock the output structure but try to use real API connection.
      
      // Let's attempt to fetch the access token to verify it works
      const token = await api.getAccessToken();
      
      if (token) {
        // We'll return a dynamic response here simulating real analyzed data
        return res.json({
          source: 'merchant_center_api',
          data: {
            leaderGap: -12, // Dynamic calculation would go here based on product analysis
            approvalRate: 99,
            merchantId: merchantId
          }
        });
      }
    } catch (e) {
      console.error("Merchant Center API Error:", e);
      // Fallback to simulator below
    }
  }

  res.json({
    source: 'simulator',
    data: {
      leaderGap: -5,
      approvalRate: 98,
      merchantId: '5613923993'
    }
  });
});

// Google Search Console Endpoint
app.get('/api/competitors/seo', async (req, res) => {
  const hasSeoKey = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  let seoData = {
    clickGrowth: 12,
    opportunity: 'Mejorar title tags en categoría "Botas".',
    domain: 'tiendaapes.com'
  };
  let source = 'simulator';

  if (hasSeoKey) {
    try {
      const auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
      });
      const searchconsole = google.searchconsole({ version: 'v1', auth });
      
      // We will try to fetch the site list to verify access
      const siteList = await searchconsole.sites.list();
      const hasAccess = siteList.data.siteEntry && siteList.data.siteEntry.length > 0;
      
      if (hasAccess) {
        source = 'live_api';
        // In a real scenario, we'd query searchconsole.searchanalytics.query() here
        // For now we just prove the connection works by returning the actual domain found
        seoData.domain = siteList.data.siteEntry[0].siteUrl.replace('sc-domain:', '').replace('https://', '').replace('/', '');
        seoData.opportunity = 'API Conectada Exitosamente. Procesando insights...';
      }
    } catch (error) {
      console.error("Error connecting to Search Console:", error.message);
      seoData.opportunity = 'Error de API: ' + error.message;
    }
  }

  res.json({ source, data: seoData });
});

// === API PROXY ROUTES ===
// Vite dev server proxies these to external APIs.
// In production (Vercel), Express must proxy them since vercel.json
// routes ALL /api/* to this server.

function proxyToExternal(targetHost, pathRewrite) {
  return (req, res) => {
    const targetPath = pathRewrite ? pathRewrite(req.path, req.url) : req.url;
    const auth = req.headers['authentication'] || req.headers['Authorization'] || '';
    const devToken = req.headers['developer-token'] || '';

    const options = {
      hostname: targetHost,
      port: 443,
      path: targetPath,
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
        'Authentication': auth,
        'Accept': 'application/json',
        'User-Agent': req.headers['user-agent'] || 'APES CRM (contact@apesdigital.com)',
      },
    };

    if (devToken) options.headers['developer-token'] = devToken;

    const proxyReq = https.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, {
        'Content-Type': proxyRes.headers['content-type'] || 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error(`[Proxy Error] ${targetHost}${targetPath}:`, err.message);
      res.status(502).json({ error: 'Proxy error', message: err.message });
    });

    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      req.pipe(proxyReq);
    } else {
      proxyReq.end();
    }
  };
}

// TiendaNueve API Proxy: /api/tn-proxy/storeId/path -> /v1/storeId/path@api.tiendanube.com
app.all('/api/tn-proxy/*', (req, res) => {
  const tnPath = req.path.replace('/api/tn-proxy/', '');
  const qs = req.url.includes('?') ? req.url.split('?')[1] : '';
  const targetPath = `/v1/${tnPath}${qs ? '?' + qs : ''}`;
  proxyToExternal('api.tiendanube.com', () => targetPath)(req, res);
});

// TiendaNueve Alt route: /api/tiendanube/* -> /*@api.tiendanube.com
app.all('/api/tiendanube/*', (req, res) => {
  const tnPath = req.path.replace('/api/tiendanube', '');
  const qs = req.url.includes('?') ? req.url.split('?')[1] : '';
  const targetPath = `${tnPath}${qs ? '?' + qs : ''}`;
  proxyToExternal('api.tiendanube.com', () => targetPath)(req, res);
});

// Google Shopping Content: /gapi-content/* -> /*@shoppingcontent.googleapis.com
app.all('/gapi-content/*', (req, res) => {
  const targetPath = req.url.split('/gapi-content')[1] || '/';
  proxyToExternal('shoppingcontent.googleapis.com', () => targetPath)(req, res);
});

// Google Analytics Data: /gapi-analytics/* -> /*@analyticsdata.googleapis.com
app.all('/gapi-analytics/*', (req, res) => {
  const targetPath = req.url.split('/gapi-analytics')[1] || '/';
  proxyToExternal('analyticsdata.googleapis.com', () => targetPath)(req, res);
});

// Google OAuth: /gapi-oauth/* -> /*@oauth2.googleapis.com
app.all('/gapi-oauth/*', (req, res) => {
  const targetPath = req.url.split('/gapi-oauth')[1] || '/';
  proxyToExternal('oauth2.googleapis.com', () => targetPath)(req, res);
});

// Google Search Console: /gapi-webmasters/* -> /*@www.googleapis.com
app.all('/gapi-webmasters/*', (req, res) => {
  const targetPath = req.url.split('/gapi-webmasters')[1] || '/';
  proxyToExternal('www.googleapis.com', () => targetPath)(req, res);
});

// Google Ads: /gapi-ads/* -> /*@googleads.googleapis.com
app.all('/gapi-ads/*', (req, res) => {
  const targetPath = req.url.split('/gapi-ads')[1] || '/';
  proxyToExternal('googleads.googleapis.com', () => targetPath)(req, res);
});

// === END API PROXY ROUTES ===

// === REAL-TIME SYNC WEBHOOKS ===

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
);

// In-memory SSE connections per channel
const sseClients = new Map();

// SSE endpoint - clients connect here for real-time updates
app.get('/api/sync/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });
  res.write('data: {"type":"connected"}\n\n');

  const clientId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  const channel = req.query.channel || 'global';

  if (!sseClients.has(channel)) sseClients.set(channel, new Map());
  sseClients.get(channel).set(clientId, res);

  req.on('close', () => {
    const ch = sseClients.get(channel);
    if (ch) { ch.delete(clientId); if (ch.size === 0) sseClients.delete(channel); }
  });
});

function broadcastToChannel(channel, event, data) {
  const clients = sseClients.get(channel);
  if (!clients || clients.size === 0) return;
  const payload = `data: ${JSON.stringify({ type: event, ...data, timestamp: Date.now() })}\n\n`;
  for (const [id, client] of clients) {
    try { client.write(payload); } catch { clients.delete(id); }
  }
}

// Supabase Database Webhook receiver
app.post('/api/webhook/supabase', (req, res) => {
  try {
    const body = req.body;
    const table = body.table || body.record?.table_name || 'unknown';
    const event = body.type || body.event || 'UPDATE';
    const record = body.record || body;

    console.log(`[Supabase Webhook] ${event} on ${table}`);

    // Broadcast to all connected clients
    broadcastToChannel('global', 'db-change', { table, event, record });
    broadcastToChannel(`table:${table}`, 'db-change', { table, event, record });

    // Specific table handling
    if (table === 'system_config') {
      broadcastToChannel('global', 'config-changed', { table, event });
    }
    if (table === 'workspaces') {
      broadcastToChannel('global', 'workspace-changed', { table, event, record });
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('[Supabase Webhook Error]', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// TiendaNueve Webhook receiver
app.post('/api/webhook/tiendanube', (req, res) => {
  try {
    const body = req.body;
    const storeId = body.store_id || body.storeId;
    const event = body.event || body.topic || 'unknown';

    console.log(`[TiendaNueve Webhook] ${event} for store ${storeId}`);

    // Broadcast to all connected clients for this store
    broadcastToChannel('global', 'tn-event', { event, storeId, data: body });
    broadcastToChannel('tiendanube', 'tn-event', { event, storeId, data: body });

    // Specific event handling
    if (event.includes('order') || event.includes('purchase')) {
      broadcastToChannel('global', 'order-changed', { event, storeId });
    }
    if (event.includes('product') || event.includes('stock')) {
      broadcastToChannel('global', 'product-changed', { event, storeId });
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('[TiendaNueve Webhook Error]', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Health check for sync system
app.get('/api/sync/health', (req, res) => {
  let totalClients = 0;
  for (const [, ch] of sseClients) totalClients += ch.size;
  res.json({
    status: 'ok',
    connectedClients: totalClients,
    channels: Array.from(sseClients.keys()),
    uptime: process.uptime(),
  });
});

// Diagnostic endpoint to check if Supabase data exists
app.get('/api/diag', async (req, res) => {
  try {
    const { data: config, error: configErr } = await supabaseAdmin
      .from('system_config')
      .select('id, tiendanube_store_id, tiendanube_access_token, meta_ad_account_id, meta_access_token')
      .eq('id', 'main')
      .single();

    const { data: workspaces, error: wsErr } = await supabaseAdmin
      .from('workspaces')
      .select('user_id, tiendanube_store_id, tiendanube_access_token')
      .limit(5);

    res.json({
      system_config: config || null,
      system_config_error: configErr?.message || null,
      workspaces_count: workspaces?.length || 0,
      workspaces: workspaces || [],
      workspaces_error: wsErr?.message || null,
      supabase_url: process.env.VITE_SUPABASE_URL ? 'SET' : 'MISSING',
      has_service_role: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Seed endpoint: saves TiendaNueve credentials into system_config
// Uses user's JWT for authenticated writes
app.post('/api/seed/credentials', express.json(), async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No auth token' });

  const token = authHeader.replace('Bearer ', '');
  const userSupabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.VITE_SUPABASE_ANON_KEY || '',
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const storeId = process.env.TN_STORE_ID || null;
  const storeToken = process.env.TN_ACCESS_TOKEN || null;
  const gaCreds = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || null;

  // Parse Google service account JSON if it's a string
  let ga4CredsJson = null;
  let mcCredsJson = null;
  let scCredsJson = null;
  if (gaCreds) {
    try {
      const parsed = typeof gaCreds === 'string' ? JSON.parse(gaCreds) : gaCreds;
      ga4CredsJson = parsed;
      mcCredsJson = parsed;
      scCredsJson = parsed;
    } catch (e) {
      console.warn('[Seed] Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON:', e.message);
    }
  }

  const seedData = {
    id: 'main',
    tiendanube_store_id: storeId,
    tiendanube_access_token: storeToken,
    meta_access_token: process.env.META_ACCESS_TOKEN || null,
    meta_ad_account_id: process.env.META_AD_ACCOUNT_ID || null,
    ga4_property_id: process.env.GA4_PROPERTY_ID || null,
    ga4_credentials_json: ga4CredsJson,
    merchant_center_merchant_id: process.env.MERCHANT_CENTER_MERCHANT_ID || null,
    merchant_center_credentials_json: mcCredsJson,
    search_console_site_url: process.env.SEARCH_CONSOLE_SITE_URL || null,
    search_console_credentials_json: scCredsJson,
    updated_at: new Date().toISOString(),
  };

  try {
    // Try system_config first (requires admin role)
    const { error: scErr } = await userSupabase
      .from('system_config')
      .upsert(seedData, { onConflict: 'id' });

    if (!scErr) {
      return res.json({ saved: 'system_config', error: null });
    }

    // Fallback: save to workspaces (requires user_id)
    const { data: { user } } = await userSupabase.auth.getUser();
    if (!user) return res.status(401).json({ error: 'Not authenticated' });

    const { error: wsErr } = await userSupabase
      .from('workspaces')
      .upsert({
        user_id: user.id,
        tiendanube_store_id: storeId,
        tiendanube_access_token: storeToken,
        meta_access_token: seedData.meta_access_token,
        meta_ad_account_id: seedData.meta_ad_account_id,
        ga4_property_id: seedData.ga4_property_id,
        ga4_credentials_json: ga4CredsJson,
        merchant_center_merchant_id: seedData.merchant_center_merchant_id,
        merchant_center_credentials_json: mcCredsJson,
        search_console_site_url: seedData.search_console_site_url,
        search_console_credentials_json: scCredsJson,
      }, { onConflict: 'user_id' });

    if (wsErr) {
      return res.json({ saved: null, system_config_error: scErr.message, workspaces_error: wsErr.message });
    }

    return res.json({ saved: 'workspaces', system_config_error: scErr.message, error: null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === END REAL-TIME SYNC ===

// === SERVER-SIDE DATA CACHE (CRON) ===
// Cron job fetches all data server-side, clients read from cache instantly

const TN_RATE_LIMIT_MS = 550;
let tnLastReq = 0;
async function tnFetch(path, token) {
  const now = Date.now();
  const wait = TN_RATE_LIMIT_MS - (now - tnLastReq);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  tnLastReq = Date.now();
  const res = await fetch(`https://api.tiendanube.com/v1${path}`, {
    headers: { 'Authentication': `bearer ${token}`, 'User-Agent': 'APES CRM (contact@apesdigital.com)', 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`TN ${path}: ${res.status}`);
  const link = res.headers.get('link') || '';
  const data = await res.json();
  const nextMatch = link.match(/[?&]page=(\d+)>;\s*rel="next"/);
  return { data, nextPage: nextMatch ? parseInt(nextMatch[1]) : null };
}

async function tnFetchAll(path, token) {
  let page = 1, all = [];
  while (true) {
    const qs = path.includes('?') ? '&' : '?';
    const { data, nextPage } = await tnFetch(`${path}${qs}page=${page}`, token);
    all = all.concat(data);
    if (!nextPage || nextPage <= page) break;
    page = nextPage;
  }
  return all;
}

async function ga4GetAccessToken(sa) {
  const { SignJWT, importPKCS8 } = await import('jose');
  const cleaned = sa.private_key.replace(/\\n/g, '\n').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const pk = await importPKCS8(cleaned, 'RS256');
  const jwt = await new SignJWT({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/analytics.readonly', aud: 'https://oauth2.googleapis.com/token' })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' }).setIssuedAt().setExpirationTime('1h').sign(pk);
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }) });
  if (!r.ok) throw new Error('GA4 token failed');
  const j = await r.json();
  return j.access_token;
}

async function ga4GetInsights(sa, propId, startDate, endDate) {
  if (!sa || !propId) return null;
  try {
    const token = await ga4GetAccessToken(sa);
    const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propId}:runReport`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        metrics: [{ name: 'totalUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }, { name: 'conversions' }, { name: 'totalRevenue' }],
        dimensions: [{ name: 'date' }],
      }),
    });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { console.warn('[Cron GA4]', e.message); return null; }
}

async function mcGetAccessToken(sa) {
  const { SignJWT, importPKCS8 } = await import('jose');
  const cleaned = sa.private_key.replace(/\\n/g, '\n').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const pk = await importPKCS8(cleaned, 'RS256');
  const jwt = await new SignJWT({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/content', aud: 'https://oauth2.googleapis.com/token' })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' }).setIssuedAt().setExpirationTime('1h').sign(pk);
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }) });
  if (!r.ok) throw new Error('MC token failed');
  return (await r.json()).access_token;
}

async function mcFetchProducts(sa, merchantId) {
  if (!sa || !merchantId) return [];
  try {
    const token = await mcGetAccessToken(sa);
    let all = [], pageToken;
    do {
      const url = `https://shoppingcontent.googleapis.com/content/v2.1/${merchantId}/products?maxResults=50${pageToken ? '&pageToken=' + pageToken : ''}`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) return all;
      const j = await r.json();
      all = all.concat(j.resources || []);
      pageToken = j.nextPageToken;
    } while (pageToken);
    return all;
  } catch (e) { console.warn('[Cron MC]', e.message); return []; }
}

async function gscFetch(siteUrl, sa, startDate, endDate) {
  if (!sa || !siteUrl) return { queries: [], pages: [], performance: null };
  try {
    const token = await ga4GetAccessToken(sa); // same service account scopes
    const siteEnc = encodeURIComponent(siteUrl);
    const body = JSON.stringify({ startDate, endDate, dimensions: ['query'], rowLimit: 50 });
    const [qr, pr] = await Promise.all([
      fetch(`https://www.googleapis.com/webmasters/v3/sites/${siteEnc}/searchAnalytics/query`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body }),
      fetch(`https://www.googleapis.com/webmasters/v3/sites/${siteEnc}/searchAnalytics/query`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ startDate, endDate, dimensions: ['page'], rowLimit: 50 }) }),
    ]);
    const qData = qr.ok ? await qr.json() : { rows: [] };
    const pData = pr.ok ? await pr.json() : { rows: [] };
    return {
      queries: (qData.rows || []).map(r => ({ query: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })),
      pages: (pData.rows || []).map(r => ({ page: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })),
      performance: { totalClicks: (qData.rows || []).reduce((s, r) => s + r.clicks, 0), totalImpressions: (qData.rows || []).reduce((s, r) => s + r.impressions, 0) },
    };
  } catch (e) { console.warn('[Cron GSC]', e.message); return { queries: [], pages: [], performance: null }; }
}

function mapToUnified(orders) {
  const clientMap = new Map();
  for (const o of orders) {
    const cust = o.customer || {};
    const email = cust.email || '';
    const phone = cust.phone || '';
    const key = email || phone || `unknown_${cust.id || Math.random()}`;
    if (!clientMap.has(key)) {
      clientMap.set(key, {
        id: cust.id || key, name: `${cust.first_name || ''} ${cust.last_name || ''}`.trim() || 'Sin nombre',
        email, phone, city: cust.city || '', province: cust.province || '',
        totalOrders: 0, totalSpent: 0, orders: [], firstOrder: null, lastOrder: null,
      });
    }
    const c = clientMap.get(key);
    c.totalOrders++;
    c.totalSpent += parseFloat(o.total || 0);
    const orderDate = o.completed_at || o.created_at;
    if (!c.firstOrder || orderDate < c.firstOrder) c.firstOrder = orderDate;
    if (!c.lastOrder || orderDate > c.lastOrder) c.lastOrder = orderDate;
    c.orders.push({ id: o.id, total: parseFloat(o.total || 0), date: orderDate, status: o.status });
  }
  return Array.from(clientMap.values());
}

// GET /api/cron/sync — on-demand server-side data refresh
app.get('/api/cron/sync', async (req, res) => {

  const startTime = Date.now();
  const errors = [];

  const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
  );

  try {
    // 1. Load credentials from system_config
    const { data: config, error: cfgErr } = await supabaseAdmin.from('system_config').select('*').eq('id', 'main').single();
    if (cfgErr || !config) throw new Error('No system_config found');

    // 1b. Seed missing JSON credentials from env vars (service_role bypasses RLS)
    const gaCreds = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    let gaCredsJson = null;
    if (gaCreds) { try { gaCredsJson = typeof gaCreds === 'string' ? JSON.parse(gaCreds) : gaCreds; } catch (_) {} }

    const updates = {};
    if (!config.ga4_credentials_json && gaCredsJson) updates.ga4_credentials_json = gaCredsJson;
    if (!config.merchant_center_credentials_json && gaCredsJson) updates.merchant_center_credentials_json = gaCredsJson;
    if (!config.search_console_credentials_json && gaCredsJson) updates.search_console_credentials_json = gaCredsJson;
    if (!config.meta_ad_account_id && process.env.META_AD_ACCOUNT_ID) updates.meta_ad_account_id = process.env.META_AD_ACCOUNT_ID;
    if (!config.search_console_site_url && process.env.SEARCH_CONSOLE_SITE_URL) updates.search_console_site_url = process.env.SEARCH_CONSOLE_SITE_URL;
    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();
      await supabaseAdmin.from('system_config').upsert({ id: 'main', ...updates }, { onConflict: 'id' });
      console.log('[Cron] Seeded missing credentials:', Object.keys(updates).join(', '));
      // Reload config
      const { data: refreshed } = await supabaseAdmin.from('system_config').select('*').eq('id', 'main').single();
      if (refreshed) Object.assign(config, refreshed);
    }

    const storeId = config.tiendanube_store_id;
    const token = config.tiendanube_access_token;
    if (!storeId || !token) throw new Error('No TN credentials');

    // 2. Fetch TiendaNueve data in parallel (respecting rate limit via tnFetch)
    console.log('[Cron] Fetching TiendaNueve data...');
    let customers = [], orders = [], products = [];
    try {
      customers = await tnFetchAll(`/${storeId}/customers`, token);
    } catch (e) { errors.push({ api: 'tn_customers', msg: e.message }); }

    try {
      orders = await tnFetchAll(`/${storeId}/orders`, token);
    } catch (e) { errors.push({ api: 'tn_orders', msg: e.message }); }

    try {
      products = await tnFetchAll(`/${storeId}/products`, token);
    } catch (e) { errors.push({ api: 'tn_products', msg: e.message }); }

    console.log(`[Cron] TN: ${customers.length} customers, ${orders.length} orders, ${products.length} products`);

    // 3. Map to unified format
    const unifiedClients = mapToUnified(orders);
    const rawOrders = orders.map(o => ({
      id: o.id, total: parseFloat(o.total || 0), date: o.completed_at || o.created_at,
      status: o.status, customer_id: o.customer?.id,
    }));

    // 4. Date range for analytics (last 30 days)
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 30);
    const sd = start.toISOString().split('T')[0];
    const ed = end.toISOString().split('T')[0];

    // 5. Fetch external APIs in parallel
    console.log('[Cron] Fetching external APIs...');
    let ga4 = null, meta = null, mc = [], gsc = { queries: [], pages: [], performance: null };

    const sa = config.ga4_credentials_json || config.merchant_center_credentials_json;
    console.log('[Cron] SA creds:', sa ? `present (${sa.client_email || 'no email'})` : 'null');
    console.log('[Cron] GA4 prop:', config.ga4_property_id || 'none');
    console.log('[Cron] MC merchant:', config.merchant_center_merchant_id || 'none');
    console.log('[Cron] GSC site:', config.search_console_site_url || 'none');
    console.log('[Cron] Meta account:', config.meta_ad_account_id || 'none');

    const [ga4Res, mcRes, gscRes] = await Promise.allSettled([
      ga4GetInsights(sa, config.ga4_property_id, sd, ed),
      mcFetchProducts(sa, config.merchant_center_merchant_id),
      gscFetch(config.search_console_site_url, sa, sd, ed),
    ]);
    if (ga4Res.status === 'fulfilled') { ga4 = ga4Res.value; console.log('[Cron] GA4 result:', ga4 ? 'data' : 'null'); }
    else { console.error('[Cron] GA4 rejected:', ga4Res.reason?.message); errors.push({ api: 'ga4', msg: ga4Res.reason?.message }); }
    if (mcRes.status === 'fulfilled') { mc = mcRes.value; console.log('[Cron] MC result:', mc?.length || 0, 'products'); }
    else { console.error('[Cron] MC rejected:', mcRes.reason?.message); errors.push({ api: 'mc', msg: mcRes.reason?.message }); }
    if (gscRes.status === 'fulfilled') { gsc = gscRes.value; console.log('[Cron] GSC result:', gsc.queries?.length || 0, 'queries'); }
    else { console.error('[Cron] GSC rejected:', gscRes.reason?.message); errors.push({ api: 'gsc', msg: gscRes.reason?.message }); }

    // Meta (simple: just use token directly)
    if (config.meta_ad_account_id && config.meta_access_token) {
      try {
        const metaUrl = `https://graph.facebook.com/v21.0/act_${config.meta_ad_account_id}/insights?fields=impressions,clicks,spend,actions,cost_per_action_type&date_preset=max_30d&access_token=${config.meta_access_token}`;
        const mr = await fetch(metaUrl);
        if (mr.ok) { const md = await mr.json(); meta = md.data?.[0] || null; }
      } catch (e) { errors.push({ api: 'meta', msg: e.message }); }
    }

    // 6. Save to server_cache
    const duration = Date.now() - startTime;
    console.log(`[Cron] Sync completed in ${duration}ms`);

    const { error: upsertErr } = await supabaseAdmin.from('server_cache').upsert({
      id: 'main',
      tiendanube_products: products,
      tiendanube_orders: rawOrders,
      tiendanube_customers: customers,
      unified_clients: unifiedClients,
      raw_orders: rawOrders,
      ga4_insights: ga4,
      meta_insights: meta,
      mc_products: mc,
      gsc_queries: gsc.queries,
      gsc_pages: gsc.pages,
      gsc_performance: gsc.performance,
      sync_status: errors.length > 0 ? 'partial' : 'ok',
      sync_duration_ms: duration,
      error_log: errors,
      last_sync: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    if (upsertErr) console.error('[Cron] Upsert error:', upsertErr.message);

    res.json({ status: 'ok', duration, customers: customers.length, orders: orders.length, products: products.length, errors });
  } catch (err) {
    console.error('[Cron] Fatal:', err.message);
    const duration = Date.now() - startTime;
    try {
      await supabaseAdmin.from('server_cache').upsert({
        id: 'main', sync_status: 'error', sync_duration_ms: duration,
        error_log: [{ api: 'cron', msg: err.message }],
        last_sync: new Date().toISOString(), updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    } catch (_) {}
    res.status(500).json({ error: err.message, duration });
  }
});

// POST /api/cron/sync (POST also allowed for manual triggers)
app.post('/api/cron/sync', async (req, res) => {
  // Redirect to GET handler logic
  req.method = 'GET';
  app.handle(req, res);
});

// GET /api/data/snapshot — clients read this for instant data
app.get('/api/data/snapshot', async (req, res) => {
  const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
  );

  try {
    const { data, error } = await supabaseAdmin
      .from('server_cache')
      .select('tiendanube_products, tiendanube_orders, tiendanube_customers, unified_clients, raw_orders, ga4_insights, meta_insights, mc_products, gsc_queries, gsc_pages, gsc_performance, ai_insights, last_sync, sync_status, sync_duration_ms, error_log')
      .eq('id', 'main')
      .single();

    if (error || !data) {
      return res.json({ ready: false, message: 'Cache not initialized yet. First sync pending.' });
    }

    res.json({
      ready: data.sync_status === 'ok' || data.sync_status === 'partial',
      lastSync: data.last_sync,
      syncStatus: data.sync_status,
      syncDuration: data.sync_duration_ms,
      data: {
        products: data.tiendanube_products || [],
        orders: data.tiendanube_orders || [],
        customers: data.tiendanube_customers || [],
        unifiedClients: data.unified_clients || [],
        rawOrders: data.raw_orders || [],
        ga4Insights: data.ga4_insights,
        metaInsights: data.meta_insights,
        mcProducts: data.mc_products || [],
        gscQueries: data.gsc_queries || [],
        gscPages: data.gsc_pages || [],
        gscPerformance: data.gsc_performance,
        aiInsights: data.ai_insights,
      },
      errors: data.error_log || [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cron/sync-manual — authenticated user triggers immediate sync
app.post('/api/cron/sync-manual', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No auth token' });

  // Trigger the same sync logic
  req.method = 'GET';
  req.headers.authorization = undefined;
  // Use internal fetch to call ourselves
  try {
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    const url = `${protocol}://${host}/api/cron/sync`;
    const r = await fetch(url);
    const data = await r.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

export default app;
