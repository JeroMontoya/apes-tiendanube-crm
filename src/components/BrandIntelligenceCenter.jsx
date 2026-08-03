import React, { useState, useEffect, useCallback } from 'react';
import {
  Brain, Activity, TrendingUp, TrendingDown, Minus, AlertTriangle,
  Zap, Target, Eye, BarChart3, ShoppingCart, Globe, Search,
  Shield, ArrowRight, Clock, Sparkles, Loader2, RefreshCw,
  CheckCircle2, XCircle, ChevronDown, ChevronUp, Lightbulb,
  DollarSign, Users, Package, Star
} from 'lucide-react';

const COLORS = {
  primary: '#6366F1', success: '#06B6D4', warning: 'var(--primary-container)',
  danger: '#E11D48', info: '#0EA5E9', purple: '#8B5CF6',
  pink: '#8B5CF6', teal: '#14B8A6',
};

const gradeColors = {
  Excelente: COLORS.success, Bueno: COLORS.info, Regular: COLORS.warning,
  'Necesita atención': '#F97316', Crítico: COLORS.danger,
};

function ScoreGauge({ score, label, size = 160 }) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(100, Math.max(0, score));
  const offset = circumference - (pct / 100) * circumference * 0.75;
  const color = pct >= 80 ? COLORS.success : pct >= 60 ? COLORS.info : pct >= 40 ? COLORS.warning : COLORS.danger;

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(135deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke="var(--outline)" strokeWidth={10}
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`} strokeLinecap="round" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={10}
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.5s ease, stroke 0.5s' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 36, fontWeight: 800, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 11, color: 'var(--on-surface-variant)', marginTop: 4 }}>{label || 'de 100'}</span>
      </div>
    </div>
  );
}

function MiniGauge({ label, score, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', background: `conic-gradient(${color} ${score * 3.6}deg, var(--outline) 0deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color }}>{score}</span>
        </div>
      </div>
      <span style={{ fontSize: 10, color: 'var(--on-surface-variant)', textAlign: 'center', lineHeight: 1.2 }}>{label}</span>
    </div>
  );
}

function TrendIcon({ trend }) {
  if (trend === 'up') return <TrendingUp size={16} color={COLORS.success} />;
  if (trend === 'down') return <TrendingDown size={16} color={COLORS.danger} />;
  return <Minus size={16} color="var(--on-surface-variant)" />;
}

function SeverityBadge({ severity }) {
  const styles = {
    critical: { bg: 'rgba(239,68,68,0.15)', color: COLORS.danger, icon: XCircle },
    warning: { bg: 'rgba(6, 182, 212,0.15)', color: COLORS.warning, icon: AlertTriangle },
    info: { bg: 'rgba(14,165,233,0.15)', color: COLORS.info, icon: Lightbulb },
  };
  const s = styles[severity] || styles.info;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 6, background: s.bg, color: s.color, fontSize: 11, fontWeight: 600 }}>
      <s.icon size={12} /> {severity}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const color = priority <= 3 ? COLORS.danger : priority <= 6 ? COLORS.warning : COLORS.info;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 6, background: `${color}22`, color, fontSize: 11, fontWeight: 700 }}>
      {priority}
    </span>
  );
}

