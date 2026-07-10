/**
 * tiendanubeAPI.js
 * ----------------
 * Production-grade HTTP client for the Tiendanube / Nuvemshop REST API.
 *
 * Features:
 *   • Rate-limited requests (2 req/s — Tiendanube's stated cap)
 *   • Auto-pagination via `fetchAllOrders()`
 *   • Graceful error wrapping — every method returns { success, data, error }
 *   • Data mapper to transform raw API shapes into the unified CRM model
 */

// ─── Constants ──────────────────────────────────────────────────────

const API_BASE = '/api/tiendanube';
const USER_AGENT = 'APES CRM (contact@apesdigital.com)';
const RATE_LIMIT_MS = 500; // 1000 / 2 = 500 ms between requests

// ─── Internal helpers ───────────────────────────────────────────────

/**
 * Sleeps for the given number of milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wraps a successful response.
 * @template T
 * @param {T} data
 * @returns {{ success: true, data: T, error: null }}
 */
function ok(data) {
  return { success: true, data, error: null };
}

/**
 * Wraps a failed response.
 * @param {string} message
 * @param {number|null} [status=null]
 * @returns {{ success: false, data: null, error: { message: string, status: number|null } }}
 */
function fail(message, status = null) {
  return { success: false, data: null, error: { message, status } };
}

// ─── TiendanubeAPI Class ────────────────────────────────────────────

export class TiendanubeAPI {
  /**
   * @param {string|number} storeId     — Tiendanube store ID
   * @param {string}        accessToken — OAuth access token
   */
  constructor(storeId, accessToken) {
    if (!storeId || !accessToken) {
      throw new Error('TiendanubeAPI: storeId and accessToken are required.');
    }

    this.storeId = String(storeId);
    this.accessToken = accessToken;

    /** @private Timestamp of the last request sent (for rate limiting) */
    this._lastRequestAt = 0;
  }

  // ── Private transport ─────────────────────────────────────────────

