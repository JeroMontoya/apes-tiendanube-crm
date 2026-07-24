import React, { useState, useEffect, useMemo } from 'react';
import { Search, TrendingUp, TrendingDown, Globe, Smartphone, Monitor, Tablet, BarChart2, ExternalLink, Filter, Download, ChevronDown, ChevronUp, Target, Flag, Lightbulb, Zap, Eye, RefreshCw, ArrowUpRight, ArrowDownRight, Link2, FileText, AlertTriangle } from 'lucide-react';

export default function SearchConsolePanel({ workspaceData, dateRange, filteredClients }) {
  const [queries, setQueries] = useState([]);
  const [pages, setPages] = useState([]);
  const [performance, setPerformance] = useState(null);
  const [performanceByDate, setPerformanceByDate] = useState([]);
  const [deviceBreakdown, setDeviceBreakdown] = useState([]);
  const [countryBreakdown, setCountryBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('clicks');
  const [sortDir, setSortDir] = useState('desc');

  const siteUrl = workspaceData?.search_console_site_url;
  const credentials = workspaceData?.search_console_credentials_json;

  const isConfigured = !!(siteUrl && credentials);

  useEffect(() => {
    if (!isConfigured) return;
    fetchData();
  }, [isConfigured, dateRange]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { fetchSearchConsoleInsights } = await import('../api/SearchConsoleAPI.js');
      const result = await fetchSearchConsoleInsights(siteUrl, credentials, { 
        startDate: dateRange.startDate, 
        endDate: dateRange.endDate 
      });
      
      if (result.success) {
        setQueries(result.data.topQueries || []);
        setPages(result.data.topPages || []);
        setPerformance(result.data);
        setPerformanceByDate(result.data.performanceByDate || []);
        setDeviceBreakdown(result.data.deviceBreakdown || []);
        setCountryBreakdown(result.data.countryBreakdown || []);
      } else {
        setError(result.error?.message || 'Error desconocido');
      }
    } catch (e) {
      setError(e.message);
      console.error('GSC fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('desc'); }
  };

  const sortedQueries = useMemo(() => {
    let result = [...queries];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(r => r.query.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      const va = a[sortBy] || 0;
      const vb = b[sortBy] || 0;
      return sortDir === 'asc' ? va - vb : vb - va;
    });
    return result;
  }, [queries, search, sortBy, sortDir]);

  const sortedPages = useMemo(() => {
    let result = [...pages];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(r => r.page.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      const va = a[sortBy] || 0;
      const vb = b[sortBy] || 0;
      return sortDir === 'asc' ? va - vb : vb - va;
    });
    return result;
  }, [pages, search, sortBy, sortDir]);

  const seoScore = useMemo(() => {
    if (queries.length === 0) return 0;
    const avgCtr = queries.reduce((s, q) => s + q.ctr, 0) / queries.length;
    const avgPos = queries.reduce((s, q) => s + q.position, 0) / queries.length;
    const top3 = queries.filter(q => q.position <= 3).length;
    const top10 = queries.filter(q => q.position <= 10).length;
    const ctrScore = Math.min(avgCtr * 500, 100);
    const posScore = Math.max(0, 100 - (avgPos * 5));
    const rankScore = (top3 / queries.length) * 40 + (top10 / queries.length) * 30;
    return Math.round((ctrScore * 0.3 + posScore * 0.3 + rankScore * 0.4));
  }, [queries]);

  const trendData = useMemo(() => {
    if (performanceByDate.length < 2) return null;
    const sorted = [...performanceByDate].sort((a, b) => a.date.localeCompare(b.date));
    const mid = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, mid);
    const secondHalf = sorted.slice(mid);
    const firstClicks = firstHalf.reduce((s, d) => s + d.clicks, 0);
    const secondClicks = secondHalf.reduce((s, d) => s + d.clicks, 0);
    const firstImpr = firstHalf.reduce((s, d) => s + d.impressions, 0);
    const secondImpr = secondHalf.reduce((s, d) => s + d.impressions, 0);
    return {
      clicksChange: firstClicks > 0 ? ((secondClicks - firstClicks) / firstClicks) : 0,
      impressionsChange: firstImpr > 0 ? ((secondImpr - firstImpr) / firstImpr) : 0,
      dailyData: sorted,
    };
  }, [performanceByDate]);

  const totals = performance?.totals || { clicks: 0, impressions: 0, ctr: 0, position: 0 };
  const ctrPct = (totals.ctr * 100).toFixed(2);
  const avgPos = totals.position.toFixed(1);

  const highImpLowCtr = queries.filter(q => q.impressions > 500 && q.ctr < 0.01);
  const lowPosHighImpr = queries.filter(q => q.position > 10 && q.impressions > 300);
  const nearTop = queries.filter(q => q.position > 3 && q.position <= 10 && q.impressions > 200);

  if (error || !isConfigured) {
    return (
      <div className="glass-card p-8 text-center">
        <Globe className="w-16 h-16 mx-auto text-on-surface-variant opacity-30 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Search Console no configurado</h3>
        <p className="text-on-surface-variant mb-4">Agrega Site URL y Service Account en Configuración para ver queries, clics, impresiones y posición.</p>
        <button onClick={fetchData} className="px-4 py-2 bg-primary text-white rounded-lg">Reintentar</button>
      </div>
    );
  }

  if (loading) {
    return <div className="glass-card p-8 text-center"><div className="animate-spin inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /><p className="mt-4 text-on-surface-variant">Cargando Search Console...</p></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeIn 0.4s ease-out' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div style={{ padding: 10, background: 'rgba(66, 133, 244, 0.1)', borderRadius: 12, border: '1px solid rgba(66, 133, 244, 0.2)' }}>
              <Search size={24} color="#4285f4" />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, background: 'linear-gradient(90deg, #fff, #93c5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Search Console Command
              </h1>
              <div style={{ fontSize: 12, color: 'var(--on-surface-variant)', marginTop: 4 }}>
                SEO orgánico · {siteUrl}
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetchData} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 12, border: '1px solid rgba(66,133,244,0.3)', background: 'rgba(66,133,244,0.05)', color: '#4285f4', fontWeight: 600, cursor: 'pointer', fontSize: 13, transition: 'all 0.2s' }}>
            <RefreshCw size={14} /> Actualizar
          </button>
          <a href={`https://search.google.com/search-console/performance/search-analytics?resource_id=${encodeURIComponent(siteUrl)}`} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 12, border: '1px solid var(--border-medium)', background: 'var(--surface-container-low)', color: 'var(--on-surface)', fontWeight: 600, fontSize: 13, textDecoration: 'none', transition: 'all 0.2s' }}>
            <ExternalLink size={14} /> Consola GSC
          </a>
        </div>
      </div>

      {/* KPI Cards + SEO Score */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        {/* SEO Score */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px', background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.08) 0%, transparent 100%)', borderLeft: '3px solid #4285f4' }}>
          <div style={{ position: 'relative', width: 50, height: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="50" height="50" viewBox="0 0 100 100" style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
              <circle cx="50" cy="50" r="45" fill="none" stroke="var(--border-subtle)" strokeWidth="8" />
              <circle cx="50" cy="50" r="45" fill="none" stroke={seoScore >= 70 ? '#10b981' : seoScore >= 40 ? 'var(--primary-container)' : '#ef4444'} strokeWidth="8" strokeDasharray="283" strokeDashoffset={283 - (283 * seoScore) / 100} style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
            </svg>
            <span style={{ fontSize: 15, fontWeight: 800, color: seoScore >= 70 ? '#10b981' : seoScore >= 40 ? 'var(--primary-container)' : '#ef4444' }}>{seoScore}</span>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--on-surface-variant)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>SEO Score</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface)' }}>{seoScore >= 70 ? 'Saludable' : seoScore >= 40 ? 'Mejorable' : 'Crítico'}</div>
          </div>
        </div>

        {[
          { label: 'Clics Totales', value: totals.clicks.toLocaleString('es-CO'), icon: Zap, color: '#4285f4', bg: 'rgba(66,133,244,0.1)', trend: trendData ? `${trendData.clicksChange >= 0 ? '+' : ''}${(trendData.clicksChange * 100).toFixed(1)}%` : null, trendUp: trendData?.clicksChange >= 0 },
          { label: 'Impresiones', value: totals.impressions.toLocaleString('es-CO'), icon: Eye, color: '#34a853', bg: 'rgba(52,168,83,0.1)', trend: trendData ? `${trendData.impressionsChange >= 0 ? '+' : ''}${(trendData.impressionsChange * 100).toFixed(1)}%` : null, trendUp: trendData?.impressionsChange >= 0 },
          { label: 'CTR Promedio', value: `${ctrPct}%`, icon: Target, color: '#fbbc04', bg: 'rgba(251,188,4,0.1)' },
          { label: 'Posición Media', value: avgPos, icon: Flag, color: '#ea4335', bg: 'rgba(234,67,53,0.1)' },
        ].map((s, i) => (
          <div key={i} className="glass-card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: s.bg, color: s.color }}><s.icon size={18} /></div>
              {s.trend && (
                <span style={{ fontSize: 10, fontWeight: 700, color: s.trendUp ? '#10b981' : '#ef4444', background: s.trendUp ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', padding: '2px 8px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 3 }}>
                  {s.trendUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />} {s.trend}
                </span>
              )}
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--on-surface-variant)', fontWeight: 500, textTransform: 'uppercase' }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--on-surface)', lineHeight: 1.2 }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12, overflowX: 'auto' }}>
        {[
          { id: 'overview', icon: BarChart2, label: 'Resumen' },
          { id: 'queries', icon: Search, label: 'Queries' },
          { id: 'pages', icon: FileText, label: 'Páginas' },
          { id: 'devices', icon: Monitor, label: 'Dispositivos' },
          { id: 'opportunities', icon: Lightbulb, label: 'Oportunidades' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1px solid',
            borderColor: activeTab === tab.id ? 'rgba(66,133,244,0.3)' : 'transparent',
            background: activeTab === tab.id ? 'rgba(66,133,244,0.1)' : 'transparent',
            color: activeTab === tab.id ? '#4285f4' : 'var(--on-surface-variant)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ minHeight: 400 }}>
        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
            {/* Trend sparkline-like visualization */}
            {trendData && trendData.dailyData.length > 0 && (
              <div className="glass-card" style={{ padding: 22, gridColumn: '1 / -1' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: '#93c5fd', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrendingUp size={15} /> Tendencia Diaria de Clics
                </h3>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 80 }}>
                  {(() => {
                    const maxClicks = Math.max(...trendData.dailyData.map(d => d.clicks), 1);
                    return trendData.dailyData.map((d, i) => (
                      <div key={i} style={{ flex: 1, height: `${Math.max(4, (d.clicks / maxClicks) * 100)}%`, background: `linear-gradient(180deg, #4285f4, rgba(66,133,244,0.3))`, borderRadius: 3, minHeight: 4, transition: 'height 0.5s ease-out', cursor: 'pointer', position: 'relative' }}
                        title={`${d.date}: ${d.clicks} clics, ${d.impressions} impr.`} />
                    ));
                  })()}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  <span style={{ fontSize: 10, color: 'var(--on-surface-variant)' }}>{trendData.dailyData[0]?.date}</span>
                  <span style={{ fontSize: 10, color: 'var(--on-surface-variant)' }}>{trendData.dailyData[trendData.dailyData.length - 1]?.date}</span>
                </div>
              </div>
            )}

            {/* Device Breakdown */}
            <div className="glass-card" style={{ padding: 22 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: '#93c5fd', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Monitor size={15} /> Dispositivos
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {deviceBreakdown.map((d, i) => {
                  const maxDevClicks = Math.max(...deviceBreakdown.map(x => x.clicks), 1);
                  const barW = (d.clicks / maxDevClicks) * 100;
                  const colors = ['#4285f4', '#34a853', '#fbbc04'];
                  const icons = ['🖥️', '📱', '📟'];
                  return (
                    <div key={i} style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.15)', borderRadius: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <span style={{ fontSize: 16 }}>{icons[i]}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--on-surface)' }}>{d.device}</span>
                            <span style={{ fontWeight: 700, fontSize: 12, color: colors[i] }}>{d.clicks.toLocaleString()} clics</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ height: 4, background: 'var(--border-subtle)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${barW}%`, background: colors[i], borderRadius: 2, transition: 'width 0.8s ease-out' }} />
                      </div>
                      <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                        <span style={{ fontSize: 10, color: 'var(--on-surface-variant)' }}>CTR {(d.ctr * 100).toFixed(2)}%</span>
                        <span style={{ fontSize: 10, color: 'var(--on-surface-variant)' }}>Pos. {d.position.toFixed(1)}</span>
                        <span style={{ fontSize: 10, color: 'var(--on-surface-variant)' }}>{d.impressions.toLocaleString()} impr.</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Countries */}
            <div className="glass-card" style={{ padding: 22 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: '#93c5fd', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Globe size={15} /> Top Países
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
                {countryBreakdown.slice(0, 10).map((c, i) => {
                  const maxCountryClicks = Math.max(...countryBreakdown.slice(0, 10).map(x => x.clicks), 1);
                  const barW = (c.clicks / maxCountryClicks) * 100;
                  return (
                    <div key={i} style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.15)', borderRadius: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <div style={{ width: 26, height: 26, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(66,133,244,0.1)', color: '#4285f4', fontSize: 9, fontWeight: 700 }}>{c.country.slice(0, 2).toUpperCase()}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--on-surface)' }}>{c.country}</span>
                            <span style={{ fontWeight: 700, fontSize: 12, color: '#4285f4' }}>{c.clicks.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ height: 3, background: 'var(--border-subtle)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${barW}%`, background: '#4285f4', borderRadius: 2 }} />
                      </div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                        <span style={{ fontSize: 9, color: 'var(--on-surface-variant)' }}>CTR {(c.ctr * 100).toFixed(2)}%</span>
                        <span style={{ fontSize: 9, color: 'var(--on-surface-variant)' }}>Pos. {c.position.toFixed(1)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── QUERIES ── */}
        {activeTab === 'queries' && (
          <div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: '1 1 280px' }}>
                <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--on-surface-variant)' }} />
                <input type="text" placeholder="Buscar query..." value={search} onChange={e => setSearch(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px 10px 36px', borderRadius: 10, border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--on-surface)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', background: 'var(--surface-container)', borderRadius: 8, border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
                {['clicks', 'impressions', 'ctr', 'position'].map(f => (
                  <button key={f} onClick={() => handleSort(f)} style={{ padding: '8px 14px', border: 'none', cursor: 'pointer', background: sortBy === f ? 'var(--primary)' : 'transparent', color: sortBy === f ? '#fff' : 'var(--on-surface-variant)', fontWeight: sortBy === f ? 700 : 500, fontSize: 11, fontFamily: 'Inter, sans-serif', transition: 'all 0.2s' }}>
                    {f === 'clicks' ? 'Clics' : f === 'impressions' ? 'Impr.' : f === 'ctr' ? 'CTR' : 'Pos.'}
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--outline)' }}>
                      {['Query', 'Clics', 'Impr.', 'CTR', 'Pos.', 'Oportunidad'].map(h => (
                        <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--on-surface-variant)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedQueries.map((row, i) => {
                      const isHighImprLowCtr = row.impressions > 1000 && row.ctr < 0.01;
                      const isHighPos = row.position > 10 && row.impressions > 500;
                      const isNearTop = row.position > 3 && row.position <= 10 && row.impressions > 200;
                      const opportunity = isHighImprLowCtr ? { text: 'Optimizar CTR', color: '#ea4335' } : isHighPos ? { text: 'Subir posición', color: 'var(--primary-container)' } : isNearTop ? { text: 'Casi top 3', color: '#4285f4' } : row.position <= 3 ? { text: 'Top 3', color: '#10b981' } : { text: 'Monitorear', color: 'var(--on-surface-variant)' };
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                          <td style={{ padding: '10px 14px', fontWeight: 600, fontSize: 12, color: 'var(--on-surface)', maxWidth: 350, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.query}</td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: '#4285f4', fontSize: 12 }}>{row.clicks.toLocaleString()}</td>
                          <td style={{ padding: '10px 14px', color: 'var(--on-surface-variant)', fontSize: 12 }}>{row.impressions.toLocaleString()}</td>
                          <td style={{ padding: '10px 14px', fontWeight: 600, color: row.ctr > 0.02 ? '#10b981' : row.ctr > 0.01 ? 'var(--primary-container)' : '#ef4444', fontSize: 12 }}>{(row.ctr * 100).toFixed(2)}%</td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: row.position <= 3 ? '#10b981' : row.position <= 10 ? 'var(--primary-container)' : '#ef4444', fontSize: 12 }}>{row.position.toFixed(1)}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 10, background: `${opportunity.color}15`, color: opportunity.color, fontWeight: 600 }}>{opportunity.text}</span>
                          </td>
                        </tr>
                      );
                    })}
                    {sortedQueries.length === 0 && (
                      <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--on-surface-variant)' }}><Search size={28} style={{ opacity: 0.3, marginBottom: 8 }} /><div>Sin resultados</div></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── PAGES ── */}
        {activeTab === 'pages' && (
          <div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ position: 'relative', maxWidth: 400 }}>
                <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--on-surface-variant)' }} />
                <input type="text" placeholder="Buscar página..." value={search} onChange={e => setSearch(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px 10px 36px', borderRadius: 10, border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--on-surface)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--outline)' }}>
                      {['Página', 'Clics', 'Impr.', 'CTR', 'Pos.'].map(h => (
                        <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--on-surface-variant)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPages.map((row, i) => {
                      let displayUrl = row.page;
                      try { displayUrl = new URL(row.page).pathname; } catch(e) {}
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Link2 size={12} color="var(--on-surface-variant)" />
                              <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--on-surface)', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayUrl}</span>
                            </div>
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: '#4285f4', fontSize: 12 }}>{row.clicks.toLocaleString()}</td>
                          <td style={{ padding: '10px 14px', color: 'var(--on-surface-variant)', fontSize: 12 }}>{row.impressions.toLocaleString()}</td>
                          <td style={{ padding: '10px 14px', fontWeight: 600, color: row.ctr > 0.02 ? '#10b981' : row.ctr > 0.01 ? 'var(--primary-container)' : '#ef4444', fontSize: 12 }}>{(row.ctr * 100).toFixed(2)}%</td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: row.position <= 3 ? '#10b981' : row.position <= 10 ? 'var(--primary-container)' : '#ef4444', fontSize: 12 }}>{row.position.toFixed(1)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── DEVICES ── */}
        {activeTab === 'devices' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            <div className="glass-card" style={{ padding: 22 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: '#93c5fd', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Monitor size={15} /> Rendimiento por Dispositivo
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {deviceBreakdown.map((d, i) => {
                  const totalClicksAll = deviceBreakdown.reduce((s, x) => s + x.clicks, 0);
                  const share = totalClicksAll > 0 ? (d.clicks / totalClicksAll) : 0;
                  const colors = ['#4285f4', '#34a853', '#fbbc04'];
                  const icons = [Monitor, Smartphone, Tablet];
                  const Icon = icons[i] || Monitor;
                  return (
                    <div key={i} style={{ padding: 16, background: 'rgba(0,0,0,0.15)', borderRadius: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${colors[i]}18`, color: colors[i] }}>
                          <Icon size={20} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--on-surface)' }}>{d.device}</span>
                            <span style={{ fontWeight: 800, fontSize: 14, color: colors[i] }}>{(share * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ height: 6, background: 'var(--border-subtle)', borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
                        <div style={{ height: '100%', width: `${share * 100}%`, background: colors[i], borderRadius: 3, transition: 'width 0.8s ease-out' }} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                        <div style={{ textAlign: 'center' }}><div style={{ fontSize: 10, color: 'var(--on-surface-variant)', marginBottom: 2 }}>Clics</div><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--on-surface)' }}>{d.clicks.toLocaleString()}</div></div>
                        <div style={{ textAlign: 'center' }}><div style={{ fontSize: 10, color: 'var(--on-surface-variant)', marginBottom: 2 }}>CTR</div><div style={{ fontSize: 14, fontWeight: 700, color: d.ctr > 0.02 ? '#10b981' : 'var(--primary-container)' }}>{(d.ctr * 100).toFixed(2)}%</div></div>
                        <div style={{ textAlign: 'center' }}><div style={{ fontSize: 10, color: 'var(--on-surface-variant)', marginBottom: 2 }}>Pos.</div><div style={{ fontSize: 14, fontWeight: 700, color: d.position <= 5 ? '#10b981' : 'var(--primary-container)' }}>{d.position.toFixed(1)}</div></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="glass-card" style={{ padding: 22 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: '#93c5fd', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Globe size={15} /> Top 10 Países por Clics
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {countryBreakdown.slice(0, 10).map((c, i) => {
                  const maxClicks = Math.max(...countryBreakdown.slice(0, 10).map(x => x.clicks), 1);
                  const barW = (c.clicks / maxClicks) * 100;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'rgba(0,0,0,0.15)', borderRadius: 8 }}>
                      <div style={{ width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(66,133,244,0.1)', color: '#4285f4', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{c.country.slice(0, 2).toUpperCase()}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--on-surface)' }}>{c.country}</span>
                          <span style={{ fontWeight: 700, fontSize: 12, color: '#4285f4' }}>{c.clicks.toLocaleString()}</span>
                        </div>
                        <div style={{ height: 3, background: 'var(--border-subtle)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${barW}%`, background: '#4285f4', borderRadius: 2 }} />
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--on-surface)' }}>{(c.ctr * 100).toFixed(2)}%</div>
                        <div style={{ fontSize: 9, color: 'var(--on-surface-variant)' }}>CTR</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── OPPORTUNITIES ── */}
        {activeTab === 'opportunities' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="glass-card" style={{ padding: 22, background: 'rgba(66,133,244,0.03)', borderLeft: '3px solid #4285f4' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Lightbulb size={18} color="#4285f4" />
                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--on-surface)' }}>Oportunidades SEO Detectadas</span>
                <span style={{ fontSize: 11, color: 'var(--on-surface-variant)', background: 'var(--border-subtle)', padding: '2px 8px', borderRadius: 8 }}>
                  {highImpLowCtr.length + lowPosHighImpr.length + nearTop.length} hallazgos
                </span>
              </div>

              {/* High Impressions, Low CTR */}
              {highImpLowCtr.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 700, color: '#ea4335', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={14} /> Alta impresión, CTR bajo ({highImpLowCtr.length})
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
                    {highImpLowCtr.slice(0, 4).map((q, i) => (
                      <div key={i} style={{ padding: 14, background: 'rgba(0,0,0,0.2)', borderRadius: 10, border: '1px solid rgba(234,67,53,0.15)' }}>
                        <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--on-surface)', marginBottom: 4 }}>"{q.query}"</div>
                        <div style={{ fontSize: 10, color: 'var(--on-surface-variant)', marginBottom: 8 }}>{q.impressions.toLocaleString()} impr. · Pos. {q.position.toFixed(1)} · CTR {(q.ctr * 100).toFixed(2)}%</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ padding: '3px 8px', borderRadius: 8, background: 'rgba(234,67,53,0.15)', color: '#ea4335', fontSize: 9, fontWeight: 600 }}>Reescribir title/meta</span>
                          <span style={{ padding: '3px 8px', borderRadius: 8, background: 'rgba(245,158,11,0.15)', color: 'var(--primary-container)', fontSize: 9, fontWeight: 600 }}>Añadir schema</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Low Position, High Impressions */}
              {lowPosHighImpr.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-container)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <TrendingUp size={14} /> Posición baja, alta demanda ({lowPosHighImpr.length})
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
                    {lowPosHighImpr.slice(0, 4).map((q, i) => (
                      <div key={i} style={{ padding: 14, background: 'rgba(0,0,0,0.2)', borderRadius: 10, border: '1px solid rgba(245,158,11,0.15)' }}>
                        <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--on-surface)', marginBottom: 4 }}>"{q.query}"</div>
                        <div style={{ fontSize: 10, color: 'var(--on-surface-variant)', marginBottom: 8 }}>{q.impressions.toLocaleString()} impr. · Pos. {q.position.toFixed(1)}</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ padding: '3px 8px', borderRadius: 8, background: 'rgba(66,133,244,0.15)', color: '#4285f4', fontSize: 9, fontWeight: 600 }}>Crear contenido pillar</span>
                          <span style={{ padding: '3px 8px', borderRadius: 8, background: 'rgba(52,168,83,0.15)', color: '#34a853', fontSize: 9, fontWeight: 600 }}>Link building</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Near Top 3 */}
              {nearTop.length > 0 && (
                <div>
                  <h4 style={{ fontSize: 12, fontWeight: 700, color: '#4285f4', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Target size={14} /> Casi Top 3 — oportunidad de empuje ({nearTop.length})
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
                    {nearTop.slice(0, 4).map((q, i) => (
                      <div key={i} style={{ padding: 14, background: 'rgba(0,0,0,0.2)', borderRadius: 10, border: '1px solid rgba(66,133,244,0.15)' }}>
                        <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--on-surface)', marginBottom: 4 }}>"{q.query}"</div>
                        <div style={{ fontSize: 10, color: 'var(--on-surface-variant)', marginBottom: 8 }}>{q.impressions.toLocaleString()} impr. · Pos. {q.position.toFixed(1)} · CTR {(q.ctr * 100).toFixed(2)}%</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ padding: '3px 8px', borderRadius: 8, background: 'rgba(66,133,244,0.15)', color: '#4285f4', fontSize: 9, fontWeight: 600 }}>Optimizar contenido</span>
                          <span style={{ padding: '3px 8px', borderRadius: 8, background: 'rgba(52,168,83,0.15)', color: '#34a853', fontSize: 9, fontWeight: 600 }}>Aumentar backlinks</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {highImpLowCtr.length === 0 && lowPosHighImpr.length === 0 && nearTop.length === 0 && (
                <div style={{ padding: 30, textAlign: 'center', color: 'var(--on-surface-variant)', fontSize: 13 }}>
                  No se detectaron oportunidades críticas. Tu SEO está en buena ruta.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
