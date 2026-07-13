import React, { useState, useMemo } from 'react';
import {
  Music,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Eye,
  MousePointerClick,
  DollarSign,
  BarChart3,
  ArrowUpDown,
  Search,
  Users,
  Calendar,
  Video,
  Target,
  Zap,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

const formatCOP = (value) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

const formatNumber = (value) =>
  new Intl.NumberFormat('es-CO').format(value);

const formatPercent = (value) =>
  `${(value * 100).toFixed(2)}%`;

const DeltaIndicator = ({ value, suffix = '' }) => {
  const positive = value > 0;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: positive ? 'var(--success)' : value < 0 ? 'var(--error)' : 'var(--on-surface-variant)', fontWeight: 600 }}>
      {positive ? <TrendingUp size={12} /> : value < 0 ? <TrendingDown size={12} /> : null}
      {positive ? '+' : ''}{value.toFixed(1)}{suffix}
    </span>
  );
};

const SkeletonCard = () => (
  <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 20, border: '1px solid var(--border-subtle)' }}>
    <div style={{ height: 12, width: 60, background: 'rgba(255,255,255,0.06)', borderRadius: 4, marginBottom: 10 }} />
    <div style={{ height: 24, width: 100, background: 'rgba(255,255,255,0.08)', borderRadius: 4, marginBottom: 8 }} />
    <div style={{ height: 12, width: 50, background: 'rgba(255,255,255,0.05)', borderRadius: 4 }} />
  </div>
);

const SkeletonTable = ({ rows = 5, cols = 6 }) => (
  <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} style={{ display: 'flex', gap: 16, padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
        {Array.from({ length: cols }).map((_, j) => (
          <div key={j} style={{ height: 14, flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 4 }} />
        ))}
      </div>
    ))}
  </div>
);

const tabs = ['Resumen', 'Campañas', 'Anuncios', 'Audiencia', 'Tendencia'];

const statusColors = {
  ACTIVE: 'var(--success)',
  PAUSED: 'var(--warning)',
  COMPLETED: 'var(--on-surface-variant)',
};

