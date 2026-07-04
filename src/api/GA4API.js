import { SignJWT, importPKCS8 } from 'jose';

export class GA4API {
  constructor(credentialsJson, propertyId) {
    this.credentialsRaw = credentialsJson;
    this.propertyId = propertyId ? propertyId.trim() : '';
    this.serviceAccount = null;
    this.accessToken = null;
    
    try {
      this.serviceAccount = typeof credentialsJson === 'string' ? JSON.parse(credentialsJson) : credentialsJson;
    } catch (e) {
      console.error('Error parsing GA4 Service Account JSON:', e);
    }
  }

  async getAccessToken() {
    if (!this.serviceAccount || !this.serviceAccount.private_key) {
      throw new Error('Invalid Service Account JSON');
    }

    try {
      // Import the private key using jose
      const privateKey = await importPKCS8(this.serviceAccount.private_key, 'RS256');
      
      // Create and sign the JWT
      const jwt = await new SignJWT({
        iss: this.serviceAccount.client_email,
        scope: 'https://www.googleapis.com/auth/analytics.readonly',
        aud: 'https://oauth2.googleapis.com/token',
      })
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);

      // Exchange the signed JWT for an access token
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
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
      return this.accessToken;
    } catch (error) {
      console.error('Error getting GA4 access token:', error);
      throw error;
    }
  }

  async testConnection() {
    try {
      if (!this.propertyId) throw new Error('Missing Property ID');
      await this.getAccessToken();
      
      // Perform a minimal valid request to verify property access
      const res = await this._runReport({
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

    const url = `https://analyticsdata.googleapis.com/v1beta/properties/${this.propertyId}:runReport`;
    
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
      throw new Error(`GA4 runReport failed: ${detail}`);
    }

    return await res.json();
  }

  async getInsights(startDate, endDate) {
    try {
      const accessToken = await this.getAccessToken();
      const url = `https://analyticsdata.googleapis.com/v1beta/properties/${this.propertyId}:batchRunReports`;

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
        throw new Error(`GA4 API Error: ${res.statusText}`);
      }

      const data = await res.json();
      const globalReport = data.reports[0];
      const acqReport = data.reports[1];
      const eventReport = data.reports[2];

      // Parse Global
      let global = { sessions: 0, activeUsers: 0, bounceRate: 0, averageSessionDuration: 0 };
      if (globalReport.rows && globalReport.rows.length > 0) {
        const m = globalReport.rows[0].metricValues;
        global = {
          sessions: parseInt(m[0].value, 10),
          activeUsers: parseInt(m[1].value, 10),
          bounceRate: parseFloat(m[2].value),
          averageSessionDuration: parseFloat(m[3].value)
        };
      }

      // Parse Acquisition
      let acquisition = [];
      if (acqReport.rows) {
        acquisition = acqReport.rows.map(r => ({
          channel: r.dimensionValues[0].value,
          sessions: parseInt(r.metricValues[0].value, 10),
          activeUsers: parseInt(r.metricValues[1].value, 10)
        }));
      }

      // Parse Events
      let events = [];
      if (eventReport.rows) {
        events = eventReport.rows.map(r => ({
          eventName: r.dimensionValues[0].value,
          eventCount: parseInt(r.metricValues[0].value, 10)
        }));
      }

      return { global, acquisition, events };
    } catch (error) {
      console.error('Error fetching GA4 Insights:', error);
      return null;
    }
  }
}