  /**
   * Builds the default headers every request needs.
   * @returns {HeadersInit}
   */
  _headers() {
    return {
      Authentication: `bearer ${this.accessToken}`,
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Executes a rate-limited fetch and returns the parsed JSON.
   * @param {string}               url
   * @param {RequestInit}          [init={}]
   * @returns {Promise<{ success: boolean, data: any, error: any }>}
   */
  async _request(url, init = {}) {
    // ── Rate limiting ───────────────────────────────────────────────
    const now = Date.now();
    const elapsed = now - this._lastRequestAt;
    if (elapsed < RATE_LIMIT_MS) {
      await sleep(RATE_LIMIT_MS - elapsed);
    }
    this._lastRequestAt = Date.now();

    try {
      const response = await fetch(url, {
        ...init,
        headers: { ...this._headers(), ...(init.headers || {}) },
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        
        // Tiendanube returns 404 when a collection is empty (e.g. 0 customers)
        if (response.status === 404) {
          return ok([]);
        }

        return fail(
          `HTTP ${response.status}: ${response.statusText}. ${errorBody}`.trim(),
          response.status,
        );
      }

      const data = await response.json();
      return ok(data);
    } catch (err) {
      return fail(
        err instanceof Error ? err.message : 'Unknown network error',
      );
    }
  }

  // ── Public methods ────────────────────────────────────────────────

  /**
   * Tests the API connection by fetching the store info endpoint.
   * @returns {Promise<{ success: boolean, data: any, error: any }>}
   */
  async testConnection() {
    const url = `${API_BASE}/${this.storeId}/store`;
    return this._request(url);
  }

  /**
   * Fetches the full customer list from Tiendanube.
   * @returns {Promise<{ success: boolean, data: Array|null, error: any }>}
   */
  async fetchCustomers() {
    const url = `${API_BASE}/${this.storeId}/customers`;
    return this._request(url);
  }

  /**
   * Fetches a single page of orders with optional query params.
   *
   * @param {Record<string, string|number>} [params={}]
   *   e.g. { page: 2, per_page: 50, status: 'closed' }
   * @returns {Promise<{ success: boolean, data: Array|null, error: any }>}
   */
  async fetchOrders(params = {}) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    }
    const qs = query.toString();
    const url = `${API_BASE}/${this.storeId}/orders${qs ? `?${qs}` : ''}`;
    return this._request(url);
  }

  /**
   * Fetches **all** orders by paginating automatically.
   * Stops when an empty page is returned.
   *
   * @param {number} [perPage=50] — items per page (max 200 per TN docs)
   * @returns {Promise<{ success: boolean, data: Array|null, error: any }>}
   */
  async fetchAllOrders(perPage = 50) {
    const allOrders = [];
    let page = 1;

    while (true) {
      const result = await this.fetchOrders({ page, per_page: perPage });

      if (!result.success) {
        // If we already have some data, return what we have with a warning
        if (allOrders.length > 0) {
          return ok(allOrders);
        }
        return result;
      }

      const orders = result.data;

      if (!Array.isArray(orders) || orders.length === 0) {
        break; // No more pages
      }

      allOrders.push(...orders);

      // If the returned page has fewer items than perPage, it's the last page
      if (orders.length < perPage) {
        break;
      }

      page += 1;
    }

    return ok(allOrders);
  }

  /**
   * Fetches a single page of checkouts.
   *
   * @param {Record<string, string|number>} [params={}]
   * @returns {Promise<{ success: boolean, data: Array|null, error: any }>}
   */
  async fetchCheckouts(params = {}) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    }
    const qs = query.toString();
    const url = `${API_BASE}/${this.storeId}/checkouts${qs ? `?${qs}` : ''}`;
    return this._request(url);
  }

  /**
   * Fetches all checkouts by paginating automatically.
   *
   * @param {number} [perPage=50]
   * @returns {Promise<{ success: boolean, data: Array|null, error: any }>}
   */
  async fetchAllCheckouts(perPage = 50) {
    const allCheckouts = [];
    let page = 1;

    while (true) {
      const result = await this.fetchCheckouts({ page, per_page: perPage });

      if (!result.success) {
        if (allCheckouts.length > 0) return ok(allCheckouts);
        return result;
      }

      const checkouts = result.data;
      if (!Array.isArray(checkouts) || checkouts.length === 0) break;

      allCheckouts.push(...checkouts);

      if (checkouts.length < perPage) break;
      page += 1;
    }

    return ok(allCheckouts);
  }

  /**
   * Fetches a single page of products.
   *
   * @param {Record<string, string|number>} [params={}]
   * @returns {Promise<{ success: boolean, data: Array|null, error: any }>}
   */
  async fetchProducts(params = {}) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    }
    const qs = query.toString();
    const url = `${API_BASE}/${this.storeId}/products${qs ? `?${qs}` : ''}`;
    return this._request(url);
  }

  /**
   * Fetches all products by paginating automatically.
   *
   * @param {number} [perPage=50]
   * @returns {Promise<{ success: boolean, data: Array|null, error: any }>}
   */
  async fetchAllProducts(perPage = 200) {
    const allProducts = [];
    let page = 1;

    console.log(`[TiendanubeAPI] fetchAllProducts starting, perPage=${perPage}`);

    while (true) {
      const result = await this.fetchProducts({ page, per_page: perPage });

      if (!result.success) {
        console.warn(`[TiendanubeAPI] fetchProducts page ${page} failed:`, result.error);
        if (allProducts.length > 0) return ok(allProducts);
        return result;
      }

      const products = result.data;
      if (!Array.isArray(products) || products.length === 0) {
        console.log(`[TiendanubeAPI] Page ${page} returned 0 products, stopping.`);
        break;
      }

      console.log(`[TiendanubeAPI] Page ${page}: ${products.length} products fetched (total: ${allProducts.length + products.length})`);
      allProducts.push(...products);

      if (products.length < perPage) {
        console.log(`[TiendanubeAPI] Page ${page} returned ${products.length} < ${perPage}, done.`);
        break;
      }
      page += 1;
    }

    console.log(`[TiendanubeAPI] fetchAllProducts complete: ${allProducts.length} total products`);
    return ok(allProducts);
  }

  /**
   * Alias for fetchAllCheckouts, representing abandoned carts.
   */
  async fetchAbandonedCarts(perPage = 50) {
    return this.fetchAllCheckouts(perPage);
  }

  /**
   * Updates a single product (e.g. stock, name, etc.) via PUT.
   *
   * @param {string|number} productId
   * @param {object}        body — partial product object to merge
   * @returns {Promise<{ success: boolean, data: any, error: any }>}
   */
  async updateProduct(productId, body) {
    const url = `${API_BASE}/${this.storeId}/products/${productId}`;
    return this._request(url, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  /**
   * Updates stock for a specific variant.
   *
   * @param {string|number} productId
   * @param {string|number} variantId
   * @param {number}        newStock
   * @returns {Promise<{ success: boolean, data: any, error: any }>}
   */
  async updateVariantStock(productId, variantId, newStock) {
    const url = `${API_BASE}/${this.storeId}/products/${productId}/variants/${variantId}`;
    return this._request(url, {
      method: 'PUT',
      body: JSON.stringify({ stock: newStock, stock_management: true }),
    });
  }
}

// ─── Data Mapper ────────────────────────────────────────────────────

/**
 * Transforms raw Tiendanube API responses (customers + orders) into
 * the order-based format expected by `unifyClients()`.
 *
 * The output matches the shape of `mockTiendanubeOrders`:
 * ```
 * {
 *   id, number, state, currency, created_at,
 *   customer: { id, name, email, phone, identification },
 *   total: '45000.00',
 *   products: [{ name, price, quantity }]
 * }
 * ```
 *
 * @param {Array<object>} customers — raw GET /customers response
 * @param {Array<object>} orders    — raw GET /orders response (all pages)
 * @returns {Array<object>}
 */
export function mapTiendanubeDataToUnified(customers = [], orders = []) {
  // Build a quick lookup of customer data by ID so we can enrich orders
  // that might come back with a minimal customer stub.
  /** @type {Map<number|string, object>} */
  const customerMap = new Map();
  for (const c of customers) {
    if (c.id) {
      customerMap.set(c.id, c);
    }
  }

  return orders.map((order) => {
    // Merge order.customer with the full customer record if available
    const orderCustomer = order.customer || {};
    const fullCustomer = customerMap.get(orderCustomer.id) || {};

    // Tiendanube nests identification inside an object for some stores
    const identification =
      orderCustomer.identification ||
      fullCustomer.identification ||
      fullCustomer.dni ||
      '';

    const identificationValue =
      typeof identification === 'object'
        ? identification.number || identification.value || ''
        : String(identification);

    // Extract products from order line items
    const products = (order.products || []).map((p) => ({
      name: p.name || p.product?.name || 'Producto',
      price: String(p.price || p.unit_price || '0'),
      quantity: p.quantity || 1,
    }));

    return {
      id: order.id,
      number: order.number || order.id,
      state: order.status || order.state || 'open',
      payment_status: order.payment_status || 'pending',
      coupon: order.coupon || order.discount_coupon || [],
      contact_name: order.contact_name,
      contact_email: order.contact_email,
      contact_phone: order.contact_phone,
      billing_name: order.billing_name,
      billing_phone: order.billing_phone,
      billing_identification: order.billing_identification || identificationValue,
      customer: {
        id: orderCustomer.id || fullCustomer.id || null,
        name: orderCustomer.name || fullCustomer.name || 'Sin nombre',
        email:
          orderCustomer.email || fullCustomer.email || '',
        phone:
          orderCustomer.phone || fullCustomer.phone || '',
        identification: identificationValue,
      },
      total:
        typeof order.total === 'number'
          ? order.total.toFixed(2)
          : String(order.total || '0.00'),
      subtotal: order.subtotal,
      discount: order.discount,
      discount_coupon: order.discount_coupon,
      discount_gateway: order.discount_gateway,
      promotional_discount: order.promotional_discount,
      currency: order.currency || 'ARS',
      created_at: order.created_at || new Date().toISOString(),
      shipping_address: order.shipping_address || null,
      billing_address: order.billing_address || null,
      products,
    };
  });
}
