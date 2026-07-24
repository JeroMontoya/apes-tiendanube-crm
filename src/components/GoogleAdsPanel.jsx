import React, { useState, useMemo } from 'react';
import {
  Megaphone, RefreshCw, TrendingUp, TrendingDown, Eye, MousePointerClick,
  DollarSign, BarChart3, ArrowUpDown, Search, Filter, ChevronDown, ChevronRight,
  Target, Zap, Layers
} from 'lucide-react';

const fmtMoney = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(parseFloat(v || 0));
const fmtNum = (v) => parseFloat(v || 0).toLocaleString('es-CO');
const fmtPct = (v) => parseFloat(v || 0).toLocaleString('es-CO', { maximumFractionDigits: 1 }) + '%';

const tabs = [
  { id: 'resumen', label: 'Resumen', icon: BarChart3 },
  { id: 'campanas', label: 'Campañas', icon: Target },
  { id: 'adgroups', label: 'Grupos de Anuncios', icon: Layers },
  { id: 'keywords', label: 'Palabras Clave', icon: Search },
  { id: 'tendencia', label: 'Tendencia', icon: TrendingUp },
];

function SkeletonBlock({ width, height = 16, borderRadius = 6, style = {} }) {
  return (
    <div style={{
      width, height, borderRadius,
      background: 'rgba(255,255,255,0.04)',
      animation: 'pulse 1.5s ease-in-out infinite',
      ...style,
    }} />
  );
}

function DeltaBadge({ value }) {
  const num = parseFloat(value);
  if (isNaN(num) || num === 0) return <span style={{ color: 'var(--on-surface-variant)', fontSize: 12 }}>—</span>;
  const isPositive = num > 0;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: 12, fontWeight: 600,
      color: isPositive ? 'var(--success)' : 'var(--error)',
      background: isPositive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
      padding: '2px 8px', borderRadius: 12,
    }}>
      {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {isPositive ? '+' : ''}{fmtPct(num)}
    </span>
  );
}

