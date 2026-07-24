/**
 * /api/cro/batch.js
 * Análisis batch de múltiples productos (máx 10 por request)
 * Implementa caché en Supabase para evitar re-análisis (control de costos OpenAI)
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SYSTEM_PROMPT = `Eres un Copywriter y Arquitecto de Conversión (CRO) de clase mundial especializado en e-commerce LATAM.
FRAMEWORKS: PAS (Problem-Agitate-Solution), AIDA (Attention-Interest-Desire-Action), Direct Response.
RESPUESTA JSON: { "diagnostico", "errores_encontrados", "framework_recomendado", "titulo_optimizado", "descripcion_optimizada", "cta_recomendado", "prueba_social_sugerida", "urgencia_sugerida", "impacto_esperado" }`;

function calculateCR(views, orders) {
  if (!views || views === 0) return 0;
  return parseFloat(((orders / views) * 100).toFixed(2));
}

function classifyPerformance(cr) {
  if (cr >= 5) return { level: 'excellent', label: 'Excelente', color: '#3b8a6e' };
  if (cr >= 3) return { level: 'good', label: 'Bueno', color: '#3d5a99' };
  if (cr >= 1.5) return { level: 'average', label: 'Promedio', color: '#a08240' };
  if (cr >= 0.5) return { level: 'below', label: 'Bajo', color: '#c97a3a' };
  return { level: 'critical', label: 'Crítico', color: '#994444' };
}

/**
 * Genera un cache_key basado en el contenido del copy y precio
 * Si el copy/precio no cambió, se reutiliza el diagnóstico previo
 */
function generateCacheKey(product, price) {
  const name = typeof product.name === 'object' ? JSON.stringify(product.name) : product.name || '';
  const desc = typeof product.description === 'object' ? JSON.stringify(product.description) : product.description || '';
  const raw = `${name}|${desc}|${price}`;
  return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 32);
}

/**
 * Busca diagnóstico en caché (válido por 7 días)
 */
async function getCachedAnalysis(productId, cacheKey) {
  try {
    const { data, error } = await supabase
      .from('cro_analysis_cache')
      .select('diagnostic, optimized_copy, expected_impact, framework_used')
      .eq('product_id', productId)
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Guarda análisis en caché
 */
async function saveToCache(productId, productName, productDesc, price, metrics, cr, cacheKey, parsed, framework) {
  try {
    await supabase.from('cro_analysis_cache').upsert({
      product_id: productId,
      product_name: productName,
      product_description: productDesc,
      product_price: parseFloat(price) || 0,
      views: metrics.views || 0,
      orders: metrics.orders || 0,
      conversion_rate: cr,
      diagnostic: { analysis: parsed.diagnostico, errors_found: parsed.errores_encontrados || [], recommended_framework: parsed.framework_recomendado },
      optimized_copy: { title: parsed.titulo_optimizado, description: parsed.descripcion_optimizada, cta: parsed.cta_recomendado, social_proof: parsed.prueba_social_sugerida, urgency: parsed.urgencia_sugerida },
      expected_impact: parsed.impacto_esperado,
      framework_used: framework,
      cache_key: cacheKey,
    }, { onConflict: 'cache_key' });
  } catch (e) {
    console.warn('[CRO CACHE] Save failed (non-critical):', e.message);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY no configurada' });
    }

    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const { products, options } = req.body;
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de products' });
    }

    const batchSize = Math.min(products.length, 10);
    const results = [];
    const failures = [];
    let cacheHits = 0;
    let apiCalls = 0;

    for (let i = 0; i < batchSize; i++) {
      const { product, metrics } = products[i];
      if (!product || !metrics) {
        failures.push({ index: i, error: 'Faltan product o metrics' });
        continue;
      }

      try {
        const productName = typeof product.name === 'object'
          ? (product.name.es || Object.values(product.name)[0])
          : product.name;
        const productDesc = typeof product.description === 'object'
          ? (product.description.es || Object.values(product.description)[0] || '')
          : (product.description || '');
        const price = product.variants?.[0]?.price || 'N/A';
        const cr = calculateCR(metrics.views || 0, metrics.orders || 0);
        const perf = classifyPerformance(cr);
        const cacheKey = generateCacheKey(product, price);

        // 1. Intentar caché primero
        const cached = await getCachedAnalysis(product.id, cacheKey);
        if (cached) {
          cacheHits++;
          results.push({
            product_id: product.id,
            product_name: productName,
            metrics: { views: metrics.views || 0, orders: metrics.orders || 0, conversion_rate: cr, performance: perf },
            diagnostic: cached.diagnostic,
            optimized_copy: cached.optimized_copy,
            expected_impact: cached.expected_impact,
            from_cache: true,
          });
          continue;
        }

        // 2. Sin caché → llamar a OpenAI
        const userPrompt = `PRODUCTO: ${productName}\nDESCRIPCIÓN: ${productDesc || '(Sin descripción)'}\nPRECIO: $${price}\nVistas: ${metrics.views || 0} | Compras: ${metrics.orders || 0} | CR: ${cr}% (${perf.label}) | Revenue: $${metrics.revenue || 0}`;

        const response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
          max_tokens: 1200,
        });

        apiCalls++;
        const parsed = JSON.parse(response.choices[0].message.content);
        const framework = parsed.framework_recomendado || 'PAS';

        // Guardar en caché
        saveToCache(product.id, productName, productDesc, price, metrics, cr, cacheKey, parsed, framework);

        results.push({
          product_id: product.id,
          product_name: productName,
          metrics: { views: metrics.views || 0, orders: metrics.orders || 0, conversion_rate: cr, performance: perf },
          diagnostic: { analysis: parsed.diagnostico, errors_found: parsed.errores_encontrados || [], framework: framework },
          optimized_copy: { title: parsed.titulo_optimizado, description: parsed.descripcion_optimizada, cta: parsed.cta_recomendado, social_proof: parsed.prueba_social_sugerida, urgency: parsed.urgencia_sugerida },
          expected_impact: parsed.impacto_esperado,
          from_cache: false,
        });

        if (i < batchSize - 1) await new Promise(r => setTimeout(r, 500));
      } catch (error) {
        failures.push({ product_id: product.id, error: error.message });
      }
    }

    const avgCR = results.length > 0
      ? results.reduce((s, r) => s + (r.metrics?.conversion_rate || 0), 0) / results.length
      : 0;

    return res.status(200).json({
      total_analyzed: results.length,
      total_failed: failures.length,
      cache_hits: cacheHits,
      api_calls: apiCalls,
      estimated_tokens_saved: cacheHits * 800,
      results,
      failures,
      summary: {
        average_conversion_rate: parseFloat(avgCR.toFixed(2)),
        critical_products: results.filter(r => r.metrics?.performance?.level === 'critical').length,
        below_products: results.filter(r => r.metrics?.performance?.level === 'below').length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[CRO BATCH ERROR]:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