const TikTokAdsPanel = ({ tiktokData, workspace, dateRange, onRefresh }) => {
  const [activeTab, setActiveTab] = useState('Resumen');
  const [sortConfig, setSortConfig] = useState({ key: 'spend', direction: 'desc' });
  const [searchFilter, setSearchFilter] = useState('');
  const [expandedCampaign, setExpandedCampaign] = useState(null);

  const isLoading = !tiktokData;
  const isEmpty = tiktokData && !(tiktokData.campaigns || []).length;

  const totals = useMemo(() => {
    if (!tiktokData) return null;
    const campaigns = tiktokData.campaigns || [];
    const gasto = campaigns.reduce((s, c) => s + (c.spend || 0), 0);
    const impresiones = campaigns.reduce((s, c) => s + (c.impressions || 0), 0);
    const clics = campaigns.reduce((s, c) => s + (c.clicks || 0), 0);
    const ctr = impresiones > 0 ? clics / impresiones : 0;
    const conversiones = campaigns.reduce((s, c) => s + (c.conversions || 0), 0);
    const cpa = conversiones > 0 ? gasto / conversiones : 0;
    const revenue = campaigns.reduce((s, c) => s + (c.revenue || 0), 0);
    const roas = gasto > 0 ? revenue / gasto : 0;
    return { gasto, impresiones, clics, ctr, conversiones, cpa, roas, revenue };
  }, [tiktokData]);

  const sortedCampaigns = useMemo(() => {
    if (!tiktokData?.campaigns) return [];
    let data = [...tiktokData.campaigns];
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      data = data.filter(c => c.name?.toLowerCase().includes(q));
    }
    data.sort((a, b) => {
      const aVal = a[sortConfig.key] ?? 0;
      const bVal = b[sortConfig.key] ?? 0;
      if (typeof aVal === 'string') return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return data;
  }, [tiktokData, sortConfig, searchFilter]);

  const filteredAds = useMemo(() => {
    if (!tiktokData?.ads) return [];
    let data = [...tiktokData.ads];
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      data = data.filter(a => a.name?.toLowerCase().includes(q) || a.campaignName?.toLowerCase().includes(q) || a.adGroupName?.toLowerCase().includes(q));
    }
    return data;
  }, [tiktokData, searchFilter]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const SortIcon = ({ colKey }) => (
    <ArrowUpDown size={12} style={{ opacity: sortConfig.key === colKey ? 1 : 0.3, marginLeft: 4 }} />
  );

  const kpiCards = totals ? [
    { label: 'Gasto Total', value: formatCOP(totals.gasto), delta: 12.4, icon: DollarSign, color: '#6366f1' },
    { label: 'Impresiones', value: formatNumber(totals.impresiones), delta: 8.2, icon: Eye, color: '#8b5cf6' },
    { label: 'Clics', value: formatNumber(totals.clics), delta: 15.7, icon: MousePointerClick, color: '#a78bfa' },
    { label: 'CTR', value: formatPercent(totals.ctr), delta: 2.1, icon: BarChart3, color: 'var(--success)' },
    { label: 'CPA', value: formatCOP(totals.cpa), delta: -5.3, icon: Target, color: totals.cpa > 10000 ? 'var(--error)' : 'var(--success)' },
    { label: 'ROAS', value: `${totals.roas.toFixed(2)}x`, delta: 9.8, icon: Zap, color: '#6366f1' },
  ] : [];

  if (isLoading) {
    return (
      <div style={{ background: 'var(--surface-dim)', borderRadius: 16, border: '1px solid var(--border-subtle)', padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Music size={20} color="#6366f1" />
          </div>
          <div>
            <div style={{ height: 20, width: 160, background: 'rgba(255,255,255,0.08)', borderRadius: 4 }} />
            <div style={{ height: 14, width: 120, background: 'rgba(255,255,255,0.05)', borderRadius: 4, marginTop: 6 }} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <SkeletonTable rows={5} cols={6} />
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div style={{ background: 'var(--surface-dim)', borderRadius: 16, border: '1px solid var(--border-subtle)', padding: 60, textAlign: 'center' }}>
        <div style={{ width: 60, height: 60, borderRadius: 14, background: 'rgba(99,102,241,0.1)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Music size={28} color="#6366f1" />
        </div>
        <p style={{ color: 'var(--on-surface-variant)', fontSize: 16, margin: 0 }}>No hay datos disponibles</p>
        <p style={{ color: 'var(--on-surface-variant)', fontSize: 13, margin: '8px 0 0', opacity: 0.6 }}>Conecta tu cuenta de TikTok Ads para ver métricas</p>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--surface-dim)', borderRadius: 16, border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Music size={21} color="#6366f1" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--on-surface)' }}>TikTok Ads</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <Calendar size={12} color="var(--on-surface-variant)" />
              <span style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>
                {dateRange?.startDate || ''} — {dateRange?.endDate || ''}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={onRefresh}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 10,
            border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)', color: 'var(--on-surface)',
            cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.12)'; e.currentTarget.style.borderColor = '#6366f1'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
        >
          <RefreshCw size={14} />
          Actualizar
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, padding: '20px 28px' }}>
        {kpiCards.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div
              key={i}
              style={{
                background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '18px 16px',
                border: '1px solid var(--border-subtle)', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--on-surface-variant)', fontWeight: 500 }}>{kpi.label}</span>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: `${kpi.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={14} color={kpi.color} />
                </div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--on-surface)', marginBottom: 6 }}>{kpi.value}</div>
              <DeltaIndicator value={kpi.delta} suffix="%" />
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '0 28px', borderBottom: '1px solid var(--border-subtle)' }}>
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '12px 20px', border: 'none', background: 'none', color: activeTab === tab ? '#6366f1' : 'var(--on-surface-variant)',
              fontSize: 13, fontWeight: activeTab === tab ? 700 : 500, cursor: 'pointer', position: 'relative',
              transition: 'all 0.2s', borderBottom: activeTab === tab ? '2px solid #6366f1' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div style={{ padding: '20px 28px' }}>
        {activeTab === 'Resumen' && (
          <div>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: 'var(--on-surface)' }}>Campañas con Mayor Gasto</h3>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr repeat(5, 1fr)', padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)', fontSize: 11, fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                <span>Campaña</span>
                <span style={{ textAlign: 'right' }}>Impresiones</span>
                <span style={{ textAlign: 'right' }}>Clics</span>
                <span style={{ textAlign: 'right' }}>CTR</span>
                <span style={{ textAlign: 'right' }}>Gasto</span>
                <span style={{ textAlign: 'right' }}>ROAS</span>
              </div>
              {(tiktokData.campaigns || []).slice(0, 5).map((c, i) => (
                <div
                  key={i}
                  style={{
                    display: 'grid', gridTemplateColumns: '2fr repeat(5, 1fr)', padding: '14px 20px',
                    borderBottom: i < 4 ? '1px solid var(--border-subtle)' : 'none', fontSize: 13,
                    transition: 'background 0.15s', cursor: 'default',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <div>
                    <div style={{ color: 'var(--on-surface)', fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: statusColors[c.status] || 'var(--on-surface-variant)', marginTop: 2 }}>{c.status}</div>
                  </div>
                  <span style={{ textAlign: 'right', color: 'var(--on-surface)' }}>{formatNumber(c.impressions || 0)}</span>
                  <span style={{ textAlign: 'right', color: 'var(--on-surface)' }}>{formatNumber(c.clicks || 0)}</span>
                  <span style={{ textAlign: 'right', color: 'var(--on-surface)' }}>{c.ctr ? formatPercent(c.ctr) : '—'}</span>
                  <span style={{ textAlign: 'right', color: 'var(--on-surface)', fontWeight: 600 }}>{formatCOP(c.spend || 0)}</span>
                  <span style={{ textAlign: 'right', color: 'var(--on-surface)', fontWeight: 600 }}>{c.roas ? `${c.roas.toFixed(2)}x` : '—'}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 24 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: 'var(--on-surface)' }}>Resumen de Métricas</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                {[
                  { label: 'Total Campañas', value: (tiktokData.campaigns || []).length },
                  { label: 'Total Grupos de Anuncios', value: (tiktokData.adGroups || []).length },
                  { label: 'Total Anuncios', value: (tiktokData.ads || []).length },
                  { label: 'Ingresos Totales', value: formatCOP(totals.revenue) },
                  { label: 'Tasa de Conversión', value: totals.clics > 0 ? formatPercent(totals.conversiones / totals.clics) : '0%' },
                  { label: 'Costo por Clic', value: formatCOP(totals.clics > 0 ? totals.gasto / totals.clics : 0) },
                ].map((m, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 12, color: 'var(--on-surface-variant)', marginBottom: 6 }}>{m.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--on-surface)' }}>{m.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Campañas' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--on-surface-variant)' }} />
                <input
                  type="text"
                  placeholder="Buscar campañas..."
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  style={{
                    width: '100%', padding: '9px 12px 9px 36px', borderRadius: 10, border: '1px solid var(--border-subtle)',
                    background: 'rgba(255,255,255,0.03)', color: 'var(--on-surface)', fontSize: 13, outline: 'none',
                  }}
                />
              </div>
              <span style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>
                {sortedCampaigns.length} campañas
              </span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr repeat(9, 1fr)', padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)', fontSize: 11, fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {['Nombre', 'Estado', 'Presupuesto', 'Impresiones', 'Clics', 'CTR', 'Gasto', 'Conversiones', 'CPA', 'ROAS'].map((col, i) => {
                  const keys = ['name', 'status', 'budget', 'impressions', 'clicks', 'ctr', 'spend', 'conversions', 'cpa', 'roas'];
                  return (
                    <span
                      key={i}
                      onClick={() => handleSort(keys[i])}
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: i === 0 ? 'flex-start' : 'flex-end', userSelect: 'none' }}
                    >
                      {col}
                      <SortIcon colKey={keys[i]} />
                    </span>
                  );
                })}
              </div>
              {sortedCampaigns.map((c, i) => (
                <div
                  key={i}
                  onClick={() => setExpandedCampaign(expandedCampaign === i ? null : i)}
                  style={{
                    display: 'grid', gridTemplateColumns: '2fr repeat(9, 1fr)', padding: '14px 20px',
                    borderBottom: '1px solid var(--border-subtle)', fontSize: 13, cursor: 'pointer',
                    transition: 'background 0.15s', alignItems: 'center',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {expandedCampaign === i ? <ChevronDown size={14} color="var(--on-surface-variant)" /> : <ChevronRight size={14} color="var(--on-surface-variant)" />}
                    <span style={{ fontWeight: 600, color: 'var(--on-surface)' }}>{c.name}</span>
                  </div>
                  <span style={{ textAlign: 'right', color: statusColors[c.status] || 'var(--on-surface-variant)', fontWeight: 600, fontSize: 12 }}>{c.status}</span>
                  <span style={{ textAlign: 'right', color: 'var(--on-surface)' }}>{formatCOP(c.budget || 0)}</span>
                  <span style={{ textAlign: 'right', color: 'var(--on-surface)' }}>{formatNumber(c.impressions || 0)}</span>
                  <span style={{ textAlign: 'right', color: 'var(--on-surface)' }}>{formatNumber(c.clicks || 0)}</span>
                  <span style={{ textAlign: 'right', color: 'var(--on-surface)' }}>{c.ctr ? formatPercent(c.ctr) : '—'}</span>
                  <span style={{ textAlign: 'right', color: 'var(--on-surface)', fontWeight: 600 }}>{formatCOP(c.spend || 0)}</span>
                  <span style={{ textAlign: 'right', color: 'var(--on-surface)' }}>{formatNumber(c.conversions || 0)}</span>
                  <span style={{ textAlign: 'right', color: 'var(--on-surface)' }}>{c.cpa ? formatCOP(c.cpa) : '—'}</span>
                  <span style={{ textAlign: 'right', color: 'var(--on-surface)', fontWeight: 600 }}>{c.roas ? `${c.roas.toFixed(2)}x` : '—'}</span>
                </div>
              ))}
              {expandedCampaign !== null && sortedCampaigns[expandedCampaign] && (
                <div style={{ padding: '16px 20px 16px 48px', background: 'rgba(255,255,255,0.015)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                    {[
                      { label: 'Presupuesto Diario', value: formatCOP(sortedCampaigns[expandedCampaign].budget || 0) },
                      { label: 'Objetivo', value: sortedCampaigns[expandedCampaign].objective || '—' },
                      { label: 'Inicio', value: sortedCampaigns[expandedCampaign].startDate || '—' },
                      { label: 'Fin', value: sortedCampaigns[expandedCampaign].endDate || '—' },
                    ].map((item, j) => (
                      <div key={j}>
                        <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', marginBottom: 4 }}>{item.label}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--on-surface)' }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'Anuncios' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--on-surface-variant)' }} />
                <input
                  type="text"
                  placeholder="Buscar por nombre, campaña o grupo..."
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  style={{
                    width: '100%', padding: '9px 12px 9px 36px', borderRadius: 10, border: '1px solid var(--border-subtle)',
                    background: 'rgba(255,255,255,0.03)', color: 'var(--on-surface)', fontSize: 13, outline: 'none',
                  }}
                />
              </div>
              <span style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>
                {filteredAds.length} anuncios
              </span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr repeat(7, 1fr)', padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)', fontSize: 11, fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                <span>Anuncio</span>
                <span style={{ textAlign: 'right' }}>Campaña</span>
                <span style={{ textAlign: 'right' }}>Grupo</span>
                <span style={{ textAlign: 'right' }}>Impresiones</span>
                <span style={{ textAlign: 'right' }}>Clics</span>
                <span style={{ textAlign: 'right' }}>CTR</span>
                <span style={{ textAlign: 'right' }}>Gasto</span>
                <span style={{ textAlign: 'right' }}>CPA</span>
              </div>
              {filteredAds.map((ad, i) => (
                <div
                  key={i}
                  style={{
                    display: 'grid', gridTemplateColumns: '2fr repeat(7, 1fr)', padding: '14px 20px',
                    borderBottom: '1px solid var(--border-subtle)', fontSize: 13, alignItems: 'center',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Video size={14} color="#6366f1" />
                    <span style={{ fontWeight: 600, color: 'var(--on-surface)' }}>{ad.name}</span>
                  </div>
                  <span style={{ textAlign: 'right', color: 'var(--on-surface-variant)', fontSize: 12 }}>{ad.campaignName || '—'}</span>
                  <span style={{ textAlign: 'right', color: 'var(--on-surface-variant)', fontSize: 12 }}>{ad.adGroupName || '—'}</span>
                  <span style={{ textAlign: 'right', color: 'var(--on-surface)' }}>{formatNumber(ad.impressions || 0)}</span>
                  <span style={{ textAlign: 'right', color: 'var(--on-surface)' }}>{formatNumber(ad.clicks || 0)}</span>
                  <span style={{ textAlign: 'right', color: 'var(--on-surface)' }}>{ad.ctr ? formatPercent(ad.ctr) : '—'}</span>
                  <span style={{ textAlign: 'right', color: 'var(--on-surface)', fontWeight: 600 }}>{formatCOP(ad.spend || 0)}</span>
                  <span style={{ textAlign: 'right', color: 'var(--on-surface)' }}>{ad.cpa ? formatCOP(ad.cpa) : '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'Audiencia' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid var(--border-subtle)', padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                  <Users size={16} color="#6366f1" />
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--on-surface)' }}>Distribución por Edad</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {(tiktokData.audienceInsights?.ageBreakdown || []).map((a, i) => {
                    const maxPct = Math.max(...(tiktokData.audienceInsights?.ageBreakdown || []).map(x => x.percentage || 0));
                    const pct = a.percentage || 0;
                    return (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                          <span style={{ fontSize: 12, color: 'var(--on-surface)', fontWeight: 500 }}>{a.range}</span>
                          <span style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>{pct.toFixed(1)}%</span>
                        </div>
                        <div style={{ width: '100%', height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%', borderRadius: 4,
                              width: `${maxPct > 0 ? (pct / maxPct) * 100 : 0}%`,
                              background: `linear-gradient(90deg, #6366f1, #8b5cf6)`,
                              transition: 'width 0.6s ease',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {(!tiktokData.audienceInsights?.ageBreakdown || tiktokData.audienceInsights.ageBreakdown.length === 0) && (
                    <p style={{ fontSize: 13, color: 'var(--on-surface-variant)', margin: 0 }}>Sin datos de edad disponibles</p>
                  )}
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid var(--border-subtle)', padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                  <Users size={16} color="#8b5cf6" />
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--on-surface)' }}>Distribución por Género</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
                  {(() => {
                    const genderData = tiktokData.audienceInsights?.genderBreakdown || [];
                    if (!genderData.length) return <p style={{ fontSize: 13, color: 'var(--on-surface-variant)', margin: 0 }}>Sin datos de género disponibles</p>;
                    const colors = ['#6366f1', '#a78bfa', '#c4b5fd'];
                    const segments = [];
                    let cumulative = 0;
                    genderData.forEach((g, i) => {
                      const start = cumulative;
                      cumulative += g.percentage || 0;
                      segments.push(`${colors[i % colors.length]} ${start}% ${cumulative}%`);
                    });
                    return (
                      <>
                        <div
                          style={{
                            width: 160, height: 160, borderRadius: '50%',
                            background: `conic-gradient(${segments.join(', ')})`,
                            boxShadow: '0 4px 24px rgba(99,102,241,0.15)',
                          }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
                          {genderData.map((g, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 10, height: 10, borderRadius: 3, background: colors[i % colors.length] }} />
                                <span style={{ fontSize: 13, color: 'var(--on-surface)' }}>{g.label}</span>
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--on-surface)' }}>{(g.percentage || 0).toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Tendencia' && (
          <div>
            <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700, color: 'var(--on-surface)' }}>Rendimiento Diario</h3>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid var(--border-subtle)', padding: 24 }}>
              {(() => {
                const dailyStats = tiktokData.dailyStats || [];
                if (!dailyStats.length) return <p style={{ fontSize: 13, color: 'var(--on-surface-variant)', margin: 0 }}>Sin datos diarios disponibles</p>;
                const maxSpend = Math.max(...dailyStats.map(d => d.spend || 0));
                return (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 220 }}>
                    {dailyStats.map((d, i) => {
                      const h = maxSpend > 0 ? ((d.spend || 0) / maxSpend) * 180 : 0;
                      return (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                          <div style={{ fontSize: 10, color: 'var(--on-surface-variant)' }}>{formatCOP(d.spend || 0)}</div>
                          <div
                            style={{
                              width: '100%', maxWidth: 40, borderRadius: '6px 6px 2px 2px', height: Math.max(h, 4),
                              background: 'linear-gradient(180deg, #6366f1, #8b5cf6)',
                              transition: 'height 0.5s ease',
                              cursor: 'default',
                              position: 'relative',
                            }}
                            title={`${d.date}: ${formatCOP(d.spend || 0)}`}
                            onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }}
                            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                          />
                          <div style={{ fontSize: 10, color: 'var(--on-surface-variant)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 50, textAlign: 'center' }}>
                            {d.date || ''}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TikTokAdsPanel;
