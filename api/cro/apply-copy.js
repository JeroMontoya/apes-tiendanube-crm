/**
 * /api/cro/apply-copy.js
 * Aplica copy optimizado directamente a TiendaNube via PUT /products/{id}
 * Closed-Loop Growth System: CRO Dashboard → TiendaNube Product Update
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

function setCors(res) { Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v)); }

async function resolveTiendanubeToken() {
  const { data: config } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', 'tiendanube_store_token')
    .single();
  return config?.value || process.env.TIENDANUBE_STORE_TOKEN || process.env.TIENDANUBE_TOKEN;
}

async function resolveStoreId() {
  const { data: config } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', 'tiendanube_store_id')
    .single();
  return config?.value || process.env.TIENDANUBE_STORE_ID;
}

/**
 * POST /api/cro/apply-copy
 * Body: {
 *   tiendanube_product_id: number,
 *   optimized_copy: { title, description, cta? },
 *   dry_run?: boolean  // Si true, solo muestra qué se enviaría sin aplicar
 * }
 */
export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { tiendanube_product_id, optimized_copy, dry_run } = req.body;

    if (!tiendanube_product_id || !optimized_copy) {
      return res.status(400).json({ error: 'Se requieren tiendanube_product_id y optimized_copy' });
    }

    if (!optimized_copy.title && !optimized_copy.description) {
      return res.status(400).json({ error: 'optimized_copy debe contener title y/o description' });
    }

    const token = await resolveTiendanubeToken();
    const storeId = await resolveStoreId();

    if (!token || !storeId) {
      return res.status(500).json({ error: 'TiendaNube credentials not configured' });
    }

    // Construir el payload para PUT /products/{id}
    const updatePayload = {};
    if (optimized_copy.title) updatePayload.name = optimized_copy.title;
    if (optimized_copy.description) updatePayload.description = optimized_copy.description;

    if (dry_run) {
      return res.status(200).json({
        dry_run: true,
        product_id: tiendanube_product_id,
        update_payload: updatePayload,
        endpoint: `PUT https://api.tiendanube.com/v1/${storeId}/products/${tiendanube_product_id}`,
      });
    }

    // Ejecutar actualización real en TiendaNube
    const url = `https://api.tiendanube.com/v1/${storeId}/products/${tiendanube_product_id}`;

    // Rate limit: 500ms entre requests
    await new Promise(r => setTimeout(r, 500));

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authentication': `bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'OnyxCore-CRO',
      },
      body: JSON.stringify(updatePayload),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`[CRO APPLY] TN API error ${response.status}:`, errorData);
      return res.status(response.status).json({
        error: `TiendaNube API error: ${response.status}`,
        details: errorData,
        product_id: tiendanube_product_id,
      });
    }

    const updatedProduct = await response.json();

    // Log del cambio para auditoría
    try {
      await supabase.from('cro_copy_history').insert({
        tiendanube_product_id,
        new_name: optimized_copy.title || null,
        new_description: optimized_copy.description || null,
        applied_by: req.headers.authorization?.replace('Bearer ', '') || 'system',
        timestamp: new Date().toISOString(),
      });
    } catch (logErr) {
      console.warn('[CRO APPLY] Log failed (non-critical):', logErr.message);
    }

    return res.status(200).json({
      success: true,
      product_id: tiendanube_product_id,
      tn_product_id: updatedProduct.id,
      updated_fields: Object.keys(updatePayload),
      product_name: updatedProduct.name,
      message: 'Copy aplicado exitosamente en TiendaNube',
    });
  } catch (error) {
    console.error('[CRO APPLY ERROR]:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
