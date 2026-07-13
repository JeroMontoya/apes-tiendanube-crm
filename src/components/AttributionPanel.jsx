import { useState } from 'react';
import {
  Target,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Award,
  AlertTriangle,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Search,
  Zap,
  Trophy,
  Medal,
  ChevronDown,
  ChevronRight,
  PieChart,
  Activity,
  RefreshCw
} from 'lucide-react';

function matchLeadsToCampaigns(clients, campaigns) {
  const matchMap = {};
  campaigns.forEach(c => {
    const name = (c.name || '').toLowerCase().trim();
    if (!name) return;
    matchMap[name] = { ...c, leads: [], revenue: 0 };
  });
  clients.forEach(client => {
    const clientSource = (client.leadSource || client.campaignSource || client.source || '').toLowerCase().trim();
    if (!clientSource) return;
    let bestMatch = null;
    let bestScore = 0;
    Object.keys(matchMap).forEach(campaignKey => {
      const campaignWords = campaignKey.split(/[\s_\-\/]+/).filter(Boolean);
      const clientWords = clientSource.split(/[\s_\-\/]+/).filter(Boolean);
      let score = 0;
      campaignWords.forEach(cw => {
        clientWords.forEach(cw2 => {
          if (cw2.includes(cw) || cw.includes(cw2)) score += 1;
          else if (cw2.length > 3 && cw.length > 3) {
            let matching = 0;
            const minLen = Math.min(cw.length, cw2.length);
            for (let i = 0; i < minLen; i++) {
              if (cw[i] === cw2[i]) matching++;
              else break;
            }
            if (matching >= 3) score += matching * 0.5;
          }
        });
      });
      if (clientSource.includes(campaignKey) || campaignKey.includes(clientSource)) score += 5;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = campaignKey;
      }
    });
    if (bestMatch && bestScore >= 1) {
      matchMap[bestMatch].leads.push(client);
      matchMap[bestMatch].revenue += client.revenue || client.totalSpent || 0;
    }
  });
  return Object.values(matchMap);
}

function calculateAttributedRevenue(clients, campaignName) {
  const nameLower = (campaignName || '').toLowerCase().trim();
  return clients
    .filter(c => {
      const src = (c.leadSource || c.campaignSource || c.source || '').toLowerCase();
      return src.includes(nameLower) || nameLower.includes(src);
    })
    .reduce((sum, c) => sum + (c.revenue || c.totalSpent || 0), 0);
}

function getRealROAS(revenue, spend) {
  if (!spend || spend === 0) return 0;
  return revenue / spend;
}

function getStatusBadge(roas) {
  if (roas > 4) return { label: 'Excelente', color: '#10b981' };
  if (roas >= 2) return { label: 'Bueno', color: '#f59e0b' };
  return { label: 'Necesita Optimización', color: '#ef4444' };
}

