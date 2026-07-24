import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  FileText,
  Download,
  Eye,
  EyeOff,
  Settings,
  BarChart3,
  Megaphone,
  Music,
  Globe,
  ShoppingCart,
  Brain,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Layout,
  Printer,
  Sparkles,
} from 'lucide-react';
import '../report-responsive.css';

const TEMPLATES = {
  ejecutivo: {
    label: 'Reporte Ejecutivo',
    sections: ['header', 'executive', 'aiAnalysis', 'footer'],
  },
  completo: {
    label: 'Reporte Completo',
    sections: [
      'header',
      'executive',
      'meta',
      'google',
      'tiktok',
      'ga4',
      'gsc',
      'mc',
      'aiAnalysis',
      'footer',
    ],
  },
  publicidad: {
    label: 'Reporte Publicidad',
    sections: ['header', 'executive', 'meta', 'google', 'tiktok', 'footer'],
  },
};

const SECTION_META = {
  header: { label: 'Encabezado', icon: FileText },
  executive: { label: 'Resumen Ejecutivo', icon: BarChart3 },
  meta: { label: 'Meta Ads', icon: Megaphone },
  google: { label: 'Google Ads', icon: Megaphone },
  tiktok: { label: 'TikTok Ads', icon: Music },
  ga4: { label: 'Google Analytics 4', icon: Globe },
  gsc: { label: 'Search Console', icon: Globe },
  mc: { label: 'Merchant Center', icon: ShoppingCart },
  aiAnalysis: { label: 'Análisis IA', icon: Brain },
  footer: { label: 'Pie de página', icon: FileText },
};

const ALL_SECTIONS = [
  'header',
  'executive',
  'meta',
  'google',
  'tiktok',
  'ga4',
  'gsc',
  'mc',
  'aiAnalysis',
  'footer',
];

function formatCurrency(v) {
  if (v == null) return '$0';
  return '$' + Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatNumber(v) {
  if (v == null) return '0';
  return Number(v).toLocaleString('es-MX');
}

function formatPercent(v) {
  if (v == null) return '0%';
  return Number(v).toFixed(2) + '%';
}

function formatDuration(seconds) {
  if (!seconds) return '0s';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function getTopCampaigns(campaigns, n = 5) {
  if (!campaigns || !Array.isArray(campaigns)) return [];
  return [...campaigns]
    .sort((a, b) => (b.spend || b.cost || 0) - (a.spend || a.cost || 0))
    .slice(0, n);
}

const styles = {
  container: {
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    color: 'var(--on-surface, #e0e0e0)',
    minHeight: '100vh',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    borderBottom: '1px solid var(--border-subtle, #333)',
    background: 'var(--on-surface, #1a1a2e)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  toolbarTitle: {
    fontSize: '18px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  toolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  btn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    transition: 'all 0.2s',
  },
  btnPrimary: {
    background: '#6366f1',
    color: 'var(--on-surface)',
  },
  btnSecondary: {
    background: 'rgba(99,102,241,0.15)',
    color: '#a5b4fc',
    border: '1px solid rgba(99,102,241,0.3)',
  },
  btnGhost: {
    background: 'transparent',
    color: 'var(--on-surface-variant, #999)',
    border: '1px solid var(--border-subtle, #333)',
  },
  layout: {
    display: 'flex',
    minHeight: 'calc(100vh - 60px)',
  },
  sidebar: {
    width: '320px',
    minWidth: '320px',
    borderRight: '1px solid var(--border-subtle, #333)',
    padding: '20px',
    overflowY: 'auto',
    background: 'rgba(0,0,0,0.15)',
  },
  main: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
    background: 'var(--on-surface, #0f0f1a)',
  },
  sectionCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid var(--border-subtle, #333)',
    marginBottom: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    background: 'var(--surface-container-low)',
  },
  sectionCardActive: {
    borderColor: '#6366f1',
    background: 'rgba(99,102,241,0.08)',
  },
  toggle: {
    width: '40px',
    height: '22px',
    borderRadius: '11px',
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    transition: 'all 0.2s',
    flexShrink: 0,
  },
  toggleKnob: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    background: '#fff',
    position: 'absolute',
    top: '3px',
    transition: 'all 0.2s',
  },
  sectionLabel: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    fontWeight: 600,
  },
  thumbnail: {
    width: '36px',
    height: '28px',
    borderRadius: '4px',
    border: '1px solid var(--border-subtle, #333)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    background: 'var(--border-subtle)',
    flexShrink: 0,
  },
  templateBar: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  templateBtn: {
    padding: '8px 14px',
    borderRadius: '8px',
    border: '1px solid var(--border-subtle, #333)',
    background: 'var(--surface-container-low)',
    color: 'var(--on-surface-variant, #999)',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  titleInput: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid var(--border-subtle, #333)',
    background: 'var(--border-subtle)',
    color: 'var(--on-surface, #e0e0e0)',
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '16px',
    outline: 'none',
  },
  previewWrapper: {
    maxWidth: '900px',
    margin: '0 auto',
    background: '#fff',
    borderRadius: '8px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
    overflow: 'hidden',
  },
};

