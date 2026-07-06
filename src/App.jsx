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
import GoalTrackerBanner from './components/GoalTrackerBanner';
import ActiveCampaignsWidget from './components/ActiveCampaignsWidget';
import EventCalendar from './components/EventCalendar';

// Data & Logic
import historicClientsData from './data/mockHistoricClients';
import mockTiendanubeOrders from './data/mockTiendanubeOrders';
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
        const cachedClients = await loadFromCache('unified_clients');
        const cachedSync = await loadFromCache('last_sync');
        if (cachedClients && cachedClients.length > 0) {
          setUnifiedClients(cachedClients);
          if (cachedSync) setLastSync(new Date(cachedSync));
          setConnectionStatus('connected');
        }
      } catch (err) {
        console.warn('No se pudo cargar desde caché', err);
      }

      setIsSyncing(true);

      const { data: workspace } = await supabase
        .from('workspaces')
        .select('tiendanube_store_id, tiendanube_access_token, meta_ad_account_id, meta_access_token, ga4_property_id, ga4_credentials_json')
        .eq('user_id', session.user.id)
        .single();

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
      } else {
        if (unifiedClients.length === 0) {
          const initialUnified = unifyClients([], mockTiendanubeOrders);
          setUnifiedClients(initialUnified);
        }
      }

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
    if (!storeId || connectionStatus !== 'connected' || !session) return;
    const interval = setInterval(async () => {
       const { data } = await supabase.from('workspaces').select('tiendanube_access_token').eq('user_id', session.user.id).single();
       if(data?.tiendanube_access_token) {
         fetchRealData(storeId, data.tiendanube_access_token);
       }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [storeId, connectionStatus, session]);

  const fetchRealData = async (sid, token) => {
    setConnectionStatus('connecting');
    const api = new TiendanubeAPI(sid, token);
    
    try {
      const [customersRes, ordersRes] = await Promise.all([
        api.fetchCustomers(),
        api.fetchAllOrders()
      ]);

      if (customersRes.success && ordersRes.success) {
        const mappedOrders = mapTiendanubeDataToUnified(customersRes.data, ordersRes.data);
        const newUnified = unifyClients([], mappedOrders);
        
        setUnifiedClients(newUnified);
        setConnectionStatus('connected');
        
        const syncDate = new Date();
        setLastSync(syncDate);

        await saveToCache('unified_clients', newUnified);
        await saveToCache('last_sync', syncDate.toISOString());

      } else {
        throw new Error('Error al obtener datos mediante el API');
      }
    } catch (err) {
      console.error('Fetch real data failed:', err);
      if (unifiedClients.length === 0) {
        const initialUnified = unifyClients([], mockTiendanubeOrders);
        setUnifiedClients(initialUnified);
      }
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

      const [customersRes, ordersRes] = await Promise.all([
        api.fetchCustomers(),
        api.fetchAllOrders()
      ]);

      if (customersRes.success && ordersRes.success) {
        const mappedOrders = mapTiendanubeDataToUnified(customersRes.data, ordersRes.data);
        const newUnified = unifyClients([], mappedOrders);
        setUnifiedClients(newUnified);
        setConnectionStatus('connected');
        setStoreId(sid);
        setLastSync(new Date());
        
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

    // Deep clone and filter orders for each client
    return unifiedClients.map(client => {
      if (!client.purchases) return client;
      
      const filteredPurchases = client.purchases.filter(purchase => {
        if (!purchase.date) return false;
        const purchaseDate = new Date(purchase.date);
        return purchaseDate >= start && purchaseDate <= end;
      });

      // Recalculate metrics based on filtered orders
      const totalSpent = filteredPurchases.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      
      return {
        ...client,
        purchases: filteredPurchases,
        purchaseCount: filteredPurchases.length,
        totalSpent: totalSpent
      };
    }).filter(client => client.purchaseCount > 0);
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

  const renderView = () => {
    switch(activeView) {
      case 'dashboard':
        return (
          <>
            {/* Hero Header */}
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

            {/* Goal Banner - Full Width */}
            <GoalTrackerBanner clients={filteredClients} dateRange={dateRange} />

            {/* Bento Metrics Grid */}
            <StatsCards clients={filteredClients} metaInsights={metaInsights} ga4Insights={ga4Insights} />

            {/* Lower Bento: Funnels + Campaigns + Top Clients */}
            <div className="bento-grid" style={{ marginTop: 16, gridAutoRows: 'minmax(200px, auto)' }}>
              {/* Frequency Funnel - takes 5 cols */}
              <div className="glass-card bento-span-5 bento-row-2" style={{ minHeight: 400, padding: 0, overflow: 'hidden' }}>
                <FrequencyFunnel clients={filteredClients} onSelectClient={setSelectedClient} />
              </div>
              
              {/* Active Campaigns Widget - takes 4 cols */}
              <div className="glass-card bento-span-4 bento-row-2" style={{ minHeight: 400, padding: 0, overflow: 'hidden' }}>
                <ActiveCampaignsWidget workspace={workspaceData} onRefreshMeta={() => { if (workspaceData?.meta_ad_account_id && workspaceData?.meta_access_token) { const m = new (MetaAPI)(workspaceData.meta_ad_account_id, workspaceData.meta_access_token); m.getInsights(dateRange).then(r => { if (r) setMetaInsights(r); }); }}} />
              </div>
              
              {/* Top Clients - takes 3 cols */}
              <div className="glass-card bento-span-3 bento-row-2" style={{ padding: 0, display: 'flex', flexDirection: 'column', minHeight: 400 }}>
                <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--on-surface)' }}>
                    <Award size={18} color="#f59e0b" /> Top Clientes
                  </h3>
                </div>
                  {filteredClients.slice(0, 8).map((client, i) => (
                    <div 
                      key={client.id} 
                      className="top-client-item"
                      onClick={() => setSelectedClient(client)}
                      style={{ 
                        padding: '14px 24px', 
                        borderBottom: '1px solid rgba(255,255,255,0.04)', 
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: `hsl(${(i * 47) % 360}, 60%, 25%)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700, color: '#fff',
                        flexShrink: 0,
                      }}>
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
              
              {/* Geo Funnel - full width bottom */}
              <div className="glass-card bento-span-12" style={{ padding: 0, overflow: 'hidden' }}>
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
        return <MetaAdsPanel metaInsights={metaInsights} workspace={workspaceData} dateRange={dateRange} onRefreshMeta={() => { if (workspaceData?.meta_ad_account_id && workspaceData?.meta_access_token) { const m = new MetaAPI(workspaceData.meta_ad_account_id, workspaceData.meta_access_token); m.getInsights(dateRange).then(r => { if (r) setMetaInsights(r); }); }}} />;
      case 'ga4':
        return <GA4Panel ga4Insights={ga4Insights} />;
      case 'pipeline':
        return <CampaignPipeline session={session} unifiedClients={filteredClients} />;
      case 'pqr':
        return <PQRPanel session={session} />;
      case 'configuracion':
        return <SettingsPanel onConnect={handleConnect} connectionStatus={connectionStatus} session={session} />;
      case 'exportar':
        return <ExportPanel clients={filteredClients} />;
      default:
        return <div>Vista no encontrada</div>;
    }
  };

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <Sidebar 
        activeView={activeView} 
        onNavigate={(view) => { setActiveView(view); setSidebarOpen(false); }} 
        theme={theme}
        toggleTheme={toggleTheme}
      />
      
      <main className="main-content">
        {!['configuracion', 'exportar', 'pqr'].includes(activeView) && (
          <GlobalDatePicker dateRange={dateRange} setDateRange={setDateRange} />
        )}
        
        {isFetchingInsights ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
            <div style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Sincronizando datos del periodo...</div>
          </div>
        ) : (
          renderView()
        )}
      </main>

      {selectedClient && (
        <ClientDetailModal client={selectedClient} onClose={() => setSelectedClient(null)} />
      )}
    </div>
  );
}
