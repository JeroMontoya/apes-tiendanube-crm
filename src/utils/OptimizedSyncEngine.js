import { unifyClients } from './unifyClients';
import { mapTiendanubeDataToUnified } from './tiendanubeAPI';
import { loadFromCache, saveToCache } from '../data/cache';

export const CACHE_KEYS = {
  ORDERS: 'raw_orders',
  CLIENTS: 'unified_clients',
  PRODUCTS: 'tiendanube_products',
  MC_PRODUCTS: 'mc_products',
  SYNC: 'last_sync',
};

class OptimizedSyncEngine {
  constructor() {
    this.pendingRequests = new Map();
    this.lastSyncTimestamps = new Map();
    // Worker disabled for now - use main thread with requestIdleCallback
    this.worker = null;
  }

  // SWR Pattern: Stale-While-Revalidate
  async getCachedOrFetch(cacheKey, fetcher, options = {}) {
    const { ttl = 5 * 60 * 1000, backgroundRefresh = true } = options;
    
    // 1. Return cached data immediately (stale)
    const [cached, cacheMeta] = await Promise.all([
      loadFromCache(cacheKey),
      loadFromCache(`${cacheKey}_meta`),
    ]);
    
    const isStale = !cached || (cacheMeta && Date.now() - cacheMeta.timestamp > ttl);
    
    if (cached && !isStale) {
      if (backgroundRefresh) this.refreshInBackground(cacheKey, fetcher);
      return { data: cached, fromCache: true, isStale: false };
    }
    
    if (cached && isStale) {
      if (backgroundRefresh) this.refreshInBackground(cacheKey, fetcher);
      return { data: cached, fromCache: true, isStale: true };
    }
    
    // No cache - fetch fresh
    return this.fetchFresh(cacheKey, fetcher);
  }

  async refreshInBackground(cacheKey, fetcher) {
    const lockKey = `refreshing:${cacheKey}`;
    if (this.pendingRequests.has(lockKey)) return;
    
    this.pendingRequests.set(lockKey, true);
    try {
      const freshData = await fetcher();
      await saveToCache(cacheKey, freshData);
      await saveToCache(`${cacheKey}_meta`, { timestamp: Date.now() });
      this.pendingRequests.delete(lockKey);
      window.dispatchEvent(new CustomEvent('cache:updated', { detail: { key: cacheKey, data: freshData } }));
    } catch (err) {
      this.pendingRequests.delete(lockKey);
      console.warn(`Background refresh failed for ${cacheKey}:`, err);
    }
  }

  async fetchFresh(cacheKey, fetcher) {
    const lockKey = `fetching:${cacheKey}`;
    if (this.pendingRequests.has(lockKey)) {
      // Wait for existing request
      return new Promise((resolve) => {
        const check = setInterval(() => {
          if (!this.pendingRequests.has(lockKey)) {
            clearInterval(check);
            loadFromCache(cacheKey).then(d => resolve({ data: d, fromCache: false, isStale: false }));
          }
        }, 100);
      });
    }
    
    this.pendingRequests.set(lockKey, true);
    try {
      const data = await fetcher();
      await saveToCache(cacheKey, data);
      await saveToCache(`${cacheKey}_meta`, { timestamp: Date.now() });
      this.pendingRequests.delete(lockKey);
      return { data, fromCache: false, isStale: false };
    } catch (err) {
      this.pendingRequests.delete(lockKey);
      throw err;
    }
  }

  // Offload to background using requestIdleCallback (no worker needed)
  async processInBackground(type, payload) {
    return new Promise((resolve, reject) => {
      const doWork = () => {
        try {
          let result;
          if (type === 'unify') {
            const { historicClients = [], orders = [] } = payload;
            result = unifyClients(historicClients, orders);
          } else if (type === 'transform') {
            const { customers, orders } = payload;
            result = mapTiendanubeDataToUnified(customers, orders);
          } else {
            throw new Error(`Unknown process type: ${type}`);
          }
          resolve(result);
        } catch (err) {
          reject(err);
        }
      };
      
      if ('requestIdleCallback' in window) {
        requestIdleCallback(doWork, { timeout: 2000 });
      } else {
        setTimeout(doWork, 0);
      }
    });
  }

  // Request deduplication - prevent duplicate simultaneous requests
  deduplicate(key, promiseFn) {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }
    const promise = promiseFn().finally(() => {
      this.pendingRequests.delete(key);
    });
    this.pendingRequests.set(key, promise);
    return promise;
  }

  // Smart retry with exponential backoff
  async retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (err) {
        if (i === maxRetries - 1) throw err;
        const delay = baseDelay * Math.pow(2, i) + Math.random() * 500;
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
}

export const syncEngine = new OptimizedSyncEngine();