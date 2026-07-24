/**
 * /api/cro/metrics.js
 * Endpoint de métricas reales de productos para CRO Dashboard
 * Calcula vistas, compras y CR por producto desde server_cache (TiendaNube data)
 * GET /api/cro/metrics — Todas las métricas de productos
 * GET /api/cro/metrics?product_id=123 — Métricas de un producto específico
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function calculateCR(views, orders) {
  if (!views || views === 0) return 0;
  return parseFloat(((orders / views) * 100).toFixed(2));
}

function classifyPerformance(cr) {
  if (cr >= 5) return { level: 'excellent', label: 'Excelente', color: '#3b8a6e' };
  if (cr >= 3) return { level: 'good', label: 'Bueno', color: '#3d5a99' };
  if (cr >= 1.5) return { level: 'average', label: 'Promedio', color: '#a08240' };
  if (cr >= 0.5) return { level: 'below', label: 'Bajo', color: '#c97a3a' };
  return { level: 'critical', label: 'Crítico', color: '#994444' };
}

/**
 * Extrae métricas de producto desde los pedidos de TiendaNube
 * TiendaNube no provee "views" directamente, así que estimamos:
 * - views = orders * 30 (ratio industry average e-commerce: ~3% CR)
 * - Esto es una aproximación; con GA4 o tracking propio se puede refinar
 */
function calculateProductMetrics(orders, products) {
  const productMap = {};

  for (const order of orders || []) {
    if (!order.products && !order.line_items) continue;
    const items = order.products || order.line_items || [];

    for (const item of items) {
      const productId = item.product_id || item.id;
      if (!productId) continue;

      if (!productMap[productId]) {
        productMap[productId] = {
          product_id: productId,
          name: item.name || item.title || `Product ${productId}`,
          orders: 0,
          revenue: 0,
          units: 0,
          first_order: order.created_at || order.placed_on,
          last_order: order.created_at || order.placed_on,
        };
      }

      const quantity = item.quantity || 1;
      const price = parseFloat(item.price || item.unit_price || 0);
      productMap[productId].orders += 1;
      productMap[productId].units += quantity;
      productMap[productId].revenue += price * quantity;

      if (order.created_at < productMap[productId].first_order) {
        productMap[productId].first_order = order.created_at;
      }
      if (order.created_at > productMap[productId].last_order) {
        productMap[productId].last_order = order.created_at;
      }
    }
  }

  // Convert to array and calculate estimated CR
  return Object.values(productMap).map(p => {
    const estimatedViews = Math.max(p.orders * 30, 100);
    const cr = calculateCR(estimatedViews, p.orders);
    const perf = classifyPerformance(cr);

    return {
      ...p,
      estimated_views: estimatedViews,
      conversion_rate: cr,
      performance: perf,
      avg_order_value: p.orders > 0 ? parseFloat((p.revenue / p.orders).toFixed(2)) : 0,
    };
  }).sort((a, b) => b.revenue - a.revenue);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { product_id } = req.query;

    // Fetch cached TiendaNube data
    const { data: cache, error } = await supabase
      .from('server_cache')
      .select('tiendanube_orders, tiendanube_products, raw_orders')
      .eq('id', 'main')
      .maybeSingle();

    if (error || !cache) {
      return res.status(200).json({
        metrics: [],
        products: [],
        summary: { total_products: 0, total_orders: 0, avg_cr: 0, critical: 0 },
        message: 'No hay datos de sync disponibles. Ejecuta /api/cron/sync primero.',
      });
    }

    const orders = cache.tiendanube_orders || cache.raw_orders || [];
    const products = cache.tiendanube_products || [];

    // Calculate metrics per product
    const productMetrics = calculateProductMetrics(orders, products);

    // Merge with product catalog data (name, description, variants)
    const enrichedProducts = products.map(p => {
      const metric = productMetrics.find(m => m.product_id === p.id) || {
        orders: 0, revenue: 0, units: 0, estimated_views: 100, conversion_rate: 0,
        performance: classifyPerformance(0),
      };

      return {
        id: p.id,
        name: p.name,
        description: p.description,
        variants: p.variants || [],
        visible: p.visible,
        ...metric,
      };
    }).sort((a, b) => b.revenue - a.revenue);

    // Summary stats
    const totalProducts = enrichedProducts.length;
    const totalOrders = orders.length;
    const avgCR = productMetrics.length > 0
      ? productMetrics.reduce((s, p) => s + p.conversion_rate, 0) / productMetrics.length
      : 0;
    const criticalCount = productMetrics.filter(p => p.performance.level === 'critical').length;
    const belowCount = productMetrics.filter(p => p.performance.level === 'below').length;
    const totalRevenue = productMetrics.reduce((s, p) => s + p.revenue, 0);

    // If specific product requested
    if (product_id) {
      const single = enrichedProducts.find(p => p.id === Number(product_id));
      if (!single) return res.status(404).json({ error: 'Product not found' });
      return res.status(200).json({ product: single });
    }

    return res.status(200).json({
      metrics: productMetrics,
      products: enrichedProducts,
      summary: {
        total_products: totalProducts,
        total_orders: totalOrders,
        avg_cr: parseFloat(avgCR.toFixed(2)),
        critical: criticalCount,
        below: belowCount,
        good: productMetrics.filter(p => p.performance.level === 'good' || p.performance.level === 'excellent').length,
        total_revenue: totalRevenue,
      },
      sync_info: {
        last_sync: cache.updated_at,
        orders_in_cache: orders.length,
        products_in_cache: products.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[CRO METRICS ERROR]:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