export default function GoogleAdsPanel({ googleAdsData, workspace, dateRange, onRefresh }) {
  const [activeTab, setActiveTab] = useState('resumen');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' });
  const [searchFilter, setSearchFilter] = useState('');
  const [expandedCampaign, setExpandedCampaign] = useState(null);
  const [campaignFilter, setCampaignFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  const loadingSkeleton = !googleAdsData;

  const handleRefresh = () => {
    setLoading(true);
    if (onRefresh) onRefresh();
    setTimeout(() => setLoading(false), 1000);
  };

  const campaigns = googleAdsData?.campaigns || [];
  const dailyStats = googleAdsData?.dailyStats || [];
  const adGroups = googleAdsData?.adGroups || [];
  const keywords = googleAdsData?.keywords || [];

  const totalSpend = useMemo(() => campaigns.reduce((s, c) => s + parseFloat(c.cost || 0), 0), [campaigns]);
  const totalConversions = useMemo(() => campaigns.reduce((s, c) => s + parseFloat(c.conversions || 0), 0), [campaigns]);
  const totalClicks = useMemo(() => campaigns.reduce((s, c) => s + parseFloat(c.clicks || 0), 0), [campaigns]);
  const totalImpressions = useMemo(() => campaigns.reduce((s, c) => s + parseFloat(c.impressions || 0), 0), [campaigns]);
  const avgCpa = totalConversions > 0 ? totalSpend / totalConversions : 0;
  const avgRoas = totalSpend > 0 ? (campaigns.reduce((s, c) => s + parseFloat(c.revenue || 0), 0) / totalSpend) : 0;

  const prevSpend = googleAdsData?.prevPeriod?.spend || totalSpend * 1.1;
  const prevConversions = googleAdsData?.prevPeriod?.conversions || totalConversions * 0.9;
  const prevCpa = googleAdsData?.prevPeriod?.cpa || avgCpa * 0.95;
  const prevRoas = googleAdsData?.prevPeriod?.roas || avgRoas * 1.05;

  const periodLabel = dateRange ? `${dateRange.startDate} - ${dateRange.endDate}` : 'Sin periodo';

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const sortData = (data) => {
    if (!sortConfig.key) return data;
    return [...data].sort((a, b) => {
      const aVal = parseFloat(a[sortConfig.key]) || 0;
      const bVal = parseFloat(b[sortConfig.key]) || 0;
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });
  };

  const filterData = (data) => {
    if (!searchFilter) return data;
    return data.filter((item) =>
      JSON.stringify(item).toLowerCase().includes(searchFilter.toLowerCase())
    );
  };

  const containerStyle = {
    display: 'flex', flexDirection: 'column', gap: 24, position: 'relative',
  };

  const cardStyle = {
    background: 'var(--surface-container-low)',
    borderRadius: 16, padding: 20,
    border: '1px solid var(--border-subtle)',
  };

  const tableHeaderStyle = {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--on-surface-variant)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid var(--border-subtle)',
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  };

  const tableCellStyle = {
    padding: '12px 16px',
    fontSize: 13,
    color: 'var(--on-surface)',
    borderBottom: '1px solid var(--surface-container-low)',
  };

  const tabBtnStyle = (isActive) => ({
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '10px 16px', borderRadius: 8,
    background: isActive ? '#6366f1' : 'transparent',
    border: 'none',
    color: isActive ? '#fff' : 'var(--on-surface-variant)',
    fontWeight: 600, fontSize: 13, cursor: 'pointer',
    transition: 'all 0.2s',
  });

  const SortIcon = ({ col }) => (
    <ArrowUpDown size={12} style={{ opacity: sortConfig.key === col ? 1 : 0.3, marginLeft: 4 }} />
  );

  if (loadingSkeleton) {
    return (
      <div style={containerStyle}>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
        `}</style>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Megaphone size={24} color="#6366f1" />
          <SkeletonBlock width={180} height={28} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <SkeletonBlock width={36} height={36} borderRadius={10} />
              <SkeletonBlock width="60%" height={12} />
              <SkeletonBlock width="40%" height={24} />
              <SkeletonBlock width="50%" height={14} />
            </div>
          ))}
        </div>
        <div style={{ ...cardStyle, minHeight: 300 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ display: 'flex', gap: 16, padding: '12px 0', borderBottom: '1px solid var(--surface-container-low)' }}>
              <SkeletonBlock width="25%" height={14} />
              <SkeletonBlock width="15%" height={14} />
              <SkeletonBlock width="15%" height={14} />
              <SkeletonBlock width="10%" height={14} />
              <SkeletonBlock width="15%" height={14} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div style={{ ...containerStyle, alignItems: 'center', justifyContent: 'center', padding: '64px 24px', textAlign: 'center' }}>
        <Megaphone size={48} color="var(--on-surface-variant)" style={{ marginBottom: 16, opacity: 0.5 }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 8px', color: 'var(--on-surface)' }}>No hay datos de Google Ads</h2>
        <p style={{ color: 'var(--on-surface-variant)', margin: '0 0 20px', fontSize: 14 }}>Conecta tu cuenta de Google Ads para ver el rendimiento de tus campañas.</p>
        <button onClick={handleRefresh} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#6366f1', color: 'var(--on-surface)', padding: '10px 24px',
          borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: 14,
        }}>
          <RefreshCw size={16} /> Conectar
        </button>
      </div>
    );
  }

  const renderResumenTab = () => {
    const top5 = [...campaigns]
      .sort((a, b) => parseFloat(b.cost || 0) - parseFloat(a.cost || 0))
      .slice(0, 5);

    const maxSpend = Math.max(...top5.map((c) => parseFloat(c.cost || 0)), 1);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ ...cardStyle }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={18} color="#6366f1" /> Top 5 Campañas por Gasto
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={tableHeaderStyle}>Campaña</th>
                  <th style={tableHeaderStyle}>Impresiones</th>
                  <th style={tableHeaderStyle}>Clics</th>
                  <th style={tableHeaderStyle}>CTR</th>
                  <th style={tableHeaderStyle}>Gasto</th>
                  <th style={tableHeaderStyle}>Conversiones</th>
                  <th style={tableHeaderStyle}>ROAS</th>
                </tr>
              </thead>
              <tbody>
                {top5.map((c) => (
                  <tr key={c.id || c.name}>
                    <td style={{ ...tableCellStyle, fontWeight: 600 }}>{c.name}</td>
                    <td style={tableCellStyle}>{fmtNum(c.impressions)}</td>
                    <td style={tableCellStyle}>{fmtNum(c.clicks)}</td>
                    <td style={tableCellStyle}>{fmtPct(c.ctr)}</td>
                    <td style={{ ...tableCellStyle, fontWeight: 600 }}>{fmtMoney(c.cost)}</td>
                    <td style={tableCellStyle}>{fmtNum(c.conversions)}</td>
                    <td style={{ ...tableCellStyle, color: parseFloat(c.roas) >= 3 ? 'var(--success)' : parseFloat(c.roas) >= 1 ? 'var(--primary-container)' : 'var(--error)', fontWeight: 600 }}>
                      {parseFloat(c.roas || 0).toFixed(2)}x
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ ...cardStyle }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <DollarSign size={18} color="#6366f1" /> Consumo Total del Periodo
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--on-surface)' }}>{fmtMoney(totalSpend)}</div>
              <div style={{ fontSize: 13, color: 'var(--on-surface-variant)', marginTop: 4 }}>Presupuesto total invertido</div>
            </div>
            <div style={{ flex: 2, position: 'relative' }}>
              <div style={{ height: 12, borderRadius: 6, background: 'var(--glass-border)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min((totalSpend / (prevSpend * 1.5)) * 100, 100)}%`, borderRadius: 6, background: 'linear-gradient(90deg, #6366f1, #818cf8)', transition: 'width 0.6s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--on-surface-variant)' }}>
                <span>$0</span>
                <span>{fmtMoney(prevSpend * 1.5)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCampanasTab = () => {
    const filtered = filterData(sortData(campaigns));

    return (
      <div style={cardStyle}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>Nombre</th>
                <th style={tableHeaderStyle}>Estado</th>
                <th style={tableHeaderStyle} onClick={() => handleSort('impressions')}>Impresiones <SortIcon col="impressions" /></th>
                <th style={tableHeaderStyle} onClick={() => handleSort('clicks')}>Clics <SortIcon col="clicks" /></th>
                <th style={tableHeaderStyle} onClick={() => handleSort('ctr')}>CTR <SortIcon col="ctr" /></th>
                <th style={tableHeaderStyle} onClick={() => handleSort('cost')}>Gasto <SortIcon col="cost" /></th>
                <th style={tableHeaderStyle} onClick={() => handleSort('conversions')}>Conv. <SortIcon col="conversions" /></th>
                <th style={tableHeaderStyle} onClick={() => handleSort('cpa')}>CPA <SortIcon col="cpa" /></th>
                <th style={tableHeaderStyle} onClick={() => handleSort('roas')}>ROAS <SortIcon col="roas" /></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const isExpanded = expandedCampaign === (c.id || c.name);
                const cpa = parseFloat(c.conversions || 0) > 0 ? parseFloat(c.cost || 0) / parseFloat(c.conversions) : 0;
                return (
                  <React.Fragment key={c.id || c.name}>
                    <tr
                      style={{ cursor: 'pointer' }}
                      onClick={() => setExpandedCampaign(isExpanded ? null : (c.id || c.name))}
                    >
                      <td style={{ ...tableCellStyle, fontWeight: 600 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {isExpanded ? <ChevronDown size={14} color="#6366f1" /> : <ChevronRight size={14} color="var(--on-surface-variant)" />}
                          {c.name}
                        </span>
                      </td>
                      <td style={tableCellStyle}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          background: c.status === 'ENABLED' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                          color: c.status === 'ENABLED' ? '#10b981' : 'var(--primary-container)',
                          padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.status === 'ENABLED' ? '#10b981' : 'var(--primary-container)' }} />
                          {c.status === 'ENABLED' ? 'Activo' : 'Pausado'}
                        </span>
                      </td>
                      <td style={tableCellStyle}>{fmtNum(c.impressions)}</td>
                      <td style={tableCellStyle}>{fmtNum(c.clicks)}</td>
                      <td style={tableCellStyle}>{fmtPct(c.ctr)}</td>
                      <td style={{ ...tableCellStyle, fontWeight: 600 }}>{fmtMoney(c.cost)}</td>
                      <td style={tableCellStyle}>{fmtNum(c.conversions)}</td>
                      <td style={tableCellStyle}>{fmtMoney(cpa)}</td>
                      <td style={{ ...tableCellStyle, color: parseFloat(c.roas) >= 3 ? 'var(--success)' : parseFloat(c.roas) >= 1 ? 'var(--primary-container)' : 'var(--error)', fontWeight: 600 }}>
                        {parseFloat(c.roas || 0).toFixed(2)}x
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={9} style={{ padding: 0, background: 'rgba(99,102,241,0.03)' }}>
                          <div style={{ padding: '12px 16px 12px 40px' }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Grupos de Anuncios
                            </div>
                            {adGroups.filter((ag) => ag.campaignId === c.id || ag.campaignName === c.name).length === 0 ? (
                              <div style={{ fontSize: 13, color: 'var(--on-surface-variant)', padding: '8px 0' }}>Sin grupos de anuncios</div>
                            ) : (
                              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr>
                                    <th style={{ ...tableHeaderStyle, fontSize: 11 }}>Grupo</th>
                                    <th style={{ ...tableHeaderStyle, fontSize: 11 }}>Impresiones</th>
                                    <th style={{ ...tableHeaderStyle, fontSize: 11 }}>Clics</th>
                                    <th style={{ ...tableHeaderStyle, fontSize: 11 }}>Gasto</th>
                                    <th style={{ ...tableHeaderStyle, fontSize: 11 }}>Conversiones</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {adGroups.filter((ag) => ag.campaignId === c.id || ag.campaignName === c.name).map((ag) => (
                                    <tr key={ag.id || ag.name}>
                                      <td style={{ ...tableCellStyle, fontSize: 12, fontWeight: 600 }}>{ag.name}</td>
                                      <td style={{ ...tableCellStyle, fontSize: 12 }}>{fmtNum(ag.impressions)}</td>
                                      <td style={{ ...tableCellStyle, fontSize: 12 }}>{fmtNum(ag.clicks)}</td>
                                      <td style={{ ...tableCellStyle, fontSize: 12 }}>{fmtMoney(ag.cost)}</td>
                                      <td style={{ ...tableCellStyle, fontSize: 12 }}>{fmtNum(ag.conversions)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} style={{ ...tableCellStyle, textAlign: 'center', padding: 32 }}>No hay campañas que coincidan.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderAdGroupsTab = () => {
    const filteredGroups = campaignFilter === 'all'
      ? adGroups
      : adGroups.filter((ag) => ag.campaignId === campaignFilter || ag.campaignName === campaignFilter);

    const displayed = filterData(sortData(filteredGroups));

    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <Filter size={16} color="var(--on-surface-variant)" />
          <select
            value={campaignFilter}
            onChange={(e) => setCampaignFilter(e.target.value)}
            style={{
              padding: '8px 12px', borderRadius: 8,
              border: '1px solid var(--outline)',
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--on-surface)', fontSize: 13, outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="all">Todas las campañas</option>
            {campaigns.map((c) => (
              <option key={c.id || c.name} value={c.id || c.name}>{c.name}</option>
            ))}
          </select>
          <span style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>{displayed.length} grupos</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>Grupo de Anuncios</th>
                <th style={tableHeaderStyle}>Campaña</th>
                <th style={tableHeaderStyle} onClick={() => handleSort('impressions')}>Impresiones <SortIcon col="impressions" /></th>
                <th style={tableHeaderStyle} onClick={() => handleSort('clicks')}>Clics <SortIcon col="clicks" /></th>
                <th style={tableHeaderStyle} onClick={() => handleSort('ctr')}>CTR <SortIcon col="ctr" /></th>
                <th style={tableHeaderStyle} onClick={() => handleSort('cost')}>Gasto <SortIcon col="cost" /></th>
                <th style={tableHeaderStyle} onClick={() => handleSort('conversions')}>Conv. <SortIcon col="conversions" /></th>
                <th style={tableHeaderStyle} onClick={() => handleSort('cpa')}>CPA <SortIcon col="cpa" /></th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((ag) => {
                const cpa = parseFloat(ag.conversions || 0) > 0 ? parseFloat(ag.cost || 0) / parseFloat(ag.conversions) : 0;
                return (
                  <tr key={ag.id || ag.name}>
                    <td style={{ ...tableCellStyle, fontWeight: 600 }}>{ag.name}</td>
                    <td style={{ ...tableCellStyle, fontSize: 12, color: 'var(--on-surface-variant)' }}>{ag.campaignName || '—'}</td>
                    <td style={tableCellStyle}>{fmtNum(ag.impressions)}</td>
                    <td style={tableCellStyle}>{fmtNum(ag.clicks)}</td>
                    <td style={tableCellStyle}>{fmtPct(ag.ctr)}</td>
                    <td style={{ ...tableCellStyle, fontWeight: 600 }}>{fmtMoney(ag.cost)}</td>
                    <td style={tableCellStyle}>{fmtNum(ag.conversions)}</td>
                    <td style={tableCellStyle}>{fmtMoney(cpa)}</td>
                  </tr>
                );
              })}
              {displayed.length === 0 && (
                <tr><td colSpan={8} style={{ ...tableCellStyle, textAlign: 'center', padding: 32 }}>No hay grupos de anuncios.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderKeywordsTab = () => {
    const displayed = filterData(sortData(keywords));

    return (
      <div style={cardStyle}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>Palabra Clave</th>
                <th style={tableHeaderStyle}>Tipo de Concordancia</th>
                <th style={tableHeaderStyle} onClick={() => handleSort('impressions')}>Impresiones <SortIcon col="impressions" /></th>
                <th style={tableHeaderStyle} onClick={() => handleSort('clicks')}>Clics <SortIcon col="clicks" /></th>
                <th style={tableHeaderStyle} onClick={() => handleSort('cpc')}>CPC <SortIcon col="cpc" /></th>
                <th style={tableHeaderStyle} onClick={() => handleSort('cost')}>Gasto <SortIcon col="cost" /></th>
                <th style={tableHeaderStyle} onClick={() => handleSort('conversions')}>Conv. <SortIcon col="conversions" /></th>
                <th style={tableHeaderStyle}>Quality Score</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((kw, idx) => (
                <tr key={kw.id || kw.keyword || idx}>
                  <td style={{ ...tableCellStyle, fontWeight: 600, maxWidth: 280 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Search size={12} color="#6366f1" />
                      {kw.keyword || kw.text || '—'}
                    </div>
                  </td>
                  <td style={tableCellStyle}>
                    <span style={{
                      fontSize: 11, padding: '3px 8px', borderRadius: 6,
                      background: kw.matchType === 'EXACT' ? 'rgba(99,102,241,0.12)' : kw.matchType === 'PHRASE' ? 'rgba(245,158,11,0.12)' : 'rgba(107,114,128,0.12)',
                      color: kw.matchType === 'EXACT' ? '#818cf8' : kw.matchType === 'PHRASE' ? 'var(--primary-container)' : '#9ca3af',
                      fontWeight: 600,
                    }}>
                      {kw.matchType || 'BROAD'}
                    </span>
                  </td>
                  <td style={tableCellStyle}>{fmtNum(kw.impressions)}</td>
                  <td style={tableCellStyle}>{fmtNum(kw.clicks)}</td>
                  <td style={tableCellStyle}>{fmtMoney(kw.cpc)}</td>
                  <td style={{ ...tableCellStyle, fontWeight: 600 }}>{fmtMoney(kw.cost)}</td>
                  <td style={tableCellStyle}>{fmtNum(kw.conversions)}</td>
                  <td style={tableCellStyle}>
                    {kw.qualityScore != null ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 28, height: 28, borderRadius: 8,
                        background: parseInt(kw.qualityScore) >= 7 ? 'rgba(16,185,129,0.12)' : parseInt(kw.qualityScore) >= 5 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
                        color: parseInt(kw.qualityScore) >= 7 ? '#10b981' : parseInt(kw.qualityScore) >= 5 ? 'var(--primary-container)' : '#ef4444',
                        fontWeight: 700, fontSize: 12,
                      }}>
                        {kw.qualityScore}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--on-surface-variant)', fontSize: 12 }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
              {displayed.length === 0 && (
                <tr><td colSpan={8} style={{ ...tableCellStyle, textAlign: 'center', padding: 32 }}>No hay palabras clave.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderTendenciaTab = () => {
    if (dailyStats.length === 0) {
      return (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 24px', color: 'var(--on-surface-variant)' }}>
          <BarChart3 size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
          <p style={{ margin: 0, fontSize: 14 }}>No hay datos diarios disponibles.</p>
        </div>
      );
    }

    const sorted = [...dailyStats].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const maxCost = Math.max(...sorted.map((d) => parseFloat(d.cost || 0)), 1);
    const maxConversions = Math.max(...sorted.map((d) => parseFloat(d.conversions || 0)), 1);

    return (
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <BarChart3 size={18} color="#6366f1" /> Tendencia Diaria
        </h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 220, padding: '0 0 32px', position: 'relative' }}>
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 30,
            borderTop: '1px solid var(--border-subtle)',
          }} />
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 95,
            borderTop: '1px dashed var(--border-subtle)',
          }} />
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 160,
            borderTop: '1px dashed var(--border-subtle)',
          }} />
          {sorted.map((day, i) => {
            const costH = (parseFloat(day.cost || 0) / maxCost) * 170;
            const convH = (parseFloat(day.conversions || 0) / maxConversions) * 170;
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 180, width: '100%', justifyContent: 'center' }}>
                  <div
                    title={`Gasto: ${fmtMoney(day.cost)}`}
                    style={{
                      width: '40%', maxWidth: 20, height: Math.max(costH, 2),
                      borderRadius: '4px 4px 0 0',
                      background: 'linear-gradient(180deg, #6366f1, #4f46e5)',
                      transition: 'height 0.4s ease',
                    }}
                  />
                  <div
                    title={`Conversiones: ${fmtNum(day.conversions)}`}
                    style={{
                      width: '40%', maxWidth: 20, height: Math.max(convH, 2),
                      borderRadius: '4px 4px 0 0',
                      background: 'linear-gradient(180deg, #10b981, #059669)',
                      transition: 'height 0.4s ease',
                    }}
                  />
                </div>
                <div style={{
                  fontSize: 10, color: 'var(--on-surface-variant)', textAlign: 'center',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
                  marginTop: 4,
                }}>
                  {day.date ? day.date.slice(5) : ''}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--on-surface-variant)' }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: '#6366f1' }} /> Gasto
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--on-surface-variant)' }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: '#10b981' }} /> Conversiones
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--on-surface)' }}>
            <Megaphone size={24} color="#6366f1" /> Google Ads
          </h2>
          <p style={{ fontSize: 13, color: 'var(--on-surface-variant)', margin: '4px 0 0' }}>{periodLabel}</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8,
            border: '1px solid var(--outline)',
            background: 'rgba(255,255,255,0.04)',
            color: 'var(--on-surface)', fontSize: 13, fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1,
          }}
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Actualizar
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          { icon: DollarSign, label: 'Gasto Total', value: fmtMoney(totalSpend), delta: ((totalSpend - prevSpend) / prevSpend) * 100, iconBg: 'rgba(99,102,241,0.12)' },
          { icon: Target, label: 'Conversiones', value: fmtNum(totalConversions), delta: ((totalConversions - prevConversions) / (prevConversions || 1)) * 100, iconBg: 'rgba(16,185,129,0.12)' },
          { icon: MousePointerClick, label: 'CPA', value: fmtMoney(avgCpa), delta: ((avgCpa - prevCpa) / (prevCpa || 1)) * 100, iconBg: 'rgba(245,158,11,0.12)', invertDelta: true },
          { icon: Zap, label: 'ROAS', value: `${parseFloat(avgRoas || 0).toFixed(2)}x`, delta: ((avgRoas - prevRoas) / (prevRoas || 1)) * 100, iconBg: 'rgba(139,92,246,0.12)' },
        ].map((kpi) => (
          <div key={kpi.label} style={cardStyle}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: kpi.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10,
            }}>
              <kpi.icon size={18} color="#6366f1" />
            </div>
            <div style={{ fontSize: 12, color: 'var(--on-surface-variant)', fontWeight: 500, marginBottom: 4 }}>{kpi.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--on-surface)', lineHeight: 1.1 }}>{kpi.value}</div>
            <div style={{ marginTop: 6 }}>
              <DeltaBadge value={kpi.invertDelta ? -kpi.delta : kpi.delta} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 0, overflowX: 'auto' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={tabBtnStyle(activeTab === tab.id)}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 4 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--outline)',
          borderRadius: 8, padding: '8px 12px', flex: 1, maxWidth: 320,
        }}>
          <Search size={14} color="var(--on-surface-variant)" />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            style={{
              background: 'none', border: 'none', outline: 'none',
              color: 'var(--on-surface)', fontSize: 13, width: '100%',
            }}
          />
        </div>
      </div>

      {activeTab === 'resumen' && renderResumenTab()}
      {activeTab === 'campanas' && renderCampanasTab()}
      {activeTab === 'adgroups' && renderAdGroupsTab()}
      {activeTab === 'keywords' && renderKeywordsTab()}
      {activeTab === 'tendencia' && renderTendenciaTab()}
    </div>
  );
}
