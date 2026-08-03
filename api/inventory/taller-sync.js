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
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
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
  // Prefer the canonical main config row (credentials live as direct columns),
  // then legacy locations, then env.
  const { data: mainConfig } = await supabase
    .from('system_config')
    .select('*')
    .eq('id', 'main')
    .single();

  if (mainConfig?.tiendanube_access_token) {
    return mainConfig.tiendanube_access_token;
  }
  if (mainConfig?.value?.tiendanube_access_token) {
    return mainConfig.value.tiendanube_access_token;
  }

  const { data: config } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', 'tiendanube_store_token')
    .single();

  if (config?.value) return config.value;

  return process.env.TIENDANUBE_STORE_TOKEN || process.env.TIENDANUBE_TOKEN || process.env.TIENDANUBE_ACCESS_TOKEN;
}

async function resolveStoreId() {
  // Prefer the canonical main config row (credentials live as direct columns),
  // then legacy locations, then env.
  const { data: mainConfig } = await supabase
    .from('system_config')
    .select('*')
    .eq('id', 'main')
    .single();

  if (mainConfig?.tiendanube_store_id) {
    return mainConfig.tiendanube_store_id;
  }
  if (mainConfig?.value?.tiendanube_store_id) {
    return mainConfig.value.tiendanube_store_id;
  }

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

async function enqueueTiendanubeSync(productId, newStock, referenceType) {
  const { data, error } = await supabase.rpc('fn_enqueue_tiendanube_sync', {
    p_product_id: productId,
    p_new_stock: newStock,
    p_reference_type: referenceType,
  });
  if (error) {
    console.error('[taller-sync] enqueue failed:', error.message);
    return { success: false, error: error.message };
  }
  return data;
}

/**
 * POST /api/inventory/taller-sync
 * Manual stock adjustment from workshop (taller) / physical POS
 * Body: { product_id, location_code, quantity_change, movement_type, notes, performed_by_name }
 * 
 * location_code: 'R5' | 'APES' | 'WEB'
 * movement_type: 'receive' | 'dispatch' | 'adjustment' | 'defect' | 'return'
 * quantity_change: positive for receive, negative for dispatch/adjustment
 * 
 * If location_code === 'WEB', immediately pushes to TiendaNube
 */
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    setCors(res);
    return res.status(204).end();
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return err(res, 'Method not allowed', 405);
  }

  try {
    // GET: list pending syncs or current stock for a product
    if (req.method === 'GET') {
      const { product_id, location_code } = req.query;
      
      let query = supabase
        .from('inventory_stock')
        .select(`
          id,
          quantity,
          reserved,
          unlimited_stock,
          location_id,
          product_id,
          inventory_locations!inner(code, name),
          inventory_products!inner(id, name, sku, tiendanube_product_id, tiendanube_variant_id)
        `);

      if (product_id) {
        query = query.eq('product_id', product_id);
      }
      if (location_code) {
        query = query.eq('inventory_locations.code', location_code);
      }

      const { data, error } = await query;
      if (error) return err(res, 'Failed to fetch stock', 500, error.message);
      
      return ok(res, { stock: data });
    }

    // POST: manual stock adjustment
    const {
      product_id,
      location_code,
      quantity_change,
      movement_type = 'adjustment',
      reference_type = 'taller_manual',
      reference_id = null,
      notes = '',
      performed_by,
      performed_by_name = 'Taller Manual'
    } = req.body || {};

    // Validation
    if (!product_id || !location_code || quantity_change === undefined) {
      return err(res, 'Missing required fields: product_id, location_code, quantity_change', 400);
    }

    const validLocations = ['R5', 'APES', 'WEB'];
    if (!validLocations.includes(location_code)) {
      return err(res, `Invalid location_code. Must be one of: ${validLocations.join(', ')}`, 400);
    }

    const validTypes = ['receive', 'dispatch', 'adjustment', 'defect', 'return', 'transfer'];
    if (!validTypes.includes(movement_type)) {
      return err(res, `Invalid movement_type. Must be one of: ${validTypes.join(', ')}`, 400);
    }

    // Get location_id from code
    const { data: location, error: locError } = await supabase
      .from('inventory_locations')
      .select('id')
      .eq('code', location_code)
      .eq('is_active', true)
      .single();

    if (locError || !location) {
      return err(res, `Location ${location_code} not found or inactive`, 404);
    }

    // Get product info (for TiendaNube sync if WEB)
    const { data: product, error: prodError } = await supabase
      .from('inventory_products')
      .select('id, name, sku, tiendanube_product_id, tiendanube_variant_id, sell_price')
      .eq('id', product_id)
      .single();

    if (prodError || !product) {
      return err(res, 'Product not found', 404);
    }

    // Atomic stock update via RPC
    const { data: rpcResult, error: rpcError } = await supabase.rpc('fn_update_stock', {
      p_product_id: product_id,
      p_location_id: location.id,
      p_quantity_change: Number(quantity_change),
      p_movement_type: movement_type,
      p_reference_type: reference_type,
      p_reference_id: reference_id,
      p_notes: notes || `Manual ${movement_type} from Taller: ${location_code}`,
      p_performed_by: performed_by,
      p_performed_by_name: performed_by_name
    });

    if (rpcError) {
      console.error('[taller-sync] fn_update_stock error:', rpcError.message);
      return err(res, 'Failed to update stock', 500, rpcError.message);
    }

    // If WEB location, push to TiendaNube immediately.
    // If the push fails (or credentials are missing), enqueue the sync so the
    // queue processor retries it with backoff — the change is never lost.
    let tiendanubeSync = null;
    if (location_code === 'WEB' && product.tiendanube_product_id && product.tiendanube_variant_id) {
      const currentStock = await (async () => {
        const { data: stockData } = await supabase
          .from('inventory_stock')
          .select('quantity, reserved, unlimited_stock')
          .eq('product_id', product_id)
          .eq('location_id', location.id)
          .single();
        return stockData?.unlimited_stock
          ? 999999
          : Math.max(0, (stockData?.quantity || 0) - (stockData?.reserved || 0));
      })();

      try {
        const token = await resolveTiendanubeToken();
        const storeId = await resolveStoreId();

        if (token && storeId) {
          await pushStockToTiendanube(
            product.tiendanube_product_id,
            product.tiendanube_variant_id,
            currentStock,
            token,
            storeId
          );
          tiendanubeSync = { success: true, stock_pushed: currentStock };
          console.log(`[taller-sync] Pushed stock ${currentStock} to TiendaNube for ${product.sku}`);
        } else {
          const enqueued = await enqueueTiendanubeSync(product_id, currentStock, 'taller_manual');
          tiendanubeSync = {
            success: false,
            reason: 'TiendaNube credentials not configured — sync enqueued for retry',
            queued: enqueued,
          };
        }
      } catch (syncError) {
        console.error('[taller-sync] TiendaNube push failed:', syncError.message);
        const enqueued = await enqueueTiendanubeSync(product_id, currentStock, 'taller_manual');
        tiendanubeSync = {
          success: false,
          error: syncError.message,
          queued: enqueued,
        };
      }
    }

    // Fetch updated stock for response
    const { data: updatedStock } = await supabase
      .from('inventory_stock')
      .select('quantity, reserved, unlimited_stock')
      .eq('product_id', product_id)
      .eq('location_id', location.id)
      .single();

    return ok(res, {
      success: true,
      product: { id: product.id, name: product.name, sku: product.sku },
      location: location_code,
      movement_type,
      quantity_change: Number(quantity_change),
      new_stock: updatedStock,
      tiendanube_sync: tiendanubeSync,
      movement_id: rpcResult?.movement_id
    });

  } catch (error) {
    console.error('[taller-sync] Unhandled error:', error);
    return err(res, 'Internal server error', 500, error.message);
  }
}