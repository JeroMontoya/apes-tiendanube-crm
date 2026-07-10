import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Award } from 'lucide-react';

import Sidebar from './components/Sidebar';
import StatsCards from './components/StatsCards';
import MasterTable from './components/MasterTable';
import ClassificationTree from './components/ClassificationTree';
import AnalyticsPanel from './components/AnalyticsPanel';
import ExportPanel from './components/ExportPanel';
import SettingsPanel from './components/SettingsPanel';
import ClientDetailModal from './components/ClientDetailModal';
import MarketingReport from './components/MarketingReport';
import FrequencyFunnel from './components/FrequencyFunnel';
import GeoFunnel from './components/GeoFunnel';
import AuthScreen from './components/AuthScreen';
import CampaignPipeline from './components/CampaignPipeline';
import MetaAdsPanel from './components/MetaAdsPanel';
import GA4Panel from './components/GA4Panel';
import PQRPanel from './components/PQRPanel';
import InventoryPage from './components/InventoryPage';
import GoalTrackerBanner from './components/GoalTrackerBanner';
import ActiveCampaignsWidget from './components/ActiveCampaignsWidget';
import EventCalendar from './components/EventCalendar';
import NotificationCenter from './components/NotificationCenter';
import CohortRetentionChart from './components/CohortRetentionChart';
import StockAlertWidget from './components/StockAlertWidget';
import AIInsightsWidget from './components/AIInsightsWidget';
import ChurnRadar from './components/ChurnRadar';
import RecentActivityFeed from './components/RecentActivityFeed';
import OrdersTracking from './components/OrdersTracking';

// Team System
import { TeamProvider, useTeam } from './contexts/TeamContext';
import WorkshopPage from './components/WorkshopPage';
import ActivityLog from './components/ActivityLog';
import ProductivityDashboard from './components/ProductivityDashboard';

import TeamPanel from './components/TeamPanel';
import { TeamMemberBadge } from './components/TeamPanel';

// Data & Logic


import { unifyClients } from './utils/unifyClients';
import { TiendanubeAPI, mapTiendanubeDataToUnified } from './utils/tiendanubeAPI';
import { loadFromCache, saveToCache } from './data/cache';
import { MetaAPI } from './api/MetaAPI';
import { GA4API } from './api/GA4API';

