import { SignJWT, importPKCS8 } from 'jose';

const SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly'];
const SEARCH_CONSOLE_URL = '/gapi-webmasters/webmasters/v3';

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

export class SearchConsoleAPI {
  constructor(siteUrl, credentialsJson) {
    if (!siteUrl || !credentialsJson) {
      throw new Error('SearchConsoleAPI: siteUrl and credentialsJson are required');
    }
    this.siteUrl = siteUrl;
    this.credentials = typeof credentialsJson === 'string' ? JSON.parse(credentialsJson) : credentialsJson;
    this.accessToken = null;
    this.tokenExpiry = 0;
  }

  async getAccessToken() {
    const now = Date.now();
    if (this.accessToken && now < this.tokenExpiry - 60000) {
      return this.accessToken;
    }

    if (!this.credentials || !this.credentials.private_key) {
      throw new Error('Invalid Service Account JSON');
    }

    try {
      const privateKey = await importPKCS8(cleanPem(this.credentials.private_key), 'RS256');

      const jwt = await new SignJWT({
        iss: this.credentials.client_email,
        scope: SCOPES.join(' '),
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
        throw new Error(`Search Console token exchange failed: ${detail}`);
      }

      const data = await tokenRes.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = now + (data.expires_in || 3600) * 1000;
      return this.accessToken;
    } catch (error) {
      console.error('Error getting Search Console access token:', error);
      throw error;
    }
  }

  async testConnection() {
    try {
      await this.getAccessToken();
      const res = await fetch(`${SEARCH_CONSOLE_URL}/sites/${encodeURIComponent(this.siteUrl)}`, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });

      if (!res.ok) {
        const detail = await res.text();
        return { success: false, error: { message: `GSC test failed: ${detail}` } };
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: { message: e.message } };
    }
  }

  async querySearchAnalytics(options = {}) {
    const {
      startDate = '30daysAgo',
      endDate = 'today',
      dimensions = ['query', 'page'],
      dimensionFilterGroups = [],
      rowLimit = 1000,
      startRow = 0,
      aggregationType = 'auto',
    } = options;

    await this.getAccessToken();

    const requestBody = {
      startDate: this.formatDate(startDate),
      endDate: this.formatDate(endDate),
      dimensions,
      dimensionFilterGroups,
      rowLimit,
      startRow,
      aggregationType,
    };

    const res = await fetch(
      `${SEARCH_CONSOLE_URL}/sites/${encodeURIComponent(this.siteUrl)}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`GSC query failed: ${detail}`);
    }

    return res.json();
  }

  formatDate(dateStr) {
    if (dateStr === 'today') return new Date().toISOString().split('T')[0];
    if (dateStr.endsWith('daysAgo')) {
      const days = parseInt(dateStr.replace('daysAgo', ''));
      const d = new Date();
      d.setDate(d.getDate() - days);
      return d.toISOString().split('T')[0];
    }
    return dateStr;
  }

  async getTopQueries(options = {}) {
    const result = await this.querySearchAnalytics({
      ...options,
      dimensions: ['query'],
      rowLimit: options.rowLimit || 100,
    });

    return (result.rows || []).map(row => ({
      query: row.keys[0],
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0,
    }));
  }

  async getTopPages(options = {}) {
    const result = await this.querySearchAnalytics({
      ...options,
      dimensions: ['page'],
      rowLimit: options.rowLimit || 100,
    });

    return (result.rows || []).map(row => ({
      page: row.keys[0],
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0,
    }));
  }

  async getQueriesByPage(pageUrl, options = {}) {
    const result = await this.querySearchAnalytics({
      ...options,
      dimensions: ['query'],
      dimensionFilterGroups: [{
        filters: [{
          dimension: 'page',
          operator: 'equals',
          expression: pageUrl,
        }],
      }],
      rowLimit: options.rowLimit || 100,
    });

    return (result.rows || []).map(row => ({
      query: row.keys[0],
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0,
    }));
  }

  async getPerformanceByDate(options = {}) {
    const result = await this.querySearchAnalytics({
      ...options,
      dimensions: ['date'],
      rowLimit: 1000,
    });

    return (result.rows || []).map(row => ({
      date: row.keys[0],
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0,
    }));
  }

  async getDeviceBreakdown(options = {}) {
    const result = await this.querySearchAnalytics({
      ...options,
      dimensions: ['device'],
      rowLimit: 10,
    });

    return (result.rows || []).map(row => ({
      device: row.keys[0],
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0,
    }));
  }

  async getCountryBreakdown(options = {}) {
    const result = await this.querySearchAnalytics({
      ...options,
      dimensions: ['country'],
      rowLimit: 50,
    });

    return (result.rows || []).map(row => ({
      country: row.keys[0],
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0,
    }));
  }

  async listSites() {
    await this.getAccessToken();

    const res = await fetch(`${SEARCH_CONSOLE_URL}/sites`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`GSC listSites failed: ${detail}`);
    }

    return res.json();
  }

  static getEmptyState() {
    return {
      topQueries: [],
      topPages: [],
      performanceByDate: [],
      deviceBreakdown: [],
      countryBreakdown: [],
      totals: { clicks: 0, impressions: 0, ctr: 0, position: 0 },
    };
  }
}

export async function fetchSearchConsoleInsights(siteUrl, credentialsJson, dateRange) {
  try {
    const api = new SearchConsoleAPI(siteUrl, credentialsJson);
    const test = await api.testConnection();
    if (!test.success) return { success: false, error: test.error };

    const [topQueries, topPages, performanceByDate, deviceBreakdown, countryBreakdown] = await Promise.all([
      api.getTopQueries({ startDate: dateRange.startDate, endDate: dateRange.endDate, rowLimit: 50 }),
      api.getTopPages({ startDate: dateRange.startDate, endDate: dateRange.endDate, rowLimit: 50 }),
      api.getPerformanceByDate({ startDate: dateRange.startDate, endDate: dateRange.endDate }),
      api.getDeviceBreakdown({ startDate: dateRange.startDate, endDate: dateRange.endDate }),
      api.getCountryBreakdown({ startDate: dateRange.startDate, endDate: dateRange.endDate }),
    ]);

    const totals = topQueries.reduce(
      (acc, q) => ({
        clicks: acc.clicks + q.clicks,
        impressions: acc.impressions + q.impressions,
        ctr: 0,
        position: 0,
      }),
      { clicks: 0, impressions: 0, ctr: 0, position: 0 }
    );
    if (totals.impressions > 0) totals.ctr = totals.clicks / totals.impressions;
    if (topQueries.length > 0) totals.position = topQueries.reduce((a, q) => a + q.position, 0) / topQueries.length;

    return {
      success: true,
      data: {
        topQueries,
        topPages,
        performanceByDate,
        deviceBreakdown,
        countryBreakdown,
        totals,
      },
    };
  } catch (e) {
    return { success: false, error: { message: e.message } };
  }
}