import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';

export default function useInventory() {
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([
    { id: 'r5', code: 'r5', name: 'R5', type: 'physical', color: '#3b82f6' },
    { id: 'apes', code: 'apes', name: 'APES', type: 'physical', color: '#8b5cf6' },
    { id: 'web', code: 'web', name: 'WEB', type: 'online', color: '#06B6D4' },
  ]);
  const [stock, setStock] = useState([]);
  const [movements, setMovements] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const safeSet = (setter) => (value) => {
    if (mountedRef.current) setter(value);
  };

  const apiCall = useCallback(async (path, options = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const res = await fetch(`/api/inventory${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    return res.json();
  }, []);

  const handleRequest = useCallback(async (requestFn) => {
    safeSet(setLoading)(true);
    safeSet(setError)(null);
    try {
      const result = await requestFn();
      return result;
    } catch (err) {
      const msg = err.message || 'Error inesperado';
      safeSet(setError)(msg);
      return { success: false, error: msg };
    } finally {
      safeSet(setLoading)(false);
    }
  }, []);

  const fetchProducts = useCallback(async (filters = {}) => {
    return handleRequest(async () => {
      const params = new URLSearchParams();
      if (filters.locationId) params.append('location_id', filters.locationId);
      if (filters.category) params.append('category', filters.category);
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.sort) params.append('sort', filters.sort);
      if (filters.page) params.append('page', filters.page);
      const qs = params.toString();
      const res = await apiCall(`/products${qs ? `?${qs}` : ''}`);
      if (res && Array.isArray(res.products)) {
        const enrichedProducts = (res.products || []).map((p) => {
          const stockByLocation = {};
          (p.inventory_stock || []).forEach((s) => {
            stockByLocation[s.location_id] = (s.quantity || 0) - (s.reserved || 0);
          });
          return { ...p, stock_by_location: stockByLocation };
        });
        safeSet(setProducts)(enrichedProducts);
        const flatStock = (res.products || []).flatMap((p) =>
          (p.inventory_stock || []).map((s) => ({
            product_id: p.id,
            location_id: s.location_id,
            quantity: s.quantity || 0,
            reserved: s.reserved || 0,
            low_stock_threshold: s.low_stock_threshold ?? 5,
          }))
        );
        safeSet(setStock)(flatStock);
      }
      return res;
    });
  }, [apiCall, handleRequest]);

  const adjustStock = useCallback(async (productId, locationId, quantity, type, notes) => {
    return handleRequest(async () => {
      const res = await apiCall('/stock/adjust', {
        method: 'POST',
        body: JSON.stringify({ product_id: productId, location_id: locationId, quantity, type, notes }),
      });
      return res;
    });
  }, [apiCall, handleRequest]);

  const transferStock = useCallback(async (productId, fromLocationId, toLocationId, quantity, notes) => {
    return handleRequest(async () => {
      const res = await apiCall('/stock/transfer', {
        method: 'POST',
        body: JSON.stringify({
          product_id: productId,
          from_location_id: fromLocationId,
          to_location_id: toLocationId,
          quantity,
          notes,
        }),
      });
      return res;
    });
  }, [apiCall, handleRequest]);

  const fetchMovements = useCallback(async (filters = {}) => {
    return handleRequest(async () => {
      const params = new URLSearchParams();
      if (filters.locationId) params.append('location_id', filters.locationId);
      if (filters.productId) params.append('product_id', filters.productId);
      if (filters.type) params.append('type', filters.type);
      if (filters.startDate) params.append('date_from', filters.startDate);
      if (filters.endDate) params.append('date_to', filters.endDate);
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);
      const qs = params.toString();
      const res = await apiCall(`/movements${qs ? `?${qs}` : ''}`);
      if (res && Array.isArray(res.movements)) safeSet(setMovements)(res.movements);
      return res;
    });
  }, [apiCall, handleRequest]);

  const fetchAlerts = useCallback(async () => {
    return handleRequest(async () => {
      const res = await apiCall('/alerts');
      if (Array.isArray(res)) safeSet(setAlerts)(res);
      return res;
    });
  }, [apiCall, handleRequest]);

  const acknowledgeAlert = useCallback(async (alertId) => {
    return handleRequest(async () => {
      const res = await apiCall(`/alerts/${alertId}/acknowledge`, { method: 'POST' });
      if (res && res.id) {
        safeSet(setAlerts)((prev) =>
          prev.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a))
        );
      }
      return res;
    });
  }, [apiCall, handleRequest]);

  const checkAlerts = useCallback(async () => {
    return handleRequest(async () => {
      const res = await apiCall('/alerts/check', { method: 'POST' });
      if (res.success) await fetchAlerts();
      return res;
    });
  }, [apiCall, handleRequest, fetchAlerts]);

  const fetchSummary = useCallback(async (locationId) => {
    return handleRequest(async () => {
      const params = locationId ? `?location_id=${locationId}` : '';
      const res = await apiCall(`/reports/summary${params}`);
      if (res && typeof res === 'object' && !Array.isArray(res)) safeSet(setSummary)(res);
      return res;
    });
  }, [apiCall, handleRequest]);

  const createProduct = useCallback(async (data) => {
    return handleRequest(async () => {
      const res = await apiCall('/products', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return res;
    });
  }, [apiCall, handleRequest]);

  const updateProduct = useCallback(async (id, data) => {
    return handleRequest(async () => {
      const res = await apiCall(`/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return res;
    });
  }, [apiCall, handleRequest]);

  const deleteProduct = useCallback(async (id) => {
    return handleRequest(async () => {
      const res = await apiCall(`/products/${id}`, { method: 'DELETE' });
      return res;
    });
  }, [apiCall, handleRequest]);

  const fetchRoles = useCallback(async () => {
    return handleRequest(async () => {
      const res = await apiCall('/roles');
      if (Array.isArray(res)) safeSet(setRoles)(res);
      return res;
    });
  }, [apiCall, handleRequest]);

  const setUserRole = useCallback(async (userId, role) => {
    return handleRequest(async () => {
      const res = await apiCall('/roles', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, role }),
      });
      if (res && res.id) await fetchRoles();
      return res;
    });
  }, [apiCall, handleRequest, fetchRoles]);

  const fetchLocations = useCallback(async () => {
    try {
      const res = await apiCall('/locations');
      if (Array.isArray(res) && res.length > 0) {
        safeSet(setLocations)(res);
      }
    } catch {
      // Keep default locations
    }
  }, [apiCall]);

  const syncFromTiendaNueve = useCallback(async () => {
    return handleRequest(async () => {
      const res = await apiCall('/sync-from-tiendanube', { method: 'POST' });
      return res;
    });
  }, [apiCall, handleRequest]);

  const init = useCallback(async () => {
    safeSet(setLoading)(true);
    try {
      await Promise.allSettled([
        fetchProducts(),
        fetchAlerts(),
        fetchSummary(),
        fetchRoles(),
        fetchMovements({ limit: 10 }),
        fetchLocations(),
      ]);
    } catch (err) {
      safeSet(setError)(err.message);
    } finally {
      safeSet(setLoading)(false);
    }
  }, [fetchProducts, fetchAlerts, fetchSummary, fetchMovements, fetchLocations]);

  useEffect(() => {
    init();
  }, []);

  const aiScan = useCallback(async (image, locationId) => {
    return handleRequest(async () => {
      const res = await apiCall('/ai-scan', {
        method: 'POST',
        body: JSON.stringify({ image, locationId }),
      });
      return res;
    });
  }, [apiCall, handleRequest]);

  const aiSearch = useCallback(async (query) => {
    return handleRequest(async () => {
      const res = await apiCall('/ai-search', {
        method: 'POST',
        body: JSON.stringify({ query }),
      });
      return res;
    });
  }, [apiCall, handleRequest]);

  const aiVision = useCallback(async (image, prompt) => {
    return handleRequest(async () => {
      const res = await apiCall('/ai-vision', {
        method: 'POST',
        body: JSON.stringify({ image, prompt }),
      });
      return res;
    });
  }, [apiCall, handleRequest]);

  const indexEmbeddings = useCallback(async () => {
    return handleRequest(async () => {
      const res = await apiCall('/ai-search', { method: 'GET' });
      return res;
    });
  }, [apiCall, handleRequest]);

  const api = useMemo(() => ({
    products,
    locations,
    stock,
    movements,
    alerts,
    summary,
    roles,
    loading,
    error,
    fetchProducts,
    adjustStock,
    transferStock,
    fetchMovements,
    fetchAlerts,
    acknowledgeAlert,
    checkAlerts,
    fetchSummary,
    fetchRoles,
    setUserRole,
    createProduct,
    updateProduct,
    deleteProduct,
    aiScan,
    aiSearch,
    aiVision,
    indexEmbeddings,
    fetchLocations,
    syncFromTiendaNueve,
    init,
  }), [
    products,
    locations,
    stock,
    movements,
    alerts,
    summary,
    roles,
    loading,
    error,
    fetchProducts,
    adjustStock,
    transferStock,
    fetchMovements,
    fetchAlerts,
    acknowledgeAlert,
    checkAlerts,
    fetchSummary,
    fetchRoles,
    setUserRole,
    createProduct,
    updateProduct,
    deleteProduct,
    aiScan,
    aiSearch,
    aiVision,
    indexEmbeddings,
    fetchLocations,
    syncFromTiendaNueve,
    init,
  ]);

  return api;
}
