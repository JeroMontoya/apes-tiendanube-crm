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
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

async function authenticate(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return { user: null, error: 'Missing or invalid Authorization header' };
  }
  const token = auth.slice(7);
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) {
    return { user: null, error: 'Invalid or expired token' };
  }
  return { user: data.user, client: userClient };
}

async function getUserRole(userId) {
  const { data, error } = await supabase
    .from('inventory_user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();
  if (error || !data) return 'viewer';
  return data.role;
}

function hasPermission(role, action) {
  const permissions = {
    admin: ['read', 'write', 'delete', 'manage_roles', 'view_audit', 'adjust', 'transfer', 'reports', 'alerts'],
    manager: ['read', 'write', 'adjust', 'transfer', 'reports', 'alerts'],
    operator: ['read', 'adjust', 'transfer'],
    viewer: ['read'],
  };
  return permissions[role]?.includes(action) || false;
}

async function listProducts(req, res) {
  const { location_id, category, search, stock_status, page = 1, limit = 50 } = req.query;
  const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

  let query = supabase
    .from('inventory_products')
    .select(`
      *,
      inventory_stock(quantity, reserved, low_stock_threshold, location_id, inventory_locations(name, code))
    `, { count: 'exact' })
    .eq('is_active', true)
    .order('name');

  if (location_id) {
    query = query.eq('inventory_stock.location_id', location_id);
  }
  if (category) {
    query = query.eq('category', category);
  }
  if (search) {
    query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,barcode.ilike.%${search}%`);
  }

  const { data, error, count } = await query.range(offset, offset + parseInt(limit) - 1);
  if (error) return err(res, 'Failed to fetch products', 500, error.message);

  let results = data || [];
  if (stock_status) {
    results = results.filter((p) => {
      const totalStock = (p.inventory_stock || []).reduce((sum, s) => sum + (s.quantity || 0), 0);
      const totalReserved = (p.inventory_stock || []).reduce((sum, s) => sum + (s.reserved || 0), 0);
      const available = totalStock - totalReserved;
      const hasReorder = (p.inventory_stock || []).some((s) => s.quantity <= s.low_stock_threshold);
      if (stock_status === 'out_of_stock') return available === 0;
      if (stock_status === 'low_stock') return available > 0 && hasReorder;
      if (stock_status === 'in_stock') return available > 0 && !hasReorder;
      return true;
    });
  }

  return ok(res, {
    products: results,
    total: count,
    page: parseInt(page),
    limit: parseInt(limit),
    pages: Math.ceil(count / parseInt(limit)),
  });
}

async function getProductById(req, res, productId) {
  const { data, error } = await supabase
    .from('inventory_products')
    .select(`
      *,
      inventory_stock(*, inventory_locations(name, code))
    `)
    .eq('id', productId)
    .single();

  if (error || !data) return err(res, 'Product not found', 404);
  return ok(res, data);
}

async function createProduct(req, res) {
  const { name, sku, barcode, category, description, color, size, image_url, unit_cost, sell_price } = req.body;
  if (!name) return err(res, 'name is required', 400);

  const { data, error } = await supabase
    .from('inventory_products')
    .insert({
      name, sku: sku || '', barcode: barcode || '', category: category || 'otro',
      description: description || '', color: color || '', size: size || '',
      image_url: image_url || '', unit_cost: unit_cost || 0, sell_price: sell_price || 0,
      is_active: true,
    })
    .select()
    .single();

  if (error) return err(res, 'Failed to create product', 500, error.message);
  return ok(res, data, 201);
}

async function updateProduct(req, res, productId) {
  const allowed = [
    'name', 'sku', 'barcode', 'category', 'description', 'color', 'size',
    'image_url', 'unit_cost', 'sell_price', 'is_active',
  ];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('inventory_products')
    .update(updates)
    .eq('id', productId)
    .select()
    .single();

  if (error) return err(res, 'Failed to update product', 500, error.message);
  if (!data) return err(res, 'Product not found', 404);
  return ok(res, data);
}

async function deleteProduct(req, res, productId) {
  const { error } = await supabase
    .from('inventory_products')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', productId);

  if (error) return err(res, 'Failed to delete product', 500, error.message);
  return ok(res, { message: 'Product deactivated' });
}

async function getStock(req, res) {
  const { location_id } = req.query;
  if (!location_id) return err(res, 'location_id is required', 400);

  const { data, error } = await supabase
    .from('inventory_stock')
    .select(`
      *,
      inventory_products(name, sku, barcode),
      inventory_locations(name, code)
    `)
    .eq('location_id', location_id)
    .order('created_at', { ascending: false });

  if (error) return err(res, 'Failed to fetch stock', 500, error.message);
  return ok(res, data || []);
}

async function adjustStock(req, res) {
  const { product_id, location_id, quantity, type, notes } = req.body;
  if (!product_id || !location_id || quantity === undefined || !type) {
    return err(res, 'product_id, location_id, quantity, and type are required', 400);
  }

  const { data, error } = await supabase.rpc('fn_update_stock', {
    p_product_id: product_id,
    p_location_id: location_id,
    p_quantity_change: quantity,
    p_movement_type: type,
    p_notes: notes || '',
    p_performed_by: req._userId,
  });

  if (error) return err(res, 'Failed to adjust stock', 500, error.message);
  return ok(res, { message: 'Stock adjusted', movement: data });
}

async function transferStock(req, res) {
  const { product_id, from_location_id, to_location_id, quantity, notes } = req.body;
  if (!product_id || !from_location_id || !to_location_id || !quantity) {
    return err(res, 'product_id, from_location_id, to_location_id, and quantity are required', 400);
  }
  if (from_location_id === to_location_id) {
    return err(res, 'Source and destination locations must differ', 400);
  }

  const { data, error } = await supabase.rpc('fn_transfer_stock', {
    p_product_id: product_id,
    p_from_location_id: from_location_id,
    p_to_location_id: to_location_id,
    p_quantity: quantity,
    p_notes: notes || '',
    p_performed_by: req._userId,
  });

  if (error) return err(res, 'Failed to transfer stock', 500, error.message);
  return ok(res, { message: 'Transfer completed', result: data });
}

async function getMovements(req, res) {
  const {
    product_id, location_id, type, date_from, date_to,
    page = 1, limit = 50,
  } = req.query;
  const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

  let query = supabase
    .from('inventory_movements')
    .select(`
      *,
      inventory_products(name, sku),
      inventory_locations(name, code)
    `, { count: 'exact' })
    .order('created_at', { ascending: false });

  if (product_id) query = query.eq('product_id', product_id);
  if (location_id) query = query.eq('location_id', location_id);
  if (type) query = query.eq('type', type);
  if (date_from) query = query.gte('created_at', date_from);
  if (date_to) query = query.lte('created_at', date_to + 'T23:59:59.999Z');

  const { data, error, count } = await query.range(offset, offset + parseInt(limit) - 1);
  if (error) return err(res, 'Failed to fetch movements', 500, error.message);

  return ok(res, {
    movements: data || [],
    total: count,
    page: parseInt(page),
    limit: parseInt(limit),
    pages: Math.ceil(count / parseInt(limit)),
  });
}

async function getAlerts(req, res) {
  const { data, error } = await supabase
    .from('inventory_alerts')
    .select(`
      *,
      inventory_products(name, sku),
      inventory_locations(name, code)
    `)
    .eq('acknowledged', false)
    .order('created_at', { ascending: false });

  if (error) return err(res, 'Failed to fetch alerts', 500, error.message);
  return ok(res, data || []);
}

async function acknowledgeAlert(req, res, alertId) {
  const { data, error } = await supabase
    .from('inventory_alerts')
    .update({
      acknowledged: true,
      acknowledged_by: req._userId,
      acknowledged_at: new Date().toISOString(),
    })
    .eq('id', alertId)
    .eq('acknowledged', false)
    .select()
    .single();

  if (error) return err(res, 'Failed to acknowledge alert', 500, error.message);
  if (!data) return err(res, 'Alert not found or already acknowledged', 404);
  return ok(res, data);
}

async function checkAlerts(req, res) {
  const { data, error } = await supabase.rpc('fn_check_alerts');
  if (error) return err(res, 'Failed to check alerts', 500, error.message);
  return ok(res, { message: 'Alert check completed', alerts_created: data });
}

async function getSummaryReport(req, res) {
  const { location_id } = req.query;

  let stockQuery = supabase
    .from('inventory_stock')
    .select(`
      quantity, reserved, low_stock_threshold,
      inventory_products(name, sku, unit_cost, is_active),
      inventory_locations(name, code)
    `)
    .eq('inventory_products.is_active', true);

  if (location_id) stockQuery = stockQuery.eq('location_id', location_id);

  const { data: stock, error: stockErr } = await stockQuery;
  if (stockErr) return err(res, 'Failed to fetch summary', 500, stockErr.message);

  const { count: productCount } = await supabase
    .from('inventory_products')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true);

  const { count: alertCount } = await supabase
    .from('inventory_alerts')
    .select('id', { count: 'exact', head: true })
    .eq('acknowledged', false);

  const totalProducts = productCount || 0;
  const totalStock = (stock || []).reduce((sum, s) => sum + (s.quantity || 0), 0);
  const totalReserved = (stock || []).reduce((sum, s) => sum + (s.reserved || 0), 0);
  const totalValue = (stock || []).reduce((sum, s) => {
    const cost = s.inventory_products?.unit_cost || 0;
    return sum + ((s.quantity || 0) * cost);
  }, 0);

  const outOfStock = (stock || []).filter((s) => (s.quantity - (s.reserved || 0)) === 0).length;
  const lowStock = (stock || []).filter((s) => {
    const available = s.quantity - (s.reserved || 0);
    return available > 0 && s.quantity <= (s.low_stock_threshold || 0);
  }).length;

  const byLocation = {};
  (stock || []).forEach((s) => {
    const locName = s.inventory_locations?.name || 'Unknown';
    if (!byLocation[locName]) byLocation[locName] = { products: 0, total_quantity: 0, total_reserved: 0, total_value: 0 };
    byLocation[locName].products++;
    byLocation[locName].total_quantity += s.quantity || 0;
    byLocation[locName].total_reserved += s.reserved || 0;
    byLocation[locName].total_value += (s.quantity || 0) * (s.inventory_products?.unit_cost || 0);
  });

  return ok(res, {
    total_products: totalProducts,
    total_stock_units: totalStock,
    total_reserved_units: totalReserved,
    total_available_units: totalStock - totalReserved,
    total_value: Math.round(totalValue * 100) / 100,
    out_of_stock_entries: outOfStock,
    low_stock_entries: lowStock,
    active_alerts: alertCount || 0,
    by_location: byLocation,
  });
}

async function getMovementReport(req, res) {
  const { date_from, date_to, location_id, type } = req.query;
  if (!date_from || !date_to) return err(res, 'date_from and date_to are required', 400);

  let query = supabase
    .from('inventory_movements')
    .select(`
      *,
      inventory_products(name, sku),
      inventory_locations(name, code)
    `)
    .gte('created_at', date_from)
    .lte('created_at', date_to + 'T23:59:59.999Z')
    .order('created_at', { ascending: false });

  if (location_id) query = query.eq('location_id', location_id);
  if (type) query = query.eq('type', type);

  const { data, error } = await query;
  if (error) return err(res, 'Failed to fetch movement report', 500, error.message);

  const byType = {};
  (data || []).forEach((m) => {
    if (!byType[m.type]) byType[m.type] = { count: 0, total_quantity: 0 };
    byType[m.type].count++;
    byType[m.type].total_quantity += Math.abs(m.quantity || 0);
  });

  return ok(res, {
    movements: data || [],
    summary: { total_movements: data?.length || 0, by_type: byType },
    date_range: { from: date_from, to: date_to },
  });
}

async function getValuationReport(req, res) {
  const { location_id } = req.query;

  let query = supabase
    .from('inventory_stock')
    .select(`
      quantity, reserved,
      inventory_products(name, sku, unit_cost, is_active, category),
      inventory_locations(name, code)
    `)
    .eq('inventory_products.is_active', true);

  if (location_id) query = query.eq('location_id', location_id);

  const { data, error } = await query;
  if (error) return err(res, 'Failed to fetch valuation', 500, error.message);

  let totalCost = 0;
  const byProduct = {};
  const byCategory = {};

  (data || []).forEach((s) => {
    const cost = s.inventory_products?.unit_cost || 0;
    const value = (s.quantity || 0) * cost;
    totalCost += value;

    const prodKey = s.inventory_products?.name || 'Unknown';
    if (!byProduct[prodKey]) byProduct[prodKey] = { sku: s.inventory_products?.sku, quantity: 0, unit_cost: cost, total_value: 0 };
    byProduct[prodKey].quantity += s.quantity || 0;
    byProduct[prodKey].total_value += value;

    const catName = s.inventory_products?.category || 'Sin categoría';
    if (!byCategory[catName]) byCategory[catName] = { quantity: 0, total_value: 0 };
    byCategory[catName].quantity += s.quantity || 0;
    byCategory[catName].total_value += value;
  });

  return ok(res, {
    total_value: Math.round(totalCost * 100) / 100,
    by_product: byProduct,
    by_category: byCategory,
    generated_at: new Date().toISOString(),
  });
}

async function triggerSnapshot(req, res) {
  const { data, error } = await supabase.rpc('fn_daily_snapshot');
  if (error) return err(res, 'Failed to trigger snapshot', 500, error.message);
  return ok(res, { message: 'Daily snapshot triggered', result: data });
}

async function listRoles(req, res) {
  const { data, error } = await supabase
    .from('inventory_user_roles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return err(res, 'Failed to fetch roles', 500, error.message);
  return ok(res, data || []);
}

async function setRole(req, res) {
  const { user_id, role } = req.body;
  if (!user_id || !role) return err(res, 'user_id and role are required', 400);

  const validRoles = ['admin', 'manager', 'operator', 'viewer'];
  if (!validRoles.includes(role)) return err(res, `role must be one of: ${validRoles.join(', ')}`, 400);

  const { data, error } = await supabase
    .from('inventory_user_roles')
    .upsert({ user_id, role, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) return err(res, 'Failed to set role', 500, error.message);
  return ok(res, data);
}

async function getAuditLog(req, res) {
  const { page = 1, limit = 50, user_id, action } = req.query;
  const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

  let query = supabase
    .from('inventory_audit_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (user_id) query = query.eq('user_id', user_id);
  if (action) query = query.eq('action', action);

  const { data, error, count } = await query.range(offset, offset + parseInt(limit) - 1);
  if (error) return err(res, 'Failed to fetch audit log', 500, error.message);

  return ok(res, {
    entries: data || [],
    total: count,
    page: parseInt(page),
    limit: parseInt(limit),
    pages: Math.ceil(count / parseInt(limit)),
  });
}

function parsePath(pathname) {
  const parts = pathname.replace(/^\/api\/inventory\/?/, '').split('/').filter(Boolean);
  return parts;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    setCors(res);
    return res.status(204).end();
  }

  try {
    const { user, client, error: authError } = await authenticate(req);
    if (authError) return err(res, authError, 401);
    req._userId = user.id;

    const role = await getUserRole(user.id);
    req._role = role;

    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    const parts = parsePath(pathname);

    const segment = parts[0] || '';

    if (segment === 'products') {
      const productId = parts[1] || null;

      if (req.method === 'GET' && !productId) {
        if (!hasPermission(role, 'read')) return err(res, 'Forbidden', 403);
        return await listProducts(req, res);
      }
      if (req.method === 'GET' && productId) {
        if (!hasPermission(role, 'read')) return err(res, 'Forbidden', 403);
        return await getProductById(req, res, productId);
      }
      if (req.method === 'POST' && !productId) {
        if (!hasPermission(role, 'write')) return err(res, 'Forbidden', 403);
        return await createProduct(req, res);
      }
      if (req.method === 'PUT' && productId) {
        if (!hasPermission(role, 'write')) return err(res, 'Forbidden', 403);
        return await updateProduct(req, res, productId);
      }
      if (req.method === 'DELETE' && productId) {
        if (!hasPermission(role, 'delete')) return err(res, 'Forbidden', 403);
        return await deleteProduct(req, res, productId);
      }
    }

    if (segment === 'stock') {
      const subSegment = parts[1] || '';

      if (req.method === 'GET' && !subSegment) {
        if (!hasPermission(role, 'read')) return err(res, 'Forbidden', 403);
        return await getStock(req, res);
      }
      if (req.method === 'POST' && subSegment === 'adjust') {
        if (!hasPermission(role, 'adjust')) return err(res, 'Forbidden', 403);
        return await adjustStock(req, res);
      }
      if (req.method === 'POST' && subSegment === 'transfer') {
        if (!hasPermission(role, 'transfer')) return err(res, 'Forbidden', 403);
        return await transferStock(req, res);
      }
    }

    if (segment === 'movements' && req.method === 'GET') {
      if (!hasPermission(role, 'read')) return err(res, 'Forbidden', 403);
      return await getMovements(req, res);
    }

    if (segment === 'alerts') {
      const subSegment = parts[1] || '';

      if (req.method === 'GET' && !subSegment) {
        if (!hasPermission(role, 'read')) return err(res, 'Forbidden', 403);
        return await getAlerts(req, res);
      }
      if (req.method === 'POST' && subSegment === 'check') {
        if (!hasPermission(role, 'alerts')) return err(res, 'Forbidden', 403);
        return await checkAlerts(req, res);
      }
      if (req.method === 'POST' && subSegment && subSegment !== 'check') {
        if (!hasPermission(role, 'read')) return err(res, 'Forbidden', 403);
        return await acknowledgeAlert(req, res, subSegment);
      }
    }

    if (segment === 'reports') {
      const reportType = parts[1] || '';

      if (!hasPermission(role, 'reports')) return err(res, 'Forbidden', 403);

      if (req.method === 'GET' && reportType === 'summary') {
        return await getSummaryReport(req, res);
      }
      if (req.method === 'GET' && reportType === 'movements') {
        return await getMovementReport(req, res);
      }
      if (req.method === 'GET' && reportType === 'valuation') {
        return await getValuationReport(req, res);
      }
    }

    if (segment === 'snapshot' && req.method === 'GET') {
      if (!hasPermission(role, 'reports')) return err(res, 'Forbidden', 403);
      return await triggerSnapshot(req, res);
    }

    if (segment === 'roles') {
      if (!hasPermission(role, 'manage_roles')) return err(res, 'Forbidden', 403);

      if (req.method === 'GET') return await listRoles(req, res);
      if (req.method === 'POST') return await setRole(req, res);
    }

    if (segment === 'audit' && req.method === 'GET') {
      if (!hasPermission(role, 'view_audit')) return err(res, 'Forbidden', 403);
      return await getAuditLog(req, res);
    }

    return err(res, 'Not found', 404);
  } catch (error) {
    console.error('[inventory-api] Unhandled error:', error);
    return err(res, 'Internal server error', 500);
  }
}
