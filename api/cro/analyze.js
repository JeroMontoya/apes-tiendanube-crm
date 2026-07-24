/**
 * /api/cro/analyze.js
 * Endpoint Vercel: Análisis CRO de productos
 * POST /api/cro/analyze — Analiza un producto y genera copy optimizado
 * POST /api/cro/batch — Análisis batch de múltiples productos
 * GET /api/cro/diagnose — Diagnóstico rápido de un producto
 */

import axios from 'axios';

let openaiClient = null;

function getOpenAI() {
  if (!openaiClient && process.env.OPENAI_API_KEY) {
    const { default: OpenAI } = await import('openai');
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

const SYSTEM_PROMPT = `Eres un Copywriter y Arquitecto de Conversión (CRO) de clase mundial especializado en e-commerce LATAM.

FRAMEWORKS DE PERSUASIÓN: PAS (Problem-Agitate-Solution), AIDA (Attention-Interest-Desire-Action), Direct Response.

RESPUESTA JSON EXACTA:
{
  "diagnostico": "Análisis del copy actual",
  "errores_encontrados": ["error1", "error2"],
  "framework_recomendado": "PAS|AIDA|DirectResponse",
  "titulo_optimizado": "Nuevo título persuasivo",
  "descripcion_optimizada": "Nueva descripción CRO",
  "cta_recomendado": "CTA optimizado",
  "prueba_social_sugerida": "Elemento de prueba social",
  "urgencia_sugerida": "Elemento de urgencia",
  "impacto_esperado": "Estimación de impacto en CR"
}`;

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

async function analyzeProduct(product, metrics, options = {}) {
  const openai = getOpenAI();
  if (!openai) throw new Error('OPENAI_API_KEY no configurada');

  const productName = typeof product.name === 'object'
    ? (product.name.es || Object.values(product.name)[0])
    : product.name;
  const productDesc = typeof product.description === 'object'
    ? (product.description.es || Object.values(product.description)[0] || '')
    : (product.description || '');
  const price = product.variants?.[0]?.price || 'N/A';
  const cr = calculateCR(metrics.views || 0, metrics.orders || 0);
  const perf = classifyPerformance(cr);

  const userPrompt = `PRODUCTO: ${productName}
DESCRIPCIÓN: ${productDesc || '(Sin descripción)'}
PRECIO: $${price}
Vistas: ${metrics.views || 0} | Compras: ${metrics.orders || 0} | CR: ${cr}% (${perf.label}) | Revenue: $${metrics.revenue || 0}
Público: ${options.audience || 'general'} | Tono: ${options.tone || 'profesional'}
Framework: ${options.framework === 'auto' ? 'Elige el mejor' : options.framework || 'auto'}`;

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
    metrics: { views: metrics.views || 0, orders: metrics.orders || 0, conversion_rate: cr, revenue: metrics.revenue || 0, performance: perf },
    diagnostic: { analysis: parsed.diagnostico, errors_found: parsed.errores_encontrados || [], recommended_framework: parsed.framework_recomendado },
    optimized_copy: { title: parsed.titulo_optimizado, description: parsed.descripcion_optimizada, cta: parsed.cta_recomendado, social_proof: parsed.prueba_social_sugerida, urgency: parsed.urgencia_sugerida },
    expected_impact: parsed.impacto_esperado,
    timestamp: new Date().toISOString(),
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'POST') {
      const { product, metrics, options } = req.body;
      if (!product || !metrics) {
        return res.status(400).json({ error: 'Se requieren product y metrics' });
      }

      const result = await analyzeProduct(product, metrics, options || {});
      return res.status(200).json(result);
    }

    if (req.method === 'GET') {
      return res.status(200).json({
        status: 'operational',
        service: 'CRO Analyzer API',
        endpoints: {
          'POST /api/cro/analyze': 'Análisis individual de producto',
          'GET /api/cro/diagnose': 'Diagnóstico rápido (este endpoint)',
        },
        openai_configured: !!process.env.OPENAI_API_KEY,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[CRO API ERROR]:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
