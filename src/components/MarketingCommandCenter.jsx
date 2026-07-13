import React, { useState, useMemo, useCallback } from 'react';
import {
  Brain, Search, ShoppingCart, Target, Users, Filter, Lightbulb,
  ShoppingBag, TrendingUp, TrendingDown, DollarSign, Eye, AlertTriangle,
  CheckCircle, Package, BarChart2, ArrowUpRight, ArrowDownRight, RefreshCw,
  Download, Star, Clock, Zap, Shield, Globe, Activity, ChevronDown,
  ChevronRight, ExternalLink, ArrowRight, FileText, MousePointerClick,
  Crosshair, PieChart, Layers, Link, MessageSquare, Copy, Send,
  TrendingUp as TrendUp, Award, BarChart, Percent, Hash,
} from 'lucide-react';

const fmt = (n) => {
  if (n == null || isNaN(n)) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return Number(n).toLocaleString('es-AR');
};

const fmtCOP = (n) => {
  if (n == null || isNaN(n)) return '$0';
  return '$' + Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 });
};

const fmtPct = (n) => {
  if (n == null || isNaN(n)) return '0%';
  return (n * 100).toFixed(1) + '%';
};

const fmtDuration = (seconds) => {
  if (seconds == null || isNaN(seconds)) return '0s';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? m + 'm ' + s + 's' : s + 's';
};

const TABS = [
  { id: 'command', label: 'Centro de Mando', icon: Brain },
  { id: 'tiendanueve', label: 'TiendaNueve', icon: ShoppingBag },
  { id: 'funnel', label: 'Embudo', icon: Filter },
  { id: 'seo', label: 'SEO', icon: Search },
  { id: 'ecommerce', label: 'E-commerce', icon: ShoppingCart },
  { id: 'ads', label: 'Publicidad', icon: Target },
  { id: 'audiences', label: 'Audiencias', icon: Users },
  { id: 'competitors', label: 'Competencia', icon: Shield },
  { id: 'utm', label: 'UTM Builder', icon: Link },
  { id: 'reports', label: 'Reportes', icon: FileText },
  { id: 'ai', label: 'Asistente IA', icon: MessageSquare },
  { id: 'decisions', label: 'Decisiones', icon: Lightbulb },
];

const SCORE_COLORS = (score) => {
  if (score >= 70) return '#10b981';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
};

