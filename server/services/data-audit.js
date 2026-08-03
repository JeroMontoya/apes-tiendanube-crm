import { createClient } from '@supabase/supabase-js';

export async function runDataAudit(supabaseAdmin) {
  const findings = [];

  // ── 1. Check tiendanube_orders data ────────────────────────────
  const { data: orders, error: ordersErr } = await supabaseAdmin
    .from('tiendanube_orders')
    .select('tiendanube_order_id, total, subtotal, customer_email, customer_phone, customer_name, payment_status, status, stock_deducted, created_at')
    .limit(5000);

  if (ordersErr) {
    findings.push({ severity: 'error', category: 'db_access', title: 'Cannot read tiendanube_orders', detail: ordersErr.message });
    return findings;
  }

  if (!orders || orders.length === 0) {
    findings.push({ severity: 'warning', category: 'data_empty', title: 'No orders in tiendanube_orders', detail: 'Table is empty or no data synced yet' });
    return findings;
  }

  // Duplicate tiendanube_order_id
  const idCount = new Map();
  for (const o of orders) {
    idCount.set(o.tiendanube_order_id, (idCount.get(o.tiendanube_order_id) || 0) + 1);
  }
  const duplicates = [...idCount.entries()].filter(([, c]) => c > 1);
  if (duplicates.length > 0) {
    findings.push({
      severity: 'critical',
      category: 'integrity',
      title: `Found ${duplicates.length} duplicate order IDs`,
      detail: `Orders with duplicate tiendanube_order_id: ${duplicates.slice(0, 10).map(([id, c]) => `#${id} (${c}x)`).join(', ')}${duplicates.length > 10 ? `... and ${duplicates.length - 10} more` : ''}`,
    });
  }

  // Orders with zero/negative total
  const zeroTotal = orders.filter(o => !o.total || Number(o.total) <= 0);
  if (zeroTotal.length > 0) {
    findings.push({
      severity: 'warning',
      category: 'monetary',
      title: `${zeroTotal.length} orders with zero/negative total`,
      detail: `These orders have total <= 0 and may skew RFM monetary: ${zeroTotal.slice(0, 5).map(o => `#${o.tiendanube_order_id}`).join(', ')}${zeroTotal.length > 5 ? `... (${zeroTotal.length - 5} more)` : ''}`,
    });
  }

  // Orders with cancelled/voided status that should be excluded from analytics
  const cancelled = orders.filter(o => (o.payment_status || '').match(/cancelled|voided|refunded/i) || (o.status || '').match(/cancelled/i));
  if (cancelled.length > 0) {
    findings.push({
      severity: 'info',
      category: 'segmentation',
      title: `${cancelled.length} cancelled/voided/refunded orders in table`,
      detail: 'These should be excluded from RFM and monetary calculations. Check mapToUnified filter logic.',
    });
  }

  // Stock deduction consistency
  const paidNotDeducted = orders.filter(o => (o.payment_status === 'paid' || o.payment_status === 'authorized') && !o.stock_deducted);
  if (paidNotDeducted.length > 0) {
    findings.push({
      severity: 'critical',
      category: 'inventory',
      title: `${paidNotDeducted.length} paid orders without stock deduction`,
      detail: `Stock was not deducted for these paid orders: ${paidNotDeducted.slice(0, 5).map(o => `#${o.tiendanube_order_id}`).join(', ')}${paidNotDeducted.length > 5 ? `... (${paidNotDeducted.length - 5} more)` : ''}. Check fn_upsert_tiendanube_order RPC and WEB location exists.`,
    });
  }

  // ── 2. Check tiendanube_clients ──────────────────────────────
  const { data: clients, error: clientsErr } = await supabaseAdmin
    .from('tiendanube_clients')
    .select('tiendanube_customer_id, email, name, phone, total_spent, orders_count')
    .limit(5000);

  if (!clientsErr && clients) {
    // Clients without email or phone (unreachable)
    const noContact = clients.filter(c => !c.email && !c.phone);
    if (noContact.length > 0) {
      findings.push({
        severity: 'warning',
        category: 'contactability',
        title: `${noContact.length} clients without email or phone`,
        detail: `These clients have no contact info — WhatsApp and email campaigns will fail: ${(noContact.length / clients.length * 100).toFixed(1)}% of total`,
      });
    }

    // Invalid emails
    const invalidEmails = clients.filter(c => c.email && /onli@|@noinformado|@nomail/i.test(c.email));
    if (invalidEmails.length > 0) {
      findings.push({
        severity: 'info',
        category: 'data_quality',
        title: `${invalidEmails.length} clients with Tiendanube merge emails`,
        detail: `Emails like 'onli@' or '@noinformado.com' indicate TN merged customer records. These affect deduplication: ${invalidEmails.length}/${clients.length} clients (${(invalidEmails.length / clients.length * 100).toFixed(1)}%)`,
      });
    }

    // orders_count vs total_spent mismatch
    const mismatch = clients.filter(c => c.orders_count > 0 && c.total_spent <= 0);
    if (mismatch.length > 0) {
      findings.push({
        severity: 'warning',
        category: 'monetary',
        title: `${mismatch.length} clients with orders but zero total_spent`,
        detail: 'RFM monetary will be 0 for these clients, causing incorrect segmentation',
      });
    }
  }

  // ── 3. Check server_cache integrity ─────────────────────────
  const { data: cache, error: cacheErr } = await supabaseAdmin
    .from('server_cache')
    .select('id, unified_clients, raw_orders, tiendanube_orders, sync_status, last_sync, error_log')
    .eq('id', 'main')
    .single();

  if (!cacheErr && cache) {
    const unifiedClients = cache.unified_clients || [];
    const rawOrders = cache.raw_orders || [];
    const tnOrders = cache.tiendanube_orders || [];

    findings.push({
      severity: 'info',
      category: 'sync',
      title: 'Server cache health',
      detail: `Sync status: ${cache.sync_status}, Last sync: ${cache.last_sync || 'never'}, Unified clients: ${unifiedClients.length}, Raw orders: ${rawOrders.length}, TN orders: ${tnOrders.length}`,
    });

    if (cache.error_log && cache.error_log.length > 0) {
      findings.push({
        severity: 'warning',
        category: 'sync',
        title: `${cache.error_log.length} sync errors in last run`,
        detail: cache.error_log.slice(0, 5).map((e) => `[${e.api}] ${e.msg}`).join('; '),
      });
    }

    // Check for stale unified client format
    if (unifiedClients.length > 0) {
      const sample = unifiedClients[0];
      if (sample.orders && !sample.purchases) {
        findings.push({
          severity: 'critical',
          category: 'compatibility',
          title: 'Stale unified_clients format detected',
          detail: 'Clients have "orders" instead of "purchases" — mapToUnified needs regeneration. Data snapshot endpoint should auto-regen on read.',
        });
      }
    }
  }

  // ── 4. Check rfm_segments if table exists ──────────────────
  const { data: rfmCount } = await supabaseAdmin
    .from('rfm_segments')
    .select('id', { count: 'exact', head: true });
  findings.push({
    severity: 'info',
    category: 'rfm',
    title: 'RFM segments status',
    detail: `rfm_segments table ${rfmCount !== null ? `has ${rfmCount} rows` : 'does not exist yet (run migration 032)'}`,
  });

  // ── 5. Summary stats ────────────────────────────────────────
  const totalRevenue = orders.reduce((s, o) => s + Number(o.total || 0), 0);
  const validOrders = orders.filter(o => Number(o.total || 0) > 0);
  findings.push({
    severity: 'info',
    category: 'summary',
    title: 'Data snapshot summary',
    detail: [
      `Orders: ${orders.length} total, ${validOrders.length} with positive value`,
      `Total revenue: $${totalRevenue.toLocaleString()}`,
      `Orders without stock deduction: ${paidNotDeducted.length}`,
      `Duplicate IDs: ${duplicates.length}`,
      `Clients: ${clients ? clients.length : 'N/A'}`,
      `Cancelled/voided orders: ${cancelled.length}`,
    ].join(' | '),
  });

  return findings;
}
