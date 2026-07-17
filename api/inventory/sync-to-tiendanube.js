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

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('tiendanube_token')
    .eq('is_active', true)
    .limit(1)
    .single();

  if (workspace?.tiendanube_token) return workspace.tiendanube_token;

  return process.env.TIENDANUBE_STORE_TOKEN || process.env.TIENDANUBE_TOKEN;
}

async function resolveStoreId() {
  const { data: config } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', 'tiendanube_store_id')
    .single();

  if (config?.value) return config.value;

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('tiendanube_store_id')
    .eq('is_active', true)
    .limit(1)
    .single();

  if (workspace?.tiendanube_store_id) return workspace.tiendanube_store_id;

  return process.env.TIENDANUBE_STORE_ID;
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
    .select('id, name, sku, tiendanube_id')
    .eq('id', productId)
    .single();

  if (prodError || !product) {
    return { success: false, error: 'Product not found' };
  }

  if (!product.tiendanube_id) {
    return { success: false, error: 'Product has no TiendaNube mapping' };
  }

  const token = await resolveTiendanubeToken();
  const storeId = await resolveStoreId();

  if (!token || !storeId) {
    return { success: false, error: 'TiendaNube credentials not configured' };
  }

  const { data: stockEntries, error: stockError } = await supabase
    .from('inventory_stock')
    .select('quantity, reserved_quantity, location_id, locations(name)')
    .eq('product_id', productId);

  if (stockError) {
    return { success: false, error: 'Failed to fetch stock levels' };
  }

  const totalAvailable = (stockEntries || []).reduce(
    (sum, s) => sum + (s.quantity || 0) - (s.reserved_quantity || 0),
    0
  );

  const { data: variants } = await supabase
    .from('inventory_variants')
    .select('id, tiendanube_variant_id')
    .eq('product_id', productId);

  const results = [];

  if (variants && variants.length > 0) {
    const perVariant = Math.floor(totalAvailable / variants.length);
    for (const variant of variants) {
      if (!variant.tiendanube_variant_id) continue;
      try {
        await pushStockToTiendanube(
          product.tiendanube_id,
          variant.tiendanube_variant_id,
          perVariant,
          token,
          storeId
        );
        results.push({ variant_id: variant.id, synced: true, stock: perVariant });
      } catch (e) {
        console.error('[sync] Variant sync failed:', e.message);
        results.push({ variant_id: variant.id, synced: false, error: e.message });
      }
    }
  } else {
    const firstVariantId = product.tiendanube_id;
    try {
      await pushStockToTiendanube(
        product.tiendanube_id,
        firstVariantId,
        totalAvailable,
        token,
        storeId
      );
      results.push({ synced: true, stock: totalAvailable });
    } catch (e) {
      console.error('[sync] Product sync failed:', e.message);
      results.push({ synced: false, error: e.message });
    }
  }

  const allSynced = results.every((r) => r.synced);
  return { success: allSynced, results, total_available: totalAvailable };
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
        .not('tiendanube_id', 'is', null);

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
