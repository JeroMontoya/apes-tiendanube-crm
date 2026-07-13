import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
  generationConfig: {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 8192,
  },
});

export class AIInsightsEngine {
  static async generateInsights(data, context = {}) {
    const prompt = this.buildInsightsPrompt(data, context);
    const result = await model.generateContent(prompt);
    return this.parseInsights(result.response.text());
  }

  static buildInsightsPrompt(data, context) {
    const { clients = [], orders = [], products = [], adsData = null, ga4Data = null, merchantData = null, searchConsoleData = null } = data;
    const { dateRange = '30d', storeName = 'TiendaNueve' } = context;

    return `
Eres un Chief Marketing Officer y Data Scientist senior especializado en e-commerce (TiendaNube/Nuvemshop).
Analiza los datos de ${storeName} para el período ${dateRange} y genera insights ACCIONABLES, priorizados por impacto.

=== DATOS CLIENTES (${clients.length}) ===
${this.summarizeClients(clients)}

=== DATOS PEDIDOS (${orders.length}) ===
${this.summarizeOrders(orders)}

=== DATOS PRODUCTOS (${products.length}) ===
${this.summarizeProducts(products)}

${adsData ? `=== META ADS ===
${JSON.stringify(adsData, null, 2)}` : ''}

${ga4Data ? `=== GA4 ===
${JSON.stringify(ga4Data, null, 2)}` : ''}

${merchantData ? `=== GOOGLE MERCHANT CENTER ===
Productos: ${merchantData.products?.length || 0}
Performance: ${JSON.stringify(merchantData.performance?.slice(0, 10) || [])}` : ''}

${searchConsoleData ? `=== GOOGLE SEARCH CONSOLE ===
Top Queries: ${JSON.stringify(searchConsoleData.topQueries?.slice(0, 20) || [])}
Top Pages: ${JSON.stringify(searchConsoleData.topPages?.slice(0, 10) || [])}
Device: ${JSON.stringify(searchConsoleData.deviceBreakdown || [])}
Countries: ${JSON.stringify(searchConsoleData.countryBreakdown?.slice(0, 10) || [])}
Totals: ${JSON.stringify(searchConsoleData.totals || {})}` : ''}

=== INSTRUCCIONES ===
Genera un JSON con esta estructura EXACTA:

{
  "executiveSummary": "Resumen ejecutivo de 3-4 líneas con hallazgos clave",
  "healthScore": 0-100,
  "criticalAlerts": [
    {"type": "revenue|churn|stock|ads|seo", "message": "...", "impact": "high|medium|low", "action": "..."}
  ],
  "opportunities": [
    {"area": "acquisition|retention|conversion|aov|seo|shopping", "title": "...", "description": "...", "estimatedImpact": "COP X", "effort": "low|medium|high", "priority": 1-10}
  ],
  "campaignIdeas": [
    {"name": "...", "channel": "Meta|Google Shopping|Email|SMS|Push", "audience": "...", "angle": "...", "budget": "COP X", "expectedROAS": "X.x", "creativeConcept": "..."}
  ],
  "segmentActions": [
    {"segment": "VIP|Nuevos|En riesgo|Dormidos|Sensibles precio", "action": "...", "channel": "...", "template": "..."}
  ],
  "productRecommendations": [
    {"productId": "...", "action": "promote|bundle|discount|discontinue|optimize_feed", "reason": "..."}
  ],
  "seoActions": [
    {"type": "content|technical|shopping_feed|structured_data", "priority": "high|medium|low", "action": "...", "targetQueries": ["..."]}
  ]
}

=== REGLAS ===
- Prioriza por impacto en REVENUE (COP)
- Sé ESPECÍFICO: nombres de segmentos, productos, queries, URLs
- Si falta dato, infiere con lógica de negocio
- Formato: SOLO JSON válido, sin markdown, sin texto extra
`;
  }

  static summarizeClients(clients) {
    if (!clients.length) return 'Sin datos';
    const segments = {};
    let totalRevenue = 0;
    clients.forEach(c => {
      const seg = c.segment || 'unknown';
      segments[seg] = (segments[seg] || 0) + 1;
      totalRevenue += c.totalSpent || 0;
    });
    return `Total: ${clients.length} | Revenue: ${this.fmt(totalRevenue)} | Segments: ${JSON.stringify(segments)}`;
  }