const styles = {
  container: {
    backgroundColor: '#0f1117',
    minHeight: '100vh',
    color: '#e2e8f0',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    padding: '24px',
    boxSizing: 'border-box'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '12px'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  iconBox: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#f8fafc',
    margin: 0
  },
  subtitle: {
    fontSize: '13px',
    color: '#94a3b8',
    margin: 0
  },
  refreshBtn: {
    background: 'rgba(99, 102, 241, 0.15)',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    color: '#6366f1',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'all 0.2s'
  },
  heroSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '28px',
    padding: '32px',
    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.05))',
    borderRadius: '16px',
    border: '1px solid rgba(99, 102, 241, 0.15)',
    position: 'relative',
    overflow: 'hidden'
  },
  gaugeContainer: {
    position: 'relative',
    width: '200px',
    height: '200px'
  },
  gaugeSvg: {
    width: '200px',
    height: '200px',
    transform: 'rotate(-90deg)'
  },
  gaugeBgCircle: {
    fill: 'none',
    stroke: '#1e293b',
    strokeWidth: '12'
  },
  gaugeFillCircle: {
    fill: 'none',
    strokeWidth: '12',
    strokeLinecap: 'round',
    transition: 'stroke-dashoffset 1s ease, stroke 0.5s ease'
  },
  gaugeCenter: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center'
  },
  gaugeValue: {
    fontSize: '36px',
    fontWeight: 800,
    lineHeight: 1
  },
  gaugeLabel: {
    fontSize: '11px',
    color: '#94a3b8',
    marginTop: '4px',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  },
  gaugeStatus: {
    fontSize: '14px',
    fontWeight: 600,
    marginTop: '8px'
  },
  heroInfo: {
    marginLeft: '48px'
  },
  heroTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#f8fafc',
    marginBottom: '8px'
  },
  heroDesc: {
    fontSize: '13px',
    color: '#94a3b8',
    lineHeight: 1.6,
    maxWidth: '400px'
  },
  summaryRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginBottom: '28px'
  },
  summaryCard: {
    background: '#1a1d27',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid rgba(255,255,255,0.06)',
    transition: 'all 0.2s'
  },
  summaryCardIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '12px'
  },
  summaryCardValue: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#f8fafc',
    marginBottom: '4px'
  },
  summaryCardLabel: {
    fontSize: '12px',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  tabsContainer: {
    display: 'flex',
    gap: '4px',
    marginBottom: '20px',
    background: '#1a1d27',
    borderRadius: '12px',
    padding: '4px',
    border: '1px solid rgba(255,255,255,0.06)',
    flexWrap: 'wrap'
  },
  tab: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    whiteSpace: 'nowrap'
  },
  tabActive: {
    background: '#6366f1',
    color: '#ffffff'
  },
  tabInactive: {
    background: 'transparent',
    color: '#94a3b8'
  },
  tableContainer: {
    background: '#1a1d27',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.06)',
    overflow: 'hidden',
    marginBottom: '28px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    padding: '14px 16px',
    textAlign: 'left',
    fontSize: '11px',
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap'
  },
  td: {
    padding: '14px 16px',
    fontSize: '13px',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
    whiteSpace: 'nowrap'
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 600
  },
  funnelSection: {
    marginBottom: '28px'
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#f8fafc',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  funnelContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0',
    padding: '24px 16px',
    background: '#1a1d27',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.06)',
    overflowX: 'auto'
  },
  funnelStage: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
    minWidth: '120px'
  },
  funnelBar: (width, color) => ({
    width: `${Math.max(width, 40)}px`,
    height: '48px',
    borderRadius: '8px',
    background: `linear-gradient(135deg, ${color}, ${color}dd)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 600,
    color: '#ffffff',
    transition: 'all 0.3s',
    position: 'relative'
  }),
  funnelLabel: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '8px',
    textAlign: 'center'
  },
  funnelValue: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#f8fafc',
    marginTop: '2px'
  },
  funnelArrow: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '0 4px',
    minWidth: '80px'
  },
  funnelRate: {
    fontSize: '11px',
    color: '#6366f1',
    fontWeight: 600
  },
  funnelRateLabel: {
    fontSize: '9px',
    color: '#64748b',
    textTransform: 'uppercase'
  },
  campaignsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
    gap: '20px',
    marginBottom: '28px'
  },
  campaignsPanel: {
    background: '#1a1d27',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.06)',
    overflow: 'hidden'
  },
  campaignsPanelHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  campaignItem: {
    padding: '14px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px'
  },
  campaignName: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#e2e8f0'
  },
  campaignMetric: {
    fontSize: '11px',
    color: '#94a3b8',
    marginTop: '2px'
  },
  rankBadge: (color) => ({
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: `${color}22`,
    color: color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 700,
    flexShrink: 0
  }),
  suggestionsBox: {
    background: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '8px',
    padding: '12px 16px',
    marginTop: '8px'
  },
  suggestionText: {
    fontSize: '12px',
    color: '#fca5a5',
    lineHeight: 1.5
  },
  emptyState: {
    padding: '48px 24px',
    textAlign: 'center',
    color: '#64748b'
  },
  sortIndicator: {
    marginLeft: '4px',
    opacity: 0.6
  },
  searchInput: {
    background: '#0f1117',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '8px 12px 8px 36px',
    color: '#e2e8f0',
    fontSize: '13px',
    outline: 'none',
    width: '200px',
    transition: 'border-color 0.2s'
  },
  searchWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  searchIcon: {
    position: 'absolute',
    left: '10px',
    color: '#64748b'
  },
  controlsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '12px'
  },
  tooltip: {
    background: '#1e293b',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '11px',
    color: '#e2e8f0',
    position: 'absolute',
    zIndex: 10,
    whiteSpace: 'nowrap',
    pointerEvents: 'none'
  }
};

export default function AttributionPanel({ clients = [], metaInsights = { campaigns: [] }, googleAdsData = { campaigns: [] }, tiktokData = { campaigns: [] }, dateRange = {} }) {
  const [activeTab, setActiveTab] = useState('resumen');
  const [sortBy, setSortBy] = useState('roas');
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');

  const metaCampaigns = (metaInsights?.campaigns || []).map(c => ({
    name: c.name,
    impressions: c.impressions || 0,
    clicks: c.clicks || 0,
    spend: c.spend || 0,
    conversions: c.conversions || 0,
    cpa: c.cpa || 0,
    roas: c.roas || 0,
    platform: 'Meta'
  }));

  const googleCampaigns = (googleAdsData?.campaigns || []).map(c => ({
    name: c.name,
    impressions: c.impressions || 0,
    clicks: c.clicks || 0,
    spend: c.cost || 0,
    conversions: c.conversions || 0,
    cpa: (c.cost && c.conversions) ? c.cost / c.conversions : 0,
    roas: c.roas || 0,
    platform: 'Google'
  }));

  const tiktokCampaigns = (tiktokData?.campaigns || []).map(c => ({
    name: c.name,
    impressions: c.impressions || 0,
    clicks: c.clicks || 0,
    spend: c.spend || 0,
    conversions: c.conversions || 0,
    cpa: c.cpa || 0,
    roas: c.roas || 0,
    platform: 'TikTok'
  }));

  const allCampaigns = [...metaCampaigns, ...googleCampaigns, ...tiktokCampaigns];

  const matchedMeta = matchLeadsToCampaigns(clients, metaCampaigns);
  const matchedGoogle = matchLeadsToCampaigns(clients, googleCampaigns);
  const matchedTiktok = matchLeadsToCampaigns(clients, tiktokCampaigns);
  const matchedAll = [...matchedMeta, ...matchedGoogle, ...matchedTiktok];

  const enrichCampaigns = (campaigns) => {
    return campaigns.map(c => {
      const matched = matchLeadsToCampaigns(clients, [c])[0] || { leads: [], revenue: 0 };
      const realRevenue = matched.revenue || 0;
      const dealCount = matched.leads.filter(l => l.status === 'won' || l.funnelStage === 'closed' || l.funnelStage === 'won').length;
      const realRoas = getRealROAS(realRevenue, c.spend);
      const realCpa = dealCount > 0 ? c.spend / dealCount : c.spend > 0 ? c.spend : 0;
      return {
        ...c,
        leads: matched.leads.length,
        attributedRevenue: realRevenue,
        realRoas,
        realCpa,
        deals: dealCount,
        status: getStatusBadge(realRoas)
      };
    });
  };

  const enrichedMeta = enrichCampaigns(metaCampaigns);
  const enrichedGoogle = enrichCampaigns(googleCampaigns);
  const enrichedTiktok = enrichCampaigns(tiktokCampaigns);
  const enrichedAll = [...enrichedMeta, ...enrichedGoogle, ...enrichedTiktok];

  const filterAndSort = (list) => {
    let filtered = list;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c => (c.name || '').toLowerCase().includes(q));
    }
    filtered.sort((a, b) => {
      let aVal = a[sortBy] || 0;
      let bVal = b[sortBy] || 0;
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (sortOrder === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
    return filtered;
  };

  const totalSpend = enrichedAll.reduce((s, c) => s + c.spend, 0);
  const totalRevenue = enrichedAll.reduce((s, c) => s + c.attributedRevenue, 0);
  const totalLeads = enrichedAll.reduce((s, c) => s + c.leads, 0);
  const totalDeals = enrichedAll.reduce((s, c) => s + c.deals, 0);
  const overallRoas = getRealROAS(totalRevenue, totalSpend);
  const overallCpa = totalDeals > 0 ? totalSpend / totalDeals : 0;
  const overallStatus = getStatusBadge(overallRoas);

  const totalImpressions = enrichedAll.reduce((s, c) => s + (c.impressions || 0), 0);
  const totalClicks = enrichedAll.reduce((s, c) => s + (c.clicks || 0), 0);
  const totalConversions = enrichedAll.reduce((s, c) => s + (c.conversions || 0), 0);

  const funnelData = [
    { label: 'Impressions', value: totalImpressions, color: '#6366f1' },
    { label: 'Clicks', value: totalClicks, color: '#8b5cf6' },
    { label: 'Leads', value: totalLeads, color: '#a78bfa' },
    { label: 'Deals', value: totalDeals, color: '#10b981' },
    { label: 'Revenue', value: totalRevenue, color: '#f59e0b', isCurrency: true }
  ];

  const funnelMax = Math.max(...funnelData.map(f => f.value), 1);

  const topCampaigns = [...enrichedAll]
    .filter(c => c.realRoas > 0)
    .sort((a, b) => b.realRoas - a.realRoas)
    .slice(0, 5);

  const underperforming = enrichedAll.filter(c => c.realRoas > 0 && c.realRoas < 1);

  const getSuggestion = (campaign) => {
    const suggestions = [];
    if (campaign.realRoas < 1) suggestions.push('ROAS por debajo de 1x. Revisar segmentación y creativos.');
    if (campaign.leads > 0 && campaign.deals === 0) suggestions.push(`${campaign.leads} leads sin cerrar. Evaluar calidad del lead y follow-up.`);
    if (campaign.cpa > 0 && campaign.realCpa > campaign.cpa * 1.5) suggestions.push(`CPA real ${((campaign.realCpa / campaign.cpa - 1) * 100).toFixed(0)}% sobre el reportado.`);
    if (campaign.clicks > 0 && campaign.leads === 0) suggestions.push('Clicks sin leads. Revisar landing page y offer.');
    if (suggestions.length === 0) suggestions.push('Optimizar segmentación y testear nuevos creativos.');
    return suggestions;
  };

  const getCurrency = (val) => {
    return `$${val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const getPercent = (val) => {
    return `${(val * 100).toFixed(1)}%`;
  };

  const renderSortIcon = (field) => {
    if (sortBy !== field) return null;
    return <span style={styles.sortIndicator}>{sortOrder === 'desc' ? '↓' : '↑'}</span>;
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const gaugeRadius = 80;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const gaugeMaxRoas = 8;
  const gaugeProgress = Math.min(overallRoas / gaugeMaxRoas, 1);
  const gaugeOffset = gaugeCircumference * (1 - gaugeProgress);

  const tabConfig = [
    { key: 'resumen', label: 'Resumen', icon: <BarChart3 size={14} /> },
    { key: 'meta', label: 'Meta', icon: <PieChart size={14} /> },
    { key: 'google', label: 'Google', icon: <Activity size={14} /> },
    { key: 'tiktok', label: 'TikTok', icon: <Zap size={14} /> }
  ];

  const getTabData = () => {
    switch (activeTab) {
      case 'meta': return filterAndSort(enrichedMeta);
      case 'google': return filterAndSort(enrichedGoogle);
      case 'tiktok': return filterAndSort(enrichedTiktok);
      default: return filterAndSort(enrichedAll);
    }
  };

  const tabData = getTabData();

  const summaryCards = [
    { label: 'Total Inversión', value: getCurrency(totalSpend), icon: <DollarSign size={18} />, color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
    { label: 'Revenue Atribuido', value: getCurrency(totalRevenue), icon: <TrendingUp size={18} />, color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
    { label: 'ROAS Real', value: `${overallRoas.toFixed(2)}x`, icon: <Target size={18} />, color: overallStatus.color, bg: `${overallStatus.color}22` },
    { label: 'Total Leads', value: totalLeads.toLocaleString(), icon: <Users size={18} />, color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
    { label: 'Deals Cerrados', value: totalDeals.toLocaleString(), icon: <Award size={18} />, color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
    { label: 'CPA Real', value: getCurrency(overallCpa), icon: <AlertTriangle size={18} />, color: '#ef4444', bg: 'rgba(239,68,68,0.15)' }
  ];

  const rankColors = ['#f59e0b', '#94a3b8', '#cd7f32', '#6366f1', '#10b981'];
  const rankLabels = ['Oro', 'Plata', 'Bronce', '4to', '5to'];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.iconBox}>
            <Target size={22} color="#ffffff" />
          </div>
          <div>
            <h1 style={styles.title}>Marketing Attribution</h1>
            <p style={styles.subtitle}>ROAS real por campaña - Cruce de ad spend con deals cerrados</p>
          </div>
        </div>
        {dateRange.startDate && dateRange.endDate && (
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            {dateRange.startDate} — {dateRange.endDate}
          </div>
        )}
        <button style={styles.refreshBtn} onClick={() => window.location.reload()}>
          <RefreshCw size={14} />
          Actualizar
        </button>
      </div>

      <div style={styles.heroSection}>
        <div style={styles.gaugeContainer}>
          <svg style={styles.gaugeSvg} viewBox="0 0 200 200">
            <circle cx="100" cy="100" r={gaugeRadius} style={styles.gaugeBgCircle} />
            <circle
              cx="100"
              cy="100"
              r={gaugeRadius}
              style={{
                ...styles.gaugeFillCircle,
                stroke: overallStatus.color,
                strokeDasharray: gaugeCircumference,
                strokeDashoffset: gaugeOffset
              }}
            />
          </svg>
          <div style={styles.gaugeCenter}>
            <div style={{ ...styles.gaugeValue, color: overallStatus.color }}>
              {overallRoas.toFixed(2)}x
            </div>
            <div style={styles.gaugeLabel}>ROAS Real</div>
            <div style={{ ...styles.gaugeStatus, color: overallStatus.color }}>
              {overallStatus.label}
            </div>
          </div>
        </div>
        <div style={styles.heroInfo}>
          <h2 style={styles.heroTitle}>Retorno Real de Inversión Publicitaria</h2>
          <p style={styles.heroDesc}>
            Este panel cruza los datos de gasto publicitario de Meta, Google y TikTok con los deals realmente cerrados en tu CRM. 
            El ROAS que ves aquí es el ROAS real, no el reportado por las plataformas.
          </p>
        </div>
      </div>

      <div style={styles.summaryRow}>
        {summaryCards.map((card, i) => (
          <div key={i} style={styles.summaryCard}>
            <div style={{ ...styles.summaryCardIcon, background: card.bg, color: card.color }}>
              {card.icon}
            </div>
            <div style={styles.summaryCardValue}>{card.value}</div>
            <div style={styles.summaryCardLabel}>{card.label}</div>
          </div>
        ))}
      </div>

      <div style={styles.funnelSection}>
        <h3 style={styles.sectionTitle}>
          <Activity size={18} color="#6366f1" />
          Attribution Funnel
        </h3>
        <div style={styles.funnelContainer}>
          {funnelData.map((stage, i) => {
            const barWidth = Math.max((stage.value / funnelMax) * 160, 60);
            const nextStage = funnelData[i + 1];
            const convRate = nextStage && stage.value > 0 ? nextStage.value / stage.value : 0;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={styles.funnelStage}>
                  <div style={styles.funnelBar(barWidth, stage.color)}>
                    {stage.isCurrency ? getCurrency(stage.value) : stage.value.toLocaleString()}
                  </div>
                  <div style={styles.funnelLabel}>{stage.label}</div>
                </div>
                {i < funnelData.length - 1 && (
                  <div style={styles.funnelArrow}>
                    <div style={styles.funnelRate}>{getPercent(convRate)}</div>
                    <ChevronRight size={14} color="#6366f1" />
                    <div style={styles.funnelRateLabel}>conv.</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={styles.controlsRow}>
        <div style={styles.tabsContainer}>
          {tabConfig.map(tab => (
            <button
              key={tab.key}
              style={{
                ...styles.tab,
                ...(activeTab === tab.key ? styles.tabActive : styles.tabInactive)
              }}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.icon}
              {tab.label}
              <span style={{
                background: activeTab === tab.key ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)',
                padding: '2px 6px',
                borderRadius: '10px',
                fontSize: '10px',
                fontWeight: 600
              }}>
                {tab.key === 'resumen' ? enrichedAll.length :
                 tab.key === 'meta' ? enrichedMeta.length :
                 tab.key === 'google' ? enrichedGoogle.length :
                 enrichedTiktok.length}
              </span>
            </button>
          ))}
        </div>
        <div style={styles.searchWrapper}>
          <Search size={14} style={styles.searchIcon} />
          <input
            style={styles.searchInput}
            placeholder="Buscar campaña..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th} onClick={() => handleSort('name')}>Campaña{renderSortIcon('name')}</th>
              {activeTab === 'resumen' && <th style={styles.th} onClick={() => handleSort('platform')}>Plataforma{renderSortIcon('platform')}</th>}
              <th style={styles.th} onClick={() => handleSort('spend')}>Inversión{renderSortIcon('spend')}</th>
              <th style={styles.th} onClick={() => handleSort('leads')}>Leads{renderSortIcon('leads')}</th>
              <th style={styles.th} onClick={() => handleSort('deals')}>Deals{renderSortIcon('deals')}</th>
              <th style={styles.th} onClick={() => handleSort('attributedRevenue')}>Revenue Atribuido{renderSortIcon('attributedRevenue')}</th>
              <th style={styles.th} onClick={() => handleSort('realRoas')}>ROAS Real{renderSortIcon('realRoas')}</th>
              <th style={styles.th} onClick={() => handleSort('realCpa')}>CPA Real{renderSortIcon('realCpa')}</th>
              <th style={styles.th}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {tabData.length === 0 ? (
              <tr>
                <td colSpan={activeTab === 'resumen' ? 9 : 8} style={styles.emptyState}>
                  <Filter size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
                  No hay campañas para mostrar
                </td>
              </tr>
            ) : (
              tabData.map((campaign, i) => (
                <tr key={i} style={{ background: campaign.realRoas < 1 && campaign.realRoas > 0 ? 'rgba(239,68,68,0.04)' : 'transparent' }}>
                  <td style={styles.td}>
                    <div style={styles.campaignName}>{campaign.name}</div>
                  </td>
                  {activeTab === 'resumen' && (
                    <td style={styles.td}>
                      <span style={{
                        ...styles.badge,
                        background: campaign.platform === 'Meta' ? 'rgba(99,102,241,0.15)' :
                                   campaign.platform === 'Google' ? 'rgba(16,185,129,0.15)' :
                                   'rgba(239,68,68,0.15)',
                        color: campaign.platform === 'Meta' ? '#6366f1' :
                               campaign.platform === 'Google' ? '#10b981' :
                               '#ef4444'
                      }}>
                        {campaign.platform}
                      </span>
                    </td>
                  )}
                  <td style={styles.td}>{getCurrency(campaign.spend)}</td>
                  <td style={styles.td}>{campaign.leads}</td>
                  <td style={styles.td}>{campaign.deals}</td>
                  <td style={{ ...styles.td, fontWeight: 600, color: campaign.attributedRevenue > 0 ? '#10b981' : '#64748b' }}>
                    {getCurrency(campaign.attributedRevenue)}
                  </td>
                  <td style={styles.td}>
                    <span style={{ fontWeight: 700, color: campaign.status.color }}>
                      {campaign.realRoas > 0 ? `${campaign.realRoas.toFixed(2)}x` : '—'}
                    </span>
                  </td>
                  <td style={styles.td}>{campaign.realCpa > 0 ? getCurrency(campaign.realCpa) : '—'}</td>
                  <td style={styles.td}>
                    {campaign.realRoas > 0 ? (
                      <span style={{ ...styles.badge, background: `${campaign.status.color}22`, color: campaign.status.color }}>
                        {campaign.realRoas > 2 ? <ArrowUpRight size={12} /> : campaign.realRoas < 1 ? <ArrowDownRight size={12} /> : null}
                        {campaign.status.label}
                      </span>
                    ) : (
                      <span style={{ ...styles.badge, background: 'rgba(100,116,139,0.15)', color: '#64748b' }}>
                        Sin datos
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={styles.campaignsGrid}>
        <div style={styles.campaignsPanel}>
          <div style={styles.campaignsPanelHeader}>
            <Trophy size={18} color="#f59e0b" />
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Top Campañas por ROAS</h3>
          </div>
          {topCampaigns.length === 0 ? (
            <div style={styles.emptyState}>No hay datos suficientes</div>
          ) : (
            topCampaigns.map((campaign, i) => (
              <div key={i} style={styles.campaignItem}>
                <div style={styles.rankBadge(rankColors[i])}>
                  {i < 3 ? <Medal size={14} /> : i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={styles.campaignName}>{campaign.name}</div>
                  <div style={styles.campaignMetric}>
                    {campaign.platform} · {campaign.leads} leads · {campaign.deals} deals
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: rankColors[i] }}>
                    {campaign.realRoas.toFixed(2)}x
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    {getCurrency(campaign.attributedRevenue)} revenue
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={styles.campaignsPanel}>
          <div style={styles.campaignsPanelHeader}>
            <AlertTriangle size={18} color="#ef4444" />
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Campañas Underperforming</h3>
          </div>
          {underperforming.length === 0 ? (
            <div style={{ ...styles.emptyState, color: '#10b981' }}>
              <Award size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.5 }} />
              Todas las campañas tienen ROAS ≥ 1
            </div>
          ) : (
            underperforming.map((campaign, i) => (
              <div key={i} style={styles.campaignItem}>
                <div style={{ ...styles.rankBadge('#ef4444') }}>
                  <TrendingDown size={14} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={styles.campaignName}>{campaign.name}</div>
                  <div style={styles.campaignMetric}>
                    {campaign.platform} · ROAS {campaign.realRoas.toFixed(2)}x · {getCurrency(campaign.spend)} invertido
                  </div>
                  <div style={styles.suggestionsBox}>
                    {getSuggestion(campaign).map((s, j) => (
                      <div key={j} style={styles.suggestionText}>• {s}</div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
