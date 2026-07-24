/**
 * @file google-suite.js
 * @description Google Service Account connector for GA4, Search Console, Merchant Center
 * @author ANTIGRAVITY / ONYX v21.0
 *
 * Uses JWT Service Account auth — no OAuth token refresh required.
 * Set GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY in server/.env
 */

import { google } from 'googleapis';

let _auth = null;

function getAuth() {
  if (_auth) return _auth;

  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    throw new Error('Missing GOOGLE_CLIENT_EMAIL or GOOGLE_PRIVATE_KEY');
  }

  _auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: [
      'https://www.googleapis.com/auth/analytics.readonly',
      'https://www.googleapis.com/auth/webmasters.readonly',
      'https://www.googleapis.com/auth/content',
    ],
  });

  return _auth;
}

/**
 * Search Console: Top keywords by clicks, impressions, CTR, position
 * @param {string} siteUrl - e.g. "https://www.apes.com.co"
 * @param {string} startDate - "YYYY-MM-DD"
 * @param {string} endDate - "YYYY-MM-DD"
 * @param {number} rowLimit - max rows (default 25)
 */
export async function getSearchConsoleKeywords(siteUrl, startDate, endDate, rowLimit = 25) {
  const auth = getAuth();
  const searchconsole = google.searchconsole({ version: 'v1', auth });

  const res = await searchconsole.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: ['query', 'page'],
      rowLimit,
      dataState: 'final',
    },
  });

  return (res.data.rows || []).map(row => ({
    query: row.keys?.[0] || '',
    page_url: row.keys?.[1] || '',
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
    ctr: parseFloat((row.ctr || 0).toFixed(4)),
    position: parseFloat((row.position || 0).toFixed(2)),
  }));
}

/**
 * Search Console: Aggregate site performance
 */
export async function getSearchConsoleSummary(siteUrl, startDate, endDate) {
  const auth = getAuth();
  const searchconsole = google.searchconsole({ version: 'v1', auth });

  const res = await searchconsole.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
      dataState: 'final',
    },
  });

  const row = res.data.rows?.[0];
  return {
    total_clicks: row?.clicks || 0,
    total_impressions: row?.impressions || 0,
    avg_ctr: parseFloat((row?.ctr || 0).toFixed(4)),
    avg_position: parseFloat((row?.position || 0).toFixed(2)),
  };
}

/**
 * Merchant Center: List product statuses
 * @param {string} merchantId
 */
export async function getMerchantCenterProducts(merchantId) {
  const auth = getAuth();
  const content = google.content({ version: 'v2.1', auth });

  const res = await content.productstatuses.list({
    merchantId,
    maxResults: 50,
    destinations: ['Surfaces across Google', 'Free listings'],
  });

  return (res.data.resources || []).map(item => {
    const status = item.productStatus || {};
    const price = item.productPrice || {};
    return {
      product_id: item.productId || '',
      title: item.title || '',
      link: item.link || '',
      image_link: item.imageLink || '',
      availability: item.availability || 'in stock',
      approval_status: status.destinationStatus?.[0]?.status || 'UNKNOWN',
      click_potential: status.clickPotential || 'UNKNOWN',
      disapproval_reasons: (status.destinationStatus?.[0]?.disapprovalReasons || []),
      price_amount: price.priceAmount || 0,
      price_currency: price.currency || 'COP',
      brand: item.brand || '',
      gtin: item.gtin || '',
    };
  });
}

/**
 * GA4: Run a report via Data API (v1beta)
 * @param {string} propertyId
 * @param {string[]} metricNames - e.g. ['sessions', 'totalUsers']
 * @param {string} startDate
 * @param {string} endDate
 */
export async function getGA4Report(propertyId, metricNames, startDate, endDate) {
  const auth = getAuth();

  const res = await auth.authorize();
  const accessToken = res.access_token;

  const reportRes = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        metrics: metricNames.map(name => ({ name })),
      }),
    }
  );

  if (!reportRes.ok) {
    const err = await reportRes.text();
    throw new Error(`GA4 API ${reportRes.status}: ${err}`);
  }

  const data = await reportRes.json();
  const row = data.rows?.[0];
  const result = {};

  for (let i = 0; i < (data.metricHeaders || []).length; i++) {
    const name = data.metricHeaders[i].name;
    result[name] = parseFloat(row?.metricValues?.[i]?.value || '0');
  }

  return result;
}

/**
 * Full sync: fetch all Google data and return structured payload
 */
export async function syncAllGoogleData() {
  const siteUrl = process.env.GSC_SITE_URL;
  const merchantId = process.env.GOOGLE_MERCHANT_ID;
  const ga4PropertyId = process.env.GA4_PROPERTY_ID;

  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 28 * 86400000).toISOString().split('T')[0];

  const results = { gsc: null, merchant: null, ga4: null, errors: {} };

  try {
    results.gsc = {
      summary: siteUrl ? await getSearchConsoleSummary(siteUrl, startDate, endDate) : null,
      keywords: siteUrl ? await getSearchConsoleKeywords(siteUrl, startDate, endDate, 25) : [],
    };
  } catch (e) {
    results.errors.gsc = e.message;
  }

  try {
    results.merchant = merchantId
      ? await getMerchantCenterProducts(merchantId)
      : [];
  } catch (e) {
    results.errors.merchant = e.message;
  }

  try {
    results.ga4 = ga4PropertyId
      ? await getGA4Report(
          ga4PropertyId,
          ['sessions', 'totalUsers', 'bounceRate', 'averageSessionDuration', 'conversions'],
          startDate,
          endDate
        )
      : null;
  } catch (e) {
    results.errors.ga4 = e.message;
  }

  return results;
}
