import { SignJWT, importPKCS8 } from 'jose';

function cleanPem(rawKey) {
  if (!rawKey) return '';
  let key = rawKey
    .replace(/\\n/g, '\n')
    .replace(/\\r\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
  return key;
}

export class MerchantCenterAPI {
  constructor(credentialsJson, merchantId) {
    this.credentialsRaw = credentialsJson;
    this.merchantId = merchantId ? String(merchantId).trim() : '';
    this.serviceAccount = null;
    this.accessToken = null;
    this.tokenExpiry = 0;

    try {
      this.serviceAccount = typeof credentialsJson === 'string' ? JSON.parse(credentialsJson) : credentialsJson;
      console.log('[MC API] Service account loaded:', this.serviceAccount?.client_email ? 'OK' : 'MISSING client_email', 'has key:', !!this.serviceAccount?.private_key);
    } catch (e) {
      console.error('Error parsing Merchant Center Service Account JSON:', e);
    }
  }

  async getAccessToken() {
    if (this.accessToken && Date.now() < this.tokenExpiry - 60000) {
      return this.accessToken;
    }

    if (!this.serviceAccount || !this.serviceAccount.private_key) {
      throw new Error('Invalid Service Account JSON - missing private_key');
    }

    try {
      const cleanedKey = cleanPem(this.serviceAccount.private_key);
      console.log('[MC API] Key starts with:', cleanedKey.substring(0, 30), '...');
      const privateKey = await importPKCS8(cleanedKey, 'RS256');

      const jwt = await new SignJWT({
        iss: this.serviceAccount.client_email,
        scope: 'https://www.googleapis.com/auth/content',
        aud: 'https://oauth2.googleapis.com/token',
      })
        .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(privateKey);

      const tokenRes = await fetch('/gapi-oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt,
        }),
      });

      if (!tokenRes.ok) {
        const detail = await tokenRes.text();
        throw new Error(`Google token exchange failed: ${detail}`);
      }

      const data = await tokenRes.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
      console.log('[MC API] Access token obtained OK');
      return this.accessToken;
    } catch (error) {
      console.error('Error getting Merchant Center access token:', error);
      throw error;
    }
  }

  async testConnection() {
    try {
      if (!this.merchantId) throw new Error('Missing Merchant ID');
      await this.getAccessToken();

      const res = await fetch(
        `/gapi-content/content/v2.1/${this.merchantId}/accounts`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` },
        }
      );

      if (!res.ok) {
        const detail = await res.text();
        return { success: false, error: { message: `MC test failed: ${detail}` } };
      }

      return { success: true };
    } catch (e) {
      return { success: false, error: { message: e.message } };
    }
  }

  async listProducts(options = {}) {
    const {
      pageSize = 250,
      pageToken = null,
      feedId = null,
      includeInvalid = false,
    } = options;

    await this.getAccessToken();

    const params = new URLSearchParams({
      pageSize: String(pageSize),
    });

    if (pageToken) params.set('pageToken', pageToken);
    if (feedId) params.set('feedId', String(feedId));
    if (includeInvalid) params.set('includeInvalidInsertedItems', 'true');

    const url = `/gapi-content/content/v2.1/${this.merchantId}/products?${params}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error('[MC API] listProducts failed:', res.status, detail);
      throw new Error(`MC listProducts failed: ${detail}`);
    }

    const data = await res.json();
    console.log('[MC API] listProducts OK:', data.resources?.length || 0, 'products');
    return data;
  }

  async fetchAllProducts(options = {}) {
    const allProducts = [];
    let pageToken = null;
    let page = 1;

    while (true) {
      const result = await this.listProducts({ ...options, pageToken, pageSize: 250 });
      const products = result.resources || [];
      
      if (!Array.isArray(products) || products.length === 0) break;

      allProducts.push(...products);

      if (products.length < 250) break;
      pageToken = result.nextPageToken;
      if (!pageToken) break;
      page++;
    }

    return { products: allProducts, totalCount: allProducts.length };
  }

  async getProductPerformance(options = {}) {
    const {
      startDate = '30daysAgo',
      endDate = 'today',
      metrics = ['clicks', 'impressions', 'ctr', 'cost', 'conversions', 'conversionValue'],
      dimensions = ['offerId', 'title', 'brand', 'category', 'condition', 'availability'],
      pageSize = 1000,
    } = options;

    await this.getAccessToken();

    const url = `/gapi-content/content/v2.1/${this.merchantId}/reports:run`;

    const reportRequest = {
      reportType: 'PRODUCT_PERFORMANCE',
      dateRange: { startDate, endDate },
      metrics,
      dimensions,
      pageSize,
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reportRequest),
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`MC getProductPerformance failed: ${detail}`);
    }

    return res.json();
  }

  async listFeeds() {
    await this.getAccessToken();

    const res = await fetch(
      `/gapi-content/content/v2.1/${this.merchantId}/datafeeds`,
      { headers: { Authorization: `Bearer ${this.accessToken}` } }
    );

    if (!res.ok) {
      const detail = await res.text();
      console.error('[MC API] listFeeds failed:', res.status, detail);
      throw new Error(`MC listFeeds failed: ${detail}`);
    }

    const data = await res.json();
    console.log('[MC API] listFeeds OK:', data.resources?.length || 0, 'feeds');
    return data;
  }

  async getFeedStatus(feedId) {
    await this.getAccessToken();

    const res = await fetch(
      `/gapi-content/content/v2.1/${this.merchantId}/datafeeds/${feedId}/fetchStatus`,
      { headers: { Authorization: `Bearer ${this.accessToken}` } }
    );

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`MC getFeedStatus failed: ${detail}`);
    }

    return res.json();
  }

  async triggerFeedFetch(feedId) {
    await this.getAccessToken();

    const res = await fetch(
      `/gapi-content/content/v2.1/${this.merchantId}/datafeeds/${feedId}/fetchNow`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.accessToken}` },
      }
    );

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`MC triggerFeedFetch failed: ${detail}`);
    }

    return res.json();
  }

  async getAccountInfo() {
    await this.getAccessToken();

    const res = await fetch(
      `/gapi-content/content/v2.1/${this.merchantId}/accounts/${this.merchantId}`,
      { headers: { Authorization: `Bearer ${this.accessToken}` } }
    );

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`MC getAccountInfo failed: ${detail}`);
    }

    return res.json();
  }

  static normalizeProducts(products = []) {
    return products.map(p => ({
      id: p.id,
      offerId: p.offerId,
      title: p.title,
      description: p.description,
      link: p.link,
      imageLink: p.imageLink,
      additionalImageLinks: p.additionalImageLinks || [],
      availability: p.availability,
      condition: p.condition,
      price: p.price,
      salePrice: p.salePrice,
      brand: p.brand,
      gtin: p.gtin,
      mpn: p.mpn,
      googleProductCategory: p.googleProductCategory,
      productType: p.productType,
      customLabel0: p.customLabel0,
      customLabel1: p.customLabel1,
      customLabel2: p.customLabel2,
      customLabel3: p.customLabel3,
      customLabel4: p.customLabel4,
      shipping: p.shipping,
      shippingWeight: p.shippingWeight,
      shippingLength: p.shippingLength,
      shippingWidth: p.shippingWidth,
      shippingHeight: p.shippingHeight,
      itemGroupId: p.itemGroupId,
      color: p.color,
      size: p.size,
      gender: p.gender,
      ageGroup: p.ageGroup,
      pattern: p.pattern,
      material: p.material,
      sizeSystem: p.sizeSystem,
      sizeType: p.sizeType,
    }));
  }
}

export function mapMerchantCenterToUnified(products = []) {
  return products.map(p => ({
    id: p.id || p.offerId,
    productId: p.offerId,
    title: p.title,
    price: p.price ? parseFloat(p.price.value) : 0,
    currency: p.price?.currency || 'COP',
    salePrice: p.salePrice ? parseFloat(p.salePrice.value) : null,
    availability: p.availability,
    condition: p.condition,
    brand: p.brand,
    category: p.googleProductCategory || p.productType,
    productType: p.productType,
    imageLink: p.imageLink,
    link: p.link,
    gtin: p.gtin,
    mpn: p.mpn,
    customLabels: {
      label0: p.customLabel0,
      label1: p.customLabel1,
      label2: p.customLabel2,
      label3: p.customLabel3,
      label4: p.customLabel4,
    },
  }));
}