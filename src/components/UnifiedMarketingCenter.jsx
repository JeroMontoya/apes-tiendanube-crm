import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, ShoppingBag, Search, BarChart2, Camera, Swords,
  ArrowUpRight, ArrowDownRight, RefreshCw, Layers, Globe,
  Activity, Users, Eye, Zap, ChevronRight, Clock, CheckCircle2,
  AlertTriangle, Package, ExternalLink, Link2, Target, Database
} from 'lucide-react';

const S = {
  tab: (active) => ({
    padding: '10px 18px', fontWeight: 700, fontSize: 11, textTransform: 'uppercase',
    letterSpacing: '0.8px', cursor: 'pointer', border: 'none', background: 'transparent',
    color: active ? '#3D5A99' : 'var(--on-surface-variant)',
    borderBottom: `2px solid ${active ? '#3D5A99' : 'transparent'}`,
    display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s',
    fontFamily: 'Inter, sans-serif',
  }),
  card: {
    background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)',
    WebkitBackdropFilter: 'var(--glass-blur)',
    border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)',
    padding: 20, transition: 'all 0.3s',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: {
    textAlign: 'left', padding: '10px 12px', fontSize: 9, fontWeight: 800,
    color: 'var(--on-surface-variant)', textTransform: 'uppercase',
    letterSpacing: '0.8px', borderBottom: '1px solid var(--border-subtle)',
    fontFamily: 'JetBrains Mono, monospace',
  },
  td: {
    padding: '10px 12px', color: 'var(--on-surface)',
    borderBottom: '1px solid var(--border-subtle)', fontSize: 12,
  },
  badge: (color) => ({
    padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700,
    background: `${color}15`, color, border: `1px solid ${color}25`,
    fontFamily: 'JetBrains Mono, monospace',
  }),
  btn: {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px',
    borderRadius: 8, border: '1px solid var(--glass-border)',
    background: 'rgba(255,255,255,0.04)', color: 'var(--on-surface)',
    fontWeight: 700, fontSize: 11, cursor: 'pointer', transition: 'all 0.2s',
    fontFamily: 'Inter, sans-serif',
  },
  kpiBox: (color) => ({
    background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)', padding: 18, display: 'flex',
    flexDirection: 'column', gap: 6, position: 'relative', overflow: 'hidden',
  }),
};

const TABS = [
  { id: 'general', label: 'Visión General 360°', icon: Layers },
  { id: 'gsc', label: 'Search Console', icon: Search },
  { id: 'merchant', label: 'Merchant Center', icon: ShoppingBag },
  { id: 'competitors', label: 'Benchmark & Competidores', icon: Swords },
  { id: 'instagram', label: 'Instagram', icon: Camera },
];

function fmtVal(val, type) {
  if (val == null || isNaN(val)) return '—';
  if (type === 'currency') {
    const v = Number(val);
    if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `$${(v / 1000).toFixed(1)}K`;
    return `$${v.toFixed(0)}`;
  }
  if (type === 'pct') return `${Number(val).toFixed(1)}%`;
  if (type === 'dec') return Number(val).toFixed(2);
  if (val >= 1000) return Number(val).toLocaleString('es-AR');
  return Number(val).toFixed(val % 1 === 0 ? 0 : 1);
}

function Delta({ current, previous }) {
  if (!previous || previous === 0) return null;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const up = pct >= 0;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: up ? '#10b981' : '#ef4444', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      {up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
      {up ? '+' : ''}{pct.toFixed(1)}%
    </span>
  );
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
        <Icon size={18} />
      </div>
      <p style={{ fontSize: 12, margin: 0 }}>{text}</p>
    </div>
  );
}

function StatusDot({ ok }) {
  return <span style={{ width: 7, height: 7, borderRadius: '50%', background: ok ? '#10b981' : '#ef4444', display: 'inline-block' }} />;
}