const previewStyles = `
  @media print {
    body * { visibility: hidden !important; }
    .report-preview, .report-preview * { visibility: visible !important; }
    .report-preview {
      position: absolute !important;
      left: 0 !important;
      top: 0 !important;
      width: 100% !important;
      box-shadow: none !important;
      border-radius: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    .report-preview .no-print { display: none !important; }
    .report-builder { display: none !important; }
    @page { margin: 0.5in; size: A4; }
    .report-section { page-break-inside: avoid; }
    .report-page-break { page-break-before: always; }
  }
`;

function Toggle({ active, onToggle }) {
  return (
    <button
      style={{
        ...styles.toggle,
        background: active ? '#6366f1' : '#444',
      }}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
    >
      <span
        style={{
          ...styles.toggleKnob,
          left: active ? '21px' : '3px',
        }}
      />
    </button>
  );
}

function SectionCard({ id, active, onToggle }) {
  const meta = SECTION_META[id];
  const Icon = meta.icon;
  return (
    <div
      style={{
        ...styles.sectionCard,
        ...(active ? styles.sectionCardActive : {}),
      }}
      onClick={onToggle}
    >
      <Toggle active={active} onToggle={onToggle} />
      <div style={styles.sectionLabel}>
        <Icon size={16} style={{ color: active ? '#6366f1' : '#666' }} />
        <span style={{ color: active ? '#e0e0e0' : '#777' }}>{meta.label}</span>
      </div>
      <div style={styles.thumbnail}>
        <Icon size={12} style={{ color: active ? '#6366f1' : '#555' }} />
      </div>
    </div>
  );
}