import GlobalDatePicker, { calculateDates } from './components/GlobalDatePicker';

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  // Theme State
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const [historicClients, setHistoricClients] = useState([]);
  const [unifiedClients, setUnifiedClients] = useState([]);
  const [rawOrders, setRawOrders] = useState([]);
  const [tiendanubeProducts, setTiendanubeProducts] = useState([]);
  
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [storeId, setStoreId] = useState(null);
  const [lastSync, setLastSync] = useState(null);

  const [metaInsights, setMetaInsights] = useState(null);
  const [ga4Insights, setGa4Insights] = useState(null);
  const [workspaceData, setWorkspaceData] = useState(null);

  const [needsAuth, setNeedsAuth] = useState(false);
  const [authStoreId, setAuthStoreId] = useState(null);

  // Global Date State
  const initialDates = calculateDates('30d');
  const [dateRange, setDateRange] = useState({
    preset: '30d',
    metaPreset: 'last_30d',
    startDate: initialDates.start,
    endDate: initialDates.end
  });
  
  const [isRefreshingStock, setIsRefreshingStock] = useState(false);

  const refreshStock = async () => {
    console.log('[StockRefresh] storeId:', storeId);
    if (!storeId) return;
    setIsRefreshingStock(true);
    try {
      const { data: sysCfg } = await supabase.from('system_config').select('tiendanube_access_token').eq('id', 'main').single();
      const token = sysCfg?.tiendanube_access_token || workspaceData?.tiendanube_access_token;
      console.log('[StockRefresh] token found:', !!token);
      if (!token) return;
      const api = new TiendanubeAPI(storeId, token);
      const productsRes = await api.fetchAllProducts();
      console.log('[StockRefresh] API result:', productsRes.success, 'products:', productsRes.data?.length || 0);
        if (productsRes.success) {
          console.log(`[App] Products fetched from Tiendanube: ${productsRes.data?.length || 0}`);
          setTiendanubeProducts(productsRes.data);
          await saveToCache('tiendanube_products', productsRes.data);
        } else {
          console.warn('[App] Products fetch failed:', productsRes.error);
        }
    } catch (err) {
      console.error('[StockRefresh] Error:', err);
    } finally {
      setIsRefreshingStock(false);
    }
  };

  const [isSyncing, setIsSyncing] = useState(false);
  const [isFetchingInsights, setIsFetchingInsights] = useState(false);

  // ── -1. Auth Check (Supabase) ──────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── 0. Inicialización de Nexo ────────────────
  useEffect(() => {
    try {
      if (window.top !== window.self) {
        connect(nexo).then(async () => {
          await iAmReady();
        }).catch(err => console.warn('Error inicializando Nexo SDK', err));
      }
    } catch (e) {
      console.warn('No se pudo inicializar Nexo', e);
    }
  }, []);

  // ── 1. Carga de Caché y Sincronización ────────────────
  useEffect(() => {
    if (authLoading || !session) return;

    const loadData = async () => {
      try {
        const cachedProducts = await loadFromCache('tiendanube_products');
        if (cachedProducts) setTiendanubeProducts(cachedProducts);
      } catch (err) {
        console.warn('No se pudo cargar productos desde caché', err);
      }

      setIsSyncing(true);

      // 1. Try shared system_config first (all team members use same credentials)
      const { data: systemConfig } = await supabase
        .from('system_config')
        .select('*')
        .eq('id', 'main')
        .single();

      // 2. Fall back to per-user workspace for backward compatibility
      const { data: userWorkspace } = await supabase
        .from('workspaces')
        .select('tiendanube_store_id, tiendanube_access_token, meta_ad_account_id, meta_access_token, ga4_property_id, ga4_credentials_json, n8n_webhook_url')
        .eq('user_id', session.user.id)
        .single();

      // Merge: system_config takes priority, user workspace fills gaps
      const workspace = {
        tiendanube_store_id: systemConfig?.tiendanube_store_id || userWorkspace?.tiendanube_store_id,
        tiendanube_access_token: systemConfig?.tiendanube_access_token || userWorkspace?.tiendanube_access_token,
        meta_ad_account_id: systemConfig?.meta_ad_account_id || userWorkspace?.meta_ad_account_id,
        meta_access_token: systemConfig?.meta_access_token || userWorkspace?.meta_access_token,
        ga4_property_id: systemConfig?.ga4_property_id || userWorkspace?.ga4_property_id,
        ga4_credentials_json: systemConfig?.ga4_credentials_json || userWorkspace?.ga4_credentials_json,
        n8n_webhook_url: systemConfig?.n8n_webhook_url || userWorkspace?.n8n_webhook_url,
        auto_sync_enabled: systemConfig?.auto_sync_enabled !== false,
        sync_interval_seconds: systemConfig?.sync_interval_seconds || 90,
      };

      setWorkspaceData(workspace);

      let currentStore = workspace?.tiendanube_store_id;
      let currentToken = workspace?.tiendanube_access_token;

      if (!currentToken) {
        const urlParams = new URLSearchParams(window.location.search);
        const installed = urlParams.get('installed');
        const storeFromUrl = urlParams.get('store') || urlParams.get('store_id');
        const tokenFromUrl = urlParams.get('token');
        
        if (installed === 'true' && storeFromUrl && tokenFromUrl) {
           currentStore = storeFromUrl;
           currentToken = tokenFromUrl;
           await supabase.from('workspaces').upsert({
             user_id: session.user.id,
             tiendanube_store_id: currentStore,
             tiendanube_access_token: currentToken
           });
           window.history.replaceState({}, document.title, '/');
        } else if (storeFromUrl) {
           setNeedsAuth(true);
           setAuthStoreId(storeFromUrl);
           setIsSyncing(false);
           return;
        }
      }

      if (currentStore && currentToken) {
        setStoreId(currentStore);
        await fetchRealData(currentStore, currentToken);
      }
      // No credentials → empty state, never mock data

      setIsSyncing(false);
    };

    loadData();
  }, [session, authLoading]);

  // ── Fetch Insights when dateRange or workspace changes ────────────────
  useEffect(() => {
    if (!workspaceData) return;

    const fetchInsights = async () => {
      setIsFetchingInsights(true);

      if (workspaceData.meta_ad_account_id && workspaceData.meta_access_token) {
        const metaApi = new MetaAPI(workspaceData.meta_ad_account_id, workspaceData.meta_access_token);
        
        let metaDatePreset = dateRange.metaPreset;
        // if custom, Meta requires time_range={'since':'...','until':'...'} instead of preset
        // For simplicity, I'll pass preset for now. In MetaAPI I will handle custom.
        metaApi.getInsights(dateRange).then(res => {
          if (res) setMetaInsights(res);
        }).catch(err => console.error('[DEBUG] Meta Error:', err));
      }

      if (workspaceData.ga4_property_id && workspaceData.ga4_credentials_json) {
        const ga4Api = new GA4API(workspaceData.ga4_credentials_json, workspaceData.ga4_property_id);
        ga4Api.getInsights(dateRange.startDate, dateRange.endDate).then(res => {
          if (res) setGa4Insights(res);
        }).catch(err => console.error('[DEBUG] GA4 Error:', err));
      }

      setIsFetchingInsights(false);
    };

    fetchInsights();
  }, [dateRange, workspaceData]);

  // Auto-refresh polling
  useEffect(() => {
    if (!storeId || connectionStatus !== 'connected') return;
    const intervalMs = (workspaceData?.sync_interval_seconds || 90) * 1000;
    const interval = setInterval(() => {
      const token = workspaceData?.tiendanube_access_token || 'system';
      fetchRealData(storeId, token);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [storeId, connectionStatus, workspaceData]);

  const fetchRealData = async (sid, token) => {
    setConnectionStatus('connecting');
    const api = new TiendanubeAPI(sid, token);
    
    try {
      const [customersRes, ordersRes, productsRes] = await Promise.all([
        api.fetchCustomers(),
        api.fetchAllOrders(),
        api.fetchAllProducts()
      ]);

      if (customersRes.success && ordersRes.success) {
        const mappedOrders = mapTiendanubeDataToUnified(customersRes.data, ordersRes.data);
        const newUnified = unifyClients([], mappedOrders);
        
        setRawOrders(mappedOrders);
        setUnifiedClients(newUnified);
        setConnectionStatus('connected');

        if (productsRes.success) {
          setTiendanubeProducts(productsRes.data);
          await saveToCache('tiendanube_products', productsRes.data);
        }
        
        const syncDate = new Date();
        setLastSync(syncDate);

        await saveToCache('unified_clients', newUnified);
        await saveToCache('last_sync', syncDate.toISOString());

      } else {
        throw new Error('Error al obtener datos mediante el API');
      }
    } catch (err) {
      console.error('Fetch real data failed:', err);
      setConnectionStatus('disconnected');
    }
  };

  const handleConnect = async ({ storeId: sid, token }) => {
    setConnectionStatus('connecting');
    const api = new TiendanubeAPI(sid, token);
    
    try {
      const test = await api.testConnection();
      if (!test.success) {
        alert(`Error de conexión: ${test.error?.message || 'Token o Store ID inválido'}`);
        setConnectionStatus('disconnected');
        return;
      }

      const [customersRes, ordersRes, productsRes] = await Promise.all([
        api.fetchCustomers(),
        api.fetchAllOrders(),
        api.fetchAllProducts()
      ]);

      if (customersRes.success && ordersRes.success) {
        const mappedOrders = mapTiendanubeDataToUnified(customersRes.data, ordersRes.data);
        const newUnified = unifyClients([], mappedOrders);
        setRawOrders(mappedOrders);
        setUnifiedClients(newUnified);
        setConnectionStatus('connected');
        setStoreId(sid);
        setLastSync(new Date());

        if (productsRes.success) {
          setTiendanubeProducts(productsRes.data);
          await saveToCache('tiendanube_products', productsRes.data);
        }
        
        await saveToCache('unified_clients', newUnified);
        await saveToCache('last_sync', new Date().toISOString());
        
        alert('¡Sincronización completada con éxito!');
        setActiveView('dashboard');
      } else {
        throw new Error('Error al obtener datos');
      }
    } catch (err) {
      console.error(err);
      alert('Error al sincronizar con TiendaNube.');
      setConnectionStatus('disconnected');
    }
  };

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

  if (needsAuth) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#0F1419', color: '#F5F0EB', fontFamily: 'Montserrat, sans-serif' }}>
        <h2>APES CRM</h2>
        <p>Necesitamos conectarnos con tu tienda para cargar los datos.</p>
        <button 
          onClick={() => {
            window.top.location.href = `/api/auth/install?store_id=${authStoreId}`;
          }}
          style={{ padding: '12px 24px', backgroundColor: '#2D8B4E', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginTop: '20px', fontWeight: 'bold' }}
        >
          Conectar con TiendaNube
        </button>
      </div>
    );
  }

  return (
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
      />
    </TeamProvider>
  );
}