const S = {
  container: { background: '#0f1117', minHeight: '100vh', color: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', padding: '24px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  title: { fontSize: '28px', fontWeight: '700', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  subtitle: { fontSize: '14px', color: '#8b8fa3', marginTop: '4px' },
  tabBar: { display: 'flex', gap: '4px', marginBottom: '24px', background: '#1a1d27', borderRadius: '12px', padding: '4px', overflowX: 'auto' },
  tabButton: (active) => ({ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '8px', border: 'none', background: active ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'transparent', color: active ? '#ffffff' : '#8b8fa3', cursor: 'pointer', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap', transition: 'all 0.2s' }),
  card: { background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: '12px', padding: '20px', transition: 'all 0.2s' },
  cardHover: { background: '#1e2130' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  cardTitle: { fontSize: '16px', fontWeight: '600', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' },
  kpiCard: { background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' },
  kpiLabel: { fontSize: '12px', color: '#8b8fa3', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' },
  kpiValue: { fontSize: '24px', fontWeight: '700', color: '#ffffff' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' },
  grid5: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' },
  grid6: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px' },
  badge: (color) => ({ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', background: color + '20', color: color }),
  sectionGap: { marginBottom: '24px' },
  flexBetween: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  textSecondary: { color: '#8b8fa3', fontSize: '14px' },
  textSmall: { color: '#8b8fa3', fontSize: '12px' },
};

function ScoreGauge({ score, label, size = 80 }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = SCORE_COLORS(score);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2a2d3a" strokeWidth="6" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="6" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div style={{ position: 'relative', marginTop: -(size) + 'px', marginBottom: '0px', height: size, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: size }}>
        <span style={{ fontSize: size > 60 ? '20px' : '14px', fontWeight: '700', color: color }}>{Math.round(score)}</span>
      </div>
      <span style={{ fontSize: '12px', color: '#8b8fa3', fontWeight: '500', textAlign: 'center' }}>{label}</span>
    </div>
  );
}

function KPITile({ icon: Icon, label, value, trend, trendLabel, color }) {
  return (
    <div style={S.kpiCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={S.kpiLabel}>{label}</span>
        {Icon && (
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: (color || '#3b82f6') + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={16} color={color || '#3b82f6'} />
          </div>
        )}
      </div>
      <div style={S.kpiValue}>{value}</div>
      {trend != null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
          {trend >= 0 ? <ArrowUpRight size={14} color="#10b981" /> : <ArrowDownRight size={14} color="#ef4444" />}
          <span style={{ color: trend >= 0 ? '#10b981' : '#ef4444', fontWeight: '600' }}>
            {trend >= 0 ? '+' : ''}{typeof trend === 'number' ? trend.toFixed(1) : trend}%
          </span>
          {trendLabel && <span style={S.textSmall}>{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}

function InsightCard({ type, title, text, impact }) {
  const colorMap = { danger: '#ef4444', warning: '#f59e0b', success: '#10b981', tip: '#3b82f6', info: '#8b5cf6' };
  const iconMap = { danger: AlertTriangle, warning: AlertTriangle, success: CheckCircle, tip: Lightbulb, info: Zap };
  const color = colorMap[type] || '#3b82f6';
  const IconComp = iconMap[type] || Zap;
  return (
    <div style={{ ...S.card, borderLeft: '4px solid ' + color, padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconComp size={16} color={color} />
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#ffffff' }}>{title}</span>
        </div>
        {impact && <span style={S.badge(color)}>{impact}</span>}
      </div>
      <p style={{ fontSize: '13px', color: '#8b8fa3', margin: 0, lineHeight: '1.5' }}>{text}</p>
    </div>
  );
}

function SkeletonLoader() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{ ...S.card, height: '120px', background: 'linear-gradient(90deg, #1a1d27 25%, #2a2d3a 50%, #1a1d27 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
      ))}
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  );
}

function EmptyState({ icon: Icon, title, text }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: '16px' }}>
      {Icon && <Icon size={48} color="#2a2d3a" />}
      <span style={{ fontSize: '18px', fontWeight: '600', color: '#8b8fa3' }}>{title}</span>
      <span style={{ fontSize: '14px', color: '#555', textAlign: 'center', maxWidth: '400px' }}>{text}</span>
    </div>
  );
}

function MiniBar({ value, max, color, label }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
      {label && <span style={{ fontSize: '12px', color: '#8b8fa3', minWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>}
      <div style={{ flex: 1, height: '8px', background: '#2a2d3a', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ width: Math.min(pct, 100) + '%', height: '100%', background: color || '#3b82f6', borderRadius: '4px', transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ fontSize: '12px', color: '#ffffff', fontWeight: '600', minWidth: '40px', textAlign: 'right' }}>
        {typeof value === 'number' && value % 1 !== 0 ? value.toFixed(1) : value}
      </span>
    </div>
  );
}

function TrendBadge({ value }) {
  if (value == null) return null;
  const isPositive = value >= 0;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', background: isPositive ? '#10b98120' : '#ef444420', color: isPositive ? '#10b981' : '#ef4444' }}>
      {isPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
      {isPositive ? '+' : ''}{value.toFixed(1)}%
    </span>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
      {Icon && (
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={20} color="#ffffff" />
        </div>
      )}
      <div>
        <div style={{ fontSize: '18px', fontWeight: '700', color: '#ffffff' }}>{title}</div>
        {subtitle && <div style={{ fontSize: '13px', color: '#8b8fa3', marginTop: '2px' }}>{subtitle}</div>}
      </div>
    </div>
  );
}

function SparkLine({ data, color, height = 40, width = '100%' }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return x + ',' + y;
  }).join(' ');
  return (
    <svg width={width} height={height} viewBox={'0 0 100 ' + height} preserveAspectRatio="none" style={{ display: 'block' }}>
      <polyline points={points} fill="none" stroke={color || '#3b82f6'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DataTable({ columns, rows, maxHeight }) {
  return (
    <div style={{ overflowX: 'auto', maxHeight: maxHeight || 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} style={{ textAlign: col.align || 'left', padding: '8px 12px', color: '#8b8fa3', borderBottom: '1px solid #2a2d3a', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rIdx) => (
            <tr key={rIdx} style={{ transition: 'background 0.15s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#1e2130'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              {columns.map((col, cIdx) => (
                <td key={cIdx} style={{ padding: '8px 12px', color: col.color || '#ffffff', textAlign: col.align || 'left', borderBottom: '1px solid #1a1d27', fontWeight: col.bold ? '600' : '400', maxWidth: col.maxWidth || 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: col.wrap ? 'normal' : 'nowrap' }}>
                  {col.render ? col.render(row[col.key], row) : (row[col.key] != null ? row[col.key] : 'N/A')}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} style={{ padding: '24px', textAlign: 'center', color: '#8b8fa3' }}>No hay datos disponibles</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function DonutChart({ segments, size = 120, thickness = 12 }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  let accumulated = 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {segments.map((seg, idx) => {
          const pct = seg.value / total;
          const dashLen = pct * circ;
          const dashOff = -accumulated * circ;
          accumulated += pct;
          return (
            <circle key={idx} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={seg.color} strokeWidth={thickness} strokeDasharray={dashLen + ' ' + (circ - dashLen)} strokeDashoffset={dashOff} />
          );
        })}
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {segments.map((seg, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: seg.color, flexShrink: 0 }} />
            <span style={{ color: '#8b8fa3' }}>{seg.label}</span>
            <span style={{ color: '#ffffff', fontWeight: '600' }}>{total > 0 ? ((seg.value / total) * 100).toFixed(1) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatComparison({ label, valueA, valueB, labelA, labelB, colorA, colorB }) {
  return (
    <div style={{ padding: '12px', background: '#151820', borderRadius: '8px' }}>
      <div style={{ fontSize: '12px', color: '#8b8fa3', marginBottom: '8px' }}>{label}</div>
      <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '11px', color: colorA || '#3b82f6', marginBottom: '2px' }}>{labelA}</div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#ffffff' }}>{valueA}</div>
        </div>
        <div style={{ width: '1px', background: '#2a2d3a' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '11px', color: colorB || '#f59e0b', marginBottom: '2px' }}>{labelB}</div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#ffffff' }}>{valueB}</div>
        </div>
      </div>
    </div>
  );
}

function ProgressRing({ value, max, color, size = 60, label }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? value / max : 0;
  const offset = circ - pct * circ;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2a2d3a" strokeWidth="4" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color || '#3b82f6'} strokeWidth="4" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div style={{ position: 'relative', marginTop: -(size) + 'px', height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', width: size }}>
        <span style={{ fontSize: '12px', fontWeight: '700', color: color || '#ffffff' }}>{(pct * 100).toFixed(0)}%</span>
      </div>
      {label && <span style={{ fontSize: '10px', color: '#8b8fa3' }}>{label}</span>}
    </div>
  );
}

function AlertBanner({ type, title, children }) {
  const colorMap = { danger: '#ef4444', warning: '#f59e0b', success: '#10b981', info: '#3b82f6' };
  const color = colorMap[type] || '#3b82f6';
  const icons = { danger: AlertTriangle, warning: AlertTriangle, success: CheckCircle, info: Zap };
  const Icon = icons[type] || Zap;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', background: color + '10', border: '1px solid ' + color + '30', borderRadius: '8px', marginBottom: '16px' }}>
      <Icon size={20} color={color} style={{ flexShrink: 0, marginTop: '2px' }} />
      <div>
        <div style={{ fontSize: '14px', fontWeight: '600', color: color, marginBottom: '4px' }}>{title}</div>
        <div style={{ fontSize: '13px', color: '#8b8fa3', lineHeight: '1.5' }}>{children}</div>
      </div>
    </div>
  );
}

function MetricRow({ icon: Icon, label, value, subtext, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid #2a2d3a' }}>
      {Icon && (
        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: (color || '#3b82f6') + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={14} color={color || '#3b82f6'} />
        </div>
      )}
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: '13px', color: '#ffffff' }}>{label}</span>
        {subtext && <span style={{ fontSize: '11px', color: '#8b8fa3', marginLeft: '6px' }}>{subtext}</span>}
      </div>
      <span style={{ fontSize: '14px', fontWeight: '600', color: color || '#ffffff' }}>{value}</span>
    </div>
  );
}

function DualBar({ label, valueA, valueB, labelA, labelB, colorA, colorB, maxVal }) {
  const max = maxVal || Math.max(valueA, valueB, 1);
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '12px', color: '#8b8fa3', marginBottom: '6px' }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '10px', color: colorA || '#3b82f6', minWidth: '60px' }}>{labelA}</span>
          <div style={{ flex: 1, height: '6px', background: '#2a2d3a', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: (valueA / max) * 100 + '%', height: '100%', background: colorA || '#3b82f6', borderRadius: '3px' }} />
          </div>
          <span style={{ fontSize: '11px', fontWeight: '600', color: '#ffffff', minWidth: '40px', textAlign: 'right' }}>{valueA}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '10px', color: colorB || '#f59e0b', minWidth: '60px' }}>{labelB}</span>
          <div style={{ flex: 1, height: '6px', background: '#2a2d3a', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: (valueB / max) * 100 + '%', height: '100%', background: colorB || '#f59e0b', borderRadius: '3px' }} />
          </div>
          <span style={{ fontSize: '11px', fontWeight: '600', color: '#ffffff', minWidth: '40px', textAlign: 'right' }}>{valueB}</span>
        </div>
      </div>
    </div>
  );
}

function generateCommandInsights(ga4, gsc, mc, meta, gads, tt, tn, clients) {
  const insights = [];
  if (tn && tn.totalOrders > 0 && tn.paidOrders > 0) {
    const successRate = tn.paidOrders / tn.totalOrders;
    if (successRate < 0.6) {
      insights.push({ type: 'danger', title: 'Baja tasa de éxito en órdenes', text: 'Solo el ' + (successRate * 100).toFixed(1) + '% de las órdenes se completan. Revisar flujo de checkout y métodos de pago.', impact: 'Alto' });
    }
  }
  if (tn && tn.avgTicket && tn.avgTicket < 50000) {
    insights.push({ type: 'warning', title: 'Ticket promedio bajo', text: 'El ticket promedio es ' + fmtCOP(tn.avgTicket) + '. Implementar cross-sell y upsell para aumentar el valor por orden.', impact: 'Medio' });
  }
  if (gsc && gsc.avgPosition && gsc.avgPosition > 20) {
    insights.push({ type: 'warning', title: 'Posición promedio en buscadores mejorable', text: 'La posición promedio es ' + gsc.avgPosition.toFixed(1) + '. Optimizar meta titles y descriptions.', impact: 'Alto' });
  }
  if (gsc && gsc.avgCtr != null && gsc.avgCtr < 0.02) {
    insights.push({ type: 'tip', title: 'CTR bajo en resultados de búsqueda', text: 'El CTR promedio es ' + (gsc.avgCtr * 100).toFixed(1) + '%. Mejorar snippets y datos estructurados.', impact: 'Medio' });
  }
  if (meta && meta.roas && meta.roas < 2) {
    insights.push({ type: 'danger', title: 'ROAS de Meta bajo el objetivo', text: 'El ROAS en Meta Ads es ' + meta.roas.toFixed(1) + 'x. Revisar segmentación y creativos.', impact: 'Alto' });
  }
  if (gads && gads.roas && gads.roas < 2) {
    insights.push({ type: 'warning', title: 'ROAS de Google Ads mejorable', text: 'El ROAS en Google Ads es ' + gads.roas.toFixed(1) + 'x. Optimizar palabras clave negativas.', impact: 'Alto' });
  }
  if (tt && tt.roas && tt.roas < 1.5) {
    insights.push({ type: 'warning', title: 'ROAS de TikTok bajo', text: 'El ROAS en TikTok es ' + tt.roas.toFixed(1) + 'x. Evaluar creativos y audiencias.', impact: 'Medio' });
  }
  if (mc && mc.totalProducts > 0) {
    const inStockPct = mc.inStock / mc.totalProducts;
    if (inStockPct < 0.7) {
      insights.push({ type: 'danger', title: 'Inventario crítico', text: 'Solo el ' + (inStockPct * 100).toFixed(0) + '% de los productos tienen stock.', impact: 'Alto' });
    }
  }
  if (clients && clients.length > 0) {
    const vipCount = clients.filter((c) => c.segmentTags && c.segmentTags.includes('vip')).length;
    if (vipCount < clients.length * 0.05) {
      insights.push({ type: 'tip', title: 'Pocos clientes VIP', text: 'Solo ' + vipCount + ' de ' + clients.length + ' clientes son VIP. Implementar programa de fidelización.', impact: 'Medio' });
    }
  }
  if (ga4 && ga4.bounceRate && ga4.bounceRate > 0.6) {
    insights.push({ type: 'warning', title: 'Tasa de rebote alta', text: 'El bounce rate es ' + (ga4.bounceRate * 100).toFixed(1) + '%. Mejorar relevancia del contenido.', impact: 'Alto' });
  }
  if (tn && tn.cancelledOrders && tn.paidOrders > 0) {
    const cancelRate = tn.cancelledOrders / tn.totalOrders;
    if (cancelRate > 0.15) {
      insights.push({ type: 'danger', title: 'Alta tasa de cancelación', text: 'El ' + (cancelRate * 100).toFixed(1) + '% de órdenes se cancelan. Revisar causas principales.', impact: 'Alto' });
    }
  }
  if (tn && tn.couponUsage && tn.couponUsage.count > 0 && tn.totalOrders > 0) {
    const couponPct = tn.couponUsage.count / tn.totalOrders;
    if (couponPct > 0.3) {
      insights.push({ type: 'tip', title: 'Alto uso de cupones', text: 'El ' + (couponPct * 100).toFixed(0) + '% de órdenes usan cupones. Analizar si aumentan el LTV.', impact: 'Medio' });
    }
  }
  if (gsc && gsc.totalClicks && ga4 && ga4.global && ga4.global.sessions) {
    const seoToSessionRatio = ga4.global.sessions > 0 ? gsc.totalClicks / ga4.global.sessions : 0;
    if (seoToSessionRatio < 0.3 && gsc.totalClicks > 100) {
      insights.push({ type: 'tip', title: 'Tráfico SEO no se convierte', text: 'Las sesiones orgánicas no reflejan los clicks de GSC. Verificar tracking y atribución.', impact: 'Medio' });
    }
  }
  return insights.slice(0, 8);
}

function generatePriorities(ga4, gsc, mc, meta, gads, tt, tn, clients) {
  const priorities = [];
  if (tn && tn.totalOrders > 0) {
    const pending = tn.pendingOrders || 0;
    if (pending > 0) {
      priorities.push({ id: 1, title: 'Resolver órdenes pendientes', description: pending + ' órdenes esperando procesamiento.', impact: 'alto', effort: 'medio', revenue: pending * (tn.avgTicket || 0), platform: 'TiendaNueve' });
    }
  }
  if (mc && mc.outOfStock > 0) {
    priorities.push({ id: 2, title: 'Reabastecer productos sin stock', description: mc.outOfStock + ' productos sin stock disponibles.', impact: 'alto', effort: 'medio', revenue: 0, platform: 'Catálogo' });
  }
  if (gsc && gsc.avgPosition > 15) {
    priorities.push({ id: 3, title: 'Mejorar posicionamiento SEO', description: 'Posición promedio ' + gsc.avgPosition.toFixed(1) + '. Optimizar contenido.', impact: 'alto', effort: 'alto', revenue: 0, platform: 'SEO' });
  }
  if (meta && meta.roas < 2) {
    priorities.push({ id: 4, title: 'Optimizar campañas Meta Ads', description: 'ROAS ' + meta.roas.toFixed(1) + 'x por debajo del objetivo.', impact: 'alto', effort: 'medio', revenue: meta.revenue || 0, platform: 'Meta Ads' });
  }
  if (gads && gads.roas < 2) {
    priorities.push({ id: 5, title: 'Optimizar Google Ads', description: 'ROAS ' + gads.roas.toFixed(1) + 'x. Revisar palabras clave.', impact: 'medio', effort: 'medio', revenue: gads.revenue || 0, platform: 'Google Ads' });
  }
  if (clients && clients.length > 0) {
    const churnRisk = clients.filter((c) => c.segmentTags && c.segmentTags.includes('riesgo_churn')).length;
    if (churnRisk > 0) {
      priorities.push({ id: 6, title: 'Campaña de retención churn', description: churnRisk + ' clientes en riesgo de abandono.', impact: 'medio', effort: 'bajo', revenue: 0, platform: 'CRM' });
    }
  }
  if (ga4 && ga4.bounceRate > 0.5) {
    priorities.push({ id: 7, title: 'Mejorar Landing Pages', description: 'Bounce rate ' + (ga4.bounceRate * 100).toFixed(1) + '%.', impact: 'medio', effort: 'medio', revenue: 0, platform: 'Website' });
  }
  if (tt && tt.roas < 1.5) {
    priorities.push({ id: 8, title: 'Evaluar presencia en TikTok', description: 'ROAS ' + tt.roas.toFixed(1) + 'x. Analizar ROI.', impact: 'bajo', effort: 'bajo', revenue: tt.revenue || 0, platform: 'TikTok' });
  }
  if (tn && tn.totalOrders > 0) {
    const repeatRate = tn.topClients ? tn.topClients.filter((c) => c.purchases > 1).length / Math.max(tn.topClients.length, 1) : 0;
    if (repeatRate < 0.2 && tn.totalOrders > 20) {
      priorities.push({ id: 9, title: 'Mejorar tasa de recompra', description: 'Menos del 20% de clientes compran más de una vez. Crear estrategia de retención.', impact: 'alto', effort: 'medio', revenue: 0, platform: 'CRM' });
    }
  }
  if (gsc && gsc.totalImpressions > 0 && gsc.avgCtr < 0.02) {
    priorities.push({ id: 10, title: 'Mejorar CTR orgánico', description: 'CTR promedio ' + (gsc.avgCtr * 100).toFixed(1) + '% muy bajo. Optimizar meta descriptions.', impact: 'medio', effort: 'bajo', revenue: 0, platform: 'SEO' });
  }
  return priorities.slice(0, 10);
}

function getInsightIcon(type) {
  switch (type) { case 'danger': return AlertTriangle; case 'warning': return AlertTriangle; case 'success': return CheckCircle; case 'tip': return Lightbulb; default: return Zap; }
}

function getInsightColor(type) {
  switch (type) { case 'danger': return '#ef4444'; case 'warning': return '#f59e0b'; case 'success': return '#10b981'; case 'tip': return '#3b82f6'; default: return '#8b5cf6'; }
}

function formatCurrency(value) {
  if (value == null || isNaN(value)) return '$0';
  if (Math.abs(value) >= 1000000000) return '$' + (value / 1000000000).toFixed(1) + 'B';
  if (Math.abs(value) >= 1000000) return '$' + (value / 1000000).toFixed(1) + 'M';
  if (Math.abs(value) >= 1000) return '$' + (value / 1000).toFixed(1) + 'K';
  return '$' + value.toLocaleString('es-AR', { maximumFractionDigits: 0 });
}

function getScoreLabel(score) {
  if (score >= 80) return 'Excelente';
  if (score >= 70) return 'Bueno';
  if (score >= 50) return 'Regular';
  if (score >= 30) return 'Mejorable';
  return 'Crítico';
}

function getStatusColor(status) {
  switch (status) {
    case 'excelente': return '#10b981';
    case 'bueno': return '#10b981';
    case 'regular': return '#f59e0b';
    case 'mejorable': return '#f59e0b';
    case 'critico': return '#ef4444';
    default: return '#8b8fa3';
  }
}

function getPlatformIcon(platform) {
  switch (platform) {
    case 'Meta Ads': return Target;
    case 'Google Ads': return Search;
    case 'TikTok': return Zap;
    case 'SEO': return Globe;
    case 'CRM': return Users;
    case 'Website': return MousePointerClick;
    case 'TiendaNueve': return ShoppingBag;
    case 'Catálogo': return Package;
    default: return Zap;
  }
}

function calculateGrowthRate(current, previous) {
  if (!previous || previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function getComparisonLabel(value, threshold) {
  if (value > threshold * 1.2) return 'Muy por encima';
  if (value > threshold * 1.05) return 'Por encima';
  if (value >= threshold * 0.95) return 'En rango';
  if (value >= threshold * 0.8) return 'Por debajo';
  return 'Muy por debajo';
}

export default function MarketingCommandCenter({
  ga4Insights, gscPerformance, mcProducts, metaInsights, googleAdsData, tiktokData,
  unifiedClients, rawOrders, tiendanubeProducts, competitors, landscape, aiInsights,
  workspaceData, dateRange,
}) {
  const [activeTab, setActiveTab] = useState('command');

  const scores = useMemo(() => {
    let seo = null, ecom = null, ads = null, catalog = null;
    if (gscPerformance) {
      const avgPos = gscPerformance.avgPosition || 20;
      const avgCtr = gscPerformance.avgCtr || 0;
      const top3 = gscPerformance.top3Count || 0;
      const totalQueries = gscPerformance.totalQueries || 1;
      const posScore = Math.max(0, 100 - (avgPos - 1) * 5);
      const ctrScore = Math.min(100, avgCtr * 500);
      const top3Score = Math.min(100, (top3 / totalQueries) * 300);
      seo = Math.round(posScore * 0.4 + ctrScore * 0.3 + top3Score * 0.3);
    }
    if (ga4Insights) {
      const br = ga4Insights.bounceRate || 0.5;
      const dur = ga4Insights.avgDuration || 60;
      const purch = ga4Insights.ecommerce ? ga4Insights.ecommerce.purchases || 0 : 0;
      const sessions = ga4Insights.global ? ga4Insights.global.sessions || 1 : 1;
      const brScore = Math.max(0, 100 - br * 100);
      const durScore = Math.min(100, (dur / 180) * 100);
      const convRate = purch / sessions;
      const convScore = Math.min(100, convRate * 2000);
      ecom = Math.round(brScore * 0.3 + durScore * 0.3 + convScore * 0.4);
    }
    let totalSpend = 0, totalRevenue = 0, totalConversions = 0;
    if (metaInsights) { totalSpend += metaInsights.spend || 0; totalRevenue += metaInsights.revenue || 0; totalConversions += metaInsights.conversions || 0; }
    if (googleAdsData) { totalSpend += googleAdsData.spend || 0; totalRevenue += googleAdsData.revenue || 0; totalConversions += googleAdsData.conversions || 0; }
    if (tiktokData) { totalSpend += tiktokData.spend || 0; totalRevenue += tiktokData.revenue || 0; totalConversions += tiktokData.conversions || 0; }
    if (totalSpend > 0) {
      const roas = totalRevenue / totalSpend;
      const roasScore = Math.min(100, roas * 25);
      const cpa = totalConversions > 0 ? totalSpend / totalConversions : 999;
      const cpaScore = Math.max(0, 100 - cpa / 10);
      ads = Math.round(roasScore * 0.6 + cpaScore * 0.4);
    }
    if (mcProducts && mcProducts.totalProducts > 0) {
      const inStockPct = mcProducts.inStock / mcProducts.totalProducts;
      const withDescPct = mcProducts.withDesc / mcProducts.totalProducts;
      const withGtinPct = mcProducts.withGtin / mcProducts.totalProducts;
      const withBrandPct = mcProducts.withBrand / mcProducts.totalProducts;
      catalog = Math.round((inStockPct * 0.35 + withDescPct * 0.25 + withGtinPct * 0.2 + withBrandPct * 0.2) * 100);
    }
    if (seo === null && ecom === null && ads === null && catalog === null) return null;
    const s = { seo: seo || 0, ecom: ecom || 0, ads: ads || 0, catalog: catalog || 0 };
    s.overall = Math.round(s.seo * 0.25 + s.ecom * 0.3 + s.ads * 0.25 + s.catalog * 0.2);
    return s;
  }, [gscPerformance, ga4Insights, metaInsights, googleAdsData, tiktokData, mcProducts]);

  const tnMetrics = useMemo(() => {
    if (!rawOrders || rawOrders.length === 0) {
      return { totalOrders: 0, paidOrders: 0, pendingOrders: 0, cancelledOrders: 0, refundedOrders: 0, totalRevenue: 0, avgTicket: 0, ordersByDate: [], topClients: [], segmentDistribution: {}, couponUsage: { count: 0, totalSaved: 0 }, shippingBreakdown: {}, productPerformance: {} };
    }
    const paid = rawOrders.filter((o) => o.financial_status === 'paid' || o.status === 'paid');
    const pending = rawOrders.filter((o) => o.financial_status === 'pending' || o.status === 'pending');
    const cancelled = rawOrders.filter((o) => o.financial_status === 'cancelled' || o.status === 'cancelled');
    const refunded = rawOrders.filter((o) => o.financial_status === 'refunded' || o.status === 'refunded');
    const totalRevenue = paid.reduce((sum, o) => sum + (parseFloat(o.total_price) || 0), 0);
    const avgTicket = paid.length > 0 ? totalRevenue / paid.length : 0;
    const dateMap = {};
    rawOrders.forEach((o) => { const d = (o.created_at || '').split('T')[0]; if (d) dateMap[d] = (dateMap[d] || 0) + 1; });
    const ordersByDate = Object.entries(dateMap).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));
    const clientMap = {};
    rawOrders.forEach((o) => {
      const email = o.email || (o.customer && o.customer.email) || '';
      if (email) {
        if (!clientMap[email]) clientMap[email] = { email, name: ((o.customer && o.customer.first_name) || '') + ' ' + ((o.customer && o.customer.last_name) || ''), totalSpent: 0, purchases: 0 };
        clientMap[email].totalSpent += parseFloat(o.total_price) || 0;
        clientMap[email].purchases += 1;
      }
    });
    const topClients = Object.values(clientMap).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 10);
    const segmentDistribution = {};
    if (unifiedClients) unifiedClients.forEach((c) => { (c.segmentTags || []).forEach((tag) => { segmentDistribution[tag] = (segmentDistribution[tag] || 0) + 1; }); });
    const couponOrders = rawOrders.filter((o) => o.discount_codes && o.discount_codes.length > 0);
    const totalSaved = couponOrders.reduce((sum, o) => sum + (parseFloat(o.total_discounts) || 0), 0);
    const shippingMap = {};
    rawOrders.forEach((o) => { if (o.shipping_lines) o.shipping_lines.forEach((s) => { const carrier = s.carrier_title || s.title || 'Desconocido'; shippingMap[carrier] = (shippingMap[carrier] || 0) + 1; }); });
    const productMap = {};
    rawOrders.forEach((o) => { if (o.line_items) o.line_items.forEach((li) => { productMap[li.title || 'Producto'] = (productMap[li.title || 'Producto'] || 0) + (li.quantity || 1); }); });
    return { totalOrders: rawOrders.length, paidOrders: paid.length, pendingOrders: pending.length, cancelledOrders: cancelled.length, refundedOrders: refunded.length, totalRevenue, avgTicket, ordersByDate, topClients, segmentDistribution, couponUsage: { count: couponOrders.length, totalSaved }, shippingBreakdown: shippingMap, productPerformance: productMap };
  }, [rawOrders, unifiedClients]);

  const tnClientSegments = useMemo(() => {
    if (!unifiedClients || unifiedClients.length === 0) return { nuevo: 0, repetidor: 0, fiel: 0, alto_valor: 0, vip: 0, riesgo_churn: 0, dormido: 0, activo_reciente: 0, sensible_precio: 0, dataQuality: { email: 0, phone: 0, dni: 0 } };
    const seg = { nuevo: 0, repetidor: 0, fiel: 0, alto_valor: 0, vip: 0, riesgo_churn: 0, dormido: 0, activo_reciente: 0, sensible_precio: 0 };
    let withEmail = 0, withPhone = 0, withDNI = 0;
    unifiedClients.forEach((c) => {
      (c.segmentTags || []).forEach((t) => { if (seg.hasOwnProperty(t)) seg[t]++; });
      if (c.email) withEmail++;
      if (c.phone) withPhone++;
      if (c.dni || c.document) withDNI++;
    });
    const total = unifiedClients.length;
    return { ...seg, dataQuality: { email: total > 0 ? withEmail / total : 0, phone: total > 0 ? withPhone / total : 0, dni: total > 0 ? withDNI / total : 0 } };
  }, [unifiedClients]);

  const funnelData = useMemo(() => {
    if (!ga4Insights) return null;
    const sessions = ga4Insights.global ? ga4Insights.global.sessions || 0 : 0;
    const productViews = ga4Insights.ecommerce ? ga4Insights.ecommerce.productViews || 0 : 0;
    const addToCart = ga4Insights.ecommerce ? ga4Insights.ecommerce.addToCart || 0 : 0;
    const beginCheckout = ga4Insights.ecommerce ? ga4Insights.ecommerce.beginCheckout || 0 : 0;
    const purchases = ga4Insights.ecommerce ? ga4Insights.ecommerce.purchases || 0 : 0;
    const stages = [
      { name: 'Sesiones', value: sessions },
      { name: 'Vistas de Producto', value: productViews },
      { name: 'Añadir al Carrito', value: addToCart },
      { name: 'Inicio de Checkout', value: beginCheckout },
      { name: 'Compras', value: purchases },
    ];
    return stages.map((s, i) => ({
      ...s,
      dropoff: i > 0 ? 1 - s.value / stages[i - 1].value : 0,
      retention: i > 0 ? s.value / stages[i - 1].value : 1,
      pctOfTotal: sessions > 0 ? s.value / sessions : 0,
    }));
  }, [ga4Insights]);

  const deviceData = useMemo(() => {
    if (!gscPerformance || !gscPerformance.deviceBreakdown) return null;
    return gscPerformance.deviceBreakdown;
  }, [gscPerformance]);

  const countryData = useMemo(() => {
    if (!gscPerformance || !gscPerformance.countryBreakdown) return [];
    return Object.entries(gscPerformance.countryBreakdown).map(([country, data]) => ({ country, ...data })).sort((a, b) => (b.clicks || 0) - (a.clicks || 0)).slice(0, 10);
  }, [gscPerformance]);

  const organicVsPaid = useMemo(() => {
    if (!ga4Insights || !ga4Insights.acquisition) return null;
    const acquisition = ga4Insights.acquisition;
    const organicChannels = ['Organic Search', 'Organic Social', 'Direct', 'Referral', 'Email'];
    const paidChannels = ['Paid Search', 'Paid Social', 'Display'];
    let organicTotal = 0, paidTotal = 0;
    const organicItems = [], paidItems = [];
    Object.entries(acquisition).forEach(([channel, data]) => {
      if (organicChannels.includes(channel)) { organicTotal += data.sessions || 0; organicItems.push({ channel, sessions: data.sessions || 0 }); }
      else if (paidChannels.includes(channel)) { paidTotal += data.sessions || 0; paidItems.push({ channel, sessions: data.sessions || 0 }); }
    });
    const total = organicTotal + paidTotal;
    return { organic: organicItems, paid: paidItems, organicTotal, paidTotal, total, organicPct: total > 0 ? organicTotal / total : 0, paidPct: total > 0 ? paidTotal / total : 0 };
  }, [ga4Insights]);

  const adSpend = useMemo(() => {
    const meta = metaInsights ? metaInsights.spend || 0 : 0;
    const gads = googleAdsData ? googleAdsData.spend || 0 : 0;
    const tt = tiktokData ? tiktokData.spend || 0 : 0;
    return { meta, gads, tt, total: meta + gads + tt };
  }, [metaInsights, googleAdsData, tiktokData]);

  const adConversions = useMemo(() => {
    const meta = metaInsights ? metaInsights.conversions || 0 : 0;
    const gads = googleAdsData ? googleAdsData.conversions || 0 : 0;
    const tt = tiktokData ? tiktokData.conversions || 0 : 0;
    return { meta, gads, tt, total: meta + gads + tt };
  }, [metaInsights, googleAdsData, tiktokData]);

  const adRevenue = useMemo(() => {
    const meta = metaInsights ? metaInsights.revenue || 0 : 0;
    const gads = googleAdsData ? googleAdsData.revenue || 0 : 0;
    const ttCampaigns = tiktokData && tiktokData.campaigns ? tiktokData.campaigns : [];
    const tt = ttCampaigns.reduce((sum, c) => sum + (c.revenue || 0), 0) || (tiktokData ? tiktokData.revenue || 0 : 0);
    return { meta, gads, tt, total: meta + gads + tt };
  }, [metaInsights, googleAdsData, tiktokData]);

  const insights = useMemo(() => {
    return generateCommandInsights(ga4Insights, gscPerformance, mcProducts, metaInsights, googleAdsData, tiktokData, tnMetrics, unifiedClients);
  }, [ga4Insights, gscPerformance, mcProducts, metaInsights, googleAdsData, tiktokData, tnMetrics, unifiedClients]);

  const priorities = useMemo(() => {
    return generatePriorities(ga4Insights, gscPerformance, mcProducts, metaInsights, googleAdsData, tiktokData, tnMetrics, unifiedClients);
  }, [ga4Insights, gscPerformance, mcProducts, metaInsights, googleAdsData, tiktokData, tnMetrics, unifiedClients]);

  const trendData = useMemo(() => {
    if (!ga4Insights || !ga4Insights.ecommerce || !ga4Insights.ecommerce.revenueByDate) return null;
    const revByDate = ga4Insights.ecommerce.revenueByDate;
    const entries = Object.entries(revByDate).map(([date, revenue]) => ({ date, revenue: revenue || 0 })).sort((a, b) => a.date.localeCompare(b.date));
    if (entries.length === 0) return null;
    const mid = Math.floor(entries.length / 2);
    const firstHalf = entries.slice(0, mid);
    const secondHalf = entries.slice(mid);
    const firstSum = firstHalf.reduce((s, e) => s + e.revenue, 0);
    const secondSum = secondHalf.reduce((s, e) => s + e.revenue, 0);
    const changePct = firstSum > 0 ? ((secondSum - firstSum) / firstSum) * 100 : 0;
    return { entries, firstSum, secondSum, changePct };
  }, [ga4Insights]);

  const crossInsights = useMemo(() => {
    const result = [];
    if (gscPerformance && tnMetrics) {
      const seoTraffic = gscPerformance.totalClicks || 0;
      const tnOrders = tnMetrics.paidOrders || 0;
      if (seoTraffic > 1000 && tnOrders < 10) {
        result.push({ title: 'Alto tráfico SEO, bajas conversiones TN', text: 'El tráfico orgánico es alto pero las órdenes son pocas. Posible problema de landing page.', platforms: ['SEO', 'TiendaNueve'], color: '#f59e0b' });
      }
    }
    if (adSpend.total > 0 && tnMetrics) {
      const tnRevenue = tnMetrics.totalRevenue || 0;
      const roas = tnRevenue / adSpend.total;
      if (roas < 1 && adSpend.total > 100) {
        result.push({ title: 'Gasto publicitario no recuperado', text: 'ROAS general ' + roas.toFixed(2) + 'x. El gasto en ads excede las ventas.', platforms: ['Meta Ads', 'Google Ads', 'TikTok', 'TiendaNueve'], color: '#ef4444' });
      }
    }
    if (metaInsights && tnMetrics) {
      const metaConv = metaInsights.conversions || 0;
      const tnPaid = tnMetrics.paidOrders || 0;
      if (metaConv > tnPaid * 1.5 && metaConv > 10) {
        result.push({ title: 'Discrepancia Meta vs TN', text: 'Meta reporta ' + metaConv + ' conversiones pero TN solo tiene ' + tnPaid + ' órdenes.', platforms: ['Meta Ads', 'TiendaNueve'], color: '#8b5cf6' });
      }
    }
    if (ga4Insights && tnMetrics) {
      const ga4Purchases = ga4Insights.ecommerce ? ga4Insights.ecommerce.purchases || 0 : 0;
      const tnPaid = tnMetrics.paidOrders || 0;
      if (ga4Purchases > tnPaid * 2 && ga4Purchases > 5) {
        result.push({ title: 'GA4 más conversiones que TN', text: 'GA4 registra más compras que TN. Posible problema de tracking.', platforms: ['GA4', 'TiendaNueve'], color: '#3b82f6' });
      }
    }
    if (tnMetrics && tnMetrics.cancelledOrders > tnMetrics.paidOrders * 0.3) {
      result.push({ title: 'Alta tasa de cancelación', text: tnMetrics.cancelledOrders + ' órdenes canceladas de ' + tnMetrics.totalOrders + ' totales.', platforms: ['TiendaNueve'], color: '#ef4444' });
    }
    return result;
  }, [gscPerformance, tnMetrics, adSpend, metaInsights, ga4Insights]);

  const inStockProducts = useMemo(() => {
    if (!tiendanubeProducts) return [];
    return tiendanubeProducts.filter((p) => p.stock > 0 || p.inventory_quantity > 0);
  }, [tiendanubeProducts]);

  const outOfStockProducts = useMemo(() => {
    if (!tiendanubeProducts) return [];
    return tiendanubeProducts.filter((p) => (p.stock === 0 || p.inventory_quantity === 0) && p.variants && p.variants.length > 0);
  }, [tiendanubeProducts]);

  const overallROAS = useMemo(() => {
    if (adSpend.total === 0) return 0;
    return adRevenue.total / adSpend.total;
  }, [adSpend, adRevenue]);

  const priceRanges = useMemo(() => {
    if (!tiendanubeProducts || tiendanubeProducts.length === 0) return [];
    const ranges = [
      { label: '$0-50K', min: 0, max: 50000, count: 0 },
      { label: '$50K-100K', min: 50000, max: 100000, count: 0 },
      { label: '$100K-200K', min: 100000, max: 200000, count: 0 },
      { label: '$200K-500K', min: 200000, max: 500000, count: 0 },
      { label: '$500K+', min: 500000, max: Infinity, count: 0 },
    ];
    tiendanubeProducts.forEach((p) => {
      const price = parseFloat(p.price) || 0;
      const range = ranges.find((r) => price >= r.min && price < r.max);
      if (range) range.count++;
    });
    return ranges;
  }, [tiendanubeProducts]);

  const topBrands = useMemo(() => {
    if (!mcProducts || !mcProducts.brands) return [];
    return Object.entries(mcProducts.brands).map(([brand, data]) => ({ brand, count: data.count || 0, inStock: data.inStock || 0 })).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [mcProducts]);

  function renderCommand() {
    return (
      <div>
        <SectionHeader icon={Brain} title="Vista General" subtitle="Resumen ejecutivo de todas las plataformas" />

        <div style={{ ...S.grid5, marginBottom: '24px' }}>
          <ScoreGauge score={scores ? scores.overall : 0} label="General" size={90} />
          <ScoreGauge score={scores ? scores.seo : 0} label="SEO" size={90} />
          <ScoreGauge score={scores ? scores.ecom : 0} label="E-commerce" size={90} />
          <ScoreGauge score={scores ? scores.ads : 0} label="Publicidad" size={90} />
          <ScoreGauge score={scores ? scores.catalog : 0} label="Catálogo" size={90} />
        </div>

        <div style={{ ...S.grid6, marginBottom: '24px' }}>
          <KPITile icon={DollarSign} label="Revenue Total" value={fmtCOP((tnMetrics.totalRevenue || 0) + (ga4Insights && ga4Insights.ecommerce ? ga4Insights.ecommerce.totalRevenue || 0 : 0))} trend={trendData ? trendData.changePct : null} trendLabel="vs anterior" color="#10b981" />
          <KPITile icon={ShoppingBag} label="Órdenes TN" value={fmt(tnMetrics.totalOrders)} trend={null} color="#f59e0b" />
          <KPITile icon={Users} label="Clientes" value={fmt(unifiedClients ? unifiedClients.length : 0)} trend={null} color="#8b5cf6" />
          <KPITile icon={Eye} label="Sesiones GA4" value={fmt(ga4Insights && ga4Insights.global ? ga4Insights.global.sessions : 0)} trend={null} color="#3b82f6" />
          <KPITile icon={Target} label="ROAS Promedio" value={overallROAS.toFixed(2) + 'x'} trend={null} color="#ef4444" />
          <KPITile icon={BarChart2} label="Ticket Promedio" value={fmtCOP(tnMetrics.avgTicket)} trend={null} color="#06b6d4" />
        </div>

        {trendData && (
          <div style={{ ...S.card, marginBottom: '24px' }}>
            <div style={S.cardHeader}>
              <div style={S.cardTitle}><Activity size={18} color="#3b82f6" /> Timeline de Revenue</div>
              <TrendBadge value={trendData.changePct} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '80px' }}>
              {trendData.entries.map((entry, idx) => {
                const maxRev = Math.max(...trendData.entries.map((e) => e.revenue));
                const heightPct = maxRev > 0 ? (entry.revenue / maxRev) * 100 : 0;
                return (
                  <div key={idx} title={entry.date + ': ' + fmtCOP(entry.revenue)} style={{ flex: 1, height: heightPct + '%', minHeight: '2px', background: 'linear-gradient(180deg, #3b82f6, #8b5cf6)', borderRadius: '2px 2px 0 0', transition: 'height 0.3s ease', cursor: 'pointer' }} />
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
              <span style={S.textSmall}>{trendData.entries.length > 0 ? trendData.entries[0].date : ''}</span>
              <span style={S.textSmall}>{trendData.entries.length > 0 ? trendData.entries[trendData.entries.length - 1].date : ''}</span>
            </div>
          </div>
        )}

        {organicVsPaid && (
          <div style={{ ...S.card, marginBottom: '24px' }}>
            <div style={S.cardHeader}>
              <div style={S.cardTitle}><PieChart size={18} color="#10b981" /> Fuentes de Tráfico</div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <div style={{ flex: organicVsPaid.organicPct, height: '24px', background: 'linear-gradient(90deg, #10b981, #059669)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '600', color: '#ffffff' }}>
                Orgánico {fmtPct(organicVsPaid.organicPct)}
              </div>
              <div style={{ flex: organicVsPaid.paidPct, height: '24px', background: 'linear-gradient(90deg, #f59e0b, #d97706)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '600', color: '#ffffff' }}>
                Pagado {fmtPct(organicVsPaid.paidPct)}
              </div>
            </div>
            <div style={S.grid2}>
              <div>
                <span style={{ ...S.textSmall, fontWeight: '600', color: '#10b981' }}>Orgánico</span>
                {organicVsPaid.organic.map((item, idx) => (
                  <MiniBar key={idx} value={item.sessions} max={organicVsPaid.organicTotal} color="#10b981" label={item.channel} />
                ))}
              </div>
              <div>
                <span style={{ ...S.textSmall, fontWeight: '600', color: '#f59e0b' }}>Pagado</span>
                {organicVsPaid.paid.map((item, idx) => (
                  <MiniBar key={idx} value={item.sessions} max={organicVsPaid.paidTotal} color="#f59e0b" label={item.channel} />
                ))}
              </div>
            </div>
          </div>
        )}

        <div style={{ ...S.card, marginBottom: '24px' }}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}><Target size={18} color="#ef4444" /> Comparación de Plataformas</div>
          </div>
          <div style={S.grid3}>
            {[
              { name: 'Meta Ads', color: '#3b82f6', data: metaInsights },
              { name: 'Google Ads', color: '#10b981', data: googleAdsData },
              { name: 'TikTok', color: '#8b5cf6', data: tiktokData },
            ].map((p, idx) => (
              <div key={idx} style={{ ...S.card, background: '#151820', padding: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: p.color, marginBottom: '12px' }}>{p.name}</div>
                <MiniBar value={p.data ? p.data.spend || 0 : 0} max={adSpend.total} color={p.color} label="Gasto" />
                <MiniBar value={p.data ? p.data.conversions || 0 : 0} max={adConversions.total || 1} color="#10b981" label="Conversiones" />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                  <span style={S.textSmall}>ROAS</span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: (p.data && p.data.roas >= 2) ? '#10b981' : '#ef4444' }}>
                    {p.data ? (p.data.roas || 0).toFixed(2) + 'x' : 'N/A'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {insights.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ ...S.cardTitle, marginBottom: '16px' }}><Lightbulb size={18} color="#f59e0b" /> Top Insights</div>
            <div style={S.grid2}>
              {insights.slice(0, 4).map((ins, idx) => (
                <InsightCard key={idx} type={ins.type} title={ins.title} text={ins.text} impact={ins.impact} />
              ))}
            </div>
          </div>
        )}

        {ga4Insights && ga4Insights.topProducts && ga4Insights.topProducts.length > 0 && (
          <div style={{ ...S.card, marginBottom: '24px' }}>
            <div style={S.cardHeader}>
              <div style={S.cardTitle}><Star size={18} color="#f59e0b" /> Top Productos GA4</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px', color: '#8b8fa3', borderBottom: '1px solid #2a2d3a' }}>#</th>
                    <th style={{ textAlign: 'left', padding: '8px', color: '#8b8fa3', borderBottom: '1px solid #2a2d3a' }}>Producto</th>
                    <th style={{ textAlign: 'right', padding: '8px', color: '#8b8fa3', borderBottom: '1px solid #2a2d3a' }}>Revenue</th>
                    <th style={{ textAlign: 'right', padding: '8px', color: '#8b8fa3', borderBottom: '1px solid #2a2d3a' }}>Unidades</th>
                  </tr>
                </thead>
                <tbody>
                  {ga4Insights.topProducts.slice(0, 5).map((prod, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: '8px', color: '#8b8fa3', borderBottom: '1px solid #1a1d27' }}>{idx + 1}</td>
                      <td style={{ padding: '8px', color: '#ffffff', borderBottom: '1px solid #1a1d27' }}>{prod.name || prod.productName || 'N/A'}</td>
                      <td style={{ padding: '8px', color: '#10b981', textAlign: 'right', fontWeight: '600', borderBottom: '1px solid #1a1d27' }}>{fmtCOP(prod.revenue)}</td>
                      <td style={{ padding: '8px', color: '#8b8fa3', textAlign: 'right', borderBottom: '1px solid #1a1d27' }}>{fmt(prod.quantity || prod.units)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {ga4Insights && (
          <div style={{ ...S.card, marginBottom: '24px' }}>
            <div style={S.cardHeader}>
              <div style={S.cardTitle}><Activity size={18} color="#06b6d4" /> Métricas de Engagement GA4</div>
            </div>
            <div style={S.grid3}>
              <StatComparison
                label="Sesiones por Usuario"
                valueA={ga4Insights.global ? (ga4Insights.global.sessionsPerUser || 0).toFixed(2) : 'N/A'}
                valueB={ga4Insights.global ? fmtDuration(ga4Insights.avgDuration || 0) : 'N/A'}
                labelA="Promedio"
                labelB="Duración"
                colorA="#3b82f6"
                colorB="#10b981"
              />
              <StatComparison
                label="Tasa de Rebote"
                valueA={ga4Insights.bounceRate ? (ga4Insights.bounceRate * 100).toFixed(1) + '%' : 'N/A'}
                valueB={ga4Insights.ecommerce ? fmtCOP(ga4Insights.ecommerce.totalRevenue || 0) : '$0'}
                labelA="Rebote"
                labelB="Revenue"
                colorA={ga4Insights.bounceRate && ga4Insights.bounceRate > 0.5 ? '#ef4444' : '#10b981'}
                colorB="#f59e0b"
              />
              <StatComparison
                label="Conversiones"
                valueA={ga4Insights.ecommerce ? fmt(ga4Insights.ecommerce.purchases || 0) : '0'}
                valueB={ga4Insights.ecommerce && ga4Insights.ecommerce.purchases > 0 ? fmtCOP(ga4Insights.ecommerce.totalRevenue / ga4Insights.ecommerce.purchases) : '$0'}
                labelA="Compras"
                labelB="Valor Promedio"
                colorA="#8b5cf6"
                colorB="#06b6d4"
              />
            </div>
          </div>
        )}

        <div style={{ ...S.card, marginBottom: '24px' }}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}><Layers size={18} color="#8b5cf6" /> Resumen Cross-Platform</div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '10px', color: '#8b8fa3', borderBottom: '1px solid #2a2d3a' }}>Plataforma</th>
                  <th style={{ textAlign: 'right', padding: '10px', color: '#8b8fa3', borderBottom: '1px solid #2a2d3a' }}>Gasto</th>
                  <th style={{ textAlign: 'right', padding: '10px', color: '#8b8fa3', borderBottom: '1px solid #2a2d3a' }}>Revenue</th>
                  <th style={{ textAlign: 'right', padding: '10px', color: '#8b8fa3', borderBottom: '1px solid #2a2d3a' }}>ROAS</th>
                  <th style={{ textAlign: 'right', padding: '10px', color: '#8b8fa3', borderBottom: '1px solid #2a2d3a' }}>Conversiones</th>
                  <th style={{ textAlign: 'right', padding: '10px', color: '#8b8fa3', borderBottom: '1px solid #2a2d3a' }}>CPA</th>
                  <th style={{ textAlign: 'center', padding: '10px', color: '#8b8fa3', borderBottom: '1px solid #2a2d3a' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '10px', color: '#3b82f6', fontWeight: '600', borderBottom: '1px solid #1a1d27' }}>Meta Ads</td>
                  <td style={{ padding: '10px', color: '#ffffff', textAlign: 'right', borderBottom: '1px solid #1a1d27' }}>{fmtCOP(metaInsights ? metaInsights.spend || 0 : 0)}</td>
                  <td style={{ padding: '10px', color: '#10b981', textAlign: 'right', fontWeight: '600', borderBottom: '1px solid #1a1d27' }}>{fmtCOP(metaInsights ? metaInsights.revenue || 0 : 0)}</td>
                  <td style={{ padding: '10px', color: metaInsights && metaInsights.roas >= 2 ? '#10b981' : '#ef4444', textAlign: 'right', fontWeight: '600', borderBottom: '1px solid #1a1d27' }}>{metaInsights ? (metaInsights.roas || 0).toFixed(2) + 'x' : 'N/A'}</td>
                  <td style={{ padding: '10px', color: '#ffffff', textAlign: 'right', borderBottom: '1px solid #1a1d27' }}>{fmt(metaInsights ? metaInsights.conversions || 0 : 0)}</td>
                  <td style={{ padding: '10px', color: '#8b8fa3', textAlign: 'right', borderBottom: '1px solid #1a1d27' }}>{metaInsights && metaInsights.conversions > 0 ? fmtCOP(metaInsights.spend / metaInsights.conversions) : 'N/A'}</td>
                  <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #1a1d27' }}><span style={S.badge(metaInsights && metaInsights.roas >= 2 ? '#10b981' : metaInsights && metaInsights.roas >= 1 ? '#f59e0b' : '#ef4444')}>{metaInsights && metaInsights.roas >= 2 ? 'Óptimo' : metaInsights && metaInsights.roas >= 1 ? 'Regular' : 'Crítico'}</span></td>
                </tr>
                <tr>
                  <td style={{ padding: '10px', color: '#10b981', fontWeight: '600', borderBottom: '1px solid #1a1d27' }}>Google Ads</td>
                  <td style={{ padding: '10px', color: '#ffffff', textAlign: 'right', borderBottom: '1px solid #1a1d27' }}>{fmtCOP(googleAdsData ? googleAdsData.spend || 0 : 0)}</td>
                  <td style={{ padding: '10px', color: '#10b981', textAlign: 'right', fontWeight: '600', borderBottom: '1px solid #1a1d27' }}>{fmtCOP(googleAdsData ? googleAdsData.revenue || 0 : 0)}</td>
                  <td style={{ padding: '10px', color: googleAdsData && googleAdsData.roas >= 2 ? '#10b981' : '#ef4444', textAlign: 'right', fontWeight: '600', borderBottom: '1px solid #1a1d27' }}>{googleAdsData ? (googleAdsData.roas || 0).toFixed(2) + 'x' : 'N/A'}</td>
                  <td style={{ padding: '10px', color: '#ffffff', textAlign: 'right', borderBottom: '1px solid #1a1d27' }}>{fmt(googleAdsData ? googleAdsData.conversions || 0 : 0)}</td>
                  <td style={{ padding: '10px', color: '#8b8fa3', textAlign: 'right', borderBottom: '1px solid #1a1d27' }}>{googleAdsData && googleAdsData.conversions > 0 ? fmtCOP(googleAdsData.spend / googleAdsData.conversions) : 'N/A'}</td>
                  <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #1a1d27' }}><span style={S.badge(googleAdsData && googleAdsData.roas >= 2 ? '#10b981' : googleAdsData && googleAdsData.roas >= 1 ? '#f59e0b' : '#ef4444')}>{googleAdsData && googleAdsData.roas >= 2 ? 'Óptimo' : googleAdsData && googleAdsData.roas >= 1 ? 'Regular' : 'Crítico'}</span></td>
                </tr>
                <tr>
                  <td style={{ padding: '10px', color: '#8b5cf6', fontWeight: '600', borderBottom: '1px solid #1a1d27' }}>TikTok</td>
                  <td style={{ padding: '10px', color: '#ffffff', textAlign: 'right', borderBottom: '1px solid #1a1d27' }}>{fmtCOP(tiktokData ? tiktokData.spend || 0 : 0)}</td>
                  <td style={{ padding: '10px', color: '#10b981', textAlign: 'right', fontWeight: '600', borderBottom: '1px solid #1a1d27' }}>{fmtCOP(adRevenue.tt)}</td>
                  <td style={{ padding: '10px', color: tiktokData && tiktokData.roas >= 2 ? '#10b981' : '#ef4444', textAlign: 'right', fontWeight: '600', borderBottom: '1px solid #1a1d27' }}>{tiktokData ? (tiktokData.roas || 0).toFixed(2) + 'x' : 'N/A'}</td>
                  <td style={{ padding: '10px', color: '#ffffff', textAlign: 'right', borderBottom: '1px solid #1a1d27' }}>{fmt(tiktokData ? tiktokData.conversions || 0 : 0)}</td>
                  <td style={{ padding: '10px', color: '#8b8fa3', textAlign: 'right', borderBottom: '1px solid #1a1d27' }}>{tiktokData && tiktokData.conversions > 0 ? fmtCOP(tiktokData.spend / tiktokData.conversions) : 'N/A'}</td>
                  <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #1a1d27' }}><span style={S.badge(tiktokData && tiktokData.roas >= 2 ? '#10b981' : tiktokData && tiktokData.roas >= 1 ? '#f59e0b' : '#ef4444')}>{tiktokData && tiktokData.roas >= 2 ? 'Óptimo' : tiktokData && tiktokData.roas >= 1 ? 'Regular' : 'Crítico'}</span></td>
                </tr>
                <tr style={{ background: '#151820' }}>
                  <td style={{ padding: '10px', color: '#ffffff', fontWeight: '700', borderBottom: '1px solid #1a1d27' }}>TOTAL</td>
                  <td style={{ padding: '10px', color: '#ffffff', textAlign: 'right', fontWeight: '700', borderBottom: '1px solid #1a1d27' }}>{fmtCOP(adSpend.total)}</td>
                  <td style={{ padding: '10px', color: '#10b981', textAlign: 'right', fontWeight: '700', borderBottom: '1px solid #1a1d27' }}>{fmtCOP(adRevenue.total)}</td>
                  <td style={{ padding: '10px', color: overallROAS >= 2 ? '#10b981' : '#ef4444', textAlign: 'right', fontWeight: '700', borderBottom: '1px solid #1a1d27' }}>{overallROAS.toFixed(2)}x</td>
                  <td style={{ padding: '10px', color: '#ffffff', textAlign: 'right', fontWeight: '700', borderBottom: '1px solid #1a1d27' }}>{fmt(adConversions.total)}</td>
                  <td style={{ padding: '10px', color: '#ffffff', textAlign: 'right', fontWeight: '700', borderBottom: '1px solid #1a1d27' }}>{adConversions.total > 0 ? fmtCOP(adSpend.total / adConversions.total) : 'N/A'}</td>
                  <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #1a1d27' }}><span style={S.badge(overallROAS >= 2 ? '#10b981' : overallROAS >= 1 ? '#f59e0b' : '#ef4444')}>{overallROAS >= 2 ? 'Óptimo' : overallROAS >= 1 ? 'Regular' : 'Crítico'}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {crossInsights.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ ...S.cardTitle, marginBottom: '16px' }}><Layers size={18} color="#8b5cf6" /> Correlaciones Cross-Platform</div>
            <div style={S.grid2}>
              {crossInsights.map((ci, idx) => (
                <div key={idx} style={{ ...S.card, background: '#151820', borderLeft: '3px solid ' + ci.color, padding: '16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#ffffff', marginBottom: '6px' }}>{ci.title}</div>
                  <div style={{ fontSize: '12px', color: '#8b8fa3', marginBottom: '8px' }}>{ci.text}</div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {ci.platforms.map((pl, pi) => (
                      <span key={pi} style={S.badge('#8b5cf6')}>{pl}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderTiendaNueve() {
    const maxOrders = Math.max(tnMetrics.paidOrders, tnMetrics.pendingOrders, tnMetrics.cancelledOrders, tnMetrics.refundedOrders, 1);
    const statusData = [
      { label: 'Pagadas', value: tnMetrics.paidOrders, color: '#10b981' },
      { label: 'Pendientes', value: tnMetrics.pendingOrders, color: '#f59e0b' },
      { label: 'Canceladas', value: tnMetrics.cancelledOrders, color: '#ef4444' },
      { label: 'Reembolsadas', value: tnMetrics.refundedOrders, color: '#8b5cf6' },
    ];
    const successRate = tnMetrics.totalOrders > 0 ? tnMetrics.paidOrders / tnMetrics.totalOrders : 0;
    const maxSegment = Math.max(...Object.values(tnClientSegments).filter((v) => typeof v === 'number' && v !== 0), 1);
    const topProducts = Object.entries(tnMetrics.productPerformance).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const topShipping = Object.entries(tnMetrics.shippingBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 5);

    return (
      <div>
        <SectionHeader icon={ShoppingBag} title="TiendaNueve" subtitle="Análisis completo de órdenes y clientes de TiendaNueve" />

        <div style={{ ...S.grid6, marginBottom: '24px' }}>
          <KPITile icon={ShoppingBag} label="Total Órdenes" value={fmt(tnMetrics.totalOrders)} color="#f59e0b" />
          <KPITile icon={DollarSign} label="Revenue" value={fmtCOP(tnMetrics.totalRevenue)} color="#10b981" />
          <KPITile icon={Users} label="Clientes" value={fmt(unifiedClients ? unifiedClients.length : 0)} color="#8b5cf6" />
          <KPITile icon={BarChart2} label="Ticket Promedio" value={fmtCOP(tnMetrics.avgTicket)} color="#3b82f6" />
          <KPITile icon={AlertTriangle} label="Pendientes" value={fmt(tnMetrics.pendingOrders)} color="#f59e0b" />
          <KPITile icon={CheckCircle} label="Tasa de Éxito" value={(successRate * 100).toFixed(1) + '%'} color={successRate >= 0.7 ? '#10b981' : '#ef4444'} />
        </div>

        <div style={{ ...S.grid2, marginBottom: '24px' }}>
          <div style={S.card}>
            <div style={S.cardHeader}><div style={S.cardTitle}>Órdenes por Estado</div></div>
            {statusData.map((s, idx) => (
              <div key={idx} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#8b8fa3' }}>{s.label}</span>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: s.color }}>{s.value} ({tnMetrics.totalOrders > 0 ? ((s.value / tnMetrics.totalOrders) * 100).toFixed(1) : 0}%)</span>
                </div>
                <div style={{ height: '8px', background: '#2a2d3a', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: (s.value / maxOrders) * 100 + '%', height: '100%', background: s.color, borderRadius: '4px', transition: 'width 0.5s ease' }} />
                </div>
              </div>
            ))}
          </div>

          <div style={S.card}>
            <div style={S.cardHeader}><div style={S.cardTitle}>Timeline de Órdenes</div></div>
            {tnMetrics.ordersByDate.length > 0 ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '80px' }}>
                  {tnMetrics.ordersByDate.map((entry, idx) => {
                    const maxCount = Math.max(...tnMetrics.ordersByDate.map((e) => e.count));
                    const h = maxCount > 0 ? (entry.count / maxCount) * 100 : 0;
                    return (<div key={idx} title={entry.date + ': ' + entry.count + ' órdenes'} style={{ flex: 1, height: h + '%', minHeight: '2px', background: 'linear-gradient(180deg, #f59e0b, #d97706)', borderRadius: '2px 2px 0 0', cursor: 'pointer' }} />);
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                  <span style={S.textSmall}>{tnMetrics.ordersByDate[0].date}</span>
                  <span style={S.textSmall}>{tnMetrics.ordersByDate[tnMetrics.ordersByDate.length - 1].date}</span>
                </div>
              </div>
            ) : (
              <EmptyState icon={Clock} title="Sin datos" text="No hay órdenes para mostrar" />
            )}
          </div>
        </div>

        <div style={{ ...S.card, marginBottom: '24px' }}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}><Users size={18} color="#8b5cf6" /> Top 10 Clientes</div>
          </div>
          {tnMetrics.topClients.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px', color: '#8b8fa3', borderBottom: '1px solid #2a2d3a' }}>#</th>
                    <th style={{ textAlign: 'left', padding: '8px', color: '#8b8fa3', borderBottom: '1px solid #2a2d3a' }}>Nombre</th>
                    <th style={{ textAlign: 'left', padding: '8px', color: '#8b8fa3', borderBottom: '1px solid #2a2d3a' }}>Email</th>
                    <th style={{ textAlign: 'right', padding: '8px', color: '#8b8fa3', borderBottom: '1px solid #2a2d3a' }}>Total Gastado</th>
                    <th style={{ textAlign: 'right', padding: '8px', color: '#8b8fa3', borderBottom: '1px solid #2a2d3a' }}>Compras</th>
                  </tr>
                </thead>
                <tbody>
                  {tnMetrics.topClients.map((client, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: '8px', color: '#8b8fa3', borderBottom: '1px solid #1a1d27' }}>{idx + 1}</td>
                      <td style={{ padding: '8px', color: '#ffffff', fontWeight: '500', borderBottom: '1px solid #1a1d27' }}>{client.name || 'Sin nombre'}</td>
                      <td style={{ padding: '8px', color: '#8b8fa3', borderBottom: '1px solid #1a1d27' }}>{client.email}</td>
                      <td style={{ padding: '8px', color: '#10b981', textAlign: 'right', fontWeight: '600', borderBottom: '1px solid #1a1d27' }}>{fmtCOP(client.totalSpent)}</td>
                      <td style={{ padding: '8px', color: '#8b8fa3', textAlign: 'right', borderBottom: '1px solid #1a1d27' }}>{client.purchases}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={Users} title="Sin clientes" text="No hay datos de clientes disponibles" />
          )}
        </div>

        <div style={{ ...S.grid2, marginBottom: '24px' }}>
          <div style={S.card}>
            <div style={S.cardHeader}><div style={S.cardTitle}>Segmentos de Clientes</div></div>
            {Object.entries(tnClientSegments).filter(([key]) => key !== 'dataQuality').sort((a, b) => b[1] - a[1]).map(([segment, count], idx) => (
              <div key={idx} style={{ marginBottom: '10px' }}>
                <MiniBar value={count} max={maxSegment} color={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6', '#f97316'][idx % 9]} label={segment.replace(/_/g, ' ')} />
              </div>
            ))}
          </div>

          <div style={S.card}>
            <div style={S.cardHeader}>
              <div style={S.cardTitle}><ShoppingBag size={18} color="#f59e0b" /> Uso de Cupones</div>
            </div>
            <div style={S.grid2}>
              <div style={{ ...S.kpiCard, background: '#151820' }}>
                <span style={S.kpiLabel}>Órdenes con Cupón</span>
                <span style={{ ...S.kpiValue, fontSize: '20px' }}>{tnMetrics.couponUsage.count}</span>
              </div>
              <div style={{ ...S.kpiCard, background: '#151820' }}>
                <span style={S.kpiLabel}>Total Ahorrado</span>
                <span style={{ ...S.kpiValue, fontSize: '20px', color: '#f59e0b' }}>{fmtCOP(tnMetrics.couponUsage.totalSaved)}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ ...S.grid2, marginBottom: '24px' }}>
          <div style={S.card}>
            <div style={S.cardHeader}>
              <div style={S.cardTitle}><Globe size={18} color="#06b6d4" /> Envíos por Transportista</div>
            </div>
            {topShipping.length > 0 ? (
              topShipping.map(([carrier, count], idx) => (
                <MiniBar key={idx} value={count} max={topShipping[0][1]} color="#06b6d4" label={carrier} />
              ))
            ) : (
              <EmptyState icon={Globe} title="Sin datos" text="No hay datos de envíos" />
            )}
          </div>

          <div style={S.card}>
            <div style={S.cardHeader}>
              <div style={S.cardTitle}><Package size={18} color="#10b981" /> Top Productos</div>
            </div>
            {topProducts.length > 0 ? (
              topProducts.map(([product, qty], idx) => (
                <MiniBar key={idx} value={qty} max={topProducts[0][1]} color="#10b981" label={product.length > 15 ? product.substring(0, 15) + '...' : product} />
              ))
            ) : (
              <EmptyState icon={Package} title="Sin datos" text="No hay datos de productos" />
            )}
          </div>
        </div>

        <div style={{ ...S.card, marginBottom: '24px' }}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}><Shield size={18} color="#3b82f6" /> Calidad de Datos</div>
          </div>
          <div style={S.grid3}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: tnClientSegments.dataQuality.email >= 0.8 ? '#10b981' : '#f59e0b' }}>{fmtPct(tnClientSegments.dataQuality.email)}</div>
              <div style={S.textSmall}>con Email</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: tnClientSegments.dataQuality.phone >= 0.8 ? '#10b981' : '#f59e0b' }}>{fmtPct(tnClientSegments.dataQuality.phone)}</div>
              <div style={S.textSmall}>con Teléfono</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: tnClientSegments.dataQuality.dni >= 0.8 ? '#10b981' : '#f59e0b' }}>{fmtPct(tnClientSegments.dataQuality.dni)}</div>
              <div style={S.textSmall}>con DNI</div>
            </div>
          </div>
        </div>

        {outOfStockProducts.length > 0 && (
          <div style={{ ...S.card, borderLeft: '4px solid #ef4444' }}>
            <div style={S.cardHeader}>
              <div style={S.cardTitle}><AlertTriangle size={18} color="#ef4444" /> Inventario Crítico ({outOfStockProducts.length} productos sin stock)</div>
            </div>
            <div style={{ overflowX: 'auto', maxHeight: '300px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '6px', color: '#8b8fa3', borderBottom: '1px solid #2a2d3a' }}>Producto</th>
                    <th style={{ textAlign: 'right', padding: '6px', color: '#8b8fa3', borderBottom: '1px solid #2a2d3a' }}>Stock</th>
                    <th style={{ textAlign: 'right', padding: '6px', color: '#8b8fa3', borderBottom: '1px solid #2a2d3a' }}>Variantes</th>
                  </tr>
                </thead>
                <tbody>
                  {outOfStockProducts.slice(0, 10).map((prod, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: '6px', color: '#ffffff', borderBottom: '1px solid #1a1d27' }}>{prod.title || prod.name || 'N/A'}</td>
                      <td style={{ padding: '6px', color: '#ef4444', textAlign: 'right', fontWeight: '600', borderBottom: '1px solid #1a1d27' }}>{prod.stock || prod.inventory_quantity || 0}</td>
                      <td style={{ padding: '6px', color: '#8b8fa3', textAlign: 'right', borderBottom: '1px solid #1a1d27' }}>{prod.variants ? prod.variants.length : 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={{ ...S.card, marginBottom: '24px' }}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}><Activity size={18} color="#06b6d4" /> Resumen de Ingresos TN</div>
          </div>
          <div style={S.grid3}>
            <div style={{ padding: '16px', background: '#151820', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#8b8fa3', marginBottom: '4px', textTransform: 'uppercase' }}>Revenue Pagadas</div>
              <div style={{ fontSize: '22px', fontWeight: '700', color: '#10b981' }}>{fmtCOP(tnMetrics.totalRevenue)}</div>
              <div style={{ fontSize: '11px', color: '#8b8fa3', marginTop: '4px' }}>{tnMetrics.paidOrders} órdenes</div>
            </div>
            <div style={{ padding: '16px', background: '#151820', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#8b8fa3', marginBottom: '4px', textTransform: 'uppercase' }}>Cupones Descontados</div>
              <div style={{ fontSize: '22px', fontWeight: '700', color: '#f59e0b' }}>{fmtCOP(tnMetrics.couponUsage.totalSaved)}</div>
              <div style={{ fontSize: '11px', color: '#8b8fa3', marginTop: '4px' }}>{tnMetrics.couponUsage.count} órdenes con cupón</div>
            </div>
            <div style={{ padding: '16px', background: '#151820', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#8b8fa3', marginBottom: '4px', textTransform: 'uppercase' }}>Revenue Neto Est.</div>
              <div style={{ fontSize: '22px', fontWeight: '700', color: '#3b82f6' }}>{fmtCOP(tnMetrics.totalRevenue - tnMetrics.couponUsage.totalSaved)}</div>
              <div style={{ fontSize: '11px', color: '#8b8fa3', marginTop: '4px' }}>después de descuentos</div>
            </div>
          </div>
        </div>

        <div style={{ ...S.card, marginBottom: '24px' }}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}><Clock size={18} color="#8b5cf6" /> Análisis de Frecuencia de Compra</div>
          </div>
          <div style={S.grid3}>
            <div style={{ textAlign: 'center', padding: '12px' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#f59e0b' }}>
                {tnMetrics.topClients.filter((c) => c.purchases === 1).length}
              </div>
              <div style={{ fontSize: '11px', color: '#8b8fa3' }}>Compra Única</div>
              <div style={{ fontSize: '10px', color: '#8b8fa3', marginTop: '2px' }}>
                {tnMetrics.topClients.length > 0 ? ((tnMetrics.topClients.filter((c) => c.purchases === 1).length / tnMetrics.topClients.length) * 100).toFixed(0) : 0}% del top 10
              </div>
            </div>
            <div style={{ textAlign: 'center', padding: '12px' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#3b82f6' }}>
                {tnMetrics.topClients.filter((c) => c.purchases >= 2 && c.purchases <= 5).length}
              </div>
              <div style={{ fontSize: '11px', color: '#8b8fa3' }}>Compradores Recurrentes</div>
              <div style={{ fontSize: '10px', color: '#8b8fa3', marginTop: '2px' }}>2-5 compras</div>
            </div>
            <div style={{ textAlign: 'center', padding: '12px' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#10b981' }}>
                {tnMetrics.topClients.filter((c) => c.purchases > 5).length}
              </div>
              <div style={{ fontSize: '11px', color: '#8b8fa3' }}>Fieles (6+)</div>
              <div style={{ fontSize: '10px', color: '#8b8fa3', marginTop: '2px' }}>Más de 5 compras</div>
            </div>
          </div>
        </div>

        <div style={S.card}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}><Lightbulb size={18} color="#f59e0b" /> Recomendaciones TiendaNueve</div>
          </div>
          <div style={S.grid2}>
            {successRate < 0.7 && (
              <InsightCard type="danger" title="Mejorar tasa de conversión" text={'Solo el ' + (successRate * 100).toFixed(1) + '% de checkouts se completan. Optimizar métodos de pago y simplificar checkout.'} impact="Alto" />
            )}
            {tnMetrics.couponUsage.count > 0 && tnMetrics.couponUsage.totalSaved > 0 && (
              <InsightCard type="tip" title="ROI de cupones" text={tnMetrics.couponUsage.count + ' órdenes usaron cupones con ' + fmtCOP(tnMetrics.couponUsage.totalSaved) + ' de descuento total.'} impact="Medio" />
            )}
            {tnClientSegments.nuevo > 0 && tnClientSegments.repetidor === 0 && (
              <InsightCard type="warning" title="Sin compradores recurrentes" text="Todos los clientes son nuevos. Implementar emails post-compra y programa de fidelización." impact="Alto" />
            )}
            {tnMetrics.cancelledOrders > tnMetrics.paidOrders * 0.2 && (
              <InsightCard type="danger" title="Alta tasa de cancelación" text={((tnMetrics.cancelledOrders / tnMetrics.totalOrders) * 100).toFixed(1) + '% de cancelaciones. Revisar causas principales.'} impact="Alto" />
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderFunnel() {
    if (!funnelData) {
      return <EmptyState icon={Filter} title="Sin datos de embudo" text="No hay datos disponibles del funnel de conversión" />;
    }
    const maxValue = funnelData.length > 0 ? funnelData[0].value : 1;
    const stages = funnelData.map((stage, idx) => {
      const widthPct = maxValue > 0 ? (stage.value / maxValue) * 100 : 0;
      let color = '#10b981';
      if (stage.retention < 0.5 && idx > 0) color = '#ef4444';
      else if (stage.retention < 0.8 && idx > 0) color = '#f59e0b';
      return { ...stage, widthPct, color };
    });
    const tnCheckout = tnMetrics.paidOrders + tnMetrics.cancelledOrders + tnMetrics.pendingOrders;
    const tnPaid = tnMetrics.paidOrders;
    const tnDelivered = tnMetrics.paidOrders - tnMetrics.refundedOrders;

    return (
      <div>
        <SectionHeader icon={Filter} title="Embudo de Conversión" subtitle="Flujo de usuarios desde la visita hasta la compra" />

        <div style={{ ...S.card, marginBottom: '24px' }}>
          <div style={S.cardHeader}><div style={S.cardTitle}>Funnel GA4</div></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
            {stages.map((stage, idx) => (
              <div key={idx} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '140px', textAlign: 'right', fontSize: '13px', color: '#8b8fa3' }}>{stage.name}</div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                  <div style={{ width: Math.max(stage.widthPct, 15) + '%', height: '40px', background: 'linear-gradient(90deg, ' + stage.color + ', ' + stage.color + '99)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'width 0.5s ease' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#ffffff' }}>{fmt(stage.value)}</span>
                    <span style={{ fontSize: '11px', color: '#ffffffcc' }}>({(stage.pctOfTotal * 100).toFixed(1)}%)</span>
                  </div>
                </div>
                <div style={{ width: '100px', fontSize: '12px', textAlign: 'left' }}>
                  {idx > 0 ? (
                    <span style={{ color: stage.color, fontWeight: '600' }}>-{(stage.dropoff * 100).toFixed(1)}%</span>
                  ) : (
                    <span style={{ color: '#8b8fa3' }}>—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...S.card, marginBottom: '24px' }}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}><ShoppingBag size={18} color="#f59e0b" /> Funnel TiendaNueve</div>
          </div>
          <div style={S.grid3}>
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#ffffff' }}>{fmt(tnCheckout)}</div>
              <div style={{ fontSize: '12px', color: '#8b8fa3', marginTop: '4px' }}>Checkouts Iniciados</div>
            </div>
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>{fmt(tnPaid)}</div>
              <div style={{ fontSize: '12px', color: '#8b8fa3', marginTop: '4px' }}>Órdenes Pagadas</div>
              <div style={{ fontSize: '11px', color: tnCheckout > 0 ? (tnPaid / tnCheckout > 0.5 ? '#10b981' : '#ef4444') : '#8b8fa3', marginTop: '2px' }}>
                {tnCheckout > 0 ? ((tnPaid / tnCheckout) * 100).toFixed(1) + '% conversión' : 'N/A'}
              </div>
            </div>
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#3b82f6' }}>{fmt(tnDelivered > 0 ? tnDelivered : tnPaid)}</div>
              <div style={{ fontSize: '12px', color: '#8b8fa3', marginTop: '4px' }}>Entregadas</div>
            </div>
          </div>
        </div>

        {tnMetrics.cancelledOrders > 0 && (
          <div style={{ ...S.card, marginBottom: '24px', borderLeft: '4px solid #ef4444' }}>
            <div style={S.cardHeader}>
              <div style={S.cardTitle}><AlertTriangle size={18} color="#ef4444" /> Órdenes Canceladas ({tnMetrics.cancelledOrders})</div>
            </div>
            <p style={{ fontSize: '13px', color: '#8b8fa3', margin: 0 }}>
              {((tnMetrics.cancelledOrders / tnMetrics.totalOrders) * 100).toFixed(1)}% de las órdenes fueron canceladas. Revisar causas: pago rechazado, arrepentimiento, stock.
            </p>
          </div>
        )}

        {crossInsights.length > 0 && (
          <div style={S.grid2}>
            {crossInsights.slice(0, 2).map((ci, idx) => (
              <InsightCard key={idx} type="warning" title={ci.title} text={ci.text} impact="Cross-platform" />
            ))}
          </div>
        )}

        <div style={{ ...S.card, marginTop: '24px' }}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}><PieChart size={18} color="#8b5cf6" /> Análisis de Caída por Etapa</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {stages.map((stage, idx) => {
              if (idx === 0) return null;
              const lostUsers = stages[idx - 1].value - stage.value;
              const lostPct = stages[idx - 1].value > 0 ? (lostUsers / stages[idx - 1].value) * 100 : 0;
              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', background: '#151820', borderRadius: '8px' }}>
                  <div style={{ minWidth: '140px', fontSize: '12px', color: '#8b8fa3' }}>
                    {stages[idx - 1].name} → {stage.name}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', color: '#ef4444' }}>-{fmt(lostUsers)} usuarios ({lostPct.toFixed(1)}%)</span>
                      <span style={{ fontSize: '11px', color: '#10b981' }}>{fmt(stage.value)} continúan ({(stage.retention * 100).toFixed(1)}%)</span>
                    </div>
                    <div style={{ height: '6px', background: '#2a2d3a', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: (stage.retention * 100) + '%', height: '100%', background: stage.color, borderRadius: '3px' }} />
                    </div>
                  </div>
                  <div style={{ minWidth: '60px', textAlign: 'right' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: stage.color }}>{(stage.retention * 100).toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {funnelData && funnelData.length > 0 && (
          <div style={{ ...S.card, marginTop: '24px' }}>
            <div style={S.cardHeader}>
              <div style={S.cardTitle}><Zap size={18} color="#f59e0b" /> Recomendaciones de Optimización</div>
            </div>
            <div style={S.grid2}>
              {funnelData[1] && funnelData[1].retention < 0.5 && (
                <InsightCard type="danger" title="Caída alta en vistas de producto" text={'Solo el ' + (funnelData[1].retention * 100).toFixed(1) + '% de sesiones ven productos. Mejorar navegación y CTAs.'} impact="Alto" />
              )}
              {funnelData[2] && funnelData[2].retention < 0.3 && (
                <InsightCard type="danger" title="Pocos añaden al carrito" text={'Tasa de conversión a carrito: ' + (funnelData[2].retention * 100).toFixed(1) + '%. Revisar precios, imágenes y descripciones.'} impact="Alto" />
              )}
              {funnelData[3] && funnelData[3].retention < 0.5 && (
                <InsightCard type="warning" title="Abandono en checkout" text={'El ' + ((1 - funnelData[3].retention) * 100).toFixed(1) + '% abandona el checkout. Simplificar formularios y ofrecer más opciones de pago.'} impact="Alto" />
              )}
              {funnelData[4] && funnelData[4].pctOfTotal < 0.01 && (
                <InsightCard type="danger" title="Tasa de conversión muy baja" text={'Solo el ' + (funnelData[4].pctOfTotal * 100).toFixed(2) + '% de sesiones resultan en compra. Auditoría completa del embudo requerida.'} impact="Crítico" />
              )}
              {funnelData[4] && funnelData[4].pctOfTotal >= 0.03 && (
                <InsightCard type="success" title="Buena tasa de conversión" text={'El ' + (funnelData[4].pctOfTotal * 100).toFixed(2) + '% de conversión está por encima del promedio del sector.'} impact="Bajo" />
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderSEO() {
    if (!gscPerformance) {
      return <EmptyState icon={Search} title="Sin datos SEO" text="No hay datos de Google Search Console disponibles" />;
    }
    const top3Keywords = (gscPerformance.keywords || []).filter((k) => k.position <= 3).slice(0, 10);
    const highPotential = (gscPerformance.keywords || []).filter((k) => k.position >= 10 && k.position <= 30 && (k.impressions || 0) > 50).slice(0, 10);
    const lowCtr = (gscPerformance.keywords || []).filter((k) => (k.impressions || 0) > 100 && (k.ctr || 0) < 0.02).slice(0, 10);
    const topPages = (gscPerformance.topPages || []).slice(0, 10);
    const perfByDate = gscPerformance.performanceByDate ? Object.entries(gscPerformance.performanceByDate).sort((a, b) => a[0].localeCompare(b[0])) : [];

    return (
      <div>
        <SectionHeader icon={Search} title="SEO & Search Console" subtitle="Análisis de rendimiento en buscadores" />

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '24px' }}>
          <ScoreGauge score={scores ? scores.seo : 0} label="Score SEO" size={100} />
          <div style={{ flex: 1 }}>
            <div style={S.grid4}>
              <div style={S.kpiCard}><span style={S.kpiLabel}>Clicks</span><span style={{ ...S.kpiValue, fontSize: '20px' }}>{fmt(gscPerformance.totalClicks)}</span></div>
              <div style={S.kpiCard}><span style={S.kpiLabel}>Impresiones</span><span style={{ ...S.kpiValue, fontSize: '20px' }}>{fmt(gscPerformance.totalImpressions)}</span></div>
              <div style={S.kpiCard}><span style={S.kpiLabel}>CTR Promedio</span><span style={{ ...S.kpiValue, fontSize: '20px' }}>{fmtPct(gscPerformance.avgCtr)}</span></div>
              <div style={S.kpiCard}><span style={S.kpiLabel}>Pos. Promedio</span><span style={{ ...S.kpiValue, fontSize: '20px' }}>{gscPerformance.avgPosition ? gscPerformance.avgPosition.toFixed(1) : 'N/A'}</span></div>
            </div>
          </div>
        </div>

        {perfByDate.length > 0 && (
          <div style={{ ...S.card, marginBottom: '24px' }}>
            <div style={S.cardHeader}><div style={S.cardTitle}>Tendencia de Clicks</div></div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1px', height: '60px' }}>
              {perfByDate.map(([date, data], idx) => {
                const maxClicks = Math.max(...perfByDate.map(([, d]) => d.clicks || 0));
                const h = maxClicks > 0 ? ((data.clicks || 0) / maxClicks) * 100 : 0;
                return (<div key={idx} title={date + ': ' + (data.clicks || 0) + ' clicks'} style={{ flex: 1, height: Math.max(h, 2) + '%', background: 'linear-gradient(180deg, #10b981, #059669)', borderRadius: '1px 1px 0 0', cursor: 'pointer' }} />);
              })}
            </div>
          </div>
        )}

        <div style={{ ...S.grid3, marginBottom: '24px' }}>
          <div style={S.card}>
            <div style={S.cardHeader}><div style={{ ...S.cardTitle, color: '#10b981', fontSize: '14px' }}><Star size={16} color="#10b981" /> Top 3 ({top3Keywords.length})</div></div>
            {top3Keywords.length > 0 ? top3Keywords.map((kw, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #2a2d3a' }}>
                <span style={{ fontSize: '12px', color: '#ffffff' }}>{kw.keyword || kw.query}</span>
                <span style={{ fontSize: '11px', color: '#10b981', fontWeight: '600' }}>#{kw.position}</span>
              </div>
            )) : <span style={{ fontSize: '12px', color: '#8b8fa3' }}>No hay keywords en top 3</span>}
          </div>

          <div style={S.card}>
            <div style={S.cardHeader}><div style={{ ...S.cardTitle, color: '#f59e0b', fontSize: '14px' }}><TrendingUp size={16} color="#f59e0b" /> Alto Potencial ({highPotential.length})</div></div>
            {highPotential.length > 0 ? highPotential.map((kw, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #2a2d3a' }}>
                <span style={{ fontSize: '12px', color: '#ffffff' }}>{kw.keyword || kw.query}</span>
                <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: '600' }}>Pos #{kw.position}</span>
              </div>
            )) : <span style={{ fontSize: '12px', color: '#8b8fa3' }}>No hay keywords con alto potencial</span>}
          </div>

          <div style={S.card}>
            <div style={S.cardHeader}><div style={{ ...S.cardTitle, color: '#ef4444', fontSize: '14px' }}><AlertTriangle size={16} color="#ef4444" /> CTR Bajo ({lowCtr.length})</div></div>
            {lowCtr.length > 0 ? lowCtr.map((kw, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #2a2d3a' }}>
                <span style={{ fontSize: '12px', color: '#ffffff' }}>{kw.keyword || kw.query}</span>
                <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: '600' }}>{fmtPct(kw.ctr)}</span>
              </div>
            )) : <span style={{ fontSize: '12px', color: '#8b8fa3' }}>No hay keywords con CTR bajo</span>}
          </div>
        </div>

        {deviceData && (
          <div style={{ ...S.card, marginBottom: '24px' }}>
            <div style={S.cardHeader}><div style={S.cardTitle}>Rendimiento por Dispositivo</div></div>
            <div style={S.grid3}>
              {Object.entries(deviceData).map(([device, data], idx) => {
                const colors = { desktop: '#3b82f6', mobile: '#10b981', tablet: '#f59e0b' };
                return (
                  <div key={idx} style={{ ...S.card, background: '#151820', padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: colors[device] || '#8b8fa3', textTransform: 'capitalize', marginBottom: '12px' }}>{device}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><span style={S.textSmall}>Clicks</span><span style={{ fontSize: '12px', fontWeight: '600', color: '#ffffff' }}>{fmt(data.clicks)}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><span style={S.textSmall}>Impresiones</span><span style={{ fontSize: '12px', fontWeight: '600', color: '#ffffff' }}>{fmt(data.impressions)}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><span style={S.textSmall}>CTR</span><span style={{ fontSize: '12px', fontWeight: '600', color: '#ffffff' }}>{fmtPct(data.ctr)}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={S.textSmall}>Posición</span><span style={{ fontSize: '12px', fontWeight: '600', color: '#ffffff' }}>{data.position ? data.position.toFixed(1) : 'N/A'}</span></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {countryData.length > 0 && (
          <div style={{ ...S.card, marginBottom: '24px' }}>
            <div style={S.cardHeader}>
              <div style={S.cardTitle}><Globe size={18} color="#06b6d4" /> Top 10 Países</div>
            </div>
            {countryData.map((c, idx) => (
              <MiniBar key={idx} value={c.clicks || 0} max={countryData[0].clicks || 1} color="#06b6d4" label={c.country} />
            ))}
          </div>
        )}

        {topPages.length > 0 && (
          <div style={{ ...S.card, marginBottom: '24px' }}>
            <div style={S.cardHeader}><div style={S.cardTitle}>Top 10 Páginas</div></div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px', color: '#8b8fa3', borderBottom: '1px solid #2a2d3a' }}>Página</th>
                    <th style={{ textAlign: 'right', padding: '8px', color: '#8b8fa3', borderBottom: '1px solid #2a2d3a' }}>Clicks</th>
                    <th style={{ textAlign: 'right', padding: '8px', color: '#8b8fa3', borderBottom: '1px solid #2a2d3a' }}>CTR</th>
                    <th style={{ textAlign: 'right', padding: '8px', color: '#8b8fa3', borderBottom: '1px solid #2a2d3a' }}>Posición</th>
                  </tr>
                </thead>
                <tbody>
                  {topPages.map((page, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: '8px', color: '#ffffff', borderBottom: '1px solid #1a1d27', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{page.page || page.url || 'N/A'}</td>
                      <td style={{ padding: '8px', color: '#8b8fa3', textAlign: 'right', borderBottom: '1px solid #1a1d27' }}>{fmt(page.clicks)}</td>
                      <td style={{ padding: '8px', color: '#10b981', textAlign: 'right', borderBottom: '1px solid #1a1d27', fontWeight: '600' }}>{fmtPct(page.ctr)}</td>
                      <td style={{ padding: '8px', color: '#f59e0b', textAlign: 'right', borderBottom: '1px solid #1a1d27' }}>{page.position ? page.position.toFixed(1) : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={S.card}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}><Lightbulb size={18} color="#f59e0b" /> Oportunidades SEO</div>
          </div>
          <div style={S.grid2}>
            {highPotential.length > 0 && (
              <InsightCard type="tip" title="Keywords con alto potencial" text={highPotential.length + ' keywords en posición 10-30. Optimizando podrían llegar al top 5.'} impact="Alto" />
            )}
            {lowCtr.length > 0 && (
              <InsightCard type="warning" title="Mejorar snippets de búsqueda" text={lowCtr.length + ' keywords con CTR bajo. Optimizar titles y descriptions.'} impact="Medio" />
            )}
            {top3Keywords.length > 0 && (
              <InsightCard type="success" title="Keywords en top 3" text={top3Keywords.length + ' keywords ya están en las primeras posiciones.'} impact="Bajo" />
            )}
            {gscPerformance.avgPosition > 15 && (
              <InsightCard type="danger" title="Posición promedio alta" text={'Posición promedio de ' + gscPerformance.avgPosition.toFixed(1) + '. Las primeras posiciones capturan la mayoría de los clics.'} impact="Alto" />
            )}
          </div>
        </div>

        {gscPerformance.totalImpressions > 0 && gscPerformance.totalClicks > 0 && (
          <div style={{ ...S.card, marginTop: '24px' }}>
            <div style={S.cardHeader}>
              <div style={S.cardTitle}><BarChart2 size={18} color="#3b82f6" /> Resumen de Rendimiento SEO</div>
            </div>
            <div style={S.grid4}>
              <div style={{ padding: '16px', background: '#151820', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#8b8fa3', marginBottom: '4px', textTransform: 'uppercase' }}>Total Clicks</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#10b981' }}>{fmt(gscPerformance.totalClicks)}</div>
              </div>
              <div style={{ padding: '16px', background: '#151820', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#8b8fa3', marginBottom: '4px', textTransform: 'uppercase' }}>Total Impresiones</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#3b82f6' }}>{fmt(gscPerformance.totalImpressions)}</div>
              </div>
              <div style={{ padding: '16px', background: '#151820', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#8b8fa3', marginBottom: '4px', textTransform: 'uppercase' }}>CTR Promedio</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: fmtPct(gscPerformance.avgCtr) }}>{fmtPct(gscPerformance.avgCtr)}</div>
              </div>
              <div style={{ padding: '16px', background: '#151820', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#8b8fa3', marginBottom: '4px', textTransform: 'uppercase' }}>Pos. Promedio</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#f59e0b' }}>{gscPerformance.avgPosition ? gscPerformance.avgPosition.toFixed(1) : 'N/A'}</div>
              </div>
            </div>
          </div>
        )}

        {gscPerformance.keywords && gscPerformance.keywords.length > 0 && (
          <div style={{ ...S.card, marginTop: '24px' }}>
            <div style={S.cardHeader}>
              <div style={S.cardTitle}><Search size={18} color="#06b6d4" /> Distribución de Posiciones</div>
            </div>
            <div style={S.grid4}>
              {[
                { label: 'Top 1-3', count: gscPerformance.keywords.filter((k) => k.position <= 3).length, color: '#10b981' },
                { label: 'Top 4-10', count: gscPerformance.keywords.filter((k) => k.position > 3 && k.position <= 10).length, color: '#3b82f6' },
                { label: 'Top 11-20', count: gscPerformance.keywords.filter((k) => k.position > 10 && k.position <= 20).length, color: '#f59e0b' },
                { label: 'Pos. 20+', count: gscPerformance.keywords.filter((k) => k.position > 20).length, color: '#ef4444' },
              ].map((range, idx) => (
                <div key={idx} style={{ padding: '12px', background: '#151820', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#8b8fa3', marginBottom: '4px' }}>{range.label}</div>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: range.color }}>{range.count}</div>
                  <div style={{ fontSize: '10px', color: '#8b8fa3' }}>keywords</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {countryData.length > 0 && (
          <div style={{ ...S.card, marginTop: '24px' }}>
            <div style={S.cardHeader}>
              <div style={S.cardTitle}><Globe size={18} color="#06b6d4" /> Países - Impresiones vs Clicks</div>
            </div>
            {countryData.slice(0, 5).map((c, idx) => {
              const maxImp = Math.max(...countryData.map((d) => d.impressions || 0), 1);
              const maxClk = Math.max(...countryData.map((d) => d.clicks || 0), 1);
              return (
                <div key={idx} style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#ffffff', marginBottom: '4px', fontWeight: '500' }}>{c.country}</div>
                  <DualBar label="" valueA={c.clicks || 0} valueB={c.impressions || 0} labelA="Clicks" labelB="Impresiones" colorA="#10b981" colorB="#3b82f6" maxVal={maxImp > maxClk ? maxImp : maxClk} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function renderEcommerce() {
    const totalProducts = mcProducts ? mcProducts.totalProducts || 0 : 0;
    const inStock = mcProducts ? mcProducts.inStock || 0 : 0;
    const outOfStock = mcProducts ? mcProducts.outOfStock || 0 : 0;
    const withDesc = mcProducts ? mcProducts.withDesc || 0 : 0;
    const withGtin = mcProducts ? mcProducts.withGtin || 0 : 0;
    const withBrand = mcProducts ? mcProducts.withBrand || 0 : 0;
    const withImage = mcProducts ? mcProducts.withImage || 0 : 0;
    const withSalePrice = mcProducts ? mcProducts.withSalePrice || 0 : 0;
    const ga4Revenue = ga4Insights && ga4Insights.ecommerce ? ga4Insights.ecommerce.totalRevenue || 0 : 0;
    const ga4Purchases = ga4Insights && ga4Insights.ecommerce ? ga4Insights.ecommerce.purchases || 0 : 0;
    const aov = ga4Purchases > 0 ? ga4Revenue / ga4Purchases : 0;
    const catalogHealth = [
      { label: 'Con Imagen', value: withImage, total: totalProducts, color: '#3b82f6' },
      { label: 'Con Descripción', value: withDesc, total: totalProducts, color: '#10b981' },
      { label: 'Con GTIN/EAN', value: withGtin, total: totalProducts, color: '#f59e0b' },
      { label: 'Con Marca', value: withBrand, total: totalProducts, color: '#8b5cf6' },
      { label: 'Con Precio Oferta', value: withSalePrice, total: totalProducts, color: '#ef4444' },
    ];

    return (
      <div>
        <SectionHeader icon={ShoppingCart} title="E-commerce & Catálogo" subtitle="Salud del catálogo y métricas de tienda" />

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '24px' }}>
          <ScoreGauge score={scores ? scores.catalog : 0} label="Score Catálogo" size={100} />
          <div style={{ flex: 1 }}>
            <div style={S.grid5}>
              <KPITile icon={Package} label="Total Productos" value={fmt(totalProducts)} color="#3b82f6" />
              <KPITile icon={CheckCircle} label="En Stock" value={fmt(inStock)} color="#10b981" />
              <KPITile icon={AlertTriangle} label="Sin Stock" value={fmt(outOfStock)} color="#ef4444" />
              <KPITile icon={DollarSign} label="Revenue GA4" value={fmtCOP(ga4Revenue)} color="#f59e0b" />
              <KPITile icon={BarChart2} label="AOV GA4" value={fmtCOP(aov)} color="#8b5cf6" />
            </div>
          </div>
        </div>

        {priceRanges.length > 0 && (
          <div style={{ ...S.card, marginBottom: '24px' }}>
            <div style={S.cardHeader}><div style={S.cardTitle}>Distribución de Precios</div></div>
            {priceRanges.map((r, idx) => (
              <MiniBar key={idx} value={r.count} max={Math.max(...priceRanges.map((p) => p.count), 1)} color="#3b82f6" label={r.label} />
            ))}
          </div>
        )}

        <div style={{ ...S.card, marginBottom: '24px' }}>
          <div style={S.cardHeader}><div style={S.cardTitle}>Salud del Catálogo</div></div>
          {catalogHealth.map((item, idx) => {
            const pct = item.total > 0 ? item.value / item.total : 0;
            return (
              <div key={idx} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#8b8fa3' }}>{item.label}</span>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: pct >= 0.8 ? '#10b981' : pct >= 0.5 ? '#f59e0b' : '#ef4444' }}>
                    {fmt(item.value)} / {fmt(item.total)} ({(pct * 100).toFixed(0)}%)
                  </span>
                </div>
                <div style={{ height: '8px', background: '#2a2d3a', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: (pct * 100) + '%', height: '100%', background: item.color, borderRadius: '4px', transition: 'width 0.5s ease' }} />
                </div>
              </div>
            );
          })}
        </div>

        {topBrands.length > 0 && (
          <div style={{ ...S.card, marginBottom: '24px' }}>
            <div style={S.cardHeader}><div style={S.cardTitle}>Top Marcas</div></div>
            {topBrands.map((b, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#ffffff', minWidth: '120px' }}>{b.brand}</span>
                <div style={{ flex: 1 }}><MiniBar value={b.count} max={topBrands[0].count} color="#3b82f6" /></div>
                <span style={{ fontSize: '11px', color: '#8b8fa3', minWidth: '60px', textAlign: 'right' }}>{b.inStock} activos</span>
              </div>
            ))}
          </div>
        )}

        {ga4Insights && ga4Insights.topProducts && ga4Insights.topProducts.length > 0 && (
          <div style={{ ...S.card, marginBottom: '24px' }}>
            <div style={S.cardHeader}>
              <div style={S.cardTitle}><Star size={18} color="#f59e0b" /> Top Productos por Revenue</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px', color: '#8b8fa3', borderBottom: '1px solid #2a2d3a' }}>#</th>
                    <th style={{ textAlign: 'left', padding: '8px', color: '#8b8fa3', borderBottom: '1px solid #2a2d3a' }}>Producto</th>
                    <th style={{ textAlign: 'right', padding: '8px', color: '#8b8fa3', borderBottom: '1px solid #2a2d3a' }}>Revenue</th>
                    <th style={{ textAlign: 'right', padding: '8px', color: '#8b8fa3', borderBottom: '1px solid #2a2d3a' }}>Unidades</th>
                  </tr>
                </thead>
                <tbody>
                  {ga4Insights.topProducts.slice(0, 8).map((prod, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: '8px', color: '#8b8fa3', borderBottom: '1px solid #1a1d27' }}>{idx + 1}</td>
                      <td style={{ padding: '8px', color: '#ffffff', borderBottom: '1px solid #1a1d27' }}>{prod.name || prod.productName || 'N/A'}</td>
                      <td style={{ padding: '8px', color: '#10b981', textAlign: 'right', fontWeight: '600', borderBottom: '1px solid #1a1d27' }}>{fmtCOP(prod.revenue)}</td>
                      <td style={{ padding: '8px', color: '#8b8fa3', textAlign: 'right', borderBottom: '1px solid #1a1d27' }}>{fmt(prod.quantity || prod.units)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={S.card}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}><Lightbulb size={18} color="#f59e0b" /> Recomendaciones</div>
          </div>
          <div style={S.grid2}>
            {outOfStock > 0 && (
              <InsightCard type="danger" title="Reabastecer stock" text={outOfStock + ' productos sin stock. Priorizar los más vendidos.'} impact="Alto" />
            )}
            {totalProducts > 0 && withDesc / totalProducts < 0.8 && (
              <InsightCard type="warning" title="Completar descripciones" text={'Solo el ' + ((withDesc / totalProducts) * 100).toFixed(0) + '% de productos tienen descripción.'} impact="Medio" />
            )}
            {totalProducts > 0 && withGtin / totalProducts < 0.5 && (
              <InsightCard type="tip" title="Agregar códigos de barras" text={'Solo el ' + ((withGtin / totalProducts) * 100).toFixed(0) + '% tienen GTIN/EAN.'} impact="Bajo" />
            )}
            {totalProducts > 0 && withImage / totalProducts < 0.9 && (
              <InsightCard type="warning" title="Faltan imágenes" text={'El ' + ((1 - withImage / totalProducts) * 100).toFixed(0) + '% de productos no tienen imagen principal.'} impact="Alto" />
            )}
            {totalProducts > 0 && withBrand / totalProducts < 0.6 && (
              <InsightCard type="tip" title="Agregar marcas" text={'El ' + ((1 - withBrand / totalProducts) * 100).toFixed(0) + '% de productos no tienen marca asignada.'} impact="Medio" />
            )}
            {inStock > 0 && outOfStock > 0 && (
              <InsightCard type="success" title="Ratio stock" text={'Del total, ' + ((inStock / totalProducts) * 100).toFixed(0) + '% está disponible y ' + ((outOfStock / totalProducts) * 100).toFixed(0) + '% sin stock.'} impact="Info" />
            )}
          </div>
        </div>

        {tiendanubeProducts && tiendanubeProducts.length > 0 && (
          <div style={{ ...S.card, marginTop: '24px' }}>
            <div style={S.cardHeader}>
              <div style={S.cardTitle}><Package size={18} color="#06b6d4" /> Top Productos por Stock</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px', color: '#8b8fa3', borderBottom: '1px solid #2a2d3a' }}>Producto</th>
                    <th style={{ textAlign: 'right', padding: '8px', color: '#8b8fa3', borderBottom: '1px solid #2a2d3a' }}>Precio</th>
                    <th style={{ textAlign: 'right', padding: '8px', color: '#8b8fa3', borderBottom: '1px solid #2a2d3a' }}>Stock</th>
                    <th style={{ textAlign: 'center', padding: '8px', color: '#8b8fa3', borderBottom: '1px solid #2a2d3a' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {tiendanubeProducts
                    .sort((a, b) => (b.stock || b.inventory_quantity || 0) - (a.stock || a.inventory_quantity || 0))
                    .slice(0, 10)
                    .map((prod, idx) => {
                      const stock = prod.stock || prod.inventory_quantity || 0;
                      return (
                        <tr key={idx}>
                          <td style={{ padding: '8px', color: '#ffffff', borderBottom: '1px solid #1a1d27' }}>{prod.title || prod.name || 'N/A'}</td>
                          <td style={{ padding: '8px', color: '#8b8fa3', textAlign: 'right', borderBottom: '1px solid #1a1d27' }}>{fmtCOP(prod.price)}</td>
                          <td style={{ padding: '8px', color: stock > 10 ? '#10b981' : stock > 0 ? '#f59e0b' : '#ef4444', textAlign: 'right', fontWeight: '600', borderBottom: '1px solid #1a1d27' }}>{stock}</td>
                          <td style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #1a1d27' }}>
                            <span style={S.badge(stock > 10 ? '#10b981' : stock > 0 ? '#f59e0b' : '#ef4444')}>
                              {stock > 10 ? 'OK' : stock > 0 ? 'Bajo' : 'Agotado'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderAds() {
    const platforms = [
      { name: 'Meta Ads', color: '#3b82f6', spend: metaInsights ? metaInsights.spend || 0 : 0, revenue: metaInsights ? metaInsights.revenue || 0 : 0, conversions: metaInsights ? metaInsights.conversions || 0 : 0, roas: metaInsights ? metaInsights.roas || 0 : 0, cpa: metaInsights && metaInsights.conversions > 0 ? metaInsights.spend / metaInsights.conversions : 0, campaigns: metaInsights ? metaInsights.campaigns || [] : [] },
      { name: 'Google Ads', color: '#10b981', spend: googleAdsData ? googleAdsData.spend || 0 : 0, revenue: googleAdsData ? googleAdsData.revenue || 0 : 0, conversions: googleAdsData ? googleAdsData.conversions || 0 : 0, roas: googleAdsData ? googleAdsData.roas || 0 : 0, cpa: googleAdsData && googleAdsData.conversions > 0 ? googleAdsData.spend / googleAdsData.conversions : 0, campaigns: googleAdsData ? googleAdsData.campaigns || [] : [] },
      { name: 'TikTok', color: '#8b5cf6', spend: tiktokData ? tiktokData.spend || 0 : 0, revenue: tiktokData ? tiktokData.revenue || 0 : 0, conversions: tiktokData ? tiktokData.conversions || 0 : 0, roas: tiktokData ? tiktokData.roas || 0 : 0, cpa: tiktokData && tiktokData.conversions > 0 ? tiktokData.spend / tiktokData.conversions : 0, campaigns: tiktokData && tiktokData.campaigns ? tiktokData.campaigns : [] },
    ];
    const maxCpa = Math.max(...platforms.map((p) => p.cpa), 1);

    return (
      <div>
        <SectionHeader icon={Target} title="Publicidad" subtitle="Análisis de campañas publicitarias en todas las plataformas" />

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '24px' }}>
          <ScoreGauge score={scores ? scores.ads : 0} label="Score Ads" size={100} />
          <div style={{ flex: 1 }}>
            <div style={S.grid4}>
              <KPITile icon={DollarSign} label="Gasto Total" value={fmtCOP(adSpend.total)} color="#ef4444" />
              <KPITile icon={TrendingUp} label="Revenue Ads" value={fmtCOP(adRevenue.total)} color="#10b981" />
              <KPITile icon={Target} label="ROAS General" value={overallROAS.toFixed(2) + 'x'} color="#3b82f6" />
              <KPITile icon={Crosshair} label="Conversiones" value={fmt(adConversions.total)} color="#8b5cf6" />
            </div>
          </div>
        </div>

        <div style={{ ...S.grid3, marginBottom: '24px' }}>
          {platforms.map((p, idx) => (
            <div key={idx} style={{ ...S.card, borderTop: '3px solid ' + p.color }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: p.color, marginBottom: '16px' }}>{p.name}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={S.textSmall}>Gasto</span><span style={{ fontSize: '13px', fontWeight: '600', color: '#ffffff' }}>{fmtCOP(p.spend)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={S.textSmall}>Revenue</span><span style={{ fontSize: '13px', fontWeight: '600', color: '#10b981' }}>{fmtCOP(p.revenue)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={S.textSmall}>Conversiones</span><span style={{ fontSize: '13px', fontWeight: '600', color: '#ffffff' }}>{fmt(p.conversions)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={S.textSmall}>ROAS</span><span style={{ fontSize: '13px', fontWeight: '700', color: p.roas >= 2 ? '#10b981' : '#ef4444' }}>{p.roas.toFixed(2)}x</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={S.textSmall}>CPA</span><span style={{ fontSize: '13px', fontWeight: '600', color: '#ffffff' }}>{fmtCOP(p.cpa)}</span></div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ ...S.card, marginBottom: '24px' }}>
          <div style={S.cardHeader}><div style={S.cardTitle}>CPA por Plataforma</div></div>
          {platforms.map((p, idx) => (
            <MiniBar key={idx} value={p.cpa} max={maxCpa} color={p.color} label={p.name} />
          ))}
        </div>

        <div style={{ ...S.card, marginBottom: '24px' }}>
          <div style={S.cardHeader}><div style={S.cardTitle}>ROAS por Plataforma</div></div>
          <div style={S.grid3}>
            {platforms.map((p, idx) => (
              <div key={idx} style={{ textAlign: 'center' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: '4px solid ' + (p.roas >= 2 ? '#10b981' : p.roas >= 1 ? '#f59e0b' : '#ef4444'), display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                  <span style={{ fontSize: '18px', fontWeight: '700', color: p.roas >= 2 ? '#10b981' : p.roas >= 1 ? '#f59e0b' : '#ef4444' }}>{p.roas.toFixed(1)}x</span>
                </div>
                <span style={{ fontSize: '12px', color: p.color, fontWeight: '600' }}>{p.name}</span>
              </div>
            ))}
          </div>
        </div>

        {platforms.map((p, idx) => (
          p.campaigns.length > 0 && (
            <div key={idx} style={{ ...S.card, marginBottom: '24px' }}>
              <div style={S.cardHeader}>
                <div style={{ ...S.cardTitle, color: p.color }}><Layers size={16} color={p.color} /> Campañas {p.name}</div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '6px', color: '#8b8fa3', borderBottom: '1px solid #2a2d3a' }}>Campaña</th>
                      <th style={{ textAlign: 'right', padding: '6px', color: '#8b8fa3', borderBottom: '1px solid #2a2d3a' }}>Gasto</th>
                      <th style={{ textAlign: 'right', padding: '6px', color: '#8b8fa3', borderBottom: '1px solid #2a2d3a' }}>Revenue</th>
                      <th style={{ textAlign: 'right', padding: '6px', color: '#8b8fa3', borderBottom: '1px solid #2a2d3a' }}>ROAS</th>
                      <th style={{ textAlign: 'right', padding: '6px', color: '#8b8fa3', borderBottom: '1px solid #2a2d3a' }}>CPA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.campaigns.slice(0, 8).map((c, ci) => (
                      <tr key={ci}>
                        <td style={{ padding: '6px', color: '#ffffff', borderBottom: '1px solid #1a1d27' }}>{c.name || c.campaignName || 'N/A'}</td>
                        <td style={{ padding: '6px', color: '#8b8fa3', textAlign: 'right', borderBottom: '1px solid #1a1d27' }}>{fmtCOP(c.spend || c.cost)}</td>
                        <td style={{ padding: '6px', color: '#10b981', textAlign: 'right', borderBottom: '1px solid #1a1d27', fontWeight: '600' }}>{fmtCOP(c.revenue)}</td>
                        <td style={{ padding: '6px', color: c.roas >= 2 ? '#10b981' : '#ef4444', textAlign: 'right', fontWeight: '600', borderBottom: '1px solid #1a1d27' }}>{c.roas ? c.roas.toFixed(2) + 'x' : 'N/A'}</td>
                        <td style={{ padding: '6px', color: '#8b8fa3', textAlign: 'right', borderBottom: '1px solid #1a1d27' }}>{c.spend && c.conversions ? fmtCOP(c.spend / c.conversions) : 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ))}

        <div style={S.card}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}><Lightbulb size={18} color="#f59e0b" /> Recomendaciones de Publicidad</div>
          </div>
          <div style={S.grid2}>
            {platforms.map((p, idx) => {
              if (p.roas < 1 && p.spend > 0) return (<InsightCard key={idx} type="danger" title={p.name + ': ROAS negativo'} text={'ROAS de ' + p.roas.toFixed(2) + 'x. Revisar o pausar campañas.'} impact="Crítico" />);
              if (p.roas < 2 && p.spend > 0) return (<InsightCard key={idx} type="warning" title={p.name + ': ROAS mejorable'} text={'ROAS de ' + p.roas.toFixed(2) + 'x. Optimizar audiencias y creativos.'} impact="Alto" />);
              if (p.roas >= 2 && p.spend > 0) return (<InsightCard key={idx} type="success" title={p.name + ': ROAS saludable'} text={'ROAS de ' + p.roas.toFixed(2) + 'x. Considerar escalar presupuesto.'} impact="Bajo" />);
              return null;
            })}
            {adSpend.total > 0 && (
              <InsightCard type="tip" title="Distribución de presupuesto" text={'Meta: ' + ((adSpend.meta / adSpend.total) * 100).toFixed(0) + '% | Google: ' + ((adSpend.gads / adSpend.total) * 100).toFixed(0) + '% | TikTok: ' + ((adSpend.tt / adSpend.total) * 100).toFixed(0) + '%'} impact="Info" />
            )}
            {adConversions.total > 0 && adSpend.total > 0 && (
              <InsightCard type="tip" title="CPA General" text={'Costo promedio por adquisición: ' + fmtCOP(adSpend.total / adConversions.total) + '. Comparar con lifetime value del cliente.'} impact="Medio" />
            )}
          </div>
        </div>

        {adSpend.total > 0 && (
          <div style={{ ...S.card, marginTop: '24px' }}>
            <div style={S.cardHeader}>
              <div style={S.cardTitle}><PieChart size={18} color="#8b5cf6" /> Distribución de Gasto Publicitario</div>
            </div>
            <DonutChart
              segments={[
                { label: 'Meta Ads', value: adSpend.meta, color: '#3b82f6' },
                { label: 'Google Ads', value: adSpend.gads, color: '#10b981' },
                { label: 'TikTok', value: adSpend.tt, color: '#8b5cf6' },
              ]}
              size={140}
              thickness={16}
            />
          </div>
        )}

        {adRevenue.total > 0 && adSpend.total > 0 && (
          <div style={{ ...S.card, marginTop: '24px' }}>
            <div style={S.cardHeader}>
              <div style={S.cardTitle}><DollarSign size={18} color="#10b981" /> Análisis de Rentabilidad</div>
            </div>
            <div style={S.grid3}>
              <div style={{ padding: '16px', background: '#151820', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#8b8fa3', marginBottom: '4px', textTransform: 'uppercase' }}>Gasto Total</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#ef4444' }}>{fmtCOP(adSpend.total)}</div>
              </div>
              <div style={{ padding: '16px', background: '#151820', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#8b8fa3', marginBottom: '4px', textTransform: 'uppercase' }}>Revenue Total</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#10b981' }}>{fmtCOP(adRevenue.total)}</div>
              </div>
              <div style={{ padding: '16px', background: '#151820', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#8b8fa3', marginBottom: '4px', textTransform: 'uppercase' }}>ROI Neto</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: adRevenue.total - adSpend.total >= 0 ? '#10b981' : '#ef4444' }}>{fmtCOP(adRevenue.total - adSpend.total)}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderAudiences() {
    return (
      <div>
        <SectionHeader icon={Users} title="Audiencias" subtitle="Análisis de tráfico y segmentos de clientes" />

        {organicVsPaid && (
          <div style={{ ...S.card, marginBottom: '24px' }}>
            <div style={S.cardHeader}><div style={S.cardTitle}>Orgánico vs Pagado</div></div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <div style={{ flex: organicVsPaid.organicPct, height: '32px', background: 'linear-gradient(90deg, #10b981, #059669)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600', color: '#ffffff' }}>
                Orgánico {fmtPct(organicVsPaid.organicPct)} ({fmt(organicVsPaid.organicTotal)})
              </div>
              <div style={{ flex: organicVsPaid.paidPct, height: '32px', background: 'linear-gradient(90deg, #f59e0b, #d97706)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600', color: '#ffffff' }}>
                Pagado {fmtPct(organicVsPaid.paidPct)} ({fmt(organicVsPaid.paidTotal)})
              </div>
            </div>
            <div style={S.grid2}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#10b981', marginBottom: '8px', display: 'block' }}>Canales Orgánicos</span>
                {organicVsPaid.organic.map((item, idx) => (
                  <MiniBar key={idx} value={item.sessions} max={organicVsPaid.organicTotal} color="#10b981" label={item.channel} />
                ))}
              </div>
              <div>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#f59e0b', marginBottom: '8px', display: 'block' }}>Canales Pagados</span>
                {organicVsPaid.paid.map((item, idx) => (
                  <MiniBar key={idx} value={item.sessions} max={organicVsPaid.paidTotal} color="#f59e0b" label={item.channel} />
                ))}
              </div>
            </div>
          </div>
        )}

        {deviceData && (
          <div style={{ ...S.card, marginBottom: '24px' }}>
            <div style={S.cardHeader}><div style={S.cardTitle}>Dispositivos</div></div>
            <div style={S.grid3}>
              {Object.entries(deviceData).map(([device, data], idx) => {
                const colors = { desktop: '#3b82f6', mobile: '#10b981', tablet: '#f59e0b' };
                const totalClicks = Object.values(deviceData).reduce((s, d) => s + (d.clicks || 0), 0);
                const pct = totalClicks > 0 ? ((data.clicks || 0) / totalClicks * 100) : 0;
                return (
                  <div key={idx} style={{ ...S.card, background: '#151820', textAlign: 'center', padding: '16px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: colors[device] || '#8b8fa3', textTransform: 'capitalize', marginBottom: '8px' }}>{device}</div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#ffffff', marginBottom: '4px' }}>{pct.toFixed(1)}%</div>
                    <div style={S.textSmall}>{fmt(data.clicks)} clicks</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {countryData.length > 0 && (
          <div style={{ ...S.card, marginBottom: '24px' }}>
            <div style={S.cardHeader}>
              <div style={S.cardTitle}><Globe size={18} color="#06b6d4" /> Top 10 Países</div>
            </div>
            {countryData.map((c, idx) => (
              <MiniBar key={idx} value={c.clicks || 0} max={countryData[0].clicks || 1} color="#06b6d4" label={c.country} />
            ))}
          </div>
        )}

        <div style={{ ...S.card, marginBottom: '24px' }}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}><Users size={18} color="#8b5cf6" /> Segmentos de Clientes TN</div>
          </div>
          <div style={S.grid2}>
            <div>
              {Object.entries(tnClientSegments).filter(([key]) => key !== 'dataQuality').filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([segment, count], idx) => {
                const totalClients = unifiedClients ? unifiedClients.length : 1;
                return (
                  <div key={idx} style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#8b8fa3' }}>{segment.replace(/_/g, ' ')}</span>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: '#ffffff' }}>{count} ({((count / totalClients) * 100).toFixed(1)}%)</span>
                    </div>
                    <div style={{ height: '6px', background: '#2a2d3a', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: (count / totalClients) * 100 + '%', height: '100%', background: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][idx % 5], borderRadius: '3px' }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div>
              <div style={{ ...S.kpiCard, background: '#151820', marginBottom: '8px' }}>
                <span style={S.kpiLabel}>Total Clientes</span>
                <span style={{ ...S.kpiValue, fontSize: '20px' }}>{fmt(unifiedClients ? unifiedClients.length : 0)}</span>
              </div>
              <div style={{ ...S.kpiCard, background: '#151820', marginBottom: '8px' }}>
                <span style={S.kpiLabel}>Con Email</span>
                <span style={{ ...S.kpiValue, fontSize: '20px', color: '#10b981' }}>{fmtPct(tnClientSegments.dataQuality.email)}</span>
              </div>
              <div style={{ ...S.kpiCard, background: '#151820' }}>
                <span style={S.kpiLabel}>Con Teléfono</span>
                <span style={{ ...S.kpiValue, fontSize: '20px', color: '#3b82f6' }}>{fmtPct(tnClientSegments.dataQuality.phone)}</span>
              </div>
            </div>
          </div>
        </div>

        {ga4Insights && ga4Insights.topEvents && ga4Insights.topEvents.length > 0 && (
          <div style={{ ...S.card, marginBottom: '24px' }}>
            <div style={S.cardHeader}>
              <div style={S.cardTitle}><Activity size={18} color="#06b6d4" /> Top 10 Eventos GA4</div>
            </div>
            {ga4Insights.topEvents.slice(0, 10).map((evt, idx) => {
              const maxEvt = ga4Insights.topEvents[0] ? ga4Insights.topEvents[0].count || ga4Insights.topEvents[0].value || 1 : 1;
              return (<MiniBar key={idx} value={evt.count || evt.value || 0} max={maxEvt} color="#06b6d4" label={evt.event || evt.name || 'N/A'} />);
            })}
          </div>
        )}

        <div style={S.card}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}><Lightbulb size={18} color="#f59e0b" /> Insights de Audiencias</div>
          </div>
          <div style={S.grid2}>
            {organicVsPaid && organicVsPaid.paidPct > 0.5 && (
              <InsightCard type="warning" title="Dependencia de tráfico pagado" text={'El ' + fmtPct(organicVsPaid.paidPct) + ' del tráfico es pagado. Invertir en SEO.'} impact="Alto" />
            )}
            {tnClientSegments.riesgo_churn > 0 && (
              <InsightCard type="danger" title="Clientes en riesgo de churn" text={tnClientSegments.riesgo_churn + ' clientes en riesgo. Activar retención.'} impact="Alto" />
            )}
            {tnClientSegments.dormido > 0 && (
              <InsightCard type="tip" title="Clientes dormidos" text={tnClientSegments.dormido + ' clientes inactivos. Reactivar con ofertas.'} impact="Medio" />
            )}
            {tnClientSegments.vip > 0 && (
              <InsightCard type="success" title="Base de clientes VIP" text={tnClientSegments.vip + ' clientes VIP. Crear programa exclusivo.'} impact="Medio" />
            )}
            {organicVsPaid && organicVsPaid.organicPct > 0.7 && (
              <InsightCard type="success" title="Fuerte presencia orgánica" text={'El ' + fmtPct(organicVsPaid.organicPct) + ' del tráfico es orgánico. Buena base SEO.'} impact="Bajo" />
            )}
            {tnClientSegments.sensible_precio > 0 && (
              <InsightCard type="tip" title="Segmento sensible al precio" text={tnClientSegments.sensible_precio + ' clientes sensibles al precio. Usar ofertas y descuentos estratégicamente.'} impact="Medio" />
            )}
          </div>
        </div>

        {tnMetrics.segmentDistribution && Object.keys(tnMetrics.segmentDistribution).length > 0 && (
          <div style={{ ...S.card, marginTop: '24px' }}>
            <div style={S.cardHeader}>
              <div style={S.cardTitle}><Users size={18} color="#8b5cf6" /> Distribución de Segmentos por Órdenes</div>
            </div>
            <div style={S.grid2}>
              <div>
                <DonutChart
                  segments={Object.entries(tnMetrics.segmentDistribution).slice(0, 6).map(([seg, count], idx) => ({
                    label: seg.replace(/_/g, ' '),
                    value: count,
                    color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'][idx % 6],
                  }))}
                  size={120}
                  thickness={14}
                />
              </div>
              <div>
                {Object.entries(tnMetrics.segmentDistribution).slice(0, 6).map(([seg, count], idx) => (
                  <MetricRow
                    key={idx}
                    icon={Users}
                    label={seg.replace(/_/g, ' ')}
                    value={fmt(count)}
                    color={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'][idx % 6]}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {ga4Insights && ga4Insights.ecommerce && (
          <div style={{ ...S.card, marginTop: '24px' }}>
            <div style={S.cardHeader}>
              <div style={S.cardTitle}><ShoppingCart size={18} color="#10b981" /> Métricas de Comportamiento GA4</div>
            </div>
            <div style={S.grid3}>
              <div style={{ padding: '16px', background: '#151820', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#8b8fa3', marginBottom: '4px', textTransform: 'uppercase' }}>Vistas de Producto</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#3b82f6' }}>{fmt(ga4Insights.ecommerce.productViews || 0)}</div>
              </div>
              <div style={{ padding: '16px', background: '#151820', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#8b8fa3', marginBottom: '4px', textTransform: 'uppercase' }}>Añadidos al Carrito</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#f59e0b' }}>{fmt(ga4Insights.ecommerce.addToCart || 0)}</div>
              </div>
              <div style={{ padding: '16px', background: '#151820', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#8b8fa3', marginBottom: '4px', textTransform: 'uppercase' }}>Checkouts</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#8b5cf6' }}>{fmt(ga4Insights.ecommerce.beginCheckout || 0)}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderDecisions() {
    return (
      <div>
        <SectionHeader icon={Lightbulb} title="Decisiones" subtitle="Matriz de prioridades y plan de acción recomendado" />

        <div style={{ ...S.card, marginBottom: '24px' }}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}><Crosshair size={18} color="#ef4444" /> Matriz Impacto × Esfuerzo</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1fr', gridTemplateRows: '30px 80px 80px 80px', gap: '2px', fontSize: '11px' }}>
            <div />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b8fa3', fontWeight: '600' }}>Esfuerzo Bajo</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b8fa3', fontWeight: '600' }}>Esfuerzo Medio</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b8fa3', fontWeight: '600' }}>Esfuerzo Alto</div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b8fa3', fontWeight: '600' }}>Impacto Alto</div>
            <div style={{ background: '#10b98120', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', fontWeight: '600', fontSize: '10px', textAlign: 'center', padding: '4px' }}>Quick Wins</div>
            <div style={{ background: '#3b82f620', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', fontWeight: '600', fontSize: '10px', textAlign: 'center', padding: '4px' }}>Proyectos</div>
            <div style={{ background: '#f59e0b20', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b', fontWeight: '600', fontSize: '10px', textAlign: 'center', padding: '4px' }}>Inversiones</div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b8fa3', fontWeight: '600' }}>Impacto Medio</div>
            <div style={{ background: '#10b98110', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', fontWeight: '500', fontSize: '10px', textAlign: 'center', padding: '4px' }}>Prioritario</div>
            <div style={{ background: '#2a2d3a', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b8fa3', fontWeight: '500', fontSize: '10px', textAlign: 'center', padding: '4px' }}>Rutinario</div>
            <div style={{ background: '#f59e0b10', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b', fontWeight: '500', fontSize: '10px', textAlign: 'center', padding: '4px' }}>Reconsiderar</div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b8fa3', fontWeight: '600' }}>Impacto Bajo</div>
            <div style={{ background: '#2a2d3a', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b8fa3', fontWeight: '500', fontSize: '10px', textAlign: 'center', padding: '4px' }}>Filler</div>
            <div style={{ background: '#2a2d3a', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b8fa3', fontWeight: '500', fontSize: '10px', textAlign: 'center', padding: '4px' }}>Opcional</div>
            <div style={{ background: '#ef444410', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontWeight: '500', fontSize: '10px', textAlign: 'center', padding: '4px' }}>Evitar</div>
          </div>
        </div>

        <div style={{ ...S.card, marginBottom: '24px' }}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}><Target size={18} color="#3b82f6" /> Top 8 Prioridades</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {priorities.length > 0 ? priorities.map((p, idx) => {
              const impactColors = { alto: '#ef4444', medio: '#f59e0b', bajo: '#10b981' };
              const effortColors = { alto: '#ef4444', medio: '#f59e0b', bajo: '#10b981' };
              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: '#151820', borderRadius: '8px', border: '1px solid #2a2d3a' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', color: '#ffffff', flexShrink: 0 }}>
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#ffffff', marginBottom: '4px' }}>{p.title}</div>
                    <div style={{ fontSize: '12px', color: '#8b8fa3' }}>{p.description}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <span style={S.badge(impactColors[p.impact] || '#8b8fa3')}>Impacto: {p.impact}</span>
                    <span style={S.badge(effortColors[p.effort] || '#8b8fa3')}>Esfuerzo: {p.effort}</span>
                  </div>
                  {p.revenue > 0 && (
                    <div style={{ fontSize: '13px', color: '#10b981', fontWeight: '600', flexShrink: 0 }}>{fmtCOP(p.revenue)}</div>
                  )}
                  <span style={S.badge('#8b5cf6')}>{p.platform}</span>
                </div>
              );
            }) : (
              <EmptyState icon={CheckCircle} title="Sin prioridades pendientes" text="¡Todo está optimizado!" />
            )}
          </div>
        </div>

        <div style={{ ...S.card, marginBottom: '24px' }}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}><AlertTriangle size={18} color="#ef4444" /> Alertas Urgentes</div>
          </div>
          <div style={S.grid2}>
            {tnMetrics.cancelledOrders > 0 && (
              <InsightCard type="danger" title="Órdenes canceladas" text={tnMetrics.cancelledOrders + ' órdenes canceladas. Revisar flujo de checkout.'} impact="Alto" />
            )}
            {outOfStockProducts.length > 0 && (
              <InsightCard type="danger" title="Productos sin stock" text={outOfStockProducts.length + ' productos agotados. Reabastecer urgentemente.'} impact="Alto" />
            )}
            {overallROAS < 1 && adSpend.total > 0 && (
              <InsightCard type="danger" title="ROAS negativo" text={'El ROAS general es ' + overallROAS.toFixed(2) + 'x. Las ads cuestan más de lo que generan.'} impact="Crítico" />
            )}
            {tnMetrics.pendingOrders > 5 && (
              <InsightCard type="warning" title="Órdenes pendientes" text={tnMetrics.pendingOrders + ' órdenes esperando procesamiento.'} impact="Medio" />
            )}
          </div>
        </div>

        <div style={{ ...S.card, marginBottom: '24px' }}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}><FileText size={18} color="#3b82f6" /> Plan de Acción Semanal</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {tnMetrics.pendingOrders > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#151820', borderRadius: '6px' }}>
                <CheckCircle size={16} color="#8b8fa3" />
                <span style={{ fontSize: '13px', color: '#ffffff' }}>Procesar {tnMetrics.pendingOrders} órdenes pendientes</span>
              </div>
            )}
            {outOfStockProducts.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#151820', borderRadius: '6px' }}>
                <Package size={16} color="#8b8fa3" />
                <span style={{ fontSize: '13px', color: '#ffffff' }}>{'Reabastecer ' + outOfStockProducts.length + ' productos sin stock'}</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#151820', borderRadius: '6px' }}>
              <Target size={16} color="#8b8fa3" />
              <span style={{ fontSize: '13px', color: '#ffffff' }}>Revisar y optimizar campañas publicitarias</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#151820', borderRadius: '6px' }}>
              <Search size={16} color="#8b8fa3" />
              <span style={{ fontSize: '13px', color: '#ffffff' }}>Analizar keywords de alto potencial SEO</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#151820', borderRadius: '6px' }}>
              <Users size={16} color="#8b8fa3" />
              <span style={{ fontSize: '13px', color: '#ffffff' }}>Ejecutar campaña de retención para churn risk</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#151820', borderRadius: '6px' }}>
              <ShoppingCart size={16} color="#8b8fa3" />
              <span style={{ fontSize: '13px', color: '#ffffff' }}>Completar descripciones y datos de catálogo</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#151820', borderRadius: '6px' }}>
              <Zap size={16} color="#8b8fa3" />
              <span style={{ fontSize: '13px', color: '#ffffff' }}>Configurar alertas de bajo stock automáticas</span>
            </div>
          </div>
        </div>

        {crossInsights.length > 0 && (
          <div style={S.card}>
            <div style={S.cardHeader}>
              <div style={S.cardTitle}><Layers size={18} color="#8b5cf6" /> Correlaciones Cross-Platform</div>
            </div>
            <div style={S.grid2}>
              {crossInsights.map((ci, idx) => (
                <div key={idx} style={{ ...S.card, background: '#151820', borderLeft: '3px solid ' + ci.color, padding: '16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#ffffff', marginBottom: '6px' }}>{ci.title}</div>
                  <div style={{ fontSize: '12px', color: '#8b8fa3', marginBottom: '8px' }}>{ci.text}</div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {ci.platforms.map((pl, pi) => (
                      <span key={pi} style={S.badge('#8b5cf6')}>{pl}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ ...S.card, marginTop: '24px' }}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}><Zap size={18} color="#06b6d4" /> Resumen Ejecutivo</div>
          </div>
          <div style={S.grid3}>
            <div style={{ padding: '16px', background: '#151820', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#8b8fa3', marginBottom: '4px', textTransform: 'uppercase' }}>Prioridades Críticas</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#ef4444' }}>{priorities.filter((p) => p.impact === 'alto').length}</div>
              <div style={{ fontSize: '10px', color: '#8b8fa3', marginTop: '2px' }}>impacto alto</div>
            </div>
            <div style={{ padding: '16px', background: '#151820', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#8b8fa3', marginBottom: '4px', textTransform: 'uppercase' }}>Alertas Activas</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#f59e0b' }}>{crossInsights.length + insights.filter((i) => i.type === 'danger').length}</div>
              <div style={{ fontSize: '10px', color: '#8b8fa3', marginTop: '2px' }}>requieren atención</div>
            </div>
            <div style={{ padding: '16px', background: '#151820', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#8b8fa3', marginBottom: '4px', textTransform: 'uppercase' }}>Score General</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: scores ? SCORE_COLORS(scores.overall) : '#8b8fa3' }}>{scores ? scores.overall : 'N/A'}</div>
              <div style={{ fontSize: '10px', color: '#8b8fa3', marginTop: '2px' }}>de 100</div>
            </div>
          </div>
        </div>

        <div style={{ ...S.card, marginTop: '24px' }}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}><Clock size={18} color="#f59e0b" /> Timeline de Acciones Recomendadas</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {[
              { time: 'Hoy', action: 'Revisar y procesar órdenes pendientes', color: '#ef4444', priority: 'Urgente' },
              { time: 'Hoy', action: 'Verificar alertas de stock crítico', color: '#ef4444', priority: 'Urgente' },
              { time: 'Esta semana', action: 'Optimizar campañas con ROAS < 1', color: '#f59e0b', priority: 'Alta' },
              { time: 'Esta semana', action: 'Revisar y responder clientes en riesgo de churn', color: '#f59e0b', priority: 'Alta' },
              { time: 'Esta semana', action: 'Analizar keywords de alto potencial SEO', color: '#3b82f6', priority: 'Media' },
              { time: 'Próximo mes', action: 'Completar descripciones del catálogo', color: '#10b981', priority: 'Normal' },
              { time: 'Próximo mes', action: 'Implementar programa de fidelización VIP', color: '#10b981', priority: 'Normal' },
              { time: 'Próximo mes', action: 'Agregar códigos de barras a productos', color: '#8b5cf6', priority: 'Baja' },
            ].map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderLeft: '3px solid ' + item.color, background: idx % 2 === 0 ? '#151820' : 'transparent', marginBottom: '2px' }}>
                <span style={{ fontSize: '11px', color: '#8b8fa3', minWidth: '90px', fontWeight: '500' }}>{item.time}</span>
                <span style={{ fontSize: '13px', color: '#ffffff', flex: 1 }}>{item.action}</span>
                <span style={S.badge(item.color)}>{item.priority}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const renderCompetitors = () => {
    const compList = competitors || [];
    const ls = landscape || {};
    const totalAds = ls.totalAds || 0;
    const adsByStage = ls.adsByStage || {};
    const mySpend = metaInsights?.global?.spend || 0;
    const myImpressions = metaInsights?.global?.impressions || 0;
    const myClicks = metaInsights?.global?.clicks || 0;
    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={S.card}>
            <div style={{ fontSize: '12px', color: '#8b8fa3', marginBottom: '8px' }}>Competidores Rastreados</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#3b82f6' }}>{compList.length}</div>
          </div>
          <div style={S.card}>
            <div style={{ fontSize: '12px', color: '#8b8fa3', marginBottom: '8px' }}>Anuncios en Mercado</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#8b5cf6' }}>{fmt(totalAds)}</div>
          </div>
          <div style={S.card}>
            <div style={{ fontSize: '12px', color: '#8b8fa3', marginBottom: '8px' }}>Tu Inversión</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#10b981' }}>{fmtCOP(mySpend)}</div>
          </div>
          <div style={S.card}>
            <div style={{ fontSize: '12px', color: '#8b8fa3', marginBottom: '8px' }}>Tus Impresiones</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#f59e0b' }}>{fmt(myImpressions)}</div>
          </div>
        </div>
        {compList.length === 0 ? (
          <div style={{ ...S.card, textAlign: 'center', padding: '60px 20px' }}>
            <Shield size={48} style={{ color: '#3b82f6', marginBottom: '16px' }} />
            <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Sin Competidores Configurados</div>
            <div style={{ fontSize: '14px', color: '#8b8fa3' }}>Agrega competidores desde el panel de Inteligencia Competitiva.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={S.card}>
              <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><Shield size={16} style={{ color: '#3b82f6' }} /> Competidores</div>
              {compList.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderBottom: '1px solid #2a2d3a', fontSize: '13px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px', fontWeight: '700' }}>{(c.name || 'C')[0]}</div>
                  <div style={{ flex: 1 }}><div style={{ fontWeight: '600' }}>{c.name}</div><div style={{ fontSize: '11px', color: '#8b8fa3' }}>{c.category || 'Sin categoría'}</div></div>
                </div>
              ))}
            </div>
            <div style={S.card}>
              <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><BarChart2 size={16} style={{ color: '#8b5cf6' }} /> Anuncios por Etapa del Funnel</div>
              {['Awareness', 'Consideration', 'Conversion', 'Retention'].map((stage) => {
                const count = adsByStage[stage] || 0;
                const pct = totalAds > 0 ? (count / totalAds * 100) : 0;
                const colors = { Awareness: '#3b82f6', Consideration: '#f59e0b', Conversion: '#10b981', Retention: '#8b5cf6' };
                return (
                  <div key={stage} style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span style={{ color: '#ffffff' }}>{stage}</span>
                      <span style={{ color: '#8b8fa3' }}>{count} ({pct.toFixed(1)}%)</span>
                    </div>
                    <div style={{ height: '8px', background: '#2a2d3a', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: pct + '%', background: colors[stage], borderRadius: '4px', transition: 'width 0.5s' }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ ...S.card, gridColumn: '1 / -1' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><Eye size={16} style={{ color: '#10b981' }} /> Tu Presencia Publicitaria</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                {[{ label: 'Inversión', value: fmtCOP(mySpend), color: '#3b82f6', icon: DollarSign },
                  { label: 'Impresiones', value: fmt(myImpressions), color: '#8b5cf6', icon: Eye },
                  { label: 'Clics', value: fmt(myClicks), color: '#10b981', icon: MousePointerClick }
                ].map((m, i) => (
                  <div key={i} style={{ textAlign: 'center', padding: '16px', background: '#151820', borderRadius: '8px' }}>
                    <m.icon size={20} style={{ color: m.color, marginBottom: '8px' }} />
                    <div style={{ fontSize: '20px', fontWeight: '700', color: m.color }}>{m.value}</div>
                    <div style={{ fontSize: '11px', color: '#8b8fa3', marginTop: '4px' }}>{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const [utmUrl, setUtmUrl] = useState('');
  const [utmSource, setUtmSource] = useState('');
  const [utmMedium, setUtmMedium] = useState('');
  const [utmCampaign, setUtmCampaign] = useState('');
  const [utmTerm, setUtmTerm] = useState('');
  const [utmContent, setUtmContent] = useState('');
  const [utmHistory, setUtmHistory] = useState(() => { try { return JSON.parse(localStorage.getItem('utm_history') || '[]'); } catch { return []; } });
  const [utmCopied, setUtmCopied] = useState(false);

  const utmTemplates = [
    { name: 'Social Paid', source: 'facebook', medium: 'cpc' },
    { name: 'Instagram Ads', source: 'instagram', medium: 'cpc' },
    { name: 'Google Search', source: 'google', medium: 'cpc' },
    { name: 'TikTok', source: 'tiktok', medium: 'cpc' },
    { name: 'Email', source: 'newsletter', medium: 'email' },
    { name: 'WhatsApp', source: 'whatsapp', medium: 'social' },
    { name: 'Orgánico', source: 'google', medium: 'organic' },
  ];

  const buildUtmUrl = useCallback(() => {
    if (!utmUrl) return '';
    const base = utmUrl.includes('?') ? utmUrl.split('?')[0] : utmUrl;
    const params = [];
    if (utmSource) params.push('utm_source=' + encodeURIComponent(utmSource));
    if (utmMedium) params.push('utm_medium=' + encodeURIComponent(utmMedium));
    if (utmCampaign) params.push('utm_campaign=' + encodeURIComponent(utmCampaign));
    if (utmTerm) params.push('utm_term=' + encodeURIComponent(utmTerm));
    if (utmContent) params.push('utm_content=' + encodeURIComponent(utmContent));
    return params.length > 0 ? base + '?' + params.join('&') : base;
  }, [utmUrl, utmSource, utmMedium, utmCampaign, utmTerm, utmContent]);

  const handleCopyUtm = () => {
    const url = buildUtmUrl();
    if (url) { navigator.clipboard.writeText(url); setUtmCopied(true); setTimeout(() => setUtmCopied(false), 2000); }
  };

  const handleSaveUtm = () => {
    const url = buildUtmUrl();
    if (!url) return;
    const entry = { url, source: utmSource, medium: utmMedium, campaign: utmCampaign, term: utmTerm, content: utmContent, date: new Date().toISOString() };
    const newHistory = [entry, ...utmHistory].slice(0, 20);
    setUtmHistory(newHistory);
    localStorage.setItem('utm_history', JSON.stringify(newHistory));
  };

  const handleApplyTemplate = (t) => {
    setUtmSource(t.source); setUtmMedium(t.medium);
  };

  const renderUTM = () => {
    const previewUrl = buildUtmUrl();
    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={S.card}>
            <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><Link size={16} style={{ color: '#3b82f6' }} /> Constructor de URLs UTM</div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#8b8fa3', display: 'block', marginBottom: '4px' }}>URL Base *</label>
              <input value={utmUrl} onChange={e => setUtmUrl(e.target.value)} placeholder="https://tutienda.com/producto" style={{ width: '100%', padding: '10px 12px', background: '#151820', border: '1px solid #2a2d3a', borderRadius: '8px', color: '#ffffff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              {[{ label: 'utm_source', value: utmSource, set: setUtmSource, ph: 'facebook, google...' },
                { label: 'utm_medium', value: utmMedium, set: setUtmMedium, ph: 'cpc, email...' },
                { label: 'utm_campaign', value: utmCampaign, set: setUtmCampaign, ph: 'verano2025...' },
                { label: 'utm_term', value: utmTerm, set: setUtmTerm, ph: 'zapatillas...' },
              ].map((f) => (
                <div key={f.label}>
                  <label style={{ fontSize: '11px', color: '#8b8fa3', display: 'block', marginBottom: '4px' }}>{f.label}</label>
                  <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.ph} style={{ width: '100%', padding: '8px 10px', background: '#151820', border: '1px solid #2a2d3a', borderRadius: '6px', color: '#ffffff', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', color: '#8b8fa3', display: 'block', marginBottom: '4px' }}>utm_content</label>
              <input value={utmContent} onChange={e => setUtmContent(e.target.value)} placeholder="banner_home..." style={{ width: '100%', padding: '8px 10px', background: '#151820', border: '1px solid #2a2d3a', borderRadius: '6px', color: '#ffffff', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleCopyUtm} style={{ flex: 1, padding: '10px', background: utmCopied ? '#10b981' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>{utmCopied ? 'Copiado!' : 'Copiar URL'}</button>
              <button onClick={handleSaveUtm} style={{ flex: 1, padding: '10px', background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: '8px', color: '#ffffff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Guardar</button>
            </div>
          </div>
          <div style={S.card}>
            <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><Eye size={16} style={{ color: '#10b981' }} /> Vista Previa</div>
            {previewUrl ? (
              <div style={{ background: '#151820', padding: '12px', borderRadius: '8px', marginBottom: '16px', wordBreak: 'break-all' }}>
                <div style={{ fontSize: '11px', color: '#8b8fa3', marginBottom: '4px' }}>URL Completa:</div>
                <div style={{ fontSize: '13px', color: '#3b82f6' }}>{previewUrl}</div>
              </div>
            ) : (
              <div style={{ background: '#151820', padding: '20px', borderRadius: '8px', textAlign: 'center', color: '#8b8fa3', fontSize: '13px', marginBottom: '16px' }}>Ingresa la URL base para ver la vista previa</div>
            )}
            <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Templates Rápidos</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {utmTemplates.map((t, i) => (
                <button key={i} onClick={() => handleApplyTemplate(t)} style={{ padding: '6px 12px', background: '#151820', border: '1px solid #2a2d3a', borderRadius: '6px', color: '#ffffff', fontSize: '11px', cursor: 'pointer' }}>{t.name}</button>
              ))}
            </div>
          </div>
        </div>
        {utmHistory.length > 0 && (
          <div style={{ ...S.card, marginTop: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}><Clock size={16} style={{ color: '#f59e0b' }} /> Historial ({utmHistory.length})</div>
            {utmHistory.slice(0, 5).map((h, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', borderBottom: '1px solid #2a2d3a', fontSize: '12px' }}>
                <span style={{ color: '#3b82f6', flex: 1, wordBreak: 'break-all' }}>{h.url}</span>
                <span style={{ color: '#8b8fa3', whiteSpace: 'nowrap' }}>{h.source}/{h.medium}</span>
                <button onClick={() => { navigator.clipboard.writeText(h.url); }} style={{ background: 'none', border: 'none', color: '#8b8fa3', cursor: 'pointer' }}><Copy size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const [reportSections, setReportSections] = useState({ header: true, executive: true, meta: true, google: true, tiktok: true, ga4: true, gsc: true, mc: true, ai: true, footer: true });
  const [reportTemplate, setReportTemplate] = useState('executive');

  const reportTemplates = {
    executive: { name: 'Reporte Ejecutivo', sections: ['header', 'executive', 'ai', 'footer'] },
    complete: { name: 'Reporte Completo', sections: Object.keys(reportSections) },
    ads: { name: 'Solo Publicidad', sections: ['header', 'executive', 'meta', 'google', 'tiktok', 'footer'] },
  };

  const handleApplyReportTemplate = (key) => {
    setReportTemplate(key);
    const tpl = reportTemplates[key];
    const newSections = {};
    Object.keys(reportSections).forEach(k => { newSections[k] = tpl.sections.includes(k); });
    setReportSections(newSections);
  };

  const totalAdSpendReport = (metaInsights?.global?.spend || 0) + (googleAdsData?.campaigns?.reduce((s, c) => s + (c.cost || 0), 0) || 0) + (tiktokData?.campaigns?.reduce((s, c) => s + (c.spend || 0), 0) || 0);
  const totalAdConversionsReport = (metaInsights?.campaigns?.reduce((s, c) => s + (c.conversions || 0), 0) || 0) + (googleAdsData?.campaigns?.reduce((s, c) => s + (c.conversions || 0), 0) || 0) + (tiktokData?.campaigns?.reduce((s, c) => s + (c.conversions || 0), 0) || 0);
  const totalAdRevenueReport = (metaInsights?.campaigns?.reduce((s, c) => s + (c.revenue || 0), 0) || 0) + (googleAdsData?.campaigns?.reduce((s, c) => s + (c.conversionValue || 0), 0) || 0);
  const roasReport = totalAdSpendReport > 0 ? totalAdRevenueReport / totalAdSpendReport : 0;
  const cpaReport = totalAdConversionsReport > 0 ? totalAdSpendReport / totalAdConversionsReport : 0;

  const renderReports = () => {
    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
          <div style={S.card}>
            <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><FileText size={16} style={{ color: '#3b82f6' }} /> Configurar Reporte</div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: '#8b8fa3', marginBottom: '8px' }}>Templates</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {Object.entries(reportTemplates).map(([key, tpl]) => (
                  <button key={key} onClick={() => handleApplyReportTemplate(key)} style={{ padding: '10px 12px', background: reportTemplate === key ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : '#151820', border: reportTemplate === key ? 'none' : '1px solid #2a2d3a', borderRadius: '8px', color: '#fff', fontSize: '13px', cursor: 'pointer', textAlign: 'left' }}>{tpl.name}</button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#8b8fa3', marginBottom: '8px' }}>Secciones</div>
              {Object.entries({ header: 'Encabezado', executive: 'Resumen Ejecutivo', meta: 'Meta Ads', google: 'Google Ads', tiktok: 'TikTok Ads', ga4: 'Google Analytics 4', gsc: 'Search Console', mc: 'Merchant Center', ai: 'Análisis IA', footer: 'Pie de Página' }).map(([key, label]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', fontSize: '12px', color: '#ffffff', cursor: 'pointer' }}>
                  <input type="checkbox" checked={reportSections[key]} onChange={e => setReportSections({ ...reportSections, [key]: e.target.checked })} style={{ accentColor: '#3b82f6' }} />
                  {label}
                </label>
              ))}
            </div>
            <button onClick={() => window.print()} style={{ width: '100%', marginTop: '16px', padding: '10px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><Download size={14} /> Imprimir / Guardar PDF</button>
          </div>
          <div style={S.card}>
            <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Vista Previa</div>
            <div style={{ background: '#ffffff', color: '#1a1a1a', borderRadius: '8px', padding: '24px', fontFamily: 'Georgia, serif' }}>
              {reportSections.header && (
                <div style={{ borderBottom: '2px solid #3b82f6', paddingBottom: '16px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '22px', fontWeight: '700' }}>Reporte de Marketing Digital</div>
                  <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>Periodo: {dateRange ? (dateRange.startDate || dateRange.start || '') + ' — ' + (dateRange.endDate || dateRange.end || '') : 'Sin fecha'}</div>
                </div>
              )}
              {reportSections.executive && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>Resumen Ejecutivo</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    {[{ l: 'Inversión', v: fmtCOP(totalAdSpendReport) }, { l: 'Conversiones', v: fmt(totalAdConversionsReport) }, { l: 'ROAS', v: roasReport.toFixed(2) + 'x' }, { l: 'CPA', v: fmtCOP(cpaReport) }, { l: 'Sesiones', v: fmt(ga4Insights?.global?.sessions || 0) }, { l: 'Revenue TN', v: fmtCOP(tnMetrics.totalRevenue || 0) }].map((item, i) => (
                      <div key={i} style={{ background: '#f8f9fa', padding: '10px', borderRadius: '6px' }}><div style={{ fontSize: '11px', color: '#666' }}>{item.l}</div><div style={{ fontSize: '15px', fontWeight: '700' }}>{item.v}</div></div>
                    ))}
                  </div>
                </div>
              )}
              {reportSections.meta && metaInsights && (
                <div style={{ marginBottom: '12px' }}><div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px' }}>Meta Ads</div><div style={{ fontSize: '12px', color: '#333' }}>Inversión: {fmtCOP(metaInsights.global?.spend || 0)} | CTR: {fmtPct(metaInsights.global?.ctr || 0)} | Campañas: {metaInsights.campaigns?.length || 0}</div></div>
              )}
              {reportSections.google && googleAdsData && (
                <div style={{ marginBottom: '12px' }}><div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px' }}>Google Ads</div><div style={{ fontSize: '12px', color: '#333' }}>Inversión: {fmtCOP(googleAdsData.campaigns?.reduce((s, c) => s + (c.cost || 0), 0) || 0)} | Conversiones: {googleAdsData.campaigns?.reduce((s, c) => s + (c.conversions || 0), 0) || 0}</div></div>
              )}
              {reportSections.tiktok && tiktokData && (
                <div style={{ marginBottom: '12px' }}><div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px' }}>TikTok Ads</div><div style={{ fontSize: '12px', color: '#333' }}>Inversión: {fmtCOP(tiktokData.campaigns?.reduce((s, c) => s + (c.spend || 0), 0) || 0)} | Impresiones: {fmt(tiktokData.campaigns?.reduce((s, c) => s + (c.impressions || 0), 0) || 0)}</div></div>
              )}
              {reportSections.ga4 && ga4Insights && (
                <div style={{ marginBottom: '12px' }}><div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px' }}>Google Analytics 4</div><div style={{ fontSize: '12px', color: '#333' }}>Sesiones: {fmt(ga4Insights.global?.sessions || 0)} | Rebote: {fmtPct(ga4Insights.global?.bounceRate || 0)} | Revenue: {fmtCOP(ga4Insights.ecommerce?.totalRevenue || 0)}</div></div>
              )}
              {reportSections.gsc && gscPerformance && (
                <div style={{ marginBottom: '12px' }}><div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px' }}>Search Console</div><div style={{ fontSize: '12px', color: '#333' }}>Clics: {fmt(gscPerformance.totals?.clicks || 0)} | CTR: {fmtPct(gscPerformance.totals?.ctr || 0)} | Posición: {(gscPerformance.totals?.position || 0).toFixed(1)}</div></div>
              )}
              {reportSections.mc && mcProducts && (
                <div style={{ marginBottom: '12px' }}><div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px' }}>Merchant Center</div><div style={{ fontSize: '12px', color: '#333' }}>Productos: {mcProducts.length || 0} | En stock: {mcProducts.filter(p => p.availability === 'in stock').length || 0}</div></div>
              )}
              {reportSections.ai && (
                <div style={{ marginBottom: '12px' }}><div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px' }}>Análisis IA</div><div style={{ fontSize: '12px', color: '#333', lineHeight: '1.6' }}>{insights.length > 0 ? insights.slice(0, 3).map((ins, i) => <div key={i}>• {ins.text}</div>) : 'Sin análisis disponible.'}</div></div>
              )}
              {reportSections.footer && (
                <div style={{ borderTop: '1px solid #ddd', paddingTop: '12px', marginTop: '16px', fontSize: '11px', color: '#999', textAlign: 'center' }}>Reporte generado por Centro de Marketing — TiendaNueve CRM</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const generateLocalAIResponse = (query) => {
    const q = query.toLowerCase();
    if (q.includes('venta') || q.includes('ingreso') || q.includes('revenue')) {
      return `📊 **Resumen de Ventas TN:**\n\n• Revenue total: ${fmtCOP(tnMetrics.totalRevenue || 0)}\n• Órdenes pagadas: ${fmt(tnMetrics.paidOrders || 0)}\n• Ticket promedio: ${fmtCOP(tnMetrics.avgTicket || 0)}\n\n💡 Tasa de conversión: ${tnMetrics.totalOrders > 0 ? ((tnMetrics.paidOrders / tnMetrics.totalOrders) * 100).toFixed(1) : 0}%`;
    }
    if (q.includes('campaña') || q.includes('publicidad') || q.includes('ads')) {
      return `📢 **Top Campañas:**\n\n• **Meta Ads:** ${metaInsights?.campaigns?.length || 0} campañas, ROAS ${metaInsights?.global?.spend > 0 ? ((metaInsights?.campaigns?.reduce((s, c) => s + (c.revenue || 0), 0) || 0) / metaInsights.global.spend).toFixed(2) : '0'}\n• **Google Ads:** ${googleAdsData?.campaigns?.length || 0} campañas\n• **TikTok:** ${tiktokData?.campaigns?.length || 0} campañas\n\n💰 Inversión total: ${fmtCOP(totalAdSpendReport)}`;
    }
    if (q.includes('seo') || q.includes('buscador')) {
      const tot = gscPerformance?.totals || {};
      return `🔍 **Análisis SEO:**\n\n• Clics: ${fmt(tot.clicks || 0)}\n• Impresiones: ${fmt(tot.impressions || 0)}\n• CTR: ${fmtPct(tot.ctr || 0)}\n• Posición promedio: ${(tot.position || 0).toFixed(1)}`;
    }
    if (q.includes('producto') || q.includes('catalogo') || q.includes('inventario')) {
      return `📦 **Inventario:**\n\n• TN productos: ${tiendanubeProducts?.length || 0}\n• En stock: ${inStockProducts.length}\n• Fuera de stock: ${outOfStockProducts.length}\n• Merchant Center: ${mcProducts?.length || 0}`;
    }
    if (q.includes('cliente') || q.includes('segmento')) {
      return `👥 **Segmentos:**\n\n• Nuevos: ${tnClientSegments?.nuevo || 0}\n• Repetidores: ${tnClientSegments?.repetidor || 0}\n• Fieles: ${tnClientSegments?.fiel || 0}\n• Alto Valor: ${tnClientSegments?.alto_valor || 0}\n• VIP: ${tnClientSegments?.vip || 0}\n• Total: ${unifiedClients?.length || 0}`;
    }
    if (q.includes('recomend') || q.includes('suger')) {
      return `💡 **Recomendaciones:**\n\n${insights.slice(0, 5).map((ins, i) => `${i + 1}. ${ins.text}`).join('\n\n') || '• Mantén el monitoreo de tus campañas.'}`;
    }
    return `🤖 **Resumen de Marketing:**\n\n• Revenue TN: ${fmtCOP(tnMetrics.totalRevenue || 0)}\n• Sesiones GA4: ${fmt(ga4Insights?.global?.sessions || 0)}\n• ROAS: ${roasReport.toFixed(2)}x\n• Clientes: ${unifiedClients?.length || 0}\n\n¿Qué aspecto quieres analizar?`;
  };

  const handleSendAI = () => {
    if (!aiInput.trim()) return;
    const userMsg = { role: 'user', text: aiInput, time: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) };
    setAiMessages(prev => [...prev, userMsg]);
    setAiInput('');
    setAiLoading(true);
    setTimeout(() => {
      const response = generateLocalAIResponse(userMsg.text);
      setAiMessages(prev => [...prev, { role: 'assistant', text: response, time: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) }]);
      setAiLoading(false);
    }, 800);
  };

  const aiQuickActions = [
    { label: 'Resumen de ventas', query: 'Dame un resumen de ventas' },
    { label: 'Top campañas', query: 'Cuáles son las mejores campañas' },
    { label: 'Recomendaciones', query: 'Dame recomendaciones de marketing' },
    { label: 'Análisis SEO', query: 'Cómo está mi SEO' },
    { label: 'Productos estrella', query: 'Cuáles son mis productos estrella' },
    { label: 'Segmentación', query: 'Cuáles son mis segmentos de clientes' },
  ];

  const renderAI = () => {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', minHeight: '500px' }}>
        <div style={{ ...S.card, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}><MessageSquare size={16} style={{ color: '#3b82f6' }} /> Chat con Asistente IA</div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px', background: '#151820', borderRadius: '8px', marginBottom: '12px', minHeight: '300px' }}>
            {aiMessages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#8b8fa3' }}>
                <Brain size={48} style={{ color: '#3b82f6', marginBottom: '12px' }} />
                <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: '#ffffff' }}>Asistente de Marketing IA</div>
                <div style={{ fontSize: '13px' }}>Pregúntame sobre ventas, campañas, SEO, productos o segmentación.</div>
              </div>
            )}
            {aiMessages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: '12px' }}>
                <div style={{ maxWidth: '80%', padding: '10px 14px', borderRadius: '12px', background: msg.role === 'user' ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : '#1e2130', color: '#ffffff', fontSize: '13px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                  {msg.text}
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '4px', textAlign: 'right' }}>{msg.time}</div>
                </div>
              </div>
            ))}
            {aiLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '12px' }}>
                <div style={{ padding: '10px 14px', borderRadius: '12px', background: '#1e2130', color: '#8b8fa3', fontSize: '13px' }}>Pensando...</div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendAI()} placeholder="Escribe tu pregunta..." style={{ flex: 1, padding: '10px 14px', background: '#151820', border: '1px solid #2a2d3a', borderRadius: '8px', color: '#ffffff', fontSize: '13px', outline: 'none' }} />
            <button onClick={handleSendAI} style={{ padding: '10px 16px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}><Send size={16} /></button>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={S.card}>
            <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}><Zap size={16} style={{ color: '#f59e0b' }} /> Acciones Rápidas</div>
            {aiQuickActions.map((action, i) => (
              <button key={i} onClick={() => setAiInput(action.query)} style={{ width: '100%', padding: '8px 12px', marginBottom: '6px', background: '#151820', border: '1px solid #2a2d3a', borderRadius: '6px', color: '#ffffff', fontSize: '12px', cursor: 'pointer', textAlign: 'left' }}>{action.label}</button>
            ))}
          </div>
          <div style={S.card}>
            <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}><Activity size={16} style={{ color: '#10b981' }} /> Datos en Contexto</div>
            {[{ label: 'Revenue TN', value: fmtCOP(tnMetrics.totalRevenue || 0) }, { label: 'Sesiones GA4', value: fmt(ga4Insights?.global?.sessions || 0) }, { label: 'ROAS', value: roasReport.toFixed(2) + 'x' }, { label: 'Clientes', value: fmt(unifiedClients?.length || 0) }, { label: 'Productos', value: fmt(tiendanubeProducts?.length || 0) }].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12px' }}><span style={{ color: '#8b8fa3' }}>{item.label}</span><span style={{ color: '#ffffff', fontWeight: '600' }}>{item.value}</span></div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'command': return renderCommand();
      case 'tiendanueve': return renderTiendaNueve();
      case 'funnel': return renderFunnel();
      case 'seo': return renderSEO();
      case 'ecommerce': return renderEcommerce();
      case 'ads': return renderAds();
      case 'audiences': return renderAudiences();
      case 'competitors': return renderCompetitors();
      case 'utm': return renderUTM();
      case 'reports': return renderReports();
      case 'ai': return renderAI();
      case 'decisions': return renderDecisions();
      default: return renderCommand();
    }
  };

  const hasData = ga4Insights || gscPerformance || mcProducts || metaInsights || googleAdsData || tiktokData || (rawOrders && rawOrders.length > 0);

  return (
    <div style={S.container}>
      <div style={S.header}>
        <div>
          <div style={S.title}>Centro de Marketing</div>
          <div style={S.subtitle}>
            {dateRange ? (dateRange.start || dateRange.startDate || '') + ' — ' + (dateRange.end || dateRange.endDate || '') : 'Dashboard integral de marketing'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={{ ...S.tabButton(false), border: '1px solid #2a2d3a', background: '#1a1d27' }}>
            <Download size={14} />
            Exportar
          </button>
          <button style={{ ...S.tabButton(false), border: '1px solid #2a2d3a', background: '#1a1d27' }}>
            <RefreshCw size={14} />
            Actualizar
          </button>
        </div>
      </div>

      <div style={S.tabBar}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} style={S.tabButton(activeTab === tab.id)} onClick={() => setActiveTab(tab.id)}>
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div>
        {!hasData ? (
          <SkeletonLoader />
        ) : (
          renderTab()
        )}
      </div>
    </div>
  );
}
