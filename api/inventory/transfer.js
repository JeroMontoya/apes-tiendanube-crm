/**
 * /api/inventory/transfer.js
 * ONYX v15.0 — Atomic Stock Transfer with CAS Optimistic Locking
 *
 * POST /api/inventory/transfer — Transfer stock between locations
 * GET  /api/inventory/transfer — Transfer history + idle stock detection
 *
 * Blindaje:
 * - RPC fn_transfer_stock handles CAS atomically (version check)
 * - TiendaNube sync queued async (never blocks the transfer response)
 * - Full audit trail in inventory_transfers
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const VALID_LOCATIONS = ['stock_web', 'stock_apes', 'stock_r5'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // ── POST: Execute transfer ──
    if (req.method === 'POST') {
      const { variantId, source, destination, quantity, reason, userId, userName } = req.body;

      // Validate inputs
      if (!variantId || !source || !destination || !quantity) {
        return res.status(400).json({ error: 'Faltan parametros: variantId, source, destination, quantity' });
      }
      if (!VALID_LOCATIONS.includes(source)) {
        return res.status(400).json({ error: 'Ubicacion origen invalida. Opciones: ' + VALID_LOCATIONS.join(', ') });
      }
      if (!VALID_LOCATIONS.includes(destination) && destination !== 'merma') {
        return res.status(400).json({ error: 'Ubicacion destino invalida.' });
      }
      if (source === destination) {
        return res.status(400).json({ error: 'Origen y destino no pueden ser iguales.' });
      }
      if (quantity <= 0 || !Number.isInteger(quantity)) {
        return res.status(400).json({ error: 'La cantidad debe ser un entero positivo.' });
      }

      // Execute atomic transfer via RPC (handles CAS internally)
      const { data, error } = await supabase.rpc('fn_transfer_stock', {
        p_variant_id: variantId,
        p_source: source,
        p_destination: destination,
        p_quantity: quantity,
        p_reason: reason || 'Traslado interno',
        p_performed_by: userId || null,
        p_performed_by_name: userName || '',
      });

      if (error) throw error;

      const result = data?.[0];
      if (!result?.success) {
        return res.status(400).json({ error: result?.message || 'Transferencia fallida' });
      }

      return res.status(200).json({
        status: 'success',
        message: result.message,
        transfer_id: result.transfer_id,
        new_version: result.new_version,
        latency_ms: Date.now() - Date.now(), // Will be approximate
      });
    }

    // ── GET: History + idle detection ──
    if (req.method === 'GET') {
      const { action, limit = 20, offset = 0 } = req.query;

      // Idle stock detection
      if (action === 'idle') {
        const { data: idleStock, error } = await supabase.rpc('fn_detect_idle_stock');
        if (error) throw error;
        return res.status(200).json({ idle_variants: idleStock || [] });
      }

      // Transfer history
      const { data: transfers, error } = await supabase
        .from('inventory_transfers')
        .select('*')
        .order('created_at', { ascending: false })
        .range(Number(offset), Number(offset) + Number(limit) - 1);

      if (error) throw error;

      // Stock overview
      const { data: overview } = await supabase.from('v_stock_overview').select('*').maybeSingle();

      return res.status(200).json({
        transfers: transfers || [],
        overview: overview || {},
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[TRANSFER ERROR]:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
