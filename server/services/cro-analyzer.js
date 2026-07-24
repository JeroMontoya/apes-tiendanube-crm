/**
 * cro-analyzer.js
 * Motor de Análisis CRO (Conversion Rate Optimization) + Copywriting AI
 * Evalúa Product Detail Pages (PDP) y genera variaciones de alto ROI
 * usando frameworks de persuasión: PAS, AIDA, Direct Response.
 *
 * ONYX v5.0 - Industrial Software Architecture
 */

import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `Eres un Copywriter y Arquitecto de Conversión (CRO) de clase mundial especializado en e-commerce LATAM.

Tu misión es diagnosticar por qué un producto tiene baja tasa de conversión y generar copy optimizado que maximize ventas.

FRAMEWORKS DE PERSUASIÓN QUE DOMINAS:
1. PAS (Problem-Agitate-Solution): Identifica el dolor → Agita la consecuencia → Presenta la solución
2. AIDA (Attention-Interest-Desire-Action): Captura atención → Genera interés → Despierta deseo → Llama a la acción
3. Direct Response: copy que genera respuesta inmediata con prueba social + urgencia + escasez

REGLAS ESTRICTAS:
- NUNCA inventes métricas que no te fueron proporcionadas
- Usa datos REALES del producto para construir persuasión
- El copy debe ser natural, no spam ni clickbait barato
- Adapta el tono al público objetivo del producto
- Incluye un CTA (Call to Action) específico y medible
- Responde SIEMPRE en JSON válido con la estructura exacta solicitada

OUTPUT JSON EXACTO:
{
  "diagnostico": "Análisis del por qué el copy actual falla en convertir",
  "errores_encontrados": ["error1", "error2", "error3"],
  "framework_recomendado": "PAS|AIDA|DirectResponse",
  "titulo_optimizado": "Nuevo título persuasivo",
  "descripcion_optimizada": "Nueva descripción completa optimizada para CRO",
  "cta_recomendado": "Call to Action optimizado",
  "prueba_social_sugerida": "Elemento de prueba social a agregar",
  "urgencia_sugerida": "Elemento de urgencia/escasez a implementar",
  "impacto_esperado": "Estimación del impacto en CR"
}`;

/**
 * Calcula la Tasa de Conversión (CR) de un producto
 */
export function calculateConversionRate(views, orders) {
  if (!views || views === 0) return 0;
  return parseFloat(((orders / views) * 100).toFixed(2));
}

/**
 * Clasifica el nivel de rendimiento de un producto
 */
export function classifyPerformance(conversionRate) {
  if (conversionRate >= 5) return { level: 'excellent', label: 'Excelente', color: '#3b8a6e' };
  if (conversionRate >= 3) return { level: 'good', label: 'Bueno', color: '#3d5a99' };
  if (conversionRate >= 1.5) return { level: 'average', label: 'Promedio', color: '#a08240' };
  if (conversionRate >= 0.5) return { level: 'below', label: 'Bajo', color: '#c97a3a' };
  return { level: 'critical', label: 'Crítico', color: '#994444' };
}

/**
 * Analiza el copy de un producto y genera variaciones optimizadas
 * @param {Object} product - Producto de TiendaNube
 * @param {Object} metrics - Métricas de rendimiento {views, orders, revenue}
 * @param {Object} options - Opciones adicionales {framework, audience, tone}
 * @returns {Object} Diagnóstico + copy optimizado
 */
