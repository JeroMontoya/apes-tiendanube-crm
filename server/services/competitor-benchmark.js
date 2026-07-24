/**
 * @file competitor-benchmark.js
 * @description SERP Intelligence & Competitor Price Benchmark Engine
 * @author ANTIGRAVITY / ONYX v21.0
 *
 * Rastrea SERPs y e-commerces de competidores para calcular:
 * - Índice de Competitividad de Precio (ICP)
 * - Overlap de Palabras Clave vs. competidores
 * - Posicionamiento en resultados de búsqueda por producto
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

const SEARCH_API_KEY = process.env.SERP_API_KEY || process.env.SERPAPI_KEY;
const SEARCH_ENGINE = 'google.com.co';

/**
 * Fetch SERP results for a query
 */
async function fetchSERP(query, location = 'Medellin, Colombia') {
  if (!SEARCH_API_KEY) {
    return { results: [], organic: [], shopping: [] };
  }

  try {
    const params = new URLSearchParams({
      q: query,
      location,
      hl: 'es',
      gl: 'co',
      api_key: SEARCH_API_KEY,
      engine: 'google',
      num: 10,
    });

    const res = await fetch(`https://serpapi.com/search.json?${params}`);
    if (!res.ok) throw new Error(`SerpAPI ${res.status}`);
    const data = await res.json();

    return {
      results: data.organic_results || [],
      shopping: data.shopping_results || [],
      local: data.local_results || [],
    };
  } catch (e) {
    console.error('[Benchmark] SERP error:', e.message);
    return { results: [], shopping: [], local: [] };
  }
}

/**
 * Extract price from a string like "$95.000 COP" or "95000"
 */
function extractPrice(text) {
  if (!text) return 0;
  const cleaned = text.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Scrape competitor product prices for a given APES product
 */
export async function scrapeCompetitorPrices(apesProduct, searchQuery) {
  const { results, shopping } = await fetchSERP(searchQuery);
  const competitors = await supabase
    .from('competitor_registry')
    .select('*')
    .eq('is_active', true);
  const competitorDomains = (competitors.data || []).map(c => c.domain);

  const benchmarkEntries = [];

  // Check organic results
  for (const result of results) {
    const link = result.link || '';
    const matchedDomain = competitorDomains.find(d => link.includes(d));
    if (!matchedDomain) continue;

    const priceText = result.snippet || result.title || '';
    const price = extractPrice(priceText);
    if (price <= 0) continue;

    const diffPct = ((price - apesProduct.price) / apesProduct.price * 100);
    benchmarkEntries.push({
      apes_sku: apesProduct.sku,
      apes_product_name: apesProduct.name,
      apes_price: apesProduct.price,
      competitor_name: matchedDomain,
      competitor_url: link,
      competitor_price: price,
      price_difference_pct: parseFloat(diffPct.toFixed(2)),
      keyword_overlap: [searchQuery],
      serp_position: result.position || 0,
    });
  }

  // Check Google Shopping results
  for (const item of shopping) {
    const link = item.link || '';
    const matchedDomain = competitorDomains.find(d => link.includes(d));
    if (!matchedDomain) continue;

    const price = extractPrice(item.extracted_price || item.price || '');
    if (price <= 0) continue;

    const diffPct = ((price - apesProduct.price) / apesProduct.price * 100);
    benchmarkEntries.push({
      apes_sku: apesProduct.sku,
      apes_product_name: apesProduct.name,
      apes_price: apesProduct.price,
      competitor_name: matchedDomain,
      competitor_url: link,
      competitor_price: price,
      price_difference_pct: parseFloat(diffPct.toFixed(2)),
      keyword_overlap: [searchQuery],
      serp_position: 0,
    });
  }

  return benchmarkEntries;
}

/**
 * Analyze keyword overlap between APES and competitors
 * For each keyword, check which competitors appear in top 10
 */
export async function analyzeKeywordOverlap(keywords, siteUrl) {
  const competitors = await supabase
    .from('competitor_registry')
    .select('*')
    .eq('is_active', true);
  const competitorDomains = (competitors.data || []).map(c => c.domain);

  const overlapMap = {};

  for (const keyword of keywords.slice(0, 10)) {
    const { results } = await fetchSERP(keyword);

    const apisPresent = results.some(r => r.link?.includes(siteUrl));
    const competitorPresence = {};

    for (const domain of competitorDomains) {
      competitorPresence[domain] = results.some(r => r.link?.includes(domain));
    }

    overlapMap[keyword] = {
      apes_ranked: apisPresent,
      competitors: competitorPresence,
      total_organic: results.length,
    };
  }

  return overlapMap;
}

/**
 * Full benchmark cycle: scrape all APES products vs. registered competitors
 */
export async function runFullBenchmark(apesProducts) {
  const allBenchmarks = [];

  for (const product of apesProducts) {
    const queries = [
      `${product.name} Colombia`,
      `${product.name} ${product.sku}`,
      `comprar ${product.name} online`,
    ];

    for (const query of queries) {
      const entries = await scrapeCompetitorPrices(product, query);
      allBenchmarks.push(...entries);

      // Rate limit: 1 request per second
      await new Promise(r => setTimeout(r, 1200));
    }
  }

  // Store in Supabase
  if (allBenchmarks.length > 0) {
    const { error } = await supabase.rpc('fn_upsert_benchmarks', {
      p_benchmarks: JSON.stringify(allBenchmarks),
    });
    if (error) console.error('[Benchmark] Upsert error:', error.message);
  }

  return allBenchmarks;
}

/**
 * Get latest benchmarks from DB
 */
export async function getLatestBenchmarks(limit = 50) {
  const { data, error } = await supabase
    .from('competitor_price_benchmark')
    .select('*')
    .order('last_checked_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Get competitive index from view
 */
export async function getCompetitiveIndex() {
  const { data, error } = await supabase
    .from('v_benchmark_index')
    .select('*');

  if (error) throw error;
  return data || [];
}

/**
 * Get registered competitors
 */
export async function getCompetitorRegistry() {
  const { data, error } = await supabase
    .from('competitor_registry')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data || [];
}
