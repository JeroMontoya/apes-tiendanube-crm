import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export default function useInventory() {
  const [products, setProducts] = useState([]);
  const [locations] = useState([
    { id: 'r5', name: 'R5', type: 'physical', color: '#3b82f6' },
    { id: 'apes', name: 'APES', type: 'physical', color: '#8b5cf6' },
    { id: 'web', name: 'WEB', type: 'online', color: '#10b981' },
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
      if (filters.location) params.append('location', filters.location);
      if (filters.category) params.append('category', filters.category);
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.sort) params.append('sort', filters.sort);
      if (filters.page) params.append('page', filters.page);
      const qs = params.toString();
      const res = await apiCall(`/products${qs ? `?${qs}` : ''}`);
      if (res.success) safeSet(setProducts)(res.data);
      return res;
    });
  }, [apiCall, handleRequest]);

  const adjustStock = useCallback(async (productId, locationId, quantity, type, notes) => {
    return handleRequest(async () => {
      const res = await apiCall('/stock/adjust', {
        method: 'POST',
        body: JSON.stringify({ productId, locationId, quantity, type, notes }),
      });
      return res;
    });
  }, [apiCall, handleRequest]);

  const transferStock = useCallback(async (productId, fromLocationId, toLocationId, quantity, notes) => {
    return handleRequest(async () => {
      const res = await apiCall('/stock/transfer', {
        method: 'POST',
        body: JSON.stringify({ productId, fromLocationId, toLocationId, quantity, notes }),
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
      if (filters.startDate) params.append('start_date', filters.startDate);
      if (filters.endDate) params.append('end_date', filters.endDate);
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);
      const qs = params.toString();
      const res = await apiCall(`/movements${qs ? `?${qs}` : ''}`);
      if (res.success) safeSet(setMovements)(res.data);
      return res;
    });
  }, [apiCall, handleRequest]);

  const fetchAlerts = useCallback(async () => {
    return handleRequest(async () => {
      const res = await apiCall('/alerts');
      if (res.success) safeSet(setAlerts)(res.data);
      return res;
    });
  }, [apiCall, handleRequest]);

  const acknowledgeAlert = useCallback(async (alertId) => {
    return handleRequest(async () => {
      const res = await apiCall(`/alerts/${alertId}/acknowledge`, { method: 'POST' });
      if (res.success) {
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
      if (res.success) safeSet(setSummary)(res.data);
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
      if (res.success) safeSet(setRoles)(res.data);
      return res;
    });
  }, [apiCall, handleRequest]);

  const setUserRole = useCallback(async (userId, role, locationsGranted) => {
    return handleRequest(async () => {
      const res = await apiCall('/roles', {
        method: 'POST',
        body: JSON.stringify({ userId, role, locations: locationsGranted }),
      });
      if (res.success) await fetchRoles();
      return res;
    });
  }, [apiCall, handleRequest, fetchRoles]);

  const init = useCallback(async () => {
    safeSet(setLoading)(true);
    try {
      await Promise.allSettled([
        fetchProducts(),
        fetchAlerts(),
        fetchSummary(),
        fetchRoles(),
        fetchMovements({ limit: 10 }),
      ]);
    } catch (err) {
      safeSet(setError)(err.message);
    } finally {
      safeSet(setLoading)(false);
    }
  }, [fetchProducts, fetchAlerts, fetchSummary, fetchMovements]);

  useEffect(() => {
    init();
  }, []);

  return {
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
    init,
  };
}