function KPICard({ label, value, color }) {
  return (
    <div className="report-kpi-card" style={{ borderColor: color, background: color + '10' }}>
      <div style={{ fontSize: 11, color: '#666', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div className="report-kpi-card-value">{value}</div>
    </div>
  );
}

function DataTable({ headers, rows }) {
  return (
    <div className="report-table-wrap">
      <table className="report-table">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci}>{cell}</td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={headers.length} className="report-empty-cell">
                Sin datos disponibles
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function SectionDivider({ title }) {
  return (
    <div className="report-divider">
      <h2>
        <span style={{ width: 4, height: 18, background: '#6366f1', borderRadius: 2, display: 'inline-block' }} />
        {title}
      </h2>
    </div>
  );
}

function HeaderSection({ title, dateRange }) {
  return (
    <div className="report-header-section">
      <div style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(255,255,255,0.15)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
        <FileText size={28} color="#fff" />
      </div>
      <h1>{title || 'Reporte de Marketing'}</h1>
      <p>{dateRange?.startDate || 'N/A'} — {dateRange?.endDate || 'N/A'}</p>
      <div style={{ marginTop: 12, fontSize: 10, opacity: 0.5, textTransform: 'uppercase', letterSpacing: '2px' }}>
        Análisis Integral de Plataformas
      </div>
    </div>
  );
}

function FooterSection() {
  return (
    <div className="report-footer">
      <p style={{ margin: 0 }}>
        Generado el {new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
      </p>
      <p style={{ margin: '4px 0 0', fontSize: 10, color: '#bbb' }}>
        © {new Date().getFullYear()} — Reporte generado automáticamente
      </p>
    </div>
  );
}

function ExecutiveSummary({ allData }) {
  const totalSpend = useMemo(() => {
    let sum = 0;
    if (allData?.metaInsights?.campaigns) {
      sum += allData.metaInsights.campaigns.reduce((a, c) => a + (c.spend || 0), 0);
    }
    if (allData?.googleAdsData?.campaigns) {
      sum += allData.googleAdsData.campaigns.reduce((a, c) => a + (c.cost || c.spend || 0), 0);
    }
    if (allData?.tiktokData?.campaigns) {
      sum += allData.tiktokData.campaigns.reduce((a, c) => a + (c.spend || 0), 0);
    }
    return sum;
  }, [allData]);

  const totalConversions = useMemo(() => {
    let sum = 0;
    if (allData?.metaInsights?.campaigns) {
      sum += allData.metaInsights.campaigns.reduce((a, c) => a + (c.conversions || c.results || 0), 0);
    }
    if (allData?.googleAdsData?.campaigns) {
      sum += allData.googleAdsData.campaigns.reduce((a, c) => a + (c.conversions || 0), 0);
    }
    if (allData?.tiktokData?.campaigns) {
      sum += allData.tiktokData.campaigns.reduce((a, c) => a + (c.conversions || 0), 0);
    }
    return sum;
  }, [allData]);

  const totalRevenue = useMemo(() => {
    let sum = 0;
    if (allData?.metaInsights?.campaigns) {
      sum += allData.metaInsights.campaigns.reduce((a, c) => a + (c.revenue || 0), 0);
    }
    if (allData?.googleAdsData?.campaigns) {
      sum += allData.googleAdsData.campaigns.reduce((a, c) => a + (c.revenue || 0), 0);
    }
    return sum;
  }, [allData]);

  const roas = totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : '0.00';
  const cpa = totalConversions > 0 ? (totalSpend / totalConversions).toFixed(2) : '0.00';

  return (
    <div className="report-section">
      <SectionDivider title="Resumen Ejecutivo" />
      <div style={{ padding: 20 }}>
        <div className="report-kpi-grid">
          <KPICard label="Gasto Total" value={formatCurrency(totalSpend)} color="#ef4444" />
          <KPICard label="Conversiones" value={formatNumber(totalConversions)} color="#22c55e" />
          <KPICard label="ROAS General" value={roas + 'x'} color="#3b82f6" />
          <KPICard label="CPA Promedio" value={formatCurrency(cpa)} color="#8b5cf6" />
        </div>
      </div>
    </div>
  );
}

function MetaSection({ data }) {
  const campaigns = getTopCampaigns(data?.campaigns);
  return (
    <div className="report-section">
      <SectionDivider title="Meta Ads" />
      <div style={{ padding: '24px' }}>
        <DataTable
          headers={['Campaña', 'Gasto', 'Impresiones', 'Clics', 'Conversiones', 'ROAS']}
          rows={campaigns.map((c) => [
            c.name || c.campaign_name || '-',
            formatCurrency(c.spend),
            formatNumber(c.impressions),
            formatNumber(c.clicks),
            formatNumber(c.conversions || c.results),
            c.roas ? c.roas.toFixed(2) + 'x' : '-',
          ])}
        />
      </div>
    </div>
  );
}

function GoogleSection({ data }) {
  const campaigns = getTopCampaigns(data?.campaigns);
  return (
    <div className="report-section">
      <SectionDivider title="Google Ads" />
      <div style={{ padding: '24px' }}>
        <DataTable
          headers={['Campaña', 'Gasto', 'Impresiones', 'Clics', 'Conversiones', 'ROAS']}
          rows={campaigns.map((c) => [
            c.name || c.campaign_name || '-',
            formatCurrency(c.cost || c.spend),
            formatNumber(c.impressions),
            formatNumber(c.clicks),
            formatNumber(c.conversions),
            c.roas ? c.roas.toFixed(2) + 'x' : '-',
          ])}
        />
      </div>
    </div>
  );
}

function TiktokSection({ data }) {
  const campaigns = getTopCampaigns(data?.campaigns);
  return (
    <div className="report-section">
      <SectionDivider title="TikTok Ads" />
      <div style={{ padding: '24px' }}>
        <DataTable
          headers={['Campaña', 'Gasto', 'Impresiones', 'Clics', 'Conversiones']}
          rows={campaigns.map((c) => [
            c.name || c.campaign_name || '-',
            formatCurrency(c.spend),
            formatNumber(c.impressions),
            formatNumber(c.clicks),
            formatNumber(c.conversions),
          ])}
        />
      </div>
    </div>
  );
}

function GA4Section({ data }) {
  const sessions = data?.global?.sessions || 0;
  const users = data?.global?.activeUsers || 0;
  const bounceRate = data?.global?.bounceRate || 0;
  const avgDuration = data?.global?.averageSessionDuration || 0;
  const totalRevenue = data?.ecommerce?.totalRevenue || 0;
  const totalPurchases = data?.ecommerce?.totalPurchases || 0;

  return (
    <div className="report-section">
      <SectionDivider title="Google Analytics 4" />
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <KPICard label="Sesiones" value={formatNumber(sessions)} color="#3b82f6" />
          <KPICard label="Usuarios Activos" value={formatNumber(users)} color="#22c55e" />
          <KPICard label="Tasa de Rebote" value={formatPercent(bounceRate)} color="#ef4444" />
          <KPICard label="Tiempo Promedio" value={formatDuration(avgDuration)} color="var(--primary-container)" />
        </div>
        {totalRevenue > 0 && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <KPICard label="Ingresos E-commerce" value={formatCurrency(totalRevenue)} color="#10b981" />
            <KPICard label="Compras" value={formatNumber(totalPurchases)} color="#8b5cf6" />
          </div>
        )}
        {data?.acquisition && data.acquisition.length > 0 && (
          <>
            <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: '#374151', fontWeight: 700 }}>Canales de Adquisición</h3>
            <DataTable
              headers={['Canal', 'Sesiones', 'Usuarios']}
              rows={data.acquisition.slice(0, 5).map((ch) => [
                ch.channel || '-',
                formatNumber(ch.sessions || 0),
                formatNumber(ch.activeUsers || 0),
              ])}
            />
          </>
        )}
      </div>
    </div>
  );
}

function GSCSection({ data }) {
  return (
    <div className="report-section">
      <SectionDivider title="Search Console" />
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <KPICard label="Impresiones" value={formatNumber(data?.totalImpressions || 0)} color="#3b82f6" />
          <KPICard label="Clics" value={formatNumber(data?.totalClicks || 0)} color="#22c55e" />
          <KPICard label="CTR" value={formatPercent(data?.avgCtr || 0)} color="var(--primary-container)" />
          <KPICard label="Posición Media" value={(data?.avgPosition || 0).toFixed(1)} color="#8b5cf6" />
        </div>
        {data?.topQueries && data.topQueries.length > 0 && (
          <>
            <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: '#374151', fontWeight: 700 }}>Top Consultas</h3>
            <DataTable
              headers={['Consulta', 'Impresiones', 'Clics', 'CTR', 'Posición']}
              rows={data.topQueries.slice(0, 10).map((q) => [
                q.query || q.queryText || '-',
                formatNumber(q.impressions),
                formatNumber(q.clicks),
                formatPercent(q.ctr),
                (q.position || q.averagePosition || 0).toFixed(1),
              ])}
            />
          </>
        )}
        {data?.topPages && data.topPages.length > 0 && (
          <>
            <h3 style={{ margin: '20px 0 12px', fontSize: '14px', color: '#374151', fontWeight: 700 }}>Top Páginas</h3>
            <DataTable
              headers={['Página', 'Impresiones', 'Clics', 'CTR', 'Posición']}
              rows={data.topPages.slice(0, 5).map((p) => [
                p.page || p.url || p.pageUrl || '-',
                formatNumber(p.impressions),
                formatNumber(p.clicks),
                formatPercent(p.ctr),
                (p.position || p.averagePosition || 0).toFixed(1),
              ])}
            />
          </>
        )}
      </div>
    </div>
  );
}

