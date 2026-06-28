import React, { useState, useEffect } from 'react';

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

// Data & Logic
import historicClientsData from './data/mockHistoricClients';
import mockTiendanubeOrders from './data/mockTiendanubeOrders';
import { unifyClients } from './utils/unifyClients';
import { TiendanubeAPI, mapTiendanubeDataToUnified } from './utils/tiendanubeAPI';

export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  
  const [historicClients, setHistoricClients] = useState([]);
  const [unifiedClients, setUnifiedClients] = useState([]);
  
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [storeId, setStoreId] = useState(null);
  const [lastSync, setLastSync] = useState(null);

  const [needsAuth, setNeedsAuth] = useState(false);
  const [authStoreId, setAuthStoreId] = useState(null);

  // ── 0. Inicialización de Nexo (Para evitar que TiendaNube mate el iframe) ────────────────
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

  // ── 1. Detección de Credenciales (OAuth + LocalStorage) ────────────────
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const installed = urlParams.get('installed');
    const storeFromUrl = urlParams.get('store') || urlParams.get('store_id');
    const tokenFromUrl = urlParams.get('token');

    let currentStore = null;
    let currentToken = null;

    try {
      currentStore = localStorage.getItem('apes_store_id');
      currentToken = localStorage.getItem('apes_store_token');
    } catch (e) {
      console.warn('LocalStorage no disponible (posible bloqueo de cookies de terceros en iframe).', e);
    }

    // Si recibimos un token de la redirección OAuth
    if (installed === 'true' && storeFromUrl && tokenFromUrl) {
      currentStore = storeFromUrl;
      currentToken = tokenFromUrl;
      try {
        localStorage.setItem('apes_store_id', currentStore);
        localStorage.setItem('apes_store_token', currentToken);
      } catch (e) {
        console.warn('No se pudo guardar en LocalStorage.', e);
      }
      window.history.replaceState({}, document.title, '/');
    }

    // Si nos falta el token pero TiendaNube nos pasa el store_id (intentó abrir el iframe)
    if (!currentToken && storeFromUrl) {
      setNeedsAuth(true);
      setAuthStoreId(storeFromUrl);
      return;
    }

    if (currentStore && currentToken) {
      setStoreId(currentStore);
      fetchRealData(currentStore, currentToken);
    } else {
      // Sin tienda o token: usar mock data en modo demo
      const initialUnified = unifyClients([], mockTiendanubeOrders);
      setUnifiedClients(initialUnified);
      setLastSync(new Date());
    }
  }, [historicClients]);

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

  // Auto-refresh polling (every 5 minutes)
  useEffect(() => {
    const currentToken = localStorage.getItem('apes_store_token');
    if (!storeId || !currentToken || connectionStatus !== 'connected') return;
    const interval = setInterval(() => {
      fetchRealData(storeId, currentToken);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [storeId, connectionStatus]);

  // ── 2. Fetch via TiendanubeAPI (Serverless Edge Proxy) ────────────────────────
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
        setLastSync(new Date());
      } else {
        throw new Error('Error al obtener datos mediante el API');
      }
    } catch (err) {
      console.error('Fetch real data failed, falling back to demo:', err);
      // Fallback: usar mock data
      const initialUnified = unifyClients([], mockTiendanubeOrders);
      setUnifiedClients(initialUnified);
      setConnectionStatus('disconnected');
    }
  };

  // ── 3. Conectar vía Settings ──────────────────────────
  const handleConnect = async ({ storeId: sid, token }) => {
    setConnectionStatus('connecting');
    const api = new TiendanubeAPI(sid, token);
    
    try {
      const test = await api.testConnection();
      if (!test.success) {
        alert('Error: Verifica tu Token y Store ID');
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
        
        // Guardar las credenciales en local storage
        localStorage.setItem('apes_store_id', sid);
        localStorage.setItem('apes_store_token', token);
        
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

  // ── 4. Render Views ───────────────────────────────────
  const renderView = () => {
    switch(activeView) {
      case 'dashboard':
        return (
          <>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--on-surface)' }}>Centro de Comando</h1>
                <p style={{ fontSize: 13, color: 'var(--on-surface-variant)', margin: '4px 0 0' }}>Métricas ejecutivas y funnel de conversión.</p>
              </div>
              {lastSync && (
                <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', background: 'var(--surface-container-low)', padding: '4px 10px', borderRadius: 20, border: '1px solid var(--border-subtle)' }}>
                  Última sinc: {lastSync.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
            
            <StatsCards clients={unifiedClients} />
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 1fr))', gap: 24, marginTop: 24 }}>
              <FrequencyFunnel clients={unifiedClients} onSelectClient={setSelectedClient} />
              <GeoFunnel clients={unifiedClients} onSelectClient={setSelectedClient} />
            </div>

            <div className="glass-card" style={{ padding: '0', marginTop: 24 }}>
              <div style={{ padding: '20px 24px 0 24px' }}>
                <h3 style={{ fontSize: 16, fontWeight: 600 }}>🏆 Top Clientes Recientes</h3>
              </div>
              <MasterTable 
                clients={unifiedClients.slice(0, 5)} 
                onSelectClient={setSelectedClient} 
              />
            </div>
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
              <MasterTable clients={unifiedClients} onSelectClient={setSelectedClient} />
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
            <ClassificationTree clients={unifiedClients} />
          </>
        );
      case 'analitica':
        return (
          <>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--on-surface)' }}>El Cerebro (Analítica)</h1>
              <p style={{ fontSize: 13, color: 'var(--on-surface-variant)', margin: '4px 0 0' }}>Inteligencia de negocio en tiempo real.</p>
            </div>
            <AnalyticsPanel clients={unifiedClients} />
          </>
        );
      case 'marketing':
        return <MarketingReport clients={unifiedClients} />;
      case 'configuracion':
        return <SettingsPanel onConnect={handleConnect} connectionStatus={connectionStatus} />;
      case 'exportar':
        return <ExportPanel clients={unifiedClients} />;
      default:
        return <div>Vista no encontrada</div>;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar 
        activeView={activeView} 
        onNavigate={(view) => { setActiveView(view); setSidebarOpen(false); }} 
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      
      <main className="main-content">
        {renderView()}
      </main>

      {selectedClient && (
        <ClientDetailModal client={selectedClient} onClose={() => setSelectedClient(null)} />
      )}
    </div>
  );
}