export async function analyzeProductPDP(product, metrics, options = {}) {
  const { framework = 'auto', audience = 'general', tone = 'profesional' } = options;

  const productName = typeof product.name === 'object' ? product.name.es || Object.values(product.name)[0] : product.name;
  const productDesc = typeof product.description === 'object'
    ? (product.description.es || Object.values(product.description)[0] || '')
    : (product.description || '');
  const price = product.variants?.[0]?.price || product.variants?.[0]?.compare_at_price || 'N/A';

  const cr = calculateConversionRate(metrics.views || 0, metrics.orders || 0);
  const perf = classifyPerformance(cr);

  const userPrompt = `
ANÁLISIS CRO — PRODUCTO E-COMMERCE
====================================

PRODUCTO: ${productName}
DESCRIPCIÓN ACTUAL: ${productDesc || '(Sin descripción)'}
PRECIO: $${price}
STOCK: ${product.variants?.[0]?.stock ?? 'N/A'} unidades

MÉTRICAS DE RENDIMIENTO:
- Vistas del producto: ${metrics.views || 0}
- Compras realizadas: ${metrics.orders || 0}
- Tasa de conversión: ${cr}%
- Nivel de rendimiento: ${perf.label}
- Revenue generado: $${metrics.revenue || 0}

CONTEXTO:
- Público objetivo: ${audience}
- Tono preferido: ${tone}
- Framework forzado: ${framework === 'auto' ? 'Elige el mejor framework automáticamente' : framework}

TAREA:
1. Diagnostica POR QUÉ este producto tiene una CR de ${cr}% (${perf.label})
2. Identifica los errores de persuasión en el copy actual
3. Genera un título y descripción optimizados usando el framework más adecuado
4. Recomienda un CTA, prueba social y elemento de urgencia

Responde en JSON válido.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 1500,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('Respuesta vacía del motor IA');

    const parsed = JSON.parse(content);

    return {
      product_id: product.id,
      product_name: productName,
      metrics: {
        views: metrics.views || 0,
        orders: metrics.orders || 0,
        conversion_rate: cr,
        revenue: metrics.revenue || 0,
        performance: perf,
      },
      diagnostic: {
        analysis: parsed.diagnostico || parsed.diagnostic,
        errors_found: parsed.errores_encontrados || parsed.errors_found || [],
        recommended_framework: parsed.framework_recomendado || parsed.recommended_framework || 'PAS',
      },
      optimized_copy: {
        title: parsed.titulo_optimizado || parsed.optimized_title || productName,
        description: parsed.descripcion_optimizada || parsed.optimized_description || productDesc,
        cta: parsed.cta_recomendado || parsed.cta || 'Comprar ahora',
        social_proof: parsed.prueba_social_sugerida || parsed.social_proof || '',
        urgency: parsed.urgencia_sugerida || parsed.urgency || '',
      },
      expected_impact: parsed.impacto_esperado || parsed.expected_impact || 'Estimación no disponible',
      timestamp: new Date().toISOString(),
      model_used: 'gpt-4o',
    };
  } catch (error) {
    console.error('[CRO ERROR]: Fallo en análisis de producto:', error.message);
    throw new Error(`CRO_ANALYSIS_FAILED: ${error.message}`);
  }
}

/**
 * Análisis batch de múltiples productos (hasta 10 por llamada para controlar costos)
 */
export async function batchAnalyze(products, options = {}) {
  const results = [];
  const batchSize = Math.min(products.length, 10);

  for (let i = 0; i < batchSize; i++) {
    try {
      const result = await analyzeProductPDP(
        products[i].product,
        products[i].metrics,
        options
      );
      results.push(result);

      if (i < batchSize - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      results.push({
        product_id: products[i].product.id,
        product_name: products[i].product.name,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  const successful = results.filter(r => !r.error);
  const failed = results.filter(r => r.error);

  return {
    total_analyzed: successful.length,
    total_failed: failed.length,
    results: successful,
    failures: failed,
    summary: generateBatchSummary(successful),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Genera un resumen ejecutivo del batch de análisis
 */
function generateBatchSummary(results) {
  if (results.length === 0) return { message: 'No se completaron análisis' };

  const avgCR = results.reduce((sum, r) => sum + (r.metrics?.conversion_rate || 0), 0) / results.length;
  const criticalProducts = results.filter(r => r.metrics?.performance?.level === 'critical');
  const belowProducts = results.filter(r => r.metrics?.performance?.level === 'below');

  return {
    average_conversion_rate: parseFloat(avgCR.toFixed(2)),
    critical_products: criticalProducts.length,
    below_average_products: belowProducts.length,
    recommendation: criticalProducts.length > 0
      ? `${criticalProducts.length} productos en nivel crítico. Priorizar reescritura de copy inmediata.`
      : belowProducts.length > 0
        ? `${belowProducts.length} productos con CR bajo. Optimización recomendada.`
        : 'Todos los productos están en niveles aceptables.',
  };
}

/**
 * Analiza un solo producto y retorna diagnóstico simplificado (para el dashboard)
 */
export async function quickDiagnose(product, metrics) {
  const cr = calculateConversionRate(metrics.views || 0, metrics.orders || 0);
  const perf = classifyPerformance(cr);

  return {
    product_id: product.id,
    product_name: typeof product.name === 'object' ? product.name.es || Object.values(product.name)[0] : product.name,
    conversion_rate: cr,
    performance: perf,
    has_diagnosis: false,
  };
}
