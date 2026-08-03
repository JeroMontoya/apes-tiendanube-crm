import React, { useState, useEffect, useCallback } from 'react';
import {
  Brain, Target, TrendingUp, AlertTriangle, CheckCircle2, Copy,
  RefreshCw, Zap, ArrowUpRight, ArrowDownRight, BarChart3, Sparkles,
  ChevronRight, Eye, ShoppingCart, DollarSign, Loader2, X, Send,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '';

function calculateCR(views, orders) {
  if (!views || views === 0) return 0;
  return parseFloat(((orders / views) * 100).toFixed(2));
}

function classifyPerformance(cr) {
  if (cr >= 5) return { level: 'excellent', label: 'Excelente', color: 'var(--success)' };
  if (cr >= 3) return { level: 'good', label: 'Bueno', color: 'var(--primary)' };
  if (cr >= 1.5) return { level: 'average', label: 'Promedio', color: 'var(--warning)' };
  if (cr >= 0.5) return { level: 'below', label: 'Bajo', color: '#c97a3a' };
  return { level: 'critical', label: 'Crítico', color: 'var(--error)' };
}

const s = {
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  titleRow: { display: 'flex', alignItems: 'center', gap: 12 },
  title: { fontSize: 18, fontWeight: 600, color: 'var(--on-surface)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  subtitle: { fontSize: 13, color: 'var(--on-surface-variant)', marginTop: 2 },
  badge: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: 'var(--primary-container)', color: 'var(--primary)', border: '1px solid rgba(61,90,153,0.15)' },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 },
  card: { background: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 16, transition: 'border-color 0.2s' },
  cardHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--border-subtle)' },
  cardTitle: { fontSize: 11, fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  kpiValue: { fontSize: 22, fontWeight: 700, color: 'var(--on-surface)', fontVariantNumeric: 'tabular-nums' },
  kpiLabel: { fontSize: 11, color: 'var(--on-surface-variant)', marginTop: 2 },
  kpiDelta: { fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3, marginTop: 4 },
  productRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border-subtle)', marginBottom: 8, cursor: 'pointer', transition: 'all 0.15s', background: 'transparent' },
  productName: { fontSize: 13, fontWeight: 600, color: 'var(--on-surface)', flex: 1 },
  productMeta: { fontSize: 11, color: 'var(--on-surface-variant)' },
  crBadge: (color) => ({ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: `${color}15`, color, border: `1px solid ${color}25` }),
  btnPrimary: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--primary)', color: 'var(--on-surface)', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.02em' },
  btnSecondary: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'transparent', color: 'var(--on-surface-variant)', border: '1px solid var(--border-subtle)', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer' },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', color: 'var(--on-surface-variant)', gap: 12 },
  analysisBox: { background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 16, marginBottom: 12 },
  analysisLabel: { fontSize: 11, fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 },
  analysisText: { fontSize: 13, color: 'var(--on-surface)', lineHeight: 1.6 },
  copyCard: { background: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 16, position: 'relative' },
  copyTitle: { fontSize: 14, fontWeight: 700, color: 'var(--on-surface)', marginBottom: 8 },
  copyDesc: { fontSize: 13, color: 'var(--on-surface)', lineHeight: 1.6, marginBottom: 12 },
  ctaButton: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--primary)', color: 'var(--on-surface)', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, letterSpacing: '0.02em' },
  tag: { display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', marginRight: 4 },
  loader: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', color: 'var(--on-surface-variant)', gap: 8, fontSize: 13 },
  input: { width: '100%', padding: '8px 12px', background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 6, color: 'var(--on-surface)', fontSize: 13, outline: 'none', boxSizing: 'border-box' },
  textarea: { width: '100%', minHeight: 80, padding: '8px 12px', background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 6, color: 'var(--on-surface)', fontSize: 13, outline: 'none', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' },
  row: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
};

export default function CRODashboard({ session, ga4Insights }) {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzingBatch, setIsAnalyzingBatch] = useState(false);
  const [batchResults, setBatchResults] = useState(null);
  const [copiedField, setCopiedField] = useState('');
  const [error, setError] = useState('');
  const [customProduct, setCustomProduct] = useState({ name: '', description: '', price: '' });
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [applyingCopy, setApplyingCopy] = useState(false);
  const [appliedSuccess, setAppliedSuccess] = useState(false);
  const [metricsSummary, setMetricsSummary] = useState({});

  const getAuthHeaders = useCallback(() => {
    const token = session?.access_token;
    return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
  }, [session]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/cro/metrics`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Error fetching metrics');
      const data = await res.json();
      setProducts(data.products || []);
      setMetricsSummary(data.summary || {});
    } catch (e) {
      console.error('Fetch metrics error:', e);
    }
  };

  const analyzeProduct = async (product, metrics = {}) => {
    setIsAnalyzing(true);
    setAnalysis(null);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/cro/analyze`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          product: {
            id: product.id,
            name: product.name,
            description: product.description,
            variants: product.variants,
          },
          metrics: {
            views: metrics.estimated_views || metrics.views || 100,
            orders: metrics.orders || 1,
            revenue: metrics.revenue || parseFloat(product.variants?.[0]?.price || 0) * (metrics.orders || 1),
          },
          options: { audience: 'general', tone: 'profesional', framework: 'auto' },
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error en análisis CRO');
      }
      const result = await res.json();
      setAnalysis(result);
      setSelectedProduct(product);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeBatch = async () => {
    const criticalProducts = products
      .filter(p => (p.conversion_rate || 0) < 3)
      .slice(0, 10);

    if (criticalProducts.length === 0) {
      setError('No se encontraron productos con CR bajo para análisis batch');
      return;
    }

    setIsAnalyzingBatch(true);
    setBatchResults(null);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/cro/batch`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          products: criticalProducts.map(p => ({
            product: { id: p.id, name: p.name, description: p.description, variants: p.variants },
            metrics: {
              views: p.estimated_views || 100,
              orders: p.orders || 1,
              revenue: p.revenue || 0,
            },
          })),
        }),
      });
      if (!res.ok) throw new Error('Error en análisis batch');
      const result = await res.json();
      setBatchResults(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsAnalyzingBatch(false);
    }
  };

  const analyzeCustomProduct = async () => {
    if (!customProduct.name) return;
    await analyzeProduct({
      id: 'custom',
      name: customProduct.name,
      description: customProduct.description,
      variants: [{ price: customProduct.price || '0' }],
    }, { views: 1000, orders: 10, revenue: 100 });
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(''), 2000);
    });
  };

  const applyCopyToTiendanube = async (dryRun = false) => {
    if (!selectedProduct || !analysis) return;
    const tnProductId = selectedProduct.tiendanube_product_id || selectedProduct.id;
    if (!tnProductId) {
      setError('No se encontró el tiendanube_product_id del producto seleccionado');
      return;
    }

    setApplyingCopy(true);
    setAppliedSuccess(false);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/cro/apply-copy`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          tiendanube_product_id: tnProductId,
          optimized_copy: {
            title: analysis.optimized_copy.title,
            description: analysis.optimized_copy.description,
          },
          dry_run: dryRun,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al aplicar copy');
      }
      const result = await res.json();
      if (dryRun) {
        setCopiedField('dryrun');
        setTimeout(() => setCopiedField(''), 2000);
      } else {
        setAppliedSuccess(true);
        setTimeout(() => setAppliedSuccess(false), 4000);
      }
      return result;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setApplyingCopy(false);
    }
  };

  const avgCR = metricsSummary.avg_cr || (products.length > 0
    ? products.reduce((sum, p) => sum + (p.conversion_rate || 0), 0) / products.length
    : 0);
  const criticalCount = metricsSummary.critical || products.filter(p => (p.conversion_rate || 0) < 1.5).length;
  const totalRevenue = metricsSummary.total_revenue || products.reduce((sum, p) => sum + (p.revenue || 0), 0);

  return (
    <div style={{ padding: 20 }}>
      <div style={s.header}>
        <div style={s.titleRow}>
          <Brain size={22} color="var(--primary)" />
          <div>
            <div style={s.title}>CRO Analyzer</div>
            <div style={s.subtitle}>Motor de Copywriting AI + Análisis de Conversión</div>
          </div>
        </div>
        <div style={s.row}>
          <span style={s.badge}><Target size={12} /> {products.length} productos</span>
          {criticalCount > 0 && <span style={{ ...s.badge, background: 'var(--error-container)', color: 'var(--error)', borderColor: 'rgba(153,68,68,0.15)' }}><AlertTriangle size={12} /> {criticalCount} críticos</span>}
          <button onClick={analyzeBatch} disabled={isAnalyzingBatch} style={s.btnSecondary}>
            {isAnalyzingBatch ? <Loader2 size={14} className="spin" /> : <Zap size={14} />}
            Batch Analysis
          </button>
          <button onClick={() => setShowCustomForm(!showCustomForm)} style={s.btnSecondary}>
            <Sparkles size={14} /> Análisis Manual
          </button>
        </div>
      </div>

      {error && (
        <div style={{ ...s.card, borderColor: 'var(--error)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--error)', fontSize: 13 }}>
          <AlertTriangle size={16} /> {error}
          <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer' }}><X size={14} /></button>
        </div>
      )}

      {showCustomForm && (
        <div style={{ ...s.card, marginBottom: 16 }}>
          <div style={s.cardTitle}>Análisis Manual de Producto</div>
          <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
            <input style={s.input} placeholder="Nombre del producto *" value={customProduct.name} onChange={e => setCustomProduct({ ...customProduct, name: e.target.value })} />
            <textarea style={s.textarea} placeholder="Descripción del producto (copy actual)" value={customProduct.description} onChange={e => setCustomProduct({ ...customProduct, description: e.target.value })} />
            <div style={s.row}>
              <input style={{ ...s.input, width: 200 }} placeholder="Precio" value={customProduct.price} onChange={e => setCustomProduct({ ...customProduct, price: e.target.value })} />
              <button onClick={analyzeCustomProduct} disabled={isAnalyzing || !customProduct.name} style={s.btnPrimary}>
                {isAnalyzing ? <Loader2 size={14} className="spin" /> : <Brain size={14} />}
                Analizar Copy
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={s.grid3}>
        <div style={s.card}>
          <div style={s.cardTitle}>CR Promedio</div>
          <div style={{ ...s.kpiValue, color: classifyPerformance(avgCR).color, marginTop: 8 }}>{avgCR.toFixed(2)}%</div>
          <div style={s.kpiLabel}>Tasa de conversión general</div>
        </div>
        <div style={s.card}>
          <div style={s.cardTitle}>Productos Críticos</div>
          <div style={{ ...s.kpiValue, color: criticalCount > 0 ? 'var(--error)' : 'var(--success)', marginTop: 8 }}>{criticalCount}</div>
          <div style={s.kpiLabel}>CR bajo 1.5% — requieren copy urgente</div>
        </div>
        <div style={s.card}>
          <div style={s.cardTitle}>Revenue Total</div>
          <div style={{ ...s.kpiValue, color: 'var(--success)', marginTop: 8 }}>${totalRevenue.toLocaleString('es-CO')}</div>
          <div style={s.kpiLabel}>Ingresos acumulados</div>
        </div>
      </div>

      {/* GA4 Insights Panel */}
      {ga4Insights && (
        <div style={{ ...s.card, marginTop: 16, marginBottom: 16, borderColor: '#06B6D4' }}>
          <div style={{ ...s.cardHeader, borderColor: '#06B6D4' }}>
            <span style={{ ...s.cardTitle, color: '#06B6D4' }}>
              <Activity size={14} /> GA4 Web Analytics — Eventos & Funnel (30 días)
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            
            {/* Ecommerce Events */}
            {ga4Insights.events?.length > 0 && (
              <div style={{ background: 'var(--surface)', borderRadius: 8, padding: 12, border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#059669', marginBottom: 8, textTransform: 'uppercase' }}>Eventos E-com</div>
                {ga4Insights.events
                  .filter(e => ['purchase', 'add_to_cart', 'view_item', 'begin_checkout', 'add_payment_info', 'view_cart'].includes(e.eventName))
                  .map((ev, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < 5 ? '1px solid var(--border-subtle)' : 'none', fontSize: 12 }}>
                      <span style={{ color: 'var(--on-surface-variant)' }}>{ev.eventName}</span>
                      <span style={{ fontWeight: 700, color: 'var(--on-surface)', fontFamily: 'JetBrains Mono, monospace' }}>{ev.eventCount?.toLocaleString('es-CO')}</span>
                    </div>
                  ))}
              </div>
            )}

            {/* Funnel: add_to_cart -> begin_checkout -> add_payment_info -> purchase */}
            {ga4Insights.events?.length > 0 && (() => {
              const getCount = (name) => ga4Insights.events.find(e => e.eventName === name)?.eventCount || 0;
              const atc = getCount('add_to_cart');
              const bc = getCount('begin_checkout');
              const api = getCount('add_payment_info');
              const pur = getCount('purchase');
              const vw = getCount('view_item');
              return atc || bc || api || pur || vw ? (
                <div style={{ background: 'var(--surface)', borderRadius: 8, padding: 12, border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#06B6D4', marginBottom: 10, textTransform: 'uppercase' }}>Funnel Checkout</div>
                  {[
                    { label: 'view_item', val: vw, color: '#6366f1' },
                    { label: 'add_to_cart', val: atc, color: '#06B6D4' },
                    { label: 'begin_checkout', val: bc, color: '#f59e0b' },
                    { label: 'add_payment_info', val: api, color: '#8b5cf6' },
                    { label: 'purchase', val: pur, color: '#059669' },
                  ].map((step, i) => (
                    <div key={step.label} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                        <span style={{ color: step.color, fontWeight: 600 }}>{step.label}</span>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--on-surface)' }}>{step.val?.toLocaleString('es-CO') || 0}</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--surface-container)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ 
                          width: atc > 0 ? `${(step.val / (i === 0 ? vw : atc)) * 100}%` : '0%', 
                          height: '100%', 
                          background: step.color,
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>
                  ))}
                  {atc && pur && (
                    <div style={{ marginTop: 8, fontSize: 11, color: 'var(--on-surface-variant)' }}>
                      Cart→Purchase: {((pur/atc)*100).toFixed(1)}% | Checkout→Purchase: {bc ? ((pur/bc)*100).toFixed(1)+'%' : 'N/A'}
                    </div>
                  )}
                </div>
              ) : null;
            })()}

            {/* Revenue & AOV from GA4 */}
            {ga4Insights.ecommerce && (
              <div style={{ background: 'var(--surface)', borderRadius: 8, padding: 12, border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#059669', marginBottom: 10, textTransform: 'uppercase' }}>Revenue GA4</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: 'var(--on-surface-variant)' }}>Revenue Total</span>
                  <span style={{ fontWeight: 700, color: 'var(--success)', fontFamily: 'JetBrains Mono, monospace' }}>${(ga4Insights.ecommerce.totalRevenue || 0).toLocaleString('es-CO', {minimumFractionDigits: 2})}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: 'var(--on-surface-variant)' }}>Pedidos</span>
                  <span style={{ fontWeight: 700, color: 'var(--on-surface)', fontFamily: 'JetBrains Mono, monospace' }}>{(ga4Insights.ecommerce.totalPurchases || 0).toLocaleString('es-CO')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: 'var(--on-surface-variant)' }}>AOV</span>
                  <span style={{ fontWeight: 700, color: 'var(--on-surface)', fontFamily: 'JetBrains Mono, monospace' }}>${(ga4Insights.ecommerce.averageOrderValue || 0).toLocaleString('es-CO', {minimumFractionDigits: 2})}</span>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {analysis && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Sparkles size={16} color="var(--primary)" />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--on-surface)' }}>Análisis CRO — {analysis.product_name}</span>
            <span style={s.crBadge(analysis.metrics.performance.color)}>{analysis.metrics.conversion_rate}% — {analysis.metrics.performance.label}</span>
          </div>

          <div style={s.grid2}>
            <div>
              <div style={s.analysisBox}>
                <div style={s.analysisLabel}><AlertTriangle size={12} /> Diagnóstico</div>
                <div style={s.analysisText}>{analysis.diagnostic.analysis}</div>
              </div>
              {analysis.diagnostic.errors_found?.length > 0 && (
                <div style={s.analysisBox}>
                  <div style={s.analysisLabel}>Errores Encontrados</div>
                  {analysis.diagnostic.errors_found.map((err, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4, fontSize: 13, color: 'var(--on-surface)' }}>
                      <span style={{ color: 'var(--error)', marginTop: 2 }}>×</span> {err}
                    </div>
                  ))}
                </div>
              )}
              <div style={s.analysisBox}>
                <div style={s.analysisLabel}>Framework Recomendado</div>
                <div style={{ ...s.tag, background: 'var(--primary-container)', color: 'var(--primary)' }}>{analysis.diagnostic.recommended_framework}</div>
              </div>
              <div style={s.analysisBox}>
                <div style={s.analysisLabel}>Impacto Esperado</div>
                <div style={s.analysisText}>{analysis.expected_impact}</div>
              </div>
            </div>

            <div>
              <div style={s.copyCard}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ ...s.analysisLabel, marginBottom: 0 }}><TrendingUp size={12} /> Copy Optimizado</div>
                  <button onClick={() => copyToClipboard(`${analysis.optimized_copy.title}\n\n${analysis.optimized_copy.description}\n\nCTA: ${analysis.optimized_copy.cta}`, 'full')} style={{ ...s.tag, background: 'var(--success-container)', color: 'var(--success)', cursor: 'pointer', border: 'none' }}>
                    {copiedField === 'full' ? <CheckCircle2 size={10} /> : <Copy size={10} />} {copiedField === 'full' ? 'Copiado' : 'Copiar todo'}
                  </button>
                </div>
                <div style={s.copyTitle}>{analysis.optimized_copy.title}</div>
                <div style={s.copyDesc}>{analysis.optimized_copy.description}</div>
                <div style={{ marginBottom: 12 }}>
                  <span style={s.ctaButton}>{analysis.optimized_copy.cta}</span>
                </div>
                {analysis.optimized_copy.social_proof && (
                  <div style={{ ...s.tag, background: 'rgba(61,90,153,0.1)', color: 'var(--primary)', marginBottom: 6 }}>
                    <CheckCircle2 size={10} /> {analysis.optimized_copy.social_proof}
                  </div>
                )}
                {analysis.optimized_copy.urgency && (
                  <div style={{ ...s.tag, background: 'var(--warning-container)', color: 'var(--warning)' }}>
                    <Zap size={10} /> {analysis.optimized_copy.urgency}
                  </div>
                )}

                <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => applyCopyToTiendanube(true)}
                    disabled={applyingCopy}
                    style={{ ...s.btnSecondary, fontSize: 12, padding: '6px 12px' }}
                  >
                    {applyingCopy ? <Loader2 size={12} className="spin" /> : <Eye size={12} />}
                    Preview en TN
                  </button>
                  <button
                    onClick={() => applyCopyToTiendanube(false)}
                    disabled={applyingCopy || appliedSuccess}
                    style={{
                      ...s.btnPrimary,
                      fontSize: 12,
                      padding: '6px 14px',
                      background: appliedSuccess ? 'var(--success)' : 'var(--primary)',
                      letterSpacing: '0.03em',
                    }}
                  >
                    {applyingCopy ? <Loader2 size={12} className="spin" /> : appliedSuccess ? <CheckCircle2 size={12} /> : <Send size={12} />}
                    {appliedSuccess ? 'Aplicado en TN' : 'Aplicar 1-Click en TiendaNube'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAnalyzing && (
        <div style={s.loader}>
          <Loader2 size={20} className="spin" /> Analizando copy del producto con IA...
        </div>
      )}

      {batchResults && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ ...s.card, marginBottom: 12 }}>
            <div style={s.cardHeader}>
              <span style={s.cardTitle}><BarChart3 size={12} /> Resultados del Análisis Batch</span>
              <span style={s.badge}>{batchResults.total_analyzed} productos analizados</span>
            </div>
            <div style={s.grid3}>
              <div><span style={s.kpiLabel}>CR Promedio:</span> <strong>{batchResults.summary.average_conversion_rate}%</strong></div>
              <div><span style={s.kpiLabel}>Críticos:</span> <strong style={{ color: 'var(--error)' }}>{batchResults.summary.critical_products}</strong></div>
              <div><span style={s.kpiLabel}>Bajo rendimiento:</span> <strong style={{ color: 'var(--warning)' }}>{batchResults.summary.below_products}</strong></div>
            </div>
          </div>
          {batchResults.results.map((r, i) => (
            <div key={i} style={{ ...s.productRow, cursor: 'default' }}>
              <span style={s.productName}>{r.product_name}</span>
              <span style={s.crBadge(r.metrics.performance.color)}>{r.metrics.conversion_rate}%</span>
              <span style={s.productMeta}>{r.diagnostic.framework}</span>
              <span style={{ ...s.tag, background: 'var(--success-container)', color: 'var(--success)', fontSize: 10 }}>{r.expected_impact?.substring(0, 40)}...</span>
            </div>
          ))}
        </div>
      )}

      {!isAnalyzing && !analysis && (
        <div>
          <div style={{ ...s.cardHeader, background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: '8px 8px 0 0', padding: '10px 14px' }}>
            <span style={s.cardTitle}>Productos para Análisis</span>
            <button onClick={fetchProducts} style={{ ...s.btnSecondary, padding: '4px 10px', fontSize: 11 }}><RefreshCw size={12} /></button>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: 12, maxHeight: 500, overflow: 'auto' }}>
            {products.length === 0 ? (
              <div style={s.emptyState}>
                <BarChart3 size={32} />
                <div style={{ fontSize: 14 }}>No hay productos cargados</div>
                <div style={{ fontSize: 12 }}>Ejecuta /api/cron/sync para cargar datos de TiendaNube</div>
              </div>
            ) : (
              products.map((p, i) => {
                const views = p.estimated_views || p.views || 100;
                const orders = p.orders || 1;
                const cr = p.conversion_rate || calculateCR(views, orders);
                const perf = p.performance || classifyPerformance(cr);
                const revenue = p.revenue || parseFloat(p.variants?.[0]?.price || 0) * orders;
                return (
                  <div key={p.id || i} style={s.productRow} onClick={() => analyzeProduct(p, { estimated_views: views, orders, revenue })} onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'var(--primary-container)'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.background = 'transparent'; }}>
                    <div style={{ flex: 1 }}>
                      <div style={s.productName}>{typeof p.name === 'object' ? p.name.es || Object.values(p.name)[0] : p.name}</div>
                      <div style={s.productMeta}><Eye size={10} style={{ marginRight: 3 }} />{views} vistas · <ShoppingCart size={10} style={{ marginRight: 3 }} />{orders} compras · <DollarSign size={10} style={{ marginRight: 3 }} />${revenue.toLocaleString('es-CO')}</div>
                    </div>
                    <span style={s.crBadge(perf.color)}>{cr}% — {perf.label}</span>
                    <ChevronRight size={16} color="var(--on-surface-variant)" />
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
