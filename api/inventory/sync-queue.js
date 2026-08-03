/**
 * /api/inventory/sync-queue.js
 * ONYX v15.0 — TiendaNube Sync Queue Processor
 *
 * Processes pending stock updates to TiendaNube API after transfers.
 * Retries with exponential backoff. Max 3 attempts.
 *
 * GET /api/inventory/sync-queue — Process pending syncs
 * Can be triggered by Vercel Cron or external scheduler
 */

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BATCH_SIZE = 5;

async function resolveTiendanubeToken() {
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

  return process.env.TIENDANUBE_STORE_TOKEN || process.env.TIENDANUBE_ACCESS_TOKEN;
}

async function resolveStoreId() {
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const startTime = Date.now();

  try {
    const token = await resolveTiendanubeToken();
    const storeId = await resolveStoreId();

    if (!token || !storeId) {
      console.warn('[sync-queue] TiendaNube credentials not configured — skipping');
      return res.status(200).json({ status: 'ok', processed: 0, skipped: 'no_credentials', elapsed_ms: Date.now() - startTime });
    }

    const now = new Date().toISOString();

    // Fetch pending syncs where next_retry has passed
    const { data: pendingSyncs, error } = await supabase
      .from('tiendanube_sync_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('next_retry_at', now)
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (error) throw error;

    if (!pendingSyncs || pendingSyncs.length === 0) {
      return res.status(200).json({ status: 'ok', processed: 0, elapsed_ms: Date.now() - startTime });
    }

    const results = [];

    for (const sync of pendingSyncs) {
      // Mark as processing
      await supabase.from('tiendanube_sync_queue')
        .update({ status: 'processing' })
        .eq('id', sync.id)
        .eq('status', 'pending');

      try {
        const response = await axios.put(
          `https://api.tiendanube.com/v1/${storeId}/products/${sync.tn_product_id}/variants/${sync.tn_variant_id}`,
          { stock: sync.new_stock },
          {
            headers: {
              'Authentication': `bearer ${token}`,
              'User-Agent': 'ApesCRM (taller@apes.com)',
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          }
        );

        if (response.status >= 200 && response.status < 300) {
          await supabase.from('tiendanube_sync_queue').update({
            status: 'completed',
            processed_at: new Date().toISOString(),
          }).eq('id', sync.id);

          // Mark related transfer as synced (only for CAS/variant-based syncs)
          if (sync.variant_id) {
            await supabase.from('inventory_transfers')
              .update({ tn_synced: true, tn_sync_at: new Date().toISOString() })
              .eq('variant_id', sync.variant_id)
              .eq('tn_synced', false);
          }

          results.push({ id: sync.id, status: 'completed' });
        }
      } catch (syncError) {
        const newAttempts = (sync.attempts || 0) + 1;
        const isPermanentFail = syncError.response?.status === 404 || syncError.response?.status === 422;

        if (newAttempts >= sync.max_attempts || isPermanentFail) {
          await supabase.from('tiendanube_sync_queue').update({
            status: 'failed',
            attempts: newAttempts,
            last_error: syncError.response?.data?.message || syncError.message,
            processed_at: new Date().toISOString(),
          }).eq('id', sync.id);

          // Log error on transfer record (only for CAS/variant-based syncs)
          if (sync.variant_id) {
            await supabase.from('inventory_transfers')
              .update({ tn_sync_error: syncError.message })
              .eq('variant_id', sync.variant_id)
              .eq('tn_synced', false);
          }

          results.push({ id: sync.id, status: 'failed', error: syncError.message });
        } else {
          // Retry with exponential backoff (30s, 120s, 300s)
          const backoff = [30, 120, 300][newAttempts] || 300;
          await supabase.from('tiendanube_sync_queue').update({
            status: 'pending',
            attempts: newAttempts,
            last_error: syncError.message,
            next_retry_at: new Date(Date.now() + backoff * 1000).toISOString(),
          }).eq('id', sync.id);

          results.push({ id: sync.id, status: 'retry', attempt: newAttempts });
        }
      }
    }

    return res.status(200).json({
      status: 'ok',
      processed: results.length,
      completed: results.filter(r => r.status === 'completed').length,
      failed: results.filter(r => r.status === 'failed').length,
      retried: results.filter(r => r.status === 'retry').length,
      elapsed_ms: Date.now() - startTime,
    });
  } catch (error) {
    console.error('[SYNC QUEUE ERROR]:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
