import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY
);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function setCors(res) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
}

function ok(res, data, status = 200) {
  setCors(res);
  return res.status(status).json(data);
}

function err(res, message, status = 500, details = null) {
  setCors(res);
  const body = { error: message };
  if (details) body.details = details;
  return res.status(status).json(body);
}

let lastRequestTime = 0;
const RATE_LIMIT_MS = 500;

async function rateLimitedFetch(url, options) {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS - elapsed));
  }
  lastRequestTime = Date.now();
  return fetch(url, options);
}

async function resolveTiendanubeToken() {
  const { data: config } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', 'tiendanube_store_token')
    .single();

  if (config?.value) return config.value;

  return process.env.TIENDANUBE_STORE_TOKEN || process.env.TIENDANUBE_TOKEN;
}

async function resolveStoreId() {
  const { data: config } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', 'tiendanube_store_id')
    .single();

  if (config?.value) return config.value;

  return process.env.TIENDANUBE_STORE_ID;
}

// Cache the WEB location id for the lifetime of the function invocation
let cachedWebLocationId = null;
async function resolveWebLocationId() {
  if (cachedWebLocationId) return cachedWebLocationId;
  const { data, error } = await supabase
    .from('inventory_locations')
    .select('id')
    .eq('code', 'WEB')
    .eq('is_active', true)
    .single();
  if (error || !data) return null;
  cachedWebLocationId = data.id;
  return cachedWebLocationId;
}

async function pushStockToTiendanube(tiendanubeProductId, tiendanubeVariantId, stock, token, storeId) {
  const baseUrl = `https://api.tiendanube.com/v1/${storeId}`;
  const url = `${baseUrl}/products/${tiendanubeProductId}/variants/${tiendanubeVariantId}`;

  const response = await rateLimitedFetch(url, {
    method: 'PUT',
    headers: {
      'Authentication': `bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ stock }),
  });

  const responseBody = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`TiendaNube API ${response.status}: ${JSON.stringify(responseBody)}`);
  }

  return responseBody;
}

async function syncProductStock(productId) {
  const { data: product, error: prodError } = await supabase
    .from('inventory_products')
    .select('id, name, sku, tiendanube_product_id, tiendanube_variant_id')
    .eq('id', productId)
    .single();

  if (prodError || !product) {
    return { success: false, error: 'Product not found' };
  }

  if (!product.tiendanube_product_id) {
    return { success: false, error: 'Product has no TiendaNube mapping' };
  }

  // FIX: sin variant_id mapeado no podemos sincronizar de forma segura —
  // antes el código usaba product_id como variant_id, lo cual actualizaba
  // el recurso equivocado en Tiendanube. Ahora se reporta como error explícito.
  if (!product.tiendanube_variant_id) {
    return {
      success: false,
      error: `Product ${product.sku || product.id} has no tiendanube_variant_id mapped — skipping sync to avoid corrupting wrong variant`,
    };
  }

  const token = await resolveTiendanubeToken();
  const storeId = await resolveStoreId();

  if (!token || !storeId) {
    return { success: false, error: 'TiendaNube credentials not configured' };
  }

  const webLocationId = await resolveWebLocationId();
  if (!webLocationId) {
    return { success: false, error: 'WEB location not found/active in inventory_locations' };
  }

  // FIX: Antes se sumaba el stock de las 3 ubicaciones (R5 + APES + WEB).
  // Eso permitía vender online unidades que físicamente estaban en un local
  // y no destinadas a e-commerce. Ahora solo se sincroniza lo que está
  // asignado explícitamente a la ubicación WEB.
  const { data: webStock, error: stockError } = await supabase
    .from('inventory_stock')
    .select('quantity, reserved, unlimited_stock')
    .eq('product_id', productId)
    .eq('location_id', webLocationId)
    .single();

  if (stockError && stockError.code !== 'PGRST116') {
    return { success: false, error: 'Failed to fetch WEB stock level' };
  }

  const totalAvailable = webStock?.unlimited_stock
    ? 999999
    : Math.max(0, (webStock?.quantity || 0) - (webStock?.reserved || 0));

  try {
    await pushStockToTiendanube(
      product.tiendanube_product_id,
      product.tiendanube_variant_id,
      totalAvailable,
      token,
      storeId
    );
    return { success: true, total_available: totalAvailable, location: 'WEB' };
  } catch (e) {
    console.error('[sync] Variant sync failed:', e.message);
    return { success: false, error: e.message };
  }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    setCors(res);
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return err(res, 'Method not allowed', 405);
  }

  try {
    const { product_id, product_ids, sync_all } = req.body || {};

    if (sync_all === true) {
      const { data: products, error } = await supabase
        .from('inventory_products')
        .select('id')
        .eq('is_active', true)
        .not('tiendanube_product_id', 'is', null);

      if (error) return err(res, 'Failed to fetch products', 500, error.message);

      const syncResults = [];
      for (const p of products || []) {
        const result = await syncProductStock(p.id);
        syncResults.push({ product_id: p.id, ...result });
      }

      const synced = syncResults.filter((r) => r.success).length;
      const failed = syncResults.filter((r) => !r.success).length;

      return ok(res, {
        message: `Sync completed: ${synced} synced, ${failed} failed`,
        results: syncResults,
      });
    }

    if (Array.isArray(product_ids)) {
      const syncResults = [];
      for (const pid of product_ids) {
        const result = await syncProductStock(pid);
        syncResults.push({ product_id: pid, ...result });
      }

      const synced = syncResults.filter((r) => r.success).length;
      return ok(res, { message: `Synced ${synced}/${product_ids.length}`, results: syncResults });
    }

    if (product_id) {
      const result = await syncProductStock(product_id);
      return ok(res, { product_id, ...result });
    }

    return err(res, 'Provide product_id, product_ids array, or sync_all: true', 400);
  } catch (error) {
    console.error('[sync-to-tiendanube] Unhandled error:', error);
    return err(res, 'Internal server error', 500);
  }
}