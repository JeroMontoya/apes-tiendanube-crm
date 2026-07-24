import React, { useState, Suspense, lazy } from 'react';
import { 
  Layers, Brain, BarChart, Globe, Target, Search, ShoppingCart, 
  ShoppingBag, TrendingUp, Music, FileText, MessageSquare, 
  Shield, Link, Percent, Zap, Camera, Database, Activity 
} from 'lucide-react';

const SuperDashboard = lazy(() => import('./panels/SuperDashboard'));
const MarketingReport = lazy(() => import('./MarketingReport'));
const BrandIntelligenceCenter = lazy(() => import('./BrandIntelligenceCenter'));
const InstagramPanel = lazy(() => import('./panels/InstagramPanel'));
const SyncLogsPanel = lazy(() => import('./panels/SyncLogsPanel'));

const TABS = [
  { id: 'super_dashboard', label: 'Visión 360°', icon: Layers },
  { id: 'tiendanube_stats', label: 'Estadísticas TN', icon: ShoppingBag },
  { id: 'brand_intelligence', label: 'Inteligencia', icon: Brain },
  { id: 'instagram', label: 'Instagram', icon: Camera },
  { id: 'sync_logs', label: 'Sync & Logs', icon: Database },
  { id: 'analitica', label: 'Analítica', icon: BarChart },
  { id: 'ga4', label: 'Google Analytics', icon: Globe },
  { id: 'meta_ads', label: 'Meta Ads', icon: TrendingUp },
  { id: 'google_ads', label: 'Google Ads', icon: Target },
  { id: 'tiktok_ads', label: 'TikTok Ads', icon: Music },
  { id: 'search_console', label: 'Search Console', icon: Search },
  { id: 'merchant_center', label: 'Merchant Center', icon: ShoppingCart },
  { id: 'inteligencia_competitiva', label: 'Competencia', icon: Shield },
  { id: 'utm_builder', label: 'UTM Builder', icon: Link },
  { id: 'cro_analyzer', label: 'CRO Analyzer', icon: Percent },
  { id: 'hot_leads', label: 'Leads Calientes', icon: Zap },
  { id: 'predictive_intelligence', label: 'Predictive Engine', icon: Brain },
  { id: 'ia_chat', label: 'Asistente IA', icon: MessageSquare },
];

const S = {
  container: { padding: '24px', animation: 'fadeIn 0.5s ease', minHeight: '100vh', background: 'var(--surface-lowest, #0f1117)' },
  tabBar: { 
    display: 'flex', gap: 6, marginBottom: 24, padding: '4px',
    background: 'var(--surface-container, #1a1d27)', borderRadius: 12, overflowX: 'auto' 
  },
  tabButton: (active) => ({
    display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
    borderRadius: 8, border: 'none', 
    background: active ? 'linear-gradient(135deg, #3D5A99, #6366f1)' : 'transparent',
    color: active ? '#ffffff' : 'var(--on-surface-variant, #8b8fa3)',
    cursor: 'pointer', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
    transition: 'all 0.2s', fontFamily: 'Inter, sans-serif'
  }),
  loader: {
    padding: 50, textAlign: 'center', color: 'var(--on-surface-variant)', fontSize: 12
  }
};

export default function MarketingCommandCenter({
  ga4Insights, gscPerformance, mcProducts, metaInsights, googleAdsData, tiktokData,
  unifiedClients, rawOrders, tiendanubeProducts, competitors, landscape, aiInsights,
  workspaceData, dateRange, renderExternalPanel, session
}) {
  const [activeTab, setActiveTab] = useState('super_dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'super_dashboard':
        return <SuperDashboard 
          ga4Insights={ga4Insights} gscPerformance={gscPerformance} mcProducts={mcProducts}
          metaInsights={metaInsights} googleAdsData={googleAdsData} tiktokData={tiktokData}
          unifiedClients={unifiedClients} tiendanubeProducts={tiendanubeProducts} session={session}
        />;
      case 'tiendanube_stats':
        return <MarketingReport rawClients={unifiedClients} dateRange={dateRange} />;
      case 'brand_intelligence':
        return <BrandIntelligenceCenter session={session} />;
      case 'instagram':
        return <InstagramPanel session={session} />;
      case 'sync_logs':
        return <SyncLogsPanel session={session} />;
      default:
        // Las demás pestañas las renderiza AppViewRenderer (pasado por renderExternalPanel)
        if (renderExternalPanel) {
          return renderExternalPanel(activeTab);
        }
        return <div style={{ color: 'red' }}>Panel no encontrado o renderExternalPanel no definido.</div>;
    }
  };

  return (
    <div style={S.container}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 12, color: 'var(--on-surface)' }}>
          <Layers size={24} color="#3b82f6" /> Centro de Marketing Unificado
        </h1>
        <p style={{ margin: '4px 0 0', color: 'var(--on-surface-variant)', fontSize: 13 }}>
          Gobernanza completa de adquisición, retención y posicionamiento.
        </p>
      </div>

      <div style={S.tabBar} className="hide-scrollbar">
        {TABS.map(tab => (
          <button key={tab.id} style={S.tabButton(activeTab === tab.id)} onClick={() => setActiveTab(tab.id)}>
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      <Suspense fallback={
        <div style={S.loader}>
          <Activity size={20} style={{ animation: 'pulseGlow 1.5s infinite', marginBottom: 12, display: 'inline-block' }} />
          <div>Cargando módulo de inteligencia...</div>
        </div>
      }>
        {renderContent()}
      </Suspense>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulseGlow { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
      `}</style>
    </div>
  );
}