function AppContent({
  activeView, setActiveView, theme, toggleTheme, sidebarOpen, setSidebarOpen,
  selectedClient, setSelectedClient, historicClients, unifiedClients, rawOrders,
  tiendanubeProducts, connectionStatus, storeId, lastSync, metaInsights, ga4Insights,
  workspaceData, isRefreshingStock, refreshStock, isSyncing, isFetchingInsights,
  session, dateRange, setDateRange, filteredClients, handleConnect, fetchRealData,
}) {
  const { currentMember, ROLE_LABELS, ROLE_COLORS, ROLE_ICONS } = useTeam();

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
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
        <div className="toolbar-row" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
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
            />
          </div>
        )}
      </main>

      {selectedClient && (
        <ClientDetailModal client={selectedClient} allClients={unifiedClients} onClose={() => setSelectedClient(null)} />
      )}
    </div>
  );
}

function AppViewRenderer({
  activeView, filteredClients, tiendanubeProducts, rawOrders, session, storeId,
  workspaceData, isRefreshingStock, refreshStock, metaInsights, ga4Insights,
  connectionStatus, lastSync, handleConnect, dateRange, historicClients,
  unifiedClients, setSelectedClient, fetchRealData,
}) {
  switch(activeView) {
    case 'dashboard':
      return (
        <>
          <div className="section-header">
            <div>
              <h1 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                Centro de Comando
                <span className="live-dot" />
              </h1>
              <p>Panel de control operativo en tiempo real</p>
            </div>
            {lastSync && (
              <div style={{ 
                fontSize: 12, color: 'var(--on-surface-variant)', 
                background: 'rgba(255,255,255,0.05)', 
                padding: '6px 14px', borderRadius: 20, 
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', gap: 6,
                fontWeight: 500
              }}>
                <span className="live-dot" style={{ width: 6, height: 6 }} />
                Última sinc: {lastSync.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
          <GoalTrackerBanner clients={filteredClients} dateRange={dateRange} />
          <StatsCards clients={filteredClients} metaInsights={metaInsights} ga4Insights={ga4Insights} />
          <div className="bento-grid" style={{ marginTop: 16, gridTemplateColumns: 'repeat(12, 1fr)' }}>
            <div className="bento-span-8" style={{ display: 'flex', flexDirection: 'column' }}>
              <CohortRetentionChart clients={filteredClients} />
            </div>
            <div className="bento-span-4" style={{ display: 'flex', flexDirection: 'column' }}>
              <StockAlertWidget
                clients={filteredClients}
                products={tiendanubeProducts}
                onRefresh={refreshStock}
                isRefreshing={isRefreshingStock}
                lastSync={lastSync}
                isConnected={connectionStatus === 'connected' || tiendanubeProducts.length > 0}
              />
            </div>
          </div>
          <div className="bento-grid" style={{ marginTop: 16, gridTemplateColumns: 'repeat(12, 1fr)' }}>
            <div className="bento-span-8" style={{ display: 'flex', flexDirection: 'column' }}>
              <AIInsightsWidget clients={filteredClients} storeId={storeId} />
            </div>
            <div className="bento-span-4" style={{ display: 'flex', flexDirection: 'column' }}>
              <ChurnRadar clients={filteredClients} />
            </div>
          </div>
          <div className="bento-grid" style={{ marginTop: 16, gridAutoRows: 'minmax(400px, auto)' }}>
            <div className="glass-card bento-span-7" style={{ padding: 0, overflow: 'hidden' }}>
              <FrequencyFunnel clients={filteredClients} onSelectClient={setSelectedClient} />
            </div>
            <div className="glass-card bento-span-5" style={{ padding: 0, overflow: 'hidden' }}>
              <ActiveCampaignsWidget workspace={workspaceData} onRefreshMeta={() => { if (workspaceData?.meta_ad_account_id && workspaceData?.meta_access_token) { const m = new MetaAPI(workspaceData.meta_ad_account_id, workspaceData.meta_access_token); m.getInsights(dateRange).then(r => { if (r) metaInsights && metaInsights(r); }); }}} />
            </div>
          </div>
          <div className="bento-grid" style={{ marginTop: 16, gridAutoRows: 'minmax(400px, auto)' }}>
            <div className="bento-span-7">
              <RecentActivityFeed clients={filteredClients} rawOrders={rawOrders} />
            </div>
            <div className="glass-card bento-span-5" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--on-surface)' }}>
                  <Award size={18} color="#f59e0b" /> Top Clientes
                </h3>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {filteredClients.slice(0, 8).map((client, i) => (
                  <div 
                    key={client.id} 
                    className="top-client-item"
                    onClick={() => setSelectedClient(client)}
                    style={{ padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: 12 }}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: `hsl(${(i * 47) % 360}, 60%, 25%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                      {client.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{client.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                        <span>{client.ordersCount || client.purchaseCount} compras</span>
                        <span style={{ color: '#10b981', fontWeight: 600 }}>
                          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(client.totalSpent)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="glass-card bento-span-12" style={{ padding: 0, overflow: 'hidden', marginTop: 16 }}>
            <GeoFunnel clients={filteredClients} onSelectClient={setSelectedClient} />
          </div>
        </>
      );
    case 'calendario':
      return (
        <>
          <div className="section-header">
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 12, color: 'var(--on-surface)' }}>
                Calendario de Eventos
              </h1>
              <p style={{ margin: '4px 0 0', color: 'var(--on-surface-variant)', fontSize: 14 }}>
                Planificación de campañas, promociones y actividades
              </p>
            </div>
          </div>
          <EventCalendar />
        </>
      );
    case 'clientes':
      return (
        <>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--on-surface)' }}>Base Maestra de Clientes</h1>
            <p style={{ fontSize: 13, color: 'var(--on-surface-variant)', margin: '4px 0 0' }}>Historial cruzado unificado automáticamente.</p>
          </div>
          <div className="glass-card" style={{ padding: '0' }}>
            <MasterTable clients={filteredClients} onSelectClient={setSelectedClient} />
          </div>
        </>
      );
    case 'ventas_view':
      return <OrdersTracking rawOrders={rawOrders} lastSync={lastSync} refreshOrders={fetchRealData} storeId={storeId} workspaceData={workspaceData} />;
    case 'segmentos':
      return (
        <>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--on-surface)' }}>Árbol de Gestión</h1>
            <p style={{ fontSize: 13, color: 'var(--on-surface-variant)', margin: '4px 0 0' }}>Clasificación automática del funnel de ventas.</p>
          </div>
          <ClassificationTree clients={filteredClients} />
        </>
      );
    case 'analitica':
      return (
        <>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--on-surface)' }}>El Cerebro (Analítica)</h1>
            <p style={{ fontSize: 13, color: 'var(--on-surface-variant)', margin: '4px 0 0' }}>Inteligencia de negocio en tiempo real.</p>
          </div>
          <AnalyticsPanel clients={filteredClients} />
        </>
      );
    case 'marketing':
      return <MarketingReport rawClients={unifiedClients} dateRange={dateRange} />;
    case 'meta_ads':
      return <MetaAdsPanel metaInsights={metaInsights} workspace={workspaceData} dateRange={dateRange} onRefreshMeta={() => { if (workspaceData?.meta_ad_account_id && workspaceData?.meta_access_token) { const m = new MetaAPI(workspaceData.meta_ad_account_id, workspaceData.meta_access_token); m.getInsights(dateRange).then(r => { if (r) metaInsights && metaInsights(r); }); }}} />;
    case 'ga4':
      return <GA4Panel ga4Insights={ga4Insights} />;
    case 'pipeline':
      return <CampaignPipeline session={session} unifiedClients={filteredClients} />;
    case 'inventario':
      return (
        <InventoryPage
          products={tiendanubeProducts}
          onRefresh={refreshStock}
          isRefreshing={isRefreshingStock}
          lastSync={lastSync}
          isConnected={connectionStatus === 'connected' || tiendanubeProducts.length > 0}
          onUpdateStock={async (productId, variantId, newStock) => {
            if (!storeId) return;
            const { data: sysCfg } = await supabase.from('system_config').select('tiendanube_access_token').eq('id', 'main').single();
            const token = sysCfg?.tiendanube_access_token || workspaceData?.tiendanube_access_token;
            if (!token) return;
            const api = new TiendanubeAPI(storeId, token);
            await api.updateVariantStock(productId, variantId, newStock);
          }}
        />
      );
    case 'pqr':
      return <PQRPanel session={session} rawOrders={rawOrders} n8nWebhookUrl={workspaceData?.n8n_webhook_url} />;
    case 'taller':
      return (
        <WorkshopPage
          products={tiendanubeProducts}
          onRefresh={refreshStock}
          isRefreshing={isRefreshingStock}
          storeId={storeId}
          session={session}
          onUpdateStock={async (productId, variantId, newStock) => {
            if (!storeId) return;
            const { data: sysCfg } = await supabase.from('system_config').select('tiendanube_access_token').eq('id', 'main').single();
            const token = sysCfg?.tiendanube_access_token || workspaceData?.tiendanube_access_token;
            if (!token) return;
            const api = new TiendanubeAPI(storeId, token);
            await api.updateVariantStock(productId, variantId, newStock);
          }}
          onRefreshStock={refreshStock}
        />
      );
    case 'equipo':
      return <TeamPanel />;
    case 'actividad':
      return <ActivityLog />;
    case 'rendimiento':
      return <ProductivityDashboard />;
    case 'configuracion':
      return <SettingsPanel onConnect={handleConnect} connectionStatus={connectionStatus} session={session} />;
    case 'exportar':
      return <ExportPanel clients={filteredClients} n8nWebhookUrl={workspaceData?.n8n_webhook_url} />;
    default:
      return <div>Vista no encontrada</div>;
  }
}
