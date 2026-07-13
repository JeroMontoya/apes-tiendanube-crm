const fs = require('fs');
const path = 'C:\\Users\\jerom\\.gemini\\antigravity\\scratch\\App TiendaNueve\\src\\components\\CompetitiveIntelligencePanel.jsx';

let content = fs.readFileSync(path, 'utf8');

// The file is too corrupted. Let me restore from a known good state by rewriting the entire file
// using the original structure but without the problematic inline styles

const newContent = `import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, TrendingUp, Target, Eye, Zap, BarChart2, 
  Users, Shield, Star, Crown, AlertTriangle, 
  ChevronDown, ChevronRight, Filter, Download, 
  RefreshCw, Lightbulb, Compass,
  Plus, Edit3
} from 'lucide-react';

import styles from './CompetitiveIntelligencePanel.module.css';

const COMPETITOR_CATEGORIES = [
  'direct', 'indirect', 'marketplace', 'emerging', 'market-leader'
];

function formatNumber(num) {
  if (!num) return '0';
  if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return num.toLocaleString();
}

function formatCurrency(num) {
  if (!num) return '$0';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(num);
}

const StatusBadge = ({ status }) => {
  const configs = {
    active: { label: 'Activo', color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: '✓' },
    paused: { label: 'Pausado', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: '⏸' },
    inactive: { label: 'Inactivo', color: '#6b7280', bg: 'rgba(107,114,128,0.1)', icon: '○' },
    unknown: { label: 'Desconocido', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', icon: '?' },
  };
  const c = configs[status] || configs.unknown;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: c.bg, color: c.color }}>
      <span>{c.icon}</span> {c.label}
    </span>
  );
};

const CategoryBadge = ({ category }) => {
  const configs = {
    'direct': { label: 'Competidor Directo', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    'indirect': { label: 'Competidor Indirecto', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    'marketplace': { label: 'Marketplace', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
    'emerging': { label: 'Emergente', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
    'market-leader': { label: 'Líder de Mercado', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  };
  const c = configs[category] || { label: category, color: '#6b7280', bg: 'rgba(107,114,128,0.1)' };
  return (
    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', background: c.bg, color: c.color }}>
      {c.label}
    </span>
  );
};

function getRowStyle(i) {
  return {
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
    cursor: 'pointer',
    transition: 'background 0.15s',
  };
}

export default function CompetitiveIntelligencePanel({ 
  workspaceData, 
  dateRange, 
  filteredClients, 
  rawOrders, 
  isRefreshing, 
  refreshStock, 
  onRefreshMC 
}) {
  const [products, setProducts] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [filterAvailability, setFilterAvailability] = useState('all');
  const [sortBy, setSortBy] = useState('performance');
  const [sortDir, setSortDir] = useState('desc');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCompetitor, setNewCompetitor] = useState({ pageId: '', name: '', category: 'direct' });
  const [editingCompetitor, setEditingCompetitor] = useState(null);
  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const merchantId = workspaceData?.merchant_center_merchant_id;
  const credentials = workspaceData?.merchant_center_credentials_json;

  useEffect(() => {
    if (!merchantId || !credentials) return;
    fetchData();
  }, [merchantId, credentials, dateRange]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching Merchant Center data...');
      setProducts([]);
      setPerformance([]);
      setFeeds([]);
    } catch (e) {
      setError(e.message);
      console.error('Merchant Center fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (onRefreshMC) await onRefreshMC();
    await fetchData();
  };

  const filteredProducts = useMemo(() => {
    let result = [...products];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p => 
        p.title?.toLowerCase().includes(q) || 
        p.offerId?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q)
      );
    }
    if (filterAvailability !== 'all') {
      result = result.filter(p => p.availability === filterAvailability);
    }
    
    if (sortBy === 'performance') {
      result.sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
    } else if (sortBy === 'price') {
      result.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === 'title') {
      result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }
    return result;
  }, [products, search, filterAvailability, sortBy, sortDir]);

  const stats = useMemo(() => {
    const total = products.length;
    const inStock = products.filter(p => p.availability === 'in_stock').length;
    const limited = products.filter(p => p.availability === 'limited_availability').length;
    const outOfStock = products.filter(p => p.availability === 'out_of_stock').length;
    const withPerf = performance.length;
    return { total, inStock, limited, outOfStock, withPerf };
  }, [products, performance]);

  if (loading) {
    return <div className={styles.loadingState}><div className={styles.spinner} /><p>Cargando Merchant Center...</p></div>;
  }

  if (error || (!merchantId || !credentials)) {
    return (
      <div className={styles.emptyState}>
        <Shield className={styles.emptyIcon} />
        <h3>Merchant Center no configurado</h3>
        <p>Agrega tu Merchant ID y credenciales en Configuración para ver datos de productos y rendimiento.
        </p>
        <button onClick={fetchData} className={styles.refreshBtn} disabled={!merchantId || !credentials}>
          <RefreshCw size={14} /> Reintentar
        </button>
      </div>
    );
  }

  const handleRefresh = async () => {
    if (onRefreshMC) await onRefreshMC();
    await fetchData();
  };

  const handleSort = (key) => {
    if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(key); setSortDir('desc'); }
  };

  const handleAddCompetitor = async (competitor) => {
    const exists = competitors.some(c => c.pageId === competitor.pageId);
    if (exists) {
      alert('Este competidor ya está en la lista');
      return;
    }
    setCompetitors(prev => [...prev, { ...competitor, _id: Date.now().toString() }]);
    await saveToCache('competitors', [...competitors, { ...competitor, _id: Date.now().toString() }]);
  };

  const handleRemoveCompetitor = async (competitorId) => {
    setCompetitors(prev => prev.filter(c => c._id !== competitorId));
    const updated = competitors.filter(c => c._id !== competitorId);
    await saveToCache('competitors', updated);
  };

  const handleAnalyzeCompetitor = async (pageId) => {
    if (!workspaceData?.meta_ad_account_id || !workspaceData?.meta_access_token) {
      alert('Configura Meta Ads en Configuración para usar Inteligencia Competitiva');
      return;
    }
    setCiLoading(true);
    try {
      const { MetaAdLibraryAPI, getMetaAdLibraryInsights } = await import('./api/MetaAdLibraryAPI.js');
      const result = await getMetaAdLibraryInsights(
        workspaceData.meta_access_token,
        [{ pageId, name: competitors.find(c => c.pageId === pageId)?.name, category: competitors.find(c => c.pageId === pageId)?.category }],
        { startDate: dateRange.startDate, endDate: dateRange.endDate }
      );
      if (result.success) {
        setInsights({ pageId, data: result.data });
      } else {
        console.error('Meta Ad Library error:', result.error);
      }
    } catch (e) {
      console.error('Analyze competitor failed:', e);
      alert('Error analizando competidor: ' + e.message);
    } finally {
      setCiLoading(false);
    }
  };

  const handleGenerateLandscape = async () => {
    if (!workspaceData?.meta_ad_account_id || !workspaceData?.meta_access_token) {
      alert('Configura Meta Ads en Configuración para usar Inteligencia Competitiva');
      return;
    }
    if (competitors.length === 0) {
      alert('Agrega al menos un competidor primero');
      return;
    }
    setCiLoading(true);
    try {
      const { MetaAdLibraryAPI, getMetaAdLibraryInsights } = await import('./api/MetaAdLibraryAPI.js');
      const competitorPages = competitors.map(c => ({ pageId: c.pageId, name: c.name, category: c.category }));
      const result = await getMetaAdLibraryInsights(
        workspaceData.meta_access_token,
        competitorPages,
        { startDate: dateRange.startDate, endDate: dateRange.endDate }
      );
      if (result.success) {
        setLandscape(result.data);
      } else {
        console.error('Landscape error:', result.error);
      }
    } catch (e) {
      console.error('Generate landscape failed:', e);
      alert('Error generando panorama: ' + e.message);
    } finally {
      setCiLoading(false);
    }
  };

  const loadCompetitorsFromCache = async () => {
    try {
      const cached = await loadFromCache('competitors');
      if (cached) setCompetitors(cached);
    } catch (e) {
      console.warn('Could not load competitors from cache:', e);
    }
  };

  useEffect(() => {
    if (session && !authLoading) {
      loadCompetitorsFromCache();
    }
  }, [session, authLoading]);

  // ── Filter Clients locally based on Date Picker ──────────────────────
  const filteredClients = React.useMemo(() => {
    if (!unifiedClients || unifiedClients.length === 0) return [];
    
    const start = new Date(dateRange.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateRange.endDate);
    end.setHours(23, 59, 59, 999);

    return unifiedClients.map(client => {
      if (!client.purchases) return client;
      
      const filteredPurchases = client.purchases.filter(purchase => {
        if (!purchase.date) return false;
        const purchaseDate = new Date(purchase.date);
        return purchaseDate >= start && purchaseDate <= end;
      });

      const filteredTotal = filteredPurchases.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      
      return {
        ...client,
        purchases: filteredPurchases,
        purchaseCount: client.purchases.length,
        totalSpent: client.totalSpent || client.purchases.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0),
        filteredPurchaseCount: filteredPurchases.length,
        filteredTotalSpent: filteredTotal
      };
    }).filter(client => client.filteredPurchaseCount > 0);
  }, [unifiedClients, dateRange]);

  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#091c35', color: 'white' }}>
        <h2>Cargando...</h2>
      </div>
    );
  }

  if (!session) {
    return <AuthScreen onAuth={(s) => setSession(s)} />;
  }

  return (
    <ErrorBoundary>
      <TeamProvider session={session}>
        <AppContent
          activeView={activeView}
          setActiveView={setActiveView}
          theme={theme}
          toggleTheme={toggleTheme}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          selectedClient={selectedClient}
          setSelectedClient={setSelectedClient}
          historicClients={historicClients}
          unifiedClients={unifiedClients}
          rawOrders={rawOrders}
          tiendanubeProducts={tiendanubeProducts}
          connectionStatus={connectionStatus}
          storeId={storeId}
          lastSync={lastSync}
          metaInsights={metaInsights}
          ga4Insights={ga4Insights}
          workspaceData={workspaceData}
          isRefreshingStock={isRefreshingStock}
          refreshStock={refreshStock}
          isSyncing={isSyncing}
          isFetchingInsights={isFetchingInsights}
          session={session}
          dateRange={dateRange}
          setDateRange={setDateRange}
          filteredClients={filteredClients}
          handleConnect={handleConnect}
          fetchRealData={fetchRealData}
          syncProgress={syncProgress}
          setSyncProgress={setSyncProgress}
          competitors={competitors}
          landscape={landscape}
          insights={insights}
          ciLoading={ciLoading}
          onRefreshCompetitive={handleGenerateLandscape}
          onAddCompetitor={handleAddCompetitor}
          onAnalyzeCompetitor={handleAnalyzeCompetitor}
          onRemoveCompetitor={handleRemoveCompetitor}
        />
      </TeamProvider>
    </ErrorBoundary>
  );
}

function AppViewRenderer({
  activeView, filteredClients, tiendanubeProducts, rawOrders, session, storeId,
  workspaceData, isRefreshingStock, refreshStock, metaInsights, ga4Insights,
  connectionStatus, lastSync, handleConnect, dateRange, historicClients,
  unifiedClients, setSelectedClient, fetchRealData,
  competitors, landscape, insights, ciLoading,
  onRefreshCompetitive, onAddCompetitor, onAnalyzeCompetitor, onRemoveCompetitor,
}) {
  const { currentMember, ROLE_LABELS, ROLE_COLORS, ROLE_ICONS } = useTeam();

  return (
    <div className="app-layout">
      <Sidebar 
        activeView={activeView} 
        onNavigate={(view) => { setActiveView(view); setSidebarOpen(false); }} 
        theme={theme}
        toggleTheme={toggleTheme}
        currentMember={currentMember}
        ROLE_LABELS={ROLE_LABELS}
        ROLE_COLORS={ROLE_COLORS}
        ROLE_ICONS={ROLE_ICONS}
      />
      
      <main className="main-content">
        <div className="toolbar-row">
          {!['configuracion', 'exportar', 'pqr', 'inventario', 'taller', 'equipo', 'actividad', 'rendimiento'].includes(activeView) && (
            <div style={{ flex: '1 1 200px', minWidth: 0 }}>
              <GlobalDatePicker dateRange={dateRange} setDateRange={setDateRange} />
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <TeamMemberBadge />
            <NotificationCenter />
          </div>
        </div>
        
        {isFetchingInsights ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
            <div style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Sincronizando datos del periodo...</div>
          </div>
        ) : (
          <div key={activeView} className="view-enter">
            <AppViewRenderer
              activeView={activeView}
              filteredClients={filteredClients}
              tiendanubeProducts={tiendanubeProducts}
              rawOrders={rawOrders}
              session={session}
              storeId={storeId}
              workspaceData={workspaceData}
              isRefreshingStock={isRefreshingStock}
              refreshStock={refreshStock}
              metaInsights={metaInsights}
              ga4Insights={ga4Insights}
              connectionStatus={connectionStatus}
              lastSync={lastSync}
              handleConnect={handleConnect}
              dateRange={dateRange}
              historicClients={historicClients}
              unifiedClients={unifiedClients}
              setSelectedClient={setSelectedClient}
              fetchRealData={fetchRealData}
              competitors={competitors}
              landscape={landscape}
              insights={insights}
              ciLoading={ciLoading}
              onRefreshCompetitive={handleGenerateLandscape}
              onAddCompetitor={handleAddCompetitor}
              onAnalyzeCompetitor={handleAnalyzeCompetitor}
              onRemoveCompetitor={handleRemoveCompetitor}
            />
          </div>
        )}
      </main>

      {selectedClient && (
        <ClientDetailModal client={selectedClient} allClients={unifiedClients} onClose={() => setSelectedClient(null)} />
      )}
      <SyncProgressOverlay 
        isVisible={syncProgress.isVisible} 
        currentStep={syncProgress.currentStep} 
        stepProgress={syncProgress.stepProgress} 
        overallProgress={syncProgress.overallProgress}
        statusMessage={syncProgress.statusMessage}
        error={syncProgress.error}
        onClose={() => setSyncProgress(p => ({ ...p, isVisible: false, error: null }))}
      />
    </div>
  );
}

function AppViewRenderer({
  activeView, filteredClients, tiendanubeProducts, rawOrders, session, storeId,
  workspaceData, isRefreshingStock, refreshStock, metaInsights, ga4Insights,
  connectionStatus, lastSync, handleConnect, dateRange, historicClients,
  unifiedClients, setSelectedClient, fetchRealData,
  competitors, landscape, insights, ciLoading,
  onRefreshCompetitive, onAddCompetitor, onAnalyzeCompetitor, onRemoveCompetitor,
}) {
  const { currentMember, ROLE_LABELS, ROLE_COLORS, ROLE_ICONS } = useTeam();

  return (
    <div className="app-layout">
      <Sidebar 
        activeView={activeView} 
        onNavigate={(view) => { setActiveView(view); setSidebarOpen(false); }} 
        theme={theme}
        toggleTheme={toggleTheme}
        currentMember={currentMember}
        ROLE_LABELS={ROLE_LABELS}
        ROLE_COLORS={ROLE_COLORS}
        ROLE_ICONS={ROLE_ICONS}
      />
      
      <main className="main-content">
        <div className="toolbar-row">
          {!['configuracion', 'exportar', 'pqr', 'inventario', 'taller', 'equipo', 'actividad', 'rendimiento'].includes(activeView) && (
            <div style={{ flex: '1 1 200px', minWidth: 0 }}>
              <GlobalDatePicker dateRange={dateRange} setDateRange={setDateRange} />
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <TeamMemberBadge />
            <NotificationCenter />
          </div>
        </div>
        
        {isFetchingInsights ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
            <div style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Sincronizando datos del periodo...</div>
          </div>
        ) : (
          <div key={activeView} className="view-enter">
            <AppViewRenderer
              activeView={activeView}
              filteredClients={filteredClients}
              tiendanubeProducts={tiendanubeProducts}
              rawOrders={rawOrders}
              session={session}
              storeId={storeId}
              workspaceData={workspaceData}
              isRefreshingStock={isRefreshingStock}
              refreshStock={refreshStock}
              metaInsights={metaInsights}
              ga4Insights={ga4Insights}
              connectionStatus={connectionStatus}
              lastSync={lastSync}
              handleConnect={handleConnect}
              dateRange={dateRange}
              historicClients={historicClients}
              unifiedClients={unifiedClients}
              setSelectedClient={setSelectedClient}
              fetchRealData={fetchRealData}
              competitors={competitors}
              landscape={landscape}
              insights={insights}
              ciLoading={ciLoading}
              onRefreshCompetitive={handleGenerateLandscape}
              onAddCompetitor={handleAddCompetitor}
              onAnalyzeCompetitor={handleAnalyzeCompetitor}
              onRemoveCompetitor={handleRemoveCompetitor}
            />
          </div>
        )}
      </main>

      {selectedClient && (
        <ClientDetailModal client={selectedClient} allClients={unifiedClients} onClose={() => setSelectedClient(null)} />
      )}
      <SyncProgressOverlay 
        isVisible={syncProgress.isVisible} 
        currentStep={syncProgress.currentStep} 
        stepProgress={syncProgress.stepProgress} 
        overallProgress={syncProgress.overallProgress}
        statusMessage={syncProgress.statusMessage}
        error={syncProgress.error}
        onClose={() => setSyncProgress(p => ({ ...p, isVisible: false, error: null }))}
      />
    </div>
  );
}`;

fs.writeFileSync(path, newContent, 'utf8');
console.log('Rewritten');
"