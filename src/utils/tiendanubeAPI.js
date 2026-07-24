"use strict";

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

const API_BASE = '/api/tn-proxy';
const USER_AGENT = 'APES CRM (contact@apesdigital.com)';
const RATE_LIMIT_MS = 500; // 1000 / 2 = 500 ms between requests

// ─── Internal helpers ───────────────────────────────────────────────

/**
 * Sleeps for the given number of milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(function(resolve) {
    setTimeout(resolve, ms);
  });
}

/**
 * Wraps a successful response.
 * @template T
 * @param {T} data
 * @returns {{ success: true, data: T, error: null }}
 */
function ok(data) {
  return { success: true, data: data, error: null };
}

/**
 * Wraps a failed response.
 * @param {string} message
 * @param {number|null} [status=null]
 * @returns {{ success: false, data: null, error: { message: string, status: number|null } }}
 */
function fail(message, status) {
  if (status === undefined) status = null;
  return { success: false, data: null, error: { message: message, status: status } };
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

    this._lastRequestAt = 0;
  }

  // ── Private transport ─────────────────────────────────────────────

  /**
   * Builds the default headers every request needs.
   * @returns {HeadersInit}
   */
  _headers() {
    return {
      Authentication: 'bearer ' + this.accessToken,
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
  async _request(url, init) {
    if (init === undefined) init = {};
    var now = Date.now();
    var elapsed = now - this._lastRequestAt;
    if (elapsed < RATE_LIMIT_MS) {
      await sleep(RATE_LIMIT_MS - elapsed);
    }
    this._lastRequestAt = Date.now();

    var proxyUrl = url;

    try {
      var response = await fetch(proxyUrl, {
        ...init,
        headers: Object.assign({}, this._headers(), init.headers || {}),
      });

      if (!response.ok) {
        var errorBody = await response.text().catch(function() {
          return '';
        });

        if (response.status === 404) {
          var url = response.url || '';
          if (url.includes('tiendanube.com') || url.includes('/v1/')) {
            return ok([]);
          }
          return fail('API proxy error (404): ' + url, 404);
        }

        return fail(
          'HTTP ' + response.status + ': ' + response.statusText + '. ' + errorBody.trim(),
          response.status
        );
      }

      var data = await response.json();
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
    var url = API_BASE + '/' + this.storeId + '/store';
    return this._request(url);
  }

  /**
   * Fetches the full customer list from Tiendanube.
   * @returns {Promise<{ success: boolean, data: Array|null, error: any }>}
   */
  async fetchCustomers() {
    var url = API_BASE + '/' + this.storeId + '/customers';
    return this._request(url);
  }

  /**
   * Fetches a single page of orders with optional query params.
   *
   * @param {Record<string, string|number>} [params={}]
   *   e.g. { page: 2, per_page: 50, status: 'closed' }
   * @returns {Promise<{ success: boolean, data: Array|null, error: any }>}
   */
  async fetchOrders(params) {
    if (params === undefined) params = {};
    var query = new URLSearchParams();
    for (var key in params) {
      if (Object.prototype.hasOwnProperty.call(params, key)) {
        var value = params[key];
        if (value !== undefined && value !== null) {
          query.set(key, String(value));
        }
      }
    }
    var qs = query.toString();
    var url = API_BASE + '/' + this.storeId + '/orders' + (qs ? '?' + qs : '');
    return this._request(url);
  }

  /**
   * Fetches **all** orders by paginating automatically.
   * Stops when an empty page is returned.
   *
   * @param {number} [perPage=50] — items per page (max 200 per TN docs)
   * @returns {Promise<{ success: boolean, data: Array|null, error: any }>}
   */
  async fetchAllOrders(perPage) {
    if (perPage === undefined) perPage = 50;
    var allOrders = [];
    var page = 1;

    while (true) {
      var result = await this.fetchOrders({ page: page, per_page: perPage });

      if (!result.success) {
        if (allOrders.length > 0) return ok(allOrders);
        return result;
      }

      var orders = result.data;

      if (!Array.isArray(orders) || orders.length === 0) {
        break;
      }

      allOrders.push(...orders);

      if (orders.length < perPage) {
        break;
      }
      page++;
    }

    return ok(allOrders);
  }

  /**
   * Fetches a single page of checkouts.
   *
   * @param {Record<string, string|number>} [params={}]
   * @returns {Promise<{ success: boolean, data: Array|null, error: any }>}
   */
  async fetchCheckouts(params) {
    if (params === undefined) params = {};
    var query = new URLSearchParams();
    for (var key in params) {
      if (Object.prototype.hasOwnProperty.call(params, key)) {
        var value = params[key];
        if (value !== undefined && value !== null) {
          query.set(key, String(value));
        }
      }
    }
    var qs = query.toString();
    var url = API_BASE + '/' + this.storeId + '/checkouts' + (qs ? '?' + qs : '');
    return this._request(url);
  }

  /**
   * Fetches all checkouts by paginating automatically.
   *
   * @param {number} [perPage=50]
   * @returns {Promise<{ success: boolean, data: Array|null, error: any }>}
   */
  async fetchAllCheckouts(perPage) {
    if (perPage === undefined) perPage = 50;
    var allCheckouts = [];
    var page = 1;

    while (true) {
      var result = await this.fetchCheckouts({ page: page, per_page: perPage });

      if (!result.success) {
        if (allCheckouts.length > 0) return ok(allCheckouts);
        return result;
      }

      var checkouts = result.data;
      if (!Array.isArray(checkouts) || checkouts.length === 0) break;

      allCheckouts.push(...checkouts);

      if (checkouts.length < perPage) break;
      page++;
    }

    return ok(allCheckouts);
  }

  /**
   * Fetches a single page of products.
   *
   * @param {Record<string, string|number>} [params={}]
   * @returns {Promise<{ success: boolean, data: Array|null, error: any }>}
   */
  async fetchProducts(params) {
    if (params === undefined) params = {};
    var query = new URLSearchParams();
    for (var key in params) {
      if (Object.prototype.hasOwnProperty.call(params, key)) {
        var value = params[key];
        if (value !== undefined && value !== null) {
          query.set(key, String(value));
        }
      }
    }
    var qs = query.toString();
    var url = API_BASE + '/' + this.storeId + '/products' + (qs ? '?' + qs : '');
    return this._request(url);
  }

  /**
   * Fetches all products by paginating automatically.
   *
   * @param {number} [perPage=50]
   * @returns {Promise<{ success: boolean, data: Array|null, error: any }>}
   */
  async fetchAllProducts(perPage) {
    if (perPage === undefined) perPage = 200;
    var allProducts = [];
    var page = 1;

    console.log('[TiendanubeAPI] fetchAllProducts starting, perPage=' + perPage);

    while (true) {
      var result = await this.fetchProducts({ page: page, per_page: perPage });

      if (!result.success) {
        console.warn('[TiendanubeAPI] fetchProducts page ' + page + ' failed:', result.error);
        if (allProducts.length > 0) return ok(allProducts);
        return result;
      }

      var products = result.data;
      if (!Array.isArray(products) || products.length === 0) {
        console.log('[TiendanubeAPI] Page ' + page + ' returned 0 products, stopping.');
        break;
      }

      console.log('[TiendanubeAPI] Page ' + page + ': ' + products.length + ' products fetched (total: ' + (allProducts.length + products.length) + ')');
      allProducts.push(...products);

      if (products.length < perPage) {
        console.log('[TiendanubeAPI] Page ' + page + ' returned ' + products.length + ' < ' + perPage + ', done.');
        break;
      }
      page++;
    }

    console.log('[TiendanubeAPI] fetchAllProducts complete: ' + allProducts.length + ' total products');
    return ok(allProducts);
  }

  /**
   * Alias for fetchAllCheckouts, representing abandoned carts.
   */
  async fetchAbandonedCarts(perPage) {
    if (perPage === undefined) perPage = 50;
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
    var url = API_BASE + '/' + this.storeId + '/products/' + productId;
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
    var url = API_BASE + '/' + this.storeId + '/products/' + productId + '/variants/' + variantId;
    return this._request(url, {
      method: 'PUT',
      body: JSON.stringify({ stock: newStock, stock_management: true }),
    });
  }

  /**
   * Registers a webhook endpoint for real-time stock updates.
   * This allows the Tiendanube platform to push stock change events directly.
   *
   * @returns {Promise<{ success: boolean, data: any, error: any }>}
   */
  async registerWebhook() {
    var url = API_BASE + '/' + this.storeId + '/webhooks';
    return this._request(url, {
      method: 'POST',
      body: JSON.stringify({
        url: window.location.origin + '/api/tn-proxy/webhooks/tn-sync',
        events: ['product.stock.updated', 'stock.changed'],
        secret: (typeof process !== 'undefined' && process.env && process.env.WEBHOOK_SECRET) || 'default-secret-2026',
      }),
    });
  }

  /**
   * Processes webhook events from Tiendanube.
   * This is called from the server proxy when Tiendanube sends stock updates.
   *
   * @param {object} event - Webhook payload from Tiendanube
   * @returns {Promise<{ success: boolean, data: any, error: any }>}
   */
  async processWebhookEvent(event) {
    try {
      var product_id = event.product_id;
      var variant_id = event.variant_id;
      var new_stock = event.new_stock;
      var old_stock = event.old_stock;
      var timestamp = event.timestamp;
      var event_type = event.event_type;

      if (!product_id || !variant_id || new_stock === undefined) {
        return fail('Invalid webhook payload: missing required fields');
      }

      console.log('[Webhook] Processing ' + event_type + ' event for variant ' + variant_id + ': ' + old_stock + ' → ' + new_stock);

      await this._updateLocalStockCache(variant_id, new_stock, event);

      await this._broadcastStockUpdate({
        variantId: variant_id,
        productId: product_id,
        newStock: new_stock,
        oldStock: old_stock,
        timestamp: timestamp || Date.now(),
        eventType: event_type,
        storeId: this.storeId,
      });

      return ok({ processed: true, variantId: variant_id });

    } catch (err) {
      console.error('[Webhook] Error processing event:', err);
      return fail(err instanceof Error ? err.message : 'Failed to process webhook event');
    }
  }

  /**
   * Internal: Updates local stock cache with new stock level.
   * This maintains consistency between the API and local state.
   *
   * @private
   * @param {string|number} variantId
   * @param {number} newStock
   * @param {object} event
   */
  async _updateLocalStockCache(variantId, newStock, event) {
    console.log('[Cache] Updating stock for variant ' + variantId + ' to ' + newStock);

    var cacheEvent = new CustomEvent('stockUpdated', {
      detail: {
        variantId: variantId,
        newStock: newStock,
        source: 'webhook',
        event: event,
        timestamp: Date.now(),
      }
    });
    window.dispatchEvent(cacheEvent);
  }

  /**
   * Internal: Broadcasts stock updates to connected clients.
   * Uses WebSocket or Supabase channels for real-time updates.
   *
   * @private
   * @param {object} updateData
   */
  async _broadcastStockUpdate(updateData) {
    try {
      var supabase = window.supabase;
      if (supabase) {
        supabase
          .channel('stock_updates_' + this.storeId)
          .send({
            type: 'broadcast',
            event: 'stock_updated',
            payload: updateData,
          });
      }

      console.log('[Broadcast] Stock update sent: variant ' + updateData.variantId + ' → ' + updateData.newStock);

    } catch (err) {
      console.error('[Broadcast] Failed to send stock update:', err);
    }
  }

  /**
   * Health check for webhook endpoint.
   * Verifies that the webhook endpoint is responding correctly.
   *
   * @returns {Promise<{ success: boolean, data: any, error: any }>}
   */
  async healthCheck() {
    var url = API_BASE + '/' + this.storeId + '/webhooks/health';
    return this._request(url);
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
export function mapTiendanubeDataToUnified(customers, orders) {
  var customerMap = new Map();
  for (var c of customers) {
    if (c.id) {
      customerMap.set(c.id, c);
    }
  }

  return orders.map(function(order) {
    var orderCustomer = order.customer || {};
    var fullCustomer = customerMap.get(orderCustomer.id) || {};

    var identification =
      orderCustomer.identification ||
      fullCustomer.identification ||
      fullCustomer.dni ||
      '';

    var identificationValue =
      typeof identification === 'object'
        ? identification.number || identification.value || ''
        : String(identification);

    var products = (order.products || []).map(function(p) {
      return {
        name: p.name || p.product?.name || 'Producto',
        price: String(p.price || p.unit_price || '0'),
        quantity: p.quantity || 1,
      };
    });

    var fulfillmentStatus = order.fulfillment_status || 'pending';
    var shippingLines = order.shipping_lines || [];
    var primaryShipping = shippingLines[0] || {};
    var trackingNumber = primaryShipping.tracking_number || null;
    var trackingUrl = primaryShipping.tracking_url || null;
    var carrier = primaryShipping.carrier || primaryShipping.service || null;
    var shippingStatus = primaryShipping.status || fulfillmentStatus;

    return {
      id: order.id,
      number: order.number || order.id,
      state: order.status || order.state || 'open',
      payment_status: order.payment_status || 'pending',
      fulfillment_status: fulfillmentStatus,
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
      currency: order.currency || 'COP',
      created_at: order.created_at || new Date().toISOString(),
      shipping_address: order.shipping_address || null,
      billing_address: order.billing_address || null,
      products,
      fulfillment_status: fulfillmentStatus,
      shipping_lines: shippingLines,
      tracking_number: trackingNumber,
      tracking_url: trackingUrl,
      carrier: carrier,
      shipping_status: shippingStatus,
    };
  });
}