function MCSection({ data }) {
  const products = data?.products || data?.items || [];
  const sorted = [...products].sort((a, b) => (b.revenue || b.sales || 0) - (a.revenue || a.sales || 0)).slice(0, 5);
  return (
    <div className="report-section">
      <SectionDivider title="Merchant Center" />
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <KPICard label="Total Productos" value={formatNumber(products.length)} color="#3b82f6" />
          <KPICard label="Activos" value={formatNumber(products.filter((p) => p.status === 'active' || p.availability === 'in_stock').length)} color="#22c55e" />
        </div>
        <DataTable
          headers={['Producto', 'Precio', 'Impresiones', 'Clics', 'CTR']}
          rows={sorted.map((p) => [
            p.title || p.name || '-',
            formatCurrency(p.price || p.sellingPrice || 0),
            formatNumber(p.impressions || 0),
            formatNumber(p.clicks || 0),
            formatPercent(p.ctr || 0),
          ])}
        />
      </div>
    </div>
  );
}

function AIAnalysisSection({ allData }) {
  const insights = useMemo(() => {
    const points = [];
    const totalSpend =
      (allData?.metaInsights?.campaigns || []).reduce((a, c) => a + (c.spend || 0), 0) +
      (allData?.googleAdsData?.campaigns || []).reduce((a, c) => a + (c.cost || c.spend || 0), 0) +
      (allData?.tiktokData?.campaigns || []).reduce((a, c) => a + (c.spend || 0), 0);
    const totalConv =
      (allData?.metaInsights?.campaigns || []).reduce((a, c) => a + (c.conversions || c.results || 0), 0) +
      (allData?.googleAdsData?.campaigns || []).reduce((a, c) => a + (c.conversions || 0), 0) +
      (allData?.tiktokData?.campaigns || []).reduce((a, c) => a + (c.conversions || 0), 0);
    if (totalSpend > 0) {
      points.push(`Se invirtieron ${formatCurrency(totalSpend)} en total a través de todas las plataformas de publicidad.`);
    }
    if (totalConv > 0) {
      points.push(`Se generaron ${formatNumber(totalConv)} conversiones con un CPA promedio de ${formatCurrency(totalSpend / totalConv)}.`);
    }
    const metaCamps = allData?.metaInsights?.campaigns || [];
    if (metaCamps.length > 0) {
      const best = metaCamps.reduce((a, b) => ((a.roas || 0) > (b.roas || 0) ? a : b));
      if (best.roas) {
        points.push(`La campaña de Meta con mejor rendimiento "${best.name || best.campaign_name}" logró un ROAS de ${best.roas.toFixed(2)}x.`);
      }
    }
    const ga4 = allData?.ga4Insights;
    if (ga4?.global?.sessions > 0) {
      points.push(`Google Analytics reporta ${formatNumber(ga4.global.sessions)} sesiones con una tasa de rebote de ${formatPercent(ga4.global.bounceRate)}.`);
    }
    const gsc = allData?.gscPerformance;
    if (gsc?.avgCtr > 0) {
      points.push(`En Search Console, el CTR promedio es de ${formatPercent(gsc.avgCtr)} con posición media de ${(gsc.avgPosition || 0).toFixed(1)}.`);
    }
    if (points.length === 0) {
      points.push('No hay suficientes datos para generar análisis automático. Asegúrese de que las plataformas estén conectadas y con datos disponibles.');
    }
    return points;
  }, [allData]);

  return (
    <div className="report-section">
      <SectionDivider title="Análisis e Inteligencia" />
      <div style={{ padding: 20 }}>
        <div className="report-ai-box">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={16} color="#fff" />
            </div>
            <h3 style={{ margin: 0, fontSize: 15, color: '#1a1a2e', fontWeight: 700 }}>Conclusiones Automáticas</h3>
          </div>
          <ul className="report-ai-list">
            {insights.map((point, i) => (
              <li key={i}>
                <span style={{ color: '#6366f1', marginTop: 2, flexShrink: 0 }}>&#9656;</span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function ReportGenerator({ allData, dateRange }) {
  const [activeSections, setActiveSections] = useState(ALL_SECTIONS);
  const [reportTitle, setReportTitle] = useState('Reporte de Marketing Integral');
  const [showPreview, setShowPreview] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('completo');

  const toggleSection = useCallback((id) => {
    setActiveSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
    setSelectedTemplate(null);
  }, []);

  const applyTemplate = useCallback((key) => {
    setActiveSections(TEMPLATES[key].sections);
    setSelectedTemplate(key);
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const sortedSections = useMemo(
    () => ALL_SECTIONS.filter((s) => activeSections.includes(s)),
    [activeSections]
  );

  return (
    <div style={styles.container}>
      <style>{previewStyles}</style>

      <div className="report-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FileText size={20} style={{ color: '#6366f1' }} />
          <span className="report-toolbar-title">Generador de Reportes</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <button
            style={{ ...styles.btn, ...styles.btnGhost, fontSize: 12, padding: '6px 12px' }}
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
            <span className="btn-label-desktop">{showPreview ? 'Editor' : 'Vista Previa'}</span>
          </button>
          <button
            style={{ ...styles.btn, ...styles.btnSecondary, fontSize: 12, padding: '6px 12px' }}
            onClick={handlePrint}
          >
            <Printer size={14} />
            <span className="btn-label-desktop">Exportar PDF</span>
          </button>
        </div>
      </div>

      {!showPreview ? (
        <div className="report-layout">
          <div className="report-sidebar">
            <input
              className="report-title-input"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              placeholder="Título del reporte..."
            />

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--on-surface-variant, #999)', marginBottom: 8 }}>
                Plantillas
              </div>
              <div className="report-templates">
                {Object.entries(TEMPLATES).map(([key, tpl]) => (
                  <button
                    key={key}
                    className={`report-template-btn ${selectedTemplate === key ? 'active' : ''}`}
                    onClick={() => applyTemplate(key)}
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--on-surface-variant, #999)' }}>
                Secciones ({activeSections.length}/{ALL_SECTIONS.length})
              </div>
              <button
                style={{
                  ...styles.btn,
                  padding: '3px 8px',
                  fontSize: 11,
                  background: 'transparent',
                  color: '#6366f1',
                  border: 'none',
                }}
                onClick={() => {
                  if (activeSections.length === ALL_SECTIONS.length) {
                    setActiveSections([]);
                  } else {
                    setActiveSections([...ALL_SECTIONS]);
                  }
                  setSelectedTemplate(null);
                }}
              >
                {activeSections.length === ALL_SECTIONS.length ? 'Ocultar' : 'Mostrar todas'}
              </button>
            </div>

            {ALL_SECTIONS.map((id) => {
              const meta = SECTION_META[id];
              const Icon = meta.icon;
              const active = activeSections.includes(id);
              return (
                <div
                  key={id}
                  className={`report-section-card ${active ? 'active' : ''}`}
                  onClick={() => toggleSection(id)}
                >
                  <button
                    className="report-section-toggle"
                    style={{ background: active ? '#6366f1' : '#444' }}
                    onClick={(e) => { e.stopPropagation(); toggleSection(id); }}
                  >
                    <span className="report-section-toggle-knob" style={{ left: active ? '19px' : '3px' }} />
                  </button>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
                    <Icon size={15} style={{ color: active ? '#6366f1' : '#666' }} />
                    <span style={{ color: active ? '#e0e0e0' : '#777' }}>{meta.label}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="report-main">
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--on-surface-variant, #999)' }}>
              <Eye size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
              <p style={{ fontSize: 16, fontWeight: 600 }}>Vista previa del reporte</p>
              <p style={{ fontSize: 13, opacity: 0.6 }}>Active las secciones y haga clic en "Vista Previa"</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="report-preview-container">
          <div className="report-preview-wrapper report-preview">
            {sortedSections.includes('header') && (
              <HeaderSection title={reportTitle} dateRange={dateRange} />
            )}
            {sortedSections.includes('executive') && (
              <ExecutiveSummary allData={allData} />
            )}
            {sortedSections.includes('meta') && (
              <MetaSection data={allData?.metaInsights} />
            )}
            {sortedSections.includes('google') && (
              <GoogleSection data={allData?.googleAdsData} />
            )}
            {sortedSections.includes('tiktok') && (
              <TiktokSection data={allData?.tiktokData} />
            )}
            {sortedSections.includes('ga4') && (
              <GA4Section data={allData?.ga4Insights} />
            )}
            {sortedSections.includes('gsc') && (
              <GSCSection data={allData?.gscPerformance} />
            )}
            {sortedSections.includes('mc') && (
              <MCSection data={allData?.mcProducts} />
            )}
            {sortedSections.includes('aiAnalysis') && (
              <AIAnalysisSection allData={allData} />
            )}
            {sortedSections.includes('footer') && (
              <FooterSection />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
