import { SignJWT, importPKCS8 } from 'jose';

function cleanPem(rawKey) {
  if (!rawKey) return '';
  let key = String(rawKey)
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
  if (!key.startsWith('-----BEGIN')) {
    console.warn('[GA4 cleanPem] Key does not start with -----BEGIN');
  }
  return key;
}

export class GA4API {
  constructor(credentialsJson, propertyId) {
    this.credentialsRaw = credentialsJson;
    this.propertyId = propertyId ? String(propertyId).trim() : '';
    this.serviceAccount = null;
    this.accessToken = null;

    try {
      if (typeof credentialsJson === 'string') {
        this.serviceAccount = JSON.parse(credentialsJson);
      } else if (credentialsJson && typeof credentialsJson === 'object') {
        this.serviceAccount = credentialsJson;
      }
    } catch (e) {
      console.error('[GA4 API] JSON parse error:', e.message);
    }
  }

  get isConfigured() {
    return !!(this.serviceAccount?.private_key && this.serviceAccount?.client_email && this.propertyId);
  }

  async getAccessToken() {
    if (!this.serviceAccount?.private_key) {
      throw new Error('Service Account JSON inválido o vacío. Configura las credenciales de GA4 en Ajustes.');
    }
    if (!this.serviceAccount?.client_email) {
      throw new Error('Service Account JSON no contiene client_email.');
    }

    const cleanedKey = cleanPem(this.serviceAccount.private_key);
    if (!cleanedKey.includes('BEGIN') || !cleanedKey.includes('KEY')) {
      throw new Error('La clave privada parece estar corrupta o truncada.');
    }

    const privateKey = await importPKCS8(cleanedKey, 'RS256');

    const jwt = await new SignJWT({
      iss: this.serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/analytics.readonly',
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

    const tokenBody = await tokenRes.text();

    if (!tokenRes.ok) {
      let parsed;
      try { parsed = JSON.parse(tokenBody); } catch { parsed = {}; }
      if (parsed.error === 'invalid_grant') {
        throw new Error('Firma JWT inválida. Verifica que el Service Account JSON sea correcto y que el email sea válido.');
      }
      throw new Error(`Token exchange falló: ${parsed.error_description || tokenBody}`);
    }

    const data = JSON.parse(tokenBody);
    this.accessToken = data.access_token;
    return this.accessToken;
  }

  async testConnection() {
    if (!this.propertyId) return { success: false, error: { message: 'Falta el Property ID de GA4.' } };
    if (!this.isConfigured) return { success: false, error: { message: 'Credenciales de GA4 no configuradas.' } };
    try {
      await this.getAccessToken();
      await this._runReport({
        dateRanges: [{ startDate: 'today', endDate: 'today' }],
        metrics: [{ name: 'activeUsers' }]
      });
      return { success: true };
    } catch (e) {
      return { success: false, error: { message: e.message } };
    }
  }

  async _runReport(requestBody) {
    if (!this.accessToken) {
      await this.getAccessToken();
    }

    const url = `/gapi-analytics/v1beta/properties/${this.propertyId}:runReport`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`GA4 runReport falló (${res.status}): ${detail}`);
    }

    return await res.json();
  }