  static summarizeOrders(orders) {
    if (!orders.length) return 'Sin datos';
    const paid = orders.filter(o => o.payment_status === 'paid').length;
    const pending = orders.filter(o => o.payment_status === 'pending').length;
    const revenue = orders.filter(o => o.payment_status === 'paid').reduce((s, o) => s + (parseFloat(o.total) || 0), 0);
    const avgOrder = paid > 0 ? revenue / paid : 0;
    return `Total: ${orders.length} | Pagados: ${paid} | Pendientes: ${pending} | Revenue: ${this.fmt(revenue)} | AOV: ${this.fmt(avgOrder)}`;
  }

  static summarizeProducts(products) {
    if (!products.length) return 'Sin datos';
    const withStock = products.filter(p => (p.stock_quantity || 0) > 0).length;
    const lowStock = products.filter(p => (p.stock_quantity || 0) > 0 && (p.stock_quantity || 0) < 10).length;
    const outOfStock = products.filter(p => (p.stock_quantity || 0) === 0).length;
    return `Total: ${products.length} | Con stock: ${withStock} | Stock bajo (<10): ${lowStock} | Sin stock: ${outOfStock}`;
  }

  static fmt(n) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
  }

  static parseInsights(text) {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return JSON.parse(text);
    } catch (e) {
      console.error('AI parse error:', e);
      return this.getFallbackInsights();
    }
  }

  static getFallbackInsights() {
    return {
      executiveSummary: 'Análisis automático temporalmente no disponible.',
      healthScore: 50,
      criticalAlerts: [],
      opportunities: [],
      campaignIdeas: [],
      segmentActions: [],
      productRecommendations: [],
      seoActions: [],
    };
  }

  // === PROMPTS ESPECIALIZADOS ===

  static async generateCampaignPlan(data, objective) {
    const prompt = `
Eres un Media Buyer senior. Crea un plan de campaña COMPLETO para objetivo: ${objective}.

Datos: ${JSON.stringify(data).slice(0, 5000)}

Genera JSON:
{
  "campaignName": "...",
  "objective": "${objective}",
  "budget": {"daily": "COP X", "total": "COP X", "allocation": {"Meta": 0.6, "Google Shopping": 0.3, "Email": 0.1}},
  "audiences": [
    {"name": "...", "type": "lookalike|retargeting|interest|broad", "source": "...", "size": "~X", "platform": "Meta|Google"}
  ],
  "creatives": [
    {"format": "carousel|video|collection|single_image", "hook": "...", "headline": "...", "primaryText": "...", "cta": "SHOP_NOW|LEARN_MORE", "concept": "..."}
  ],
  "adSets": [
    {"name": "...", "audience": "...", "placement": "auto|feed|stories|reels", "budget": "COP X/day", "bidStrategy": "lowest_cost|target_roas"}
  ],
  "measurement": {"primaryKPI": "...", "secondaryKPIs": ["..."], "attributionWindow": "7d_click_1d_view"},
  "testingPlan": [{"variable": "creative|audience|placement", "variants": ["A", "B"], "duration": "7d"}]
}
`;
    const result = await model.generateContent(prompt);
    return this.parseInsights(result.response.text());
  }

  static async generateEmailSequence(segment, objective, products, tone = 'professional') {
    const prompt = `
Eres un Copywriter senior de e-commerce. Crea secuencia de 3-5 emails para:
Segmento: ${segment}
Objetivo: ${objective}
Productos clave: ${JSON.stringify(products).slice(0, 2000)}
Tono: ${tone}

Genera JSON:
{
  "sequenceName": "...",
  "emails": [
    {"day": 0, "subject": "...", "preheader": "...", "body": "...", "cta": {"text": "...", "url": "..."}, "goal": "..."}
  ]
}
`;
    const result = await model.generateContent(prompt);
    return this.parseInsights(result.response.text());
  }

  static async generateSEOContentPlan(topQueries, topPages, products, competitors = []) {
    const prompt = `
Eres un SEO Strategist. Crea plan de contenido para e-commerce.

Top Queries (impresiones): ${JSON.stringify(topQueries.slice(0, 30))}
Top Pages (clics): ${JSON.stringify(topPages.slice(0, 20))}
Products: ${JSON.stringify(products.slice(0, 30))}
Competitors: ${JSON.stringify(competitors)}

Genera JSON:
{
  "contentPillars": [{"name": "...", "targetKeywords": ["..."], "contentType": "blog|guide|comparison|category", "priority": 1-10}],
  "productPageOptimizations": [{"productId": "...", "title": "...", "metaDescription": "...", "structuredData": "...", "faq": [{"q": "...", "a": "..."}]}],
  "blogTopics": [{"title": "...", "targetKeyword": "...", "searchIntent": "informational|commercial", "outline": ["H1", "H2..."], "wordCount": 1500}],
  "technicalFixes": [{"issue": "...", "pages": ["..."], "fix": "..."}],
  "shoppingFeedOptimizations": [{"field": "title|description|category|gtin|custom_label", "action": "...", "reason": "..."}]
}
`;
    const result = await model.generateContent(prompt);
    return this.parseInsights(result.response.text());
  }

  static async generateProductFeedOptimization(products, merchantData) {
    const prompt = `
Eres especialista en Google Merchant Center. Optimiza feed de productos.

Productos (${products.length}): ${JSON.stringify(products.slice(0, 50))}
Performance MC: ${JSON.stringify(merchantData?.performance?.slice(0, 20) || [])}

Genera JSON con optimizaciones por producto:
{
  "optimizations": [
    {"offerId": "...", "field": "title|description|google_product_category|custom_label_0|image_link|price|availability", "currentValue": "...", "recommendedValue": "...", "reason": "...", "priority": "high|medium|low"}
  ],
  "globalRules": [
    {"field": "...", "rule": "...", "appliesTo": "all|apparel|electronics"}
  ]
}
`;
    const result = await model.generateContent(prompt);
    return this.parseInsights(result.response.text());
  }

  static async analyzeCompetitorGap(ourData, competitorUrls) {
    const prompt = `
Analiza gap competitivo para e-commerce.

Nuestros datos: ${JSON.stringify(ourData).slice(0, 4000)}
Competidores: ${competitorUrls.join(', ')}

Genera JSON:
{
  "gaps": [
    {"area": "keywords|content|products|backlinks|technical|shopping", "description": "...", "competitorExample": "...", "opportunity": "COP X", "action": "..."}
  ],
  "quickWins": [...],
  "longTerm": [...]
}
`;
    const result = await model.generateContent(prompt);
    return this.parseInsights(result.response.text());
  }

  static async generateRetentionStrategy(churnData, segments) {
    const prompt = `
Eres Retention Strategist. Crea estrategia anti-churn.

Churn data: ${JSON.stringify(churnData)}
Segments: ${JSON.stringify(segments)}

Genera JSON:
{
  "riskSegments": [{"segment": "...", "riskLevel": "high|medium|low", "churnRate": 0.XX, "keySignals": ["..."]}],
  "interventions": [
    {"trigger": "days_since_last_order > 90", "segment": "...", "channel": "email|sms|push|whatsapp", "template": "...", "incentive": "..."}
  ],
  "loyaltyProgram": {"tiers": [...], "rewards": [...], "communicationPlan": [...]},
  "winBackCampaign": {"name": "...", "audience": "...", "sequence": [...], "budget": "COP X"}
}
`;
    const result = await model.generateContent(prompt);
    return this.parseInsights(result.response.text());
  }

  static async generateInventoryInsights(products, salesVelocity, seasonality) {
    const prompt = `
Eres Supply Chain Analyst para e-commerce fashion.

Productos: ${JSON.stringify(products.slice(0, 100))}
Sales velocity (últimos 90d): ${JSON.stringify(salesVelocity)}
Seasonality: ${JSON.stringify(seasonality)}

Genera JSON:
{
  "reorderAlerts": [{"productId": "...", "currentStock": X, "dailyVelocity": Y, "daysOfStock": Z, "reorderQty": N, "urgency": "critical|high|medium"}],
  "overstock": [{"productId": "...", "stock": X, "velocity": Y, "action": "bundle|discount|donate|return", "estimatedLoss": "COP X"}],
  "seasonalPrep": [{"productId": "...", "season": "Black Friday|Navidad|Verano|Regreso a clases", "recommendedStock": X, "leadTimeDays": Y}],
  "bundleOpportunities": [{"products": ["...", "..."], "reason": "...", "discount": "10-15%"}]
}
`;
    const result = await model.generateContent(prompt);
    return this.parseInsights(result.response.text());
  }
}

export async function getAIInsights(data, context) {
  return AIInsightsEngine.generateInsights(data, context);
}