export default function BrandIntelligenceCenter({ session }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);

  const fetchIntelligence = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session: s } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      const res = await fetch('/api/ai/brand-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s?.access_token || ''}` },
      });
      const result = await res.json();
      if (!result.ok) throw new Error(result.error || 'Error generating intelligence');
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchIntelligence(); }, [fetchIntelligence]);

  const toggle = (section) => setExpandedSection(expandedSection === section ? null : section);

  const S = {
    card: { background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border-subtle)', overflow: 'hidden' },
    section: { padding: 24 },
    sectionTitle: { fontSize: 15, fontWeight: 700, color: 'var(--on-surface)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 },
    text: { fontSize: 14, color: 'var(--on-surface)', lineHeight: 1.7 },
    muted: { fontSize: 13, color: 'var(--on-surface-variant)', lineHeight: 1.6 },
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 500, gap: 16 }}>
        <div style={{ position: 'relative', width: 80, height: 80 }}>
          <Brain size={80} color={COLORS.purple} style={{ animation: 'pulse 2s infinite' }} />
          <Loader2 size={24} color="#fff" style={{ position: 'absolute', top: 28, left: 28, animation: 'spin 1s linear infinite' }} />
        </div>
        <h3 style={{ color: 'var(--on-surface)', margin: 0, fontSize: 18, fontWeight: 700 }}>Gemini está analizando tu marca...</h3>
        <p style={{ color: 'var(--on-surface-variant)', margin: 0, fontSize: 14, textAlign: 'center', maxWidth: 400 }}>
          Cruzando datos de TiendaNueve, Google Analytics, Meta Ads, Search Console y Merchant Center para generar inteligencia completa.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 48, gap: 16 }}>
        <XCircle size={48} color={COLORS.danger} />
        <h3 style={{ color: 'var(--on-surface)', margin: 0 }}>Error al generar inteligencia</h3>
        <p style={{ color: 'var(--on-surface-variant)', margin: 0 }}>{error}</p>
        <button onClick={fetchIntelligence} style={{ display: 'flex', alignItems: 'center', gap: 6, background: COLORS.primary, color: 'var(--on-surface)', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
          <RefreshCw size={16} /> Reintentar
        </button>
      </div>
    );
  }

  if (!data?.intelligence) return null;

  const intel = data.intelligence;
  const hs = intel.brandHealthScore || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 0, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Brain size={28} color="#fff" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--on-surface)' }}>Centro de Inteligencia de Marca</h2>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--on-surface-variant)' }}>Análisis completo con Gemini AI · {new Date(data.timestamp).toLocaleString('es-CO')}</p>
          </div>
        </div>
        <button onClick={fetchIntelligence} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface)', color: 'var(--on-surface)', border: '1px solid var(--border-subtle)', padding: '8px 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
          <RefreshCw size={14} /> Actualizar análisis
        </button>
      </div>

      {/* Health Score + Executive Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
        <div style={S.card}>
          <div style={{ ...S.section, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: 1 }}>Health Score</div>
            <ScoreGauge score={hs.score || 0} label={hs.label} />
            <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {hs.breakdown && Object.entries(hs.breakdown).map(([key, val]) => {
                const labels = { acquisition: 'Adquisición', retention: 'Retención', revenue: 'Revenue', seo: 'SEO', ads: 'Ads', products: 'Productos' };
                const c = val >= 70 ? COLORS.success : val >= 40 ? COLORS.warning : COLORS.danger;
                return <MiniGauge key={key} label={labels[key]} score={val} color={c} />;
              })}
            </div>
          </div>
        </div>

        <div style={S.card}>
          <div style={S.section}>
            <div style={S.sectionTitle}><Eye size={18} color={COLORS.info} /> Resumen Ejecutivo</div>
            <p style={S.text}>{intel.executiveSummary}</p>
            {intel.competitivePosition && (
              <div style={{ marginTop: 16, padding: 16, borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.primary, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}><Shield size={14} /> Posición Competitiva</div>
                <p style={{ ...S.muted, margin: 0 }}>{intel.competitivePosition}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Growth Trends */}
      {intel.growthTrends?.length > 0 && (
        <div style={S.card}>
          <div style={S.section}>
            <div style={S.sectionTitle}><TrendingUp size={18} color={COLORS.success} /> Tendencias de Crecimiento</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {intel.growthTrends.map((t, i) => (
                <div key={i} style={{ padding: 16, borderRadius: 10, background: 'var(--surface-container)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--on-surface)' }}>{t.metric}</span>
                    <TrendIcon trend={t.trend} />
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--on-surface)', marginBottom: 4 }}>{t.current}</div>
                  <p style={{ fontSize: 12, color: 'var(--on-surface-variant)', margin: '0 0 6px' }}>{t.insight}</p>
                  {t.forecast && <p style={{ fontSize: 11, color: COLORS.info, margin: 0, fontWeight: 600 }}>📈 {t.forecast}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Critical Alerts */}
      {intel.criticalAlerts?.length > 0 && (
        <div style={S.card}>
          <div style={S.section}>
            <div style={S.sectionTitle}><AlertTriangle size={18} color={COLORS.warning} /> Alertas Críticas ({intel.criticalAlerts.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {intel.criticalAlerts.map((a, i) => (
                <div key={i} style={{ padding: 16, borderRadius: 10, background: 'var(--surface-container)', borderLeft: `3px solid ${a.severity === 'critical' ? COLORS.danger : a.severity === 'warning' ? COLORS.warning : COLORS.info}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <SeverityBadge severity={a.severity} />
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'var(--glass-border)', color: 'var(--on-surface-variant)' }}>{a.category}</span>
                    <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--on-surface)', marginLeft: 'auto' }}>{a.title}</span>
                  </div>
                  <p style={{ ...S.muted, margin: '0 0 6px' }}>{a.detail}</p>
                  {a.recommendedAction && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: COLORS.success, fontWeight: 600 }}>
                      <Zap size={12} /> {a.recommendedAction}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Opportunities */}
      {intel.opportunities?.length > 0 && (
        <div style={S.card}>
          <div style={S.section}>
            <div style={S.sectionTitle}><Lightbulb size={18} color={COLORS.warning} /> Oportunidades ({intel.opportunities.length})</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 12 }}>
              {intel.opportunities.sort((a, b) => (a.priority || 99) - (b.priority || 99)).map((o, i) => (
                <div key={i} style={{ padding: 16, borderRadius: 10, background: 'var(--surface-container)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <PriorityBadge priority={o.priority} />
                    <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--on-surface)', flex: 1 }}>{o.title}</span>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(99,102,241,0.1)', color: COLORS.primary, fontWeight: 600 }}>{o.area}</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--on-surface-variant)', margin: 0, lineHeight: 1.5 }}>{o.description}</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 'auto' }}>
                    <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, background: 'rgba(16,185,129,0.1)', color: COLORS.success, fontWeight: 600 }}>💰 {o.estimatedImpact}</span>
                    <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, background: o.effort === 'low' ? 'rgba(16,185,129,0.1)' : o.effort === 'medium' ? 'rgba(6, 182, 212,0.1)' : 'rgba(239,68,68,0.1)', color: o.effort === 'low' ? COLORS.success : o.effort === 'medium' ? COLORS.warning : COLORS.danger, fontWeight: 600 }}>Esfuerzo: {o.effort}</span>
                    {o.timeframe && <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, background: 'rgba(14,165,233,0.1)', color: COLORS.info, fontWeight: 600 }}>⏱ {o.timeframe}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Channel Analysis */}
      {intel.channelAnalysis && (
        <div style={S.card}>
          <div style={S.section}>
            <div style={S.sectionTitle}><BarChart3 size={18} color={COLORS.purple} /> Análisis por Canal</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {Object.entries(intel.channelAnalysis).map(([channel, analysis]) => {
                const icons = { ecommerce: ShoppingCart, seo: Search, ads: Target, shoppingFeed: Package };
                const colors = { ecommerce: COLORS.primary, seo: COLORS.success, ads: COLORS.warning, shoppingFeed: COLORS.teal };
                const labels = { ecommerce: 'E-commerce', seo: 'SEO / Búsqueda', ads: 'Publicidad', shoppingFeed: 'Shopping Feed' };
                const Icon = icons[channel] || Globe;
                const c = colors[channel] || COLORS.info;
                return (
                  <div key={channel} style={{ padding: 16, borderRadius: 10, background: 'var(--surface-container)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <Icon size={18} color={c} />
                      <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--on-surface)' }}>{labels[channel] || channel}</span>
                    </div>
                    <p style={{ ...S.muted, margin: '0 0 10px' }}>{analysis.summary}</p>
                    {analysis.strengths?.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.success, textTransform: 'uppercase' }}>Fortalezas</span>
                        {analysis.strengths.map((s, i) => <div key={i} style={{ fontSize: 12, color: 'var(--on-surface-variant)', paddingLeft: 8, marginTop: 2 }}>✓ {s}</div>)}
                      </div>
                    )}
                    {analysis.weaknesses?.length > 0 && (
                      <div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.warning, textTransform: 'uppercase' }}>Debilidades</span>
                        {analysis.weaknesses.map((w, i) => <div key={i} style={{ fontSize: 12, color: 'var(--on-surface-variant)', paddingLeft: 8, marginTop: 2 }}>⚠ {w}</div>)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Action Plan */}
      {intel.actionPlan?.length > 0 && (
        <div style={S.card}>
          <div style={S.section}>
            <div style={S.sectionTitle}><Target size={18} color={COLORS.success} /> Plan de Acción</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {intel.actionPlan.map((a, i) => {
                const phaseColors = { inmediato: COLORS.danger, corto_plazo: COLORS.warning, mediano_plazo: COLORS.info };
                const phaseLabels = { inmediato: 'Inmediato', corto_plazo: 'Corto plazo', mediano_plazo: 'Mediano plazo' };
                const impactColors = { high: COLORS.danger, medium: COLORS.warning, low: COLORS.success };
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 10, background: 'var(--surface-container)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: `${phaseColors[a.phase] || COLORS.info}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                      <ArrowRight size={16} color={phaseColors[a.phase] || COLORS.info} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--on-surface)' }}>{a.action}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: `${phaseColors[a.phase] || COLORS.info}22`, color: phaseColors[a.phase] || COLORS.info, fontWeight: 600 }}>{phaseLabels[a.phase] || a.phase}</span>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'var(--glass-border)', color: 'var(--on-surface-variant)' }}>{a.owner}</span>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: `${impactColors[a.impact] || COLORS.info}22`, color: impactColors[a.impact] || COLORS.info, fontWeight: 600 }}>Impacto: {a.impact}</span>
                        {a.kpi && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(99,102,241,0.1)', color: COLORS.primary, fontWeight: 600 }}>KPI: {a.kpi}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* AI Deep Analysis */}
      {intel.aiAnalysis && (
        <div style={S.card}>
          <div style={S.section}>
            <div style={{ ...S.sectionTitle, cursor: 'pointer' }} onClick={() => toggle('aiAnalysis')}>
              <Sparkles size={18} color={COLORS.purple} /> Análisis Profundo de Gemini
              {expandedSection === 'aiAnalysis' ? <ChevronUp size={16} style={{ marginLeft: 'auto' }} /> : <ChevronDown size={16} style={{ marginLeft: 'auto' }} />}
            </div>
            {(expandedSection === 'aiAnalysis' || true) && (
              <div style={{ padding: 16, borderRadius: 10, background: 'rgba(139,92,246,0.04)', border: '1px solid rgba(139,92,246,0.1)' }}>
                <p style={{ ...S.text, margin: 0, whiteSpace: 'pre-wrap' }}>{intel.aiAnalysis}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
