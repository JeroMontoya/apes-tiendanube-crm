import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { getSearchConsoleKeywords, getSearchConsoleSummary, getMerchantCenterProducts, getGA4Report } = await import('../../server/services/google-suite.js');

    const siteUrl = process.env.GSC_SITE_URL;
    const merchantId = process.env.GOOGLE_MERCHANT_ID;
    const ga4PropertyId = process.env.GA4_PROPERTY_ID;
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 28 * 86400000).toISOString().split('T')[0];

    let gscKeywords = [];
    let gscSummary = null;
    let merchantProducts = [];
    let ga4Data = null;
    const errors = {};

    try {
      gscSummary = siteUrl ? await getSearchConsoleSummary(siteUrl, startDate, endDate) : null;
      gscKeywords = siteUrl ? await getSearchConsoleKeywords(siteUrl, startDate, endDate, 25) : [];
    } catch (e) { errors.gsc = e.message; }

    try {
      merchantProducts = merchantId ? await getMerchantCenterProducts(merchantId) : [];
    } catch (e) { errors.merchant = e.message; }

    try {
      ga4Data = ga4PropertyId
        ? await getGA4Report(ga4PropertyId, ['sessions', 'totalUsers', 'bounceRate', 'averageSessionDuration', 'conversions'], startDate, endDate)
        : null;
    } catch (e) { errors.ga4 = e.message; }

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.status(200).json({ gsc: { summary: gscSummary, keywords: gscKeywords }, merchant: merchantProducts, ga4: ga4Data, errors });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
