import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function setCors(res) { Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v)); }
function ok(res, data, status = 200) { setCors(res); return res.status(status).json(data); }
function err(res, message, status = 500, details = null) {
  setCors(res); const body = { error: message }; if (details) body.details = details; return res.status(status).json(body);
}

let lastRequestTime = 0;
const RATE_LIMIT_MS = 500;

async function rateLimitedFetch(url, options) {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) await new Promise(r => setTimeout(r, RATE_LIMIT_MS - elapsed));
  lastRequestTime = Date.now();
  return fetch(url, options);
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { setCors(res); return res.status(204).end(); }
  if (req.method !== 'POST') return err(res, 'Method not allowed', 405);

  try {
    const { data: config } = await supabase.from('system_config').select('*').eq('id', 'main').single();
    const token = config?.tiendanube_access_token;
    const storeId = config?.tiendanube_store_id;
    if (!token || !storeId) return err(res, 'TiendaNueve credentials not configured', 400);

    // Get WEB location ID
    const { data: webLoc } = await supabase.from('inventory_locations').select('id').eq('code', 'web').single();
    if (!webLoc) return err(res, 'WEB location not found in inventory_locations', 500);

    // Fetch all products from TN
    let allProducts = [];
    let pageToken;
    do {
      const url = `https://api.tiendanube.com/v1/${storeId}/products?per_page=200${pageToken ? '&page_token=' + pageToken : ''}`;
      const r = await rateLimitedFetch(url, { headers: { 'Authentication': `Bearer ${token}`, 'User-Agent': 'Apes Tiendanube CRM' } });
      if (!r.ok) { const txt = await r.text(); console.error('[sync-from-tn] TN API error:', r.status, txt); break; }
      const products = await r.json();
      allProducts = allProducts.concat(products);
      pageToken = r.headers.get('x-next-page-token');
    } while (pageToken);

    let productsSynced = 0;
    let variantsSynced = 0;

    for (const p of allProducts) {
      const attrs = p.attributes || [];
      const colorAttr = attrs.find(a => a.name?.toLowerCase() === 'color');
      const sizeAttr = attrs.find(a => a.name?.toLowerCase() === 'talla' || a.name?.toLowerCase() === 'size');
      const imageUrl = p.images?.[0]?.src || '';

      for (const v of (p.variants || [])) {
        const colorVal = v.values?.find(vv => vv?.option === colorAttr?.id)?.text || '';
        const sizeVal = v.values?.find(vv => vv?.option === sizeAttr?.id)?.text || '';
        const sku = v.sku || `TN-${p.id}-${v.id}`;
        const productName = p.name?.es || p.name || 'Sin nombre';
        const description = p.description?.es || '';

        // Upsert product
        const { data: product, error: prodErr } = await supabase
          .from('inventory_products')
          .upsert({
            sku,
            name: productName,
            description,
            category: 'producto_tn',
            color: colorVal,
            size: sizeVal,
            image_url: imageUrl,
            sell_price: parseFloat(v.price || '0'),
            tiendanube_product_id: p.id,
            tiendanube_variant_id: v.id,
            is_active: true,
          }, { onConflict: 'sku' })
          .select('id')
          .single();

        if (prodErr) { console.error('[sync-from-tn] Product upsert error:', prodErr.message); continue; }
        productsSynced++;

        // Upsert stock at WEB location
        const tnStock = v.stock ?? 0;
        const { error: stockErr } = await supabase
          .from('inventory_stock')
          .upsert({
            product_id: product.id,
            location_id: webLoc.id,
            quantity: tnStock,
            low_stock_threshold: 5,
          }, { onConflict: 'product_id,location_id' });

        if (stockErr) console.error('[sync-from-tn] Stock upsert error:', stockErr.message);
        else variantsSynced++;
      }
    }

    return ok(res, {
      success: true,
      message: `Sincronizados ${productsSynced} productos (${variantsSynced} variantes) desde TiendaNueve`,
      products_synced: productsSynced,
      variants_synced: variantsSynced,
      total_fetched: allProducts.length,
    });
  } catch (error) {
    console.error('[sync-from-tn] Error:', error.message);
    return err(res, error.message);
  }
}