  async getInsights(startDate, endDate) {
    try {
      const accessToken = await this.getAccessToken();
      const url = `/gapi-analytics/v1beta/properties/${this.propertyId}:batchRunReports`;

      const from = startDate || '30daysAgo';
      const to = endDate || 'today';

      const requestBody = {
        requests: [
          // 1. Global Metrics
          {
            dateRanges: [{ startDate: from, endDate: to }],
            metrics: [
              { name: 'sessions' },
              { name: 'activeUsers' },
              { name: 'bounceRate' },
              { name: 'averageSessionDuration' }
            ]
          },
          // 2. Acquisition
          {
            dateRanges: [{ startDate: from, endDate: to }],
            dimensions: [{ name: 'sessionDefaultChannelGroup' }],
            metrics: [{ name: 'sessions' }, { name: 'activeUsers' }]
          },
          // 3. Top Events
          {
            dateRanges: [{ startDate: from, endDate: to }],
            dimensions: [{ name: 'eventName' }],
            metrics: [{ name: 'eventCount' }],
            orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
            limit: 10
          },
          // 4. E-commerce: revenue by date
          {
            dateRanges: [{ startDate: from, endDate: to }],
            dimensions: [{ name: 'date' }],
            metrics: [
              { name: 'grossPurchaseRevenue' },
              { name: 'ecommercePurchases' },
              { name: 'purchaseRevenue' }
            ]
          },
          // 5. E-commerce: top products
          {
            dateRanges: [{ startDate: from, endDate: to }],
            dimensions: [{ name: 'itemName' }],
            metrics: [
              { name: 'itemRevenue' },
              { name: 'itemsPurchased' }
            ],
            orderBys: [{ metric: { metricName: 'itemRevenue' }, desc: true }],
            limit: 20
          }
        ]
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!res.ok) {
        const detail = await res.text();
        throw new Error(`GA4 API Error (${res.status}): ${detail}`);
      }

      const data = await res.json();
      const reports = data.reports || [];

      // Parse Global (report 0)
      let global = { sessions: 0, activeUsers: 0, bounceRate: 0, averageSessionDuration: 0 };
      const globalReport = reports[0];
      if (globalReport?.rows?.length > 0) {
        const m = globalReport.rows[0].metricValues;
        global = {
          sessions: parseInt(m[0]?.value || '0', 10),
          activeUsers: parseInt(m[1]?.value || '0', 10),
          bounceRate: parseFloat(m[2]?.value || '0'),
          averageSessionDuration: parseFloat(m[3]?.value || '0')
        };
      }

      // Parse Acquisition (report 1)
      let acquisition = [];
      const acqReport = reports[1];
      if (acqReport?.rows) {
        acquisition = acqReport.rows.map(r => ({
          channel: r.dimensionValues[0].value,
          sessions: parseInt(r.metricValues[0]?.value || '0', 10),
          activeUsers: parseInt(r.metricValues[1]?.value || '0', 10)
        }));
      }

      // Parse Events (report 2)
      let events = [];
      const eventReport = reports[2];
      if (eventReport?.rows) {
        events = eventReport.rows.map(r => ({
          eventName: r.dimensionValues[0].value,
          eventCount: parseInt(r.metricValues[0]?.value || '0', 10)
        }));
      }

      // Parse E-commerce Revenue by Date (report 3)
      let revenueByDate = [];
      const revReport = reports[3];
      if (revReport?.rows) {
        revenueByDate = revReport.rows.map(r => ({
          date: r.dimensionValues[0].value,
          grossRevenue: parseFloat(r.metricValues[0]?.value || '0'),
          purchases: parseInt(r.metricValues[1]?.value || '0', 10),
          netRevenue: parseFloat(r.metricValues[2]?.value || '0')
        }));
      }

      // Parse Top Products (report 4)
      let topProducts = [];
      const prodReport = reports[4];
      if (prodReport?.rows) {
        topProducts = prodReport.rows.map(r => ({
          name: r.dimensionValues[0].value,
          revenue: parseFloat(r.metricValues[0]?.value || '0'),
          purchases: parseInt(r.metricValues[1]?.value || '0', 10)
        }));
      }

      // Calculate totals
      const totalRevenue = revenueByDate.reduce((s, r) => s + r.grossRevenue, 0);
      const totalPurchases = revenueByDate.reduce((s, r) => s + r.purchases, 0);

      return {
        global,
        acquisition,
        events,
        ecommerce: {
          totalRevenue,
          totalPurchases,
          averageOrderValue: totalPurchases > 0 ? totalRevenue / totalPurchases : 0,
          revenueByDate,
          topProducts
        }
      };
    } catch (error) {
      console.error('[GA4] Error fetching insights:', error);
      return null;
    }
  }
}