function GeneralTab({ data }) {
  const p = data.platforms || {};
  const tn = p.tiendanube || {};
  const gsc = p.gsc || {};
  const ga4 = p.ga4 || {};
  const ig = p.instagram || {};
  const mc = data.mcSummary || {};

  const kpis = [
    { label: 'Ingresos Tiendanube', val: tn.total_revenue?.value, prev: tn.total_revenue?.previous, color: '#10b981', icon: ShoppingBag, type: 'currency' },
    { label: 'Tráfico Orgánico (GSC)', val: gsc.organic_clicks?.value, prev: gsc.organic_clicks?.previous, color: '#3b82f6', icon: Search, type: 'num' },
    { label: 'Sesiones GA4', val: ga4.sessions?.value, prev: ga4.sessions?.previous, color: '#f59e0b', icon: BarChart2, type: 'num' },
    { label: 'Seguidores Instagram', val: ig.followers?.value, prev: ig.followers?.previous, color: '#e4405f', icon: Camera, type: 'num' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {kpis.map((k, i) => (
          <div key={i} style={S.kpiBox(k.color)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{k.label}</span>
              <k.icon size={14} color={k.color} />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--on-surface)', fontFamily: 'JetBrains Mono, monospace' }}>
                {fmtVal(k.val, k.type)}
              </span>
              <Delta current={k.val} previous={k.prev} />
            </div>
          </div>
        ))}
      </div>

      {/* Quick Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        <div style={S.card}>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Search size={12} color="#3b82f6" /> Top Keywords SEO
          </div>
          {(data.gscKeywords || []).slice(0, 5).map((kw, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: 11 }}>
              <span style={{ color: 'var(--on-surface)', fontWeight: 600 }}>{kw.query}</span>
              <span style={{ color: '#3b82f6', fontFamily: 'JetBrains Mono, monospace' }}>{kw.clicks} clics</span>
            </div>
          ))}
          {(!data.gscKeywords || data.gscKeywords.length === 0) && <EmptyState icon={Search} text="Sin datos GSC — sincronizá las APIs" />}
        </div>

        <div style={S.card}>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShoppingBag size={12} color="#10b981" /> Estado del Catálogo
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { label: 'Aprobados', val: mc.approved || 0, color: '#10b981' },
              { label: 'Pendientes', val: mc.pending || 0, color: '#f59e0b' },
              { label: 'Rechazados', val: mc.disapproved || 0, color: '#ef4444' },
              { label: 'Total', val: mc.total || 0, color: 'var(--on-surface)' },
            ].map((item, i) => (
              <div key={i} style={{ padding: '8px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>{item.label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: item.color, fontFamily: 'JetBrains Mono, monospace' }}>{item.val}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={S.card}>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Camera size={12} color="#e4405f" /> Instagram Performance
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { label: 'Likes Totales', val: fmtVal(ig.total_likes?.value) },
              { label: 'Comentarios', val: fmtVal(ig.total_comments?.value) },
              { label: 'Engagement Rate', val: fmtVal(ig.engagement_rate?.value, 'pct') },
              { label: 'Publicaciones', val: fmtVal(ig.media_count?.value) },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: 11 }}>
                <span style={{ color: 'var(--on-surface-variant)' }}>{item.label}</span>
                <span style={{ color: 'var(--on-surface)', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{item.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GSCTab({ keywords }) {
  if (!keywords || keywords.length === 0) {
    return <EmptyState icon={Search} text="Sin datos de Search Console. Configurá GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY + GSC_SITE_URL en .env" />;
  }
  return (
    <div style={S.card}>
      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Search size={13} color="#3b82f6" /> Palabras Clave y Posicionamiento SEO
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Palabra Clave</th>
              <th style={S.th}>Página</th>
              <th style={{ ...S.th, textAlign: 'right' }}>Clics</th>
              <th style={{ ...S.th, textAlign: 'right' }}>Impresiones</th>
              <th style={{ ...S.th, textAlign: 'right' }}>CTR</th>
              <th style={{ ...S.th, textAlign: 'right' }}>Posición</th>
            </tr>
          </thead>
          <tbody>
            {keywords.map((kw, i) => (
              <tr key={i}>
                <td style={S.td}><span style={{ fontWeight: 700 }}>{kw.query}</span></td>
                <td style={{ ...S.td, color: 'var(--on-surface-variant)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {kw.page_url ? <a href={kw.page_url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none' }}>{new URL(kw.page_url).pathname}</a> : '—'}
                </td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>{fmtVal(kw.clicks)}</td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>{fmtVal(kw.impressions)}</td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: '#10b981' }}>{(kw.ctr * 100).toFixed(1)}%</td>
                <td style={{ ...S.td, textAlign: 'right' }}>
                  <span style={{ ...S.badge(kw.position <= 3 ? '#10b981' : kw.position <= 10 ? '#3b82f6' : '#f59e0b') }}>
                    {kw.position.toFixed(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MerchantTab({ products }) {
  if (!products || products.length === 0) {
    return <EmptyState icon={ShoppingBag} text="Sin datos de Merchant Center. Configurá GOOGLE_MERCHANT_ID + Service Account en Google Cloud Console" />;
  }

  const statusColor = (s) => {
    if (s === 'APPROVED') return '#10b981';
    if (s === 'DISAPPROVED') return '#ef4444';
    return '#f59e0b';
  };

  return (
    <div style={S.card}>
      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
        <ShoppingBag size={13} color="#10b981" /> Estado del Feed de Productos — Google Shopping
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Producto</th>
              <th style={S.th}>SKU</th>
              <th style={{ ...S.th, textAlign: 'right' }}>Precio</th>
              <th style={S.th}>Estado</th>
              <th style={S.th}>Click Potential</th>
              <th style={S.th}>Última Sync</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, i) => (
              <tr key={i}>
                <td style={S.td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {p.image_link && <img src={p.image_link} alt="" style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover' }} />}
                    <span style={{ fontWeight: 700, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
                  </div>
                </td>
                <td style={{ ...S.td, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--on-surface-variant)' }}>{p.product_id}</td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>{fmtVal(p.price_amount, 'currency')}</td>
                <td style={S.td}><span style={S.badge(statusColor(p.approval_status))}>{p.approval_status}</span></td>
                <td style={{ ...S.td, color: p.click_potential === 'HIGH' ? '#10b981' : p.click_potential === 'MEDIUM' ? '#f59e0b' : 'var(--on-surface-variant)' }}>{p.click_potential}</td>
                <td style={{ ...S.td, fontSize: 10, color: 'var(--on-surface-variant)' }}>{new Date(p.last_synced_at).toLocaleDateString('es-AR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CompetitorsTab({ benchmarks, competitors }) {
  if (!benchmarks || benchmarks.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={S.card}>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Swords size={13} color="#ef4444" /> Competidores Registrados
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {(competitors || []).map((c, i) => (
              <div key={i} style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Globe size={14} color="#ef4444" />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface)' }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--on-surface-variant)' }}>{c.domain}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <EmptyState icon={Swords} text="Sin benchmarks. Configurá SERP_API_KEY y ejecutá el sync para rastrear precios competidores" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={S.card}>
        <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Swords size={13} color="#ef4444" /> Análisis de Precios vs. Competencia
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Producto APES</th>
                <th style={{ ...S.th, textAlign: 'right' }}>Precio APES</th>
                <th style={S.th}>Competidor</th>
                <th style={{ ...S.th, textAlign: 'right' }}>Precio Competencia</th>
                <th style={{ ...S.th, textAlign: 'right' }}>Diferencia</th>
                <th style={S.th}>Posición SERP</th>
              </tr>
            </thead>
            <tbody>
              {benchmarks.map((b, i) => (
                <tr key={i}>
                  <td style={S.td}><span style={{ fontWeight: 700 }}>{b.apes_product_name}</span></td>
                  <td style={{ ...S.td, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>{fmtVal(b.apes_price, 'currency')}</td>
                  <td style={{ ...S.td, color: 'var(--on-surface-variant)' }}>{b.competitor_name}</td>
                  <td style={{ ...S.td, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>{fmtVal(b.competitor_price, 'currency')}</td>
                  <td style={{ ...S.td, textAlign: 'right' }}>
                    <span style={{ ...S.badge(b.price_difference_pct < 0 ? '#10b981' : '#ef4444') }}>
                      {b.price_difference_pct > 0 ? '+' : ''}{b.price_difference_pct}%
                    </span>
                  </td>
                  <td style={{ ...S.td, textAlign: 'center' }}>
                    <span style={{ ...S.badge(b.serp_position <= 3 ? '#10b981' : b.serp_position <= 10 ? '#3b82f6' : '#f59e0b') }}>
                      #{b.serp_position}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={S.card}>
        <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Target size={12} color="#f59e0b" /> Índice de Competitividad
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
          {[
            { label: 'Muy Competitivo', count: benchmarks.filter(b => b.price_difference_pct < -10).length, color: '#10b981' },
            { label: 'Competitivo', count: benchmarks.filter(b => b.price_difference_pct >= -10 && b.price_difference_pct < 0).length, color: '#3b82f6' },
            { label: 'Paridad', count: benchmarks.filter(b => b.price_difference_pct === 0).length, color: '#f59e0b' },
            { label: 'Por Debajo', count: benchmarks.filter(b => b.price_difference_pct > 0 && b.price_difference_pct < 10).length, color: '#f97316' },
            { label: 'Por Arriba', count: benchmarks.filter(b => b.price_difference_pct >= 10).length, color: '#ef4444' },
          ].map((item, i) => (
            <div key={i} style={{ padding: '10px 12px', borderRadius: 8, background: `${item.color}08`, border: `1px solid ${item.color}20` }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>{item.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: item.color, fontFamily: 'JetBrains Mono, monospace' }}>{item.count}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InstagramTab({ profile, media, engagement }) {
  if (!profile) {
    return <EmptyState icon={Camera} text="Sin datos de Instagram. Configurá INSTAGRAM_ACCESS_TOKEN e INSTAGRAM_USER_ID en .env" />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
        {[
          { label: 'Seguidores', val: profile.followers_count, icon: Users, color: '#e4405f' },
          { label: 'Publicaciones', val: profile.media_count, icon: Camera, color: '#833AB4' },
          { label: 'Likes Totales', val: engagement?.total_likes, icon: Zap, color: '#f59e0b' },
          { label: 'Comentarios', val: engagement?.total_comments, icon: Users, color: '#3b82f6' },
          { label: 'Promedio Likes/Post', val: engagement?.avg_likes_per_post, icon: TrendingUp, color: '#10b981' },
          { label: 'Promedio Comentarios/Post', val: engagement?.avg_comments_per_post, icon: TrendingUp, color: '#6366f1' },
        ].map((k, i) => (
          <div key={i} style={S.kpiBox(k.color)}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{k.label}</span>
              <k.icon size={12} color={k.color} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--on-surface)', fontFamily: 'JetBrains Mono, monospace' }}>
              {fmtVal(k.val)}
            </div>
          </div>
        ))}
      </div>

      <div style={S.card}>
        <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Camera size={13} color="#e4405f" /> Últimas Publicaciones
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(media || []).slice(0, 10).map((m, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 6, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
              {m.media_url && <img src={m.media_url} alt="" style={{ width: 36, height: 36, borderRadius: 4, objectFit: 'cover' }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.caption || '(sin caption)'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--on-surface-variant)' }}>
                  {m.media_type} — {new Date(m.timestamp).toLocaleDateString('es-AR')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: '#e4405f' }}>♥ {m.like_count || 0}</span>
                <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: '#3b82f6' }}>💬 {m.comments_count || 0}</span>
              </div>
            </div>
          ))}
          {(!media || media.length === 0) && <EmptyState icon={Camera} text="Sin publicaciones recientes" />}
        </div>
      </div>
    </div>
  );
}

export default function UnifiedMarketingCenter({ session }) {
  const [tab, setTab] = useState('general');
  const [data, setData] = useState({});
  const [igData, setIgData] = useState({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [metricsRes, igRes] = await Promise.all([
        fetch('/api/marketing/unified-metrics', { headers: { Authorization: `Bearer ${session?.access_token || ''}` } }),
        fetch('/api/marketing/instagram-data', { headers: { Authorization: `Bearer ${session?.access_token || ''}` } }),
      ]);
      if (metricsRes.ok) {
        const d = await metricsRes.json();
        setData(d);
        setLastUpdate(d.lastUpdate);
      }
      if (igRes.ok) setIgData(await igRes.json());
    } catch (e) {
      console.error('[UnifiedMarketing] Fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/marketing/full-sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token || ''}`, 'Content-Type': 'application/json' },
      });
      if (res.ok) await fetchAll();
    } catch (e) {
      console.error('[UnifiedMarketing] Sync error:', e);
    } finally {
      setSyncing(false);
    }
  };

  const totalPlatforms = 4;
  const connectedPlatforms = [
    !!data.platforms?.tiendanube,
    !!data.platforms?.gsc || data.gscKeywords?.length > 0,
    !!data.platforms?.ga4,
    !!igData.profile,
  ].filter(Boolean).length;

  return (
    <div style={{ padding: '0 0 40px', animation: 'fadeIn 0.5s ease' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', background: 'linear-gradient(180deg, rgba(61,90,153,0.04) 0%, transparent 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #3D5A99, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(61,90,153,0.35)' }}>
              <Layers size={20} color="#fff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--on-surface)', fontFamily: 'Inter, sans-serif', letterSpacing: '0.5px' }}>
                CENTRO DE MARKETING 360°
              </h2>
              <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--on-surface-variant)' }}>
                Ecosistema multiplataforma: Tiendanube · Google SEO · Analytics · Instagram · Competidores
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {lastUpdate && (
              <span style={{ fontSize: 10, color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={10} /> Última sync: {new Date(lastUpdate).toLocaleString('es-AR')}
              </span>
            )}
            <button onClick={handleSync} disabled={syncing} style={{
              ...S.btn,
              background: syncing ? 'var(--surface-container)' : 'rgba(61,90,153,0.12)',
              color: syncing ? 'var(--on-surface-variant)' : '#3D5A99',
              borderColor: syncing ? 'var(--border-subtle)' : 'rgba(61,90,153,0.25)',
              opacity: syncing ? 0.6 : 1, pointerEvents: syncing ? 'none' : 'auto',
            }}>
              <RefreshCw size={12} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
              {syncing ? 'Sincronizando...' : 'Sync Producción'}
            </button>
          </div>
        </div>

        {/* Platform Status Bar */}
        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          {[
            { label: 'Tiendanube', ok: !!data.platforms?.tiendanube, color: '#10b981' },
            { label: 'Google SEO', ok: !!data.platforms?.gsc || data.gscKeywords?.length > 0, color: '#3b82f6' },
            { label: 'Google Analytics', ok: !!data.platforms?.ga4, color: '#f59e0b' },
            { label: 'Merchant Center', ok: (data.mcSummary?.total || 0) > 0, color: '#10b981' },
            { label: 'Instagram', ok: !!igData.profile, color: '#e4405f' },
            { label: 'Benchmarking', ok: (data.benchmarks?.length || 0) > 0, color: '#ef4444' },
          ].map((p, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6,
              background: p.ok ? `${p.color}10` : 'var(--surface-container)',
              border: `1px solid ${p.ok ? `${p.color}25` : 'var(--border-subtle)'}`,
              opacity: p.ok ? 1 : 0.5,
            }}>
              <StatusDot ok={p.ok} />
              <span style={{ fontSize: 10, fontWeight: 700, color: p.ok ? p.color : 'var(--on-surface-variant)' }}>{p.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-container-lowest)', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={S.tab(tab === t.id)}>
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '20px 24px' }}>
        {loading ? (
          <div style={{ padding: 50, textAlign: 'center', color: 'var(--on-surface-variant)', fontSize: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', animation: 'pulseGlow 1.5s infinite' }}>
              <Activity size={16} />
            </div>
            Cargando datos de producción...
          </div>
        ) : (
          <>
            {tab === 'general' && <GeneralTab data={data} igData={igData} />}
            {tab === 'gsc' && <GSCTab keywords={data.gscKeywords} />}
            {tab === 'merchant' && <MerchantTab products={data.merchantProducts} />}
            {tab === 'competitors' && <CompetitorsTab benchmarks={data.benchmarks} competitors={data.competitors} />}
            {tab === 'instagram' && <InstagramTab profile={igData.profile} media={igData.media} engagement={igData.engagement} />}
          </>
        )}
      </div>

      {/* Sync Log */}
      {data.syncLogs?.length > 0 && (
        <div style={{ padding: '0 24px' }}>
          <div style={S.card}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={12} color="var(--primary)" /> Últimas Sincronizaciones
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {data.syncLogs.slice(0, 6).map((log, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', fontSize: 11 }}>
                  <StatusDot ok={log.status === 'success'} />
                  <span style={{ fontWeight: 700, color: 'var(--on-surface)', textTransform: 'capitalize', minWidth: 100 }}>{log.platform}</span>
                  <span style={{ color: 'var(--on-surface-variant)', flex: 1 }}>{log.error_message || `${log.records_synced || 0} registros`}</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--on-surface-variant)' }}>
                    {log.completed_at ? new Date(log.completed_at).toLocaleTimeString('es-AR') : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulseGlow { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
      `}</style>
    </div>
  );
}
