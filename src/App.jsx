import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './lib/supabase';
import { Award } from 'lucide-react';
import { useRealtimeSync } from './hooks/useRealtimeSync';

import Sidebar from './components/Sidebar';
import StatsCards from './components/StatsCards';
import MasterTable from './components/MasterTable';
import ClassificationTree from './components/ClassificationTree';
import AnalyticsPanel from './components/AnalyticsPanel';
import BrandIntelligenceCenter from './components/BrandIntelligenceCenter';
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
import MerchantCenterPanel from './components/MerchantCenterPanel';
import SearchConsolePanel from './components/SearchConsolePanel';
import LogisticsCenter from './components/LogisticsCenter';

import ErrorBoundary from './components/ErrorBoundary';

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
import { MerchantCenterAPI, mapMerchantCenterToUnified } from './api/MerchantCenterAPI';
import { SearchConsoleAPI, fetchSearchConsoleInsights } from './api/SearchConsoleAPI';
import { AIInsightsEngine } from './api/AIInsightsEngine';
import { GA4API } from './api/GA4API';
import { MetaAPI } from './api/MetaAPI';
import { MetaAdLibraryAPI } from './api/MetaAdLibraryAPI';
import SyncProgressOverlay from './components/SyncProgressOverlay';
import CompetitiveIntelligencePanel from './components/CompetitiveIntelligencePanel';
import MarketingCommandCenter from './components/MarketingCommandCenter';
import GoogleAdsPanel from './components/GoogleAdsPanel';
import TikTokAdsPanel from './components/TikTokAdsPanel';
import ReportGenerator from './components/ReportGenerator';
import AIChatAgent from './components/AIChatAgent';
import UTMBuilder from './components/UTMBuilder';
import GoogleAdsAPI from './api/GoogleAdsAPI';
import TikTokAdsAPI from './api/TikTokAdsAPI';

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
    return 'dark'; // Force premium dark mode by default
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
  const [metaInsightsLoading, setMetaInsightsLoading] = useState(false);
  const metaFetchRef = useRef(null);
  const [ga4Insights, setGa4Insights] = useState(null);
  const [mcProducts, setMcProducts] = useState([]);
  const [mcPerformance, setMcPerformance] = useState(null);
  const [gscQueries, setGscQueries] = useState([]);
  const [gscPages, setGscPages] = useState([]);
  const [gscPerformance, setGscPerformance] = useState(null);
  const [googleAdsData, setGoogleAdsData] = useState(null);
  const [tiktokData, setTiktokData] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [isFetchingAI, setIsFetchingAI] = useState(false);
  const [workspaceData, setWorkspaceData] = useState(null);

  const [authStoreId, setAuthStoreId] = useState(null);

  // Last sync timestamps for incremental sync
  const lastSyncTimestamps = useRef({ orders: 0, products: 0, clients: 0 });

  // Predictive preload on hover
  const preloadRef = useRef(new Set());

  // Global Date State
  const initialDates = calculateDates('30d');
  const [dateRange, setDateRange] = useState({
    preset: '30d',
    metaPreset: 'last_30d',
    startDate: initialDates.start,
    endDate: initialDates.end
  });
  
  const [isRefreshingStock, setIsRefreshingStock] = useState(false);

  // Sync Progress State
  const [syncProgress, setSyncProgress] = useState({
    isVisible: false,
    currentStep: 0,
    stepProgress: 0,
    overallProgress: 0,
    statusMessage: '',
    error: null,
  });

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
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;
      if (error) console.error('getSession error:', error);
      setSession(session);
      setAuthLoading(false);
    }).catch(err => {
      if (mounted) {
        console.error('getSession failed:', err);
        setAuthLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setSession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
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
      // Load cached clients and orders for instant UI restore (IndexedDB)
      try {
        const [cachedClients, cachedOrders, cachedLastSync] = await Promise.all([
          loadFromCache('unified_clients'),
          loadFromCache('raw_orders'),
          loadFromCache('last_sync'),
        ]);
        if (cachedClients) { setUnifiedClients(cachedClients); console.log('[App] Restored', cachedClients.length, 'clients from cache'); }
        if (cachedOrders) { setRawOrders(cachedOrders); console.log('[App] Restored', cachedOrders.length, 'orders from cache'); }
        if (cachedLastSync) setLastSync(new Date(cachedLastSync));
      } catch (err) { console.warn('No se pudo cargar datos desde caché local', err); }

      setIsSyncing(true);

      // 1. Load credentials from Supabase (parallel)
      const [cfgResult, wsResult] = await Promise.all([
        supabase.from('system_config').select('*').eq('id', 'main').single(),
        supabase.from('workspaces')
          .select('tiendanube_store_id, tiendanube_access_token, meta_ad_account_id, meta_access_token, n8n_webhook_url, merchant_center_merchant_id, merchant_center_credentials_json, search_console_site_url, search_console_credentials_json, google_ads_customer_id, google_ads_client_id, google_ads_client_secret, google_ads_refresh_token, google_ads_developer_token, tiktok_advertiser_id, tiktok_access_token, tiktok_app_secret')
          .eq('user_id', session.user.id)
          .single(),
      ]);
      const systemConfig = cfgResult.data;
      const userWorkspace = wsResult.data;
      if (wsResult.error) console.warn('[Workspace] Query warning:', wsResult.error.message);

      const workspace = {
        tiendanube_store_id: import.meta.env.VITE_TIENDANUBE_STORE_ID || systemConfig?.tiendanube_store_id || userWorkspace?.tiendanube_store_id,
        tiendanube_access_token: import.meta.env.VITE_TIENDANUBE_TOKEN || systemConfig?.tiendanube_access_token || userWorkspace?.tiendanube_access_token,
        meta_ad_account_id: import.meta.env.VITE_META_AD_ACCOUNT_ID || systemConfig?.meta_ad_account_id || userWorkspace?.meta_ad_account_id,
        meta_access_token: import.meta.env.VITE_META_ACCESS_TOKEN || systemConfig?.meta_access_token || userWorkspace?.meta_access_token,
        ga4_property_id: import.meta.env.VITE_GA4_PROPERTY_ID || systemConfig?.ga4_property_id || '',
        ga4_credentials_json: import.meta.env.VITE_GA4_CREDENTIALS || systemConfig?.ga4_credentials_json || '',
        n8n_webhook_url: import.meta.env.VITE_N8N_WEBHOOK_URL || systemConfig?.n8n_webhook_url || userWorkspace?.n8n_webhook_url,
        merchant_center_merchant_id: import.meta.env.VITE_MERCHANT_CENTER_MERCHANT_ID || systemConfig?.merchant_center_merchant_id || userWorkspace?.merchant_center_merchant_id,
        merchant_center_credentials_json: import.meta.env.VITE_MERCHANT_CENTER_CREDENTIALS || systemConfig?.merchant_center_credentials_json || userWorkspace?.merchant_center_credentials_json,
        search_console_site_url: import.meta.env.VITE_SEARCH_CONSOLE_SITE_URL || systemConfig?.search_console_site_url || userWorkspace?.search_console_site_url,
        search_console_credentials_json: import.meta.env.VITE_SEARCH_CONSOLE_CREDENTIALS || systemConfig?.search_console_credentials_json || userWorkspace?.search_console_credentials_json,
        google_ads_customer_id: import.meta.env.VITE_GOOGLE_ADS_CUSTOMER_ID || systemConfig?.google_ads_customer_id || userWorkspace?.google_ads_customer_id,
        google_ads_client_id: import.meta.env.VITE_GOOGLE_ADS_CLIENT_ID || systemConfig?.google_ads_client_id || userWorkspace?.google_ads_client_id,
        google_ads_client_secret: import.meta.env.VITE_GOOGLE_ADS_CLIENT_SECRET || systemConfig?.google_ads_client_secret || userWorkspace?.google_ads_client_secret,
        google_ads_refresh_token: import.meta.env.VITE_GOOGLE_ADS_REFRESH_TOKEN || systemConfig?.google_ads_refresh_token || userWorkspace?.google_ads_refresh_token,
        google_ads_developer_token: import.meta.env.VITE_GOOGLE_ADS_DEVELOPER_TOKEN || systemConfig?.google_ads_developer_token || userWorkspace?.google_ads_developer_token,
        tiktok_advertiser_id: import.meta.env.VITE_TIKTOK_ADS_ADVERTISER_ID || systemConfig?.tiktok_advertiser_id || userWorkspace?.tiktok_advertiser_id,
        tiktok_access_token: import.meta.env.VITE_TIKTOK_ADS_ACCESS_TOKEN || systemConfig?.tiktok_access_token || userWorkspace?.tiktok_access_token,
        tiktok_app_secret: import.meta.env.VITE_TIKTOK_ADS_APP_SECRET || systemConfig?.tiktok_app_secret || userWorkspace?.tiktok_app_secret,
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
          currentStore = storeFromUrl; currentToken = tokenFromUrl;
          await supabase.from('workspaces').upsert({ user_id: session.user.id, tiendanube_store_id: currentStore, tiendanube_access_token: currentToken });
          window.history.replaceState({}, document.title, '/');
        } else if (storeFromUrl) {
          setAuthStoreId(storeFromUrl); setIsSyncing(false); return;
        }
      }

      // Auto-seed if credentials missing
      const needsSeed = !systemConfig?.ga4_property_id || !systemConfig?.meta_access_token || !systemConfig?.merchant_center_merchant_id || !currentToken;
      if (needsSeed) {
        try {
          const { data: { session: authSession } } = await supabase.auth.getSession();
          if (authSession?.access_token) {
            const seedRes = await fetch('/api/seed/credentials', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authSession.access_token}` }, body: JSON.stringify({}) });
            const seedData = await seedRes.json();
            console.log('[Seed]', seedData);
            if (seedData.saved) {
              const [newCfg, newWs] = await Promise.all([
                supabase.from('system_config').select('*').eq('id', 'main').single(),
                supabase.from('workspaces').select('*').eq('user_id', session.user.id).single(),
              ]);
              const merged = { ...newCfg.data, ...newWs.data };
              setWorkspaceData(prev => ({ ...prev, ...merged }));
              if (merged?.tiendanube_store_id && merged?.tiendanube_access_token) {
                setStoreId(merged.tiendanube_store_id);
                currentStore = merged.tiendanube_store_id;
                currentToken = merged.tiendanube_access_token;
              }
            }
          }
        } catch (seedErr) { console.warn('[Seed] Auto-seed failed:', seedErr); }
      }

      // ════════════════════════════════════════════════════════════════════
      // MAIN LOAD: Read from server cache snapshot (instant!)
      // ════════════════════════════════════════════════════════════════════
      try {
        const snapshotRes = await fetch('/api/data/snapshot');
        const snapshot = await snapshotRes.json();

        if (snapshot.ready && snapshot.data) {
          console.log(`[Snapshot] Loaded from server cache. Last sync: ${snapshot.lastSync} (${snapshot.syncDuration}ms)`);
          
          // Set all data from cache instantly
          setUnifiedClients(snapshot.data.unifiedClients || []);
          setRawOrders(snapshot.data.rawOrders || []);
          setTiendanubeProducts(snapshot.data.products || []);
          setGa4Insights(snapshot.data.ga4Insights || null);
          setMetaInsights(snapshot.data.metaInsights || null);
          setMcProducts(snapshot.data.mcProducts || []);
          setGscQueries(snapshot.data.gscQueries || []);
          setGscPages(snapshot.data.gscPages || []);
          setGscPerformance(snapshot.data.gscPerformance || null);
          setAiInsights(snapshot.data.aiInsights || null);

          setLastSync(new Date(snapshot.lastSync));
          setStoreId(currentStore);
          setConnectionStatus('connected');
          setIsSyncing(false);

          // Save to local IndexedDB for offline fallback
          saveToCache('unified_clients', snapshot.data.unifiedClients || []);
          saveToCache('raw_orders', snapshot.data.rawOrders || []);
          saveToCache('tiendanube_products', snapshot.data.products || []);
          saveToCache('last_sync', snapshot.lastSync);

          // If cache is >5 min old, trigger background refresh
          const cacheAge = Date.now() - new Date(snapshot.lastSync).getTime();
          if (cacheAge > 5 * 60 * 1000) {
            console.log(`[Snapshot] Cache is ${Math.round(cacheAge / 60000)}min old, triggering background refresh`);
            fetch('/api/cron/sync').catch(() => {});
          }

          return; // Done! No need for live API calls
        }
      } catch (snapErr) {
        console.warn('[Snapshot] Server cache unavailable, falling back to live sync:', snapErr.message);
      }

      // ════════════════════════════════════════════════════════════════════
      // FALLBACK: Live sync if server cache not ready
      // ════════════════════════════════════════════════════════════════════
      if (currentStore && currentToken) {
        setStoreId(currentStore);
        await fetchRealData(currentStore, currentToken);
      }

      setIsSyncing(false);
    };

    loadData();
  }, [session, authLoading]);

  // ── Centralized Meta Insights fetcher with deduplication ────────────────
  const fetchMetaInsights = useCallback(async (signal) => {
    if (!workspaceData?.meta_ad_account_id || !workspaceData?.meta_access_token) return null;
    
    const metaApi = new MetaAPI(workspaceData.meta_ad_account_id, workspaceData.meta_access_token);
    
    try {
      const res = await metaApi.getInsights(dateRange, signal);
      if (res) setMetaInsights(res);
      return res;
    } catch (err) {
      if (err.name !== 'AbortError') console.error('[Meta] Error:', err);
      return null;
    }
  }, [workspaceData?.meta_ad_account_id, workspaceData?.meta_access_token, dateRange]);

  // ── Centralized snapshot refresher (used by AppContent realtime/polling) ──
  const refreshSnapshot = useCallback(async () => {
    try {
      const snapshotRes = await fetch('/api/data/snapshot');
      const snapshot = await snapshotRes.json();
      if (snapshot.ready && snapshot.data) {
        setUnifiedClients(snapshot.data.unifiedClients || []);
        setRawOrders(snapshot.data.rawOrders || []);
        setTiendanubeProducts(snapshot.data.products || []);
        setGa4Insights(snapshot.data.ga4Insights || null);
        setMetaInsights(snapshot.data.metaInsights || null);
        setMcProducts(snapshot.data.mcProducts || []);
        setGscQueries(snapshot.data.gscQueries || []);
        setGscPages(snapshot.data.gscPages || []);
        setGscPerformance(snapshot.data.gscPerformance || null);
        setAiInsights(snapshot.data.aiInsights || null);
        setLastSync(new Date(snapshot.lastSync));
        saveToCache('unified_clients', snapshot.data.unifiedClients || []);
        saveToCache('raw_orders', snapshot.data.rawOrders || []);
        saveToCache('tiendanube_products', snapshot.data.products || []);
        saveToCache('last_sync', snapshot.lastSync);
      }
    } catch (err) { console.warn('[Snapshot] Refresh failed:', err.message); }
  }, []);

  // ── Fetch Insights when dateRange or workspace changes ────────────────
  const insightsFetchedRef = useRef(false);
  useEffect(() => {
    if (!workspaceData) return;
    // Skip first fire if snapshot already loaded data (avoid overwriting cache)
    if (!insightsFetchedRef.current && metaInsights && ga4Insights) {
      insightsFetchedRef.current = true;
      return;
    }
    insightsFetchedRef.current = true;

    const fetchInsights = async () => {
      // Cancel any in-flight request
      if (metaFetchRef.current) metaFetchRef.current.abort();
      metaFetchRef.current = new AbortController();
      
      setMetaInsightsLoading(true);
      
      try {
        // Meta Ads — silent fail
        try {
          await fetchMetaInsights(metaFetchRef.current.signal);
        } catch (e) { console.warn('[Meta Insights] Skipped:', e.message); }

        // GA4 — silent fail, reutiliza credenciales de MC si no tiene las suyas
        try {
          const ga4CredsFallback = workspaceData?.ga4_credentials_json || workspaceData?.merchant_center_credentials_json;
          if (workspaceData?.ga4_property_id && ga4CredsFallback) {
            const ga4Api = new GA4API(ga4CredsFallback, workspaceData.ga4_property_id);
            const res = await ga4Api.getInsights(dateRange.startDate, dateRange.endDate);
            if (res) setGa4Insights(res);
          }
        } catch (e) { console.warn('[GA4 Insights] Skipped:', e.message); }
      } finally {
        setMetaInsightsLoading(false);
      }
    };

    // Google Merchant Center
    const fetchMC = async () => {
      if (workspaceData.merchant_center_merchant_id && workspaceData.merchant_center_credentials_json) {
        try {
          const mcApi = new MerchantCenterAPI(workspaceData.merchant_center_credentials_json, workspaceData.merchant_center_merchant_id);
          const test = await mcApi.testConnection();
          if (test.success) {
            const [productsRes, perfRes] = await Promise.all([
              mcApi.fetchAllProducts({ includeInvalid: false }),
              mcApi.getProductPerformance({ startDate: dateRange.startDate, endDate: dateRange.endDate }).catch(() => ({ rows: [] })),
            ]);
            if (productsRes.products) {
              const unified = mapMerchantCenterToUnified(productsRes.products);
              setMcProducts(unified);
              await saveToCache('mc_products', unified);
            }
            if (perfRes.rows) {
              setMcPerformance(perfRes.rows);
            }
          }
        } catch (e) {
          console.error('[Merchant Center] Error:', e);
        }
      }
    };

    // Google Search Console
    const fetchGSC = async () => {
      if (workspaceData.search_console_site_url && workspaceData.search_console_credentials_json) {
        try {
          const gscResult = await fetchSearchConsoleInsights(
            workspaceData.search_console_site_url,
            workspaceData.search_console_credentials_json,
            { startDate: dateRange.startDate, endDate: dateRange.endDate }
          );
          if (gscResult.success) {
            setGscQueries(gscResult.data.topQueries);
            setGscPages(gscResult.data.topPages);
            setGscPerformance(gscResult.data);
          }
        } catch (e) {
          console.error('[Search Console] Error:', e);
        }
      }
    };

    // AI Insights (Gemini) - runs after other data is available
    const fetchAI = async () => {
      if (workspaceData.gemini_api_key && (metaInsights || ga4Insights || mcProducts.length || gscQueries.length)) {
        setIsFetchingAI(true);
        try {
          const data = {
            clients: unifiedClients,
            orders: rawOrders,
            products: tiendanubeProducts,
            adsData: metaInsights,
            ga4Data: ga4Insights,
            merchantData: { products: mcProducts, performance: mcPerformance },
            searchConsoleData: { topQueries: gscQueries, topPages: gscPages, ...gscPerformance },
          };
          const insights = await AIInsightsEngine.generateInsights(data, { dateRange: dateRange.preset, storeName: 'TiendaNueve' });
          setAiInsights(insights);
        } catch (e) {
          console.error('[AI Insights] Error:', e);
        } finally {
          setIsFetchingAI(false);
        }
      }
    };

    // Run all fetches — with safety timeout so UI never gets stuck
    const runAll = async () => {
      setIsFetchingInsights(true);
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000));
      try {
        await Promise.race([
          (async () => {
            await Promise.allSettled([fetchInsights(), fetchMC(), fetchGSC()]);
            await fetchAI().catch(e => console.warn('[AI] Error:', e));
          })(),
          timeout,
        ]);
      } catch (e) {
        console.warn('[Insights runAll] Finished with warning:', e.message);
      } finally {
        setIsFetchingInsights(false);
      }
    };

    runAll();
    // Only trigger re-fetch when dateRange or workspaceData change
    // DO NOT add fetchMetaInsights — it depends on dateRange/workspaceData already, creating duplicate triggers
  }, [dateRange, workspaceData]);

  // Fallback polling — re-read from server cache every 2 minutes
  useEffect(() => {
    if (!storeId || connectionStatus !== 'connected') return;
    const POLL_INTERVAL = 2 * 60 * 1000;
    const interval = setInterval(async () => {
      try {
        const snapshotRes = await fetch('/api/data/snapshot');
        const snapshot = await snapshotRes.json();
        if (snapshot.ready && snapshot.data) {
          setUnifiedClients(snapshot.data.unifiedClients || []);
          setRawOrders(snapshot.data.rawOrders || []);
          setTiendanubeProducts(snapshot.data.products || []);
          setGa4Insights(snapshot.data.ga4Insights || null);
          setMetaInsights(snapshot.data.metaInsights || null);
          setMcProducts(snapshot.data.mcProducts || []);
          setGscQueries(snapshot.data.gscQueries || []);
          setGscPages(snapshot.data.gscPages || []);
          setGscPerformance(snapshot.data.gscPerformance || null);
          setLastSync(new Date(snapshot.lastSync));
          saveToCache('unified_clients', snapshot.data.unifiedClients || []);
          saveToCache('raw_orders', snapshot.data.rawOrders || []);
          saveToCache('tiendanube_products', snapshot.data.products || []);
          saveToCache('last_sync', snapshot.lastSync);
        }
      } catch (e) { console.warn('[Poll] Snapshot refresh failed:', e.message); }
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [storeId, connectionStatus]);

  // Manual sync: trigger server-side cron + reload snapshot
  const handleManualSync = useCallback(async () => {
    setConnectionStatus('connecting');
    try {
      // Trigger server-side sync
      await fetch('/api/cron/sync', { method: 'GET' }).catch(() => {});
      // Wait a moment for sync to complete, then load snapshot
      await new Promise(r => setTimeout(r, 2000));
      await refreshSnapshot();
      setConnectionStatus('connected');
    } catch (e) {
      console.error('[ManualSync] Error:', e);
      setConnectionStatus('connected');
    }
  }, []);

  const fetchRealData = async (sid, token, options = {}) => {
    const { isManual = false, incremental = false } = options;
    const isSilent = !isManual;
    // Only show 'connecting' status on manual/initial syncs to avoid UI flicker
    if (!isSilent) setConnectionStatus('connecting');
    
    const steps = [
      { key: 'config', label: 'Configuración', message: 'Inicializando conexión...' },
      { key: 'data', label: 'Datos principales', message: 'Clientes, pedidos y productos en paralelo...' },
      { key: 'unify', label: 'Unificación', message: 'Fusionando clientes y enriqueciendo datos...' },
      { key: 'cache', label: 'Caché', message: 'Guardando productos y datos unificados...' },
      { key: 'insights', label: 'Insights IA', message: 'Generando análisis con Gemini AI...' },
      { key: 'external', label: 'Fuentes externas', message: 'GA4, Meta Ads, Merchant Center, Search Console...' },
      { key: 'complete', label: 'Completado', message: '¡Todo listo para operar!' },
    ];
    
    const totalSteps = steps.length;
    
    const updateStep = (stepIndex, stepProgress = 0, message = '') => {
      const overallProgress = Math.round(((stepIndex + stepProgress) / totalSteps) * 100);
      setSyncProgress({
        isVisible: !isSilent,
        isSilent,
        currentStep: stepIndex,
        stepProgress: stepProgress * 100,
        overallProgress,
        statusMessage: message || steps[stepIndex]?.message || '',
        error: null,
      });
    };
    
    const api = new TiendanubeAPI(sid, token);
    
    try {
      updateStep(0, 0, 'Inicializando conexión...');
      updateStep(0, 1);
      
      updateStep(1, 0, 'Descargando datos principales...');
      const [customersRes, ordersRes, productsRes] = await Promise.all([
        api.fetchCustomers(),
        api.fetchAllOrders(),
        api.fetchAllProducts(),
      ]);
      
      if (!customersRes.success) throw new Error(customersRes.error?.message || 'Error clientes');
      if (!ordersRes.success) throw new Error(ordersRes.error?.message || 'Error pedidos');
      updateStep(1, 1);
      
      updateStep(2, 0, 'Procesando y unificando datos...');
      const mappedOrders = mapTiendanubeDataToUnified(customersRes.data, ordersRes.data);
      const newUnified = unifyClients([], mappedOrders);
      updateStep(2, 1);
      
      setRawOrders(mappedOrders);
      setUnifiedClients(newUnified);
      
      updateStep(3, 0, 'Guardando en caché...');
      if (productsRes.success) {
        setTiendanubeProducts(productsRes.data);
        saveToCache('tiendanube_products', productsRes.data);
      }
      
      const syncDate = new Date();
      setLastSync(syncDate);
      saveToCache('unified_clients', newUnified);
      saveToCache('last_sync', syncDate.toISOString());
      updateStep(3, 1);
      
      updateStep(4, 0, 'Generando insights con IA...');
      const aiPromise = (async () => {
        try {
          const insights = await AIInsightsEngine.generateInsights({ 
            clients: newUnified, 
            orders: mappedOrders, 
            products: productsRes.data || [] 
          }, { dateRange: dateRange.preset });
          setAiInsights(insights);
        } catch (e) { console.warn('AI Insights failed:', e); }
      })();
      
      updateStep(5, 0, 'Sincronizando fuentes externas...');
      const externalApis = [];
      
      // GA4: reutilizar credenciales de MC si no tiene las suyas propias
      const ga4Creds = workspaceData?.ga4_credentials_json || workspaceData?.merchant_center_credentials_json;
      const ga4PropId = workspaceData?.ga4_property_id;
      console.log('[GA4] Property ID:', ga4PropId || '(no configurado)', '| Creds:', ga4Creds ? 'disponibles' : 'no disponibles');
      if (ga4PropId && ga4Creds) {
        externalApis.push({ name: 'Google Analytics', promise: new GA4API(ga4Creds, ga4PropId).getInsights(dateRange.startDate, dateRange.endDate).then(res => { if (res) setGa4Insights(res); }).catch(err => console.warn('[GA4] Error:', err.message)) });
      } else {
        console.warn('[GA4] Saltado: falta Property ID o credenciales');
      }
      if (workspaceData?.meta_ad_account_id && workspaceData?.meta_access_token) {
        externalApis.push({ name: 'Meta Ads', promise: fetchMetaInsights(new AbortController().signal) });
      }
      if (workspaceData?.merchant_center_merchant_id && workspaceData?.merchant_center_credentials_json) {
        externalApis.push({ name: 'Merchant Center', promise: new MerchantCenterAPI(workspaceData.merchant_center_credentials_json, workspaceData.merchant_center_merchant_id).fetchAllProducts().then(res => { if (res.products) { const u = mapMerchantCenterToUnified(res.products); setMcProducts(u); } }) });
      }
      if (workspaceData?.search_console_site_url && workspaceData?.search_console_credentials_json) {
        externalApis.push({ name: 'Search Console', promise: fetchSearchConsoleInsights(workspaceData.search_console_site_url, workspaceData.search_console_credentials_json, { startDate: dateRange.startDate, endDate: dateRange.endDate }).then(res => { if (res.success) { setGscQueries(res.data.topQueries); setGscPages(res.data.topPages); setGscPerformance(res.data); } }) });
      }
      if (workspaceData?.google_ads_customer_id && workspaceData?.google_ads_refresh_token) {
        externalApis.push({ name: 'Google Ads', promise: new GoogleAdsAPI({ customerId: workspaceData.google_ads_customer_id, clientId: workspaceData.google_ads_client_id, clientSecret: workspaceData.google_ads_client_secret, refreshToken: workspaceData.google_ads_refresh_token, developerToken: workspaceData.google_ads_developer_token }).fetchCampaigns(dateRange).then(campaigns => setGoogleAdsData(prev => ({ ...prev, campaigns }))).catch(() => {}) });
      }
      if (workspaceData?.tiktok_advertiser_id && workspaceData?.tiktok_access_token) {
        externalApis.push({ name: 'TikTok Ads', promise: new TikTokAdsAPI({ advertiserId: workspaceData.tiktok_advertiser_id, accessToken: workspaceData.tiktok_access_token, appSecret: workspaceData.tiktok_app_secret }).fetchCampaigns(dateRange).then(campaigns => setTiktokData(prev => ({ ...prev, campaigns }))).catch(() => {}) });
      }
      
      for (let i = 0; i < externalApis.length; i++) {
        const api = externalApis[i];
        updateStep(5, i / externalApis.length, `${api.name}...`);
        try {
          await api.promise;
        } catch (e) { console.warn(`${api.name} failed:`, e); }
      }
      
      try {
        await aiPromise;
      } catch (e) { console.warn('AI Insights failed:', e); }
      updateStep(4, 1);
      
      updateStep(5, 1);
      updateStep(6, 1);
      
setConnectionStatus('connected');
       
       if (!isSilent) {
         setTimeout(() => {
           setSyncProgress(p => ({ ...p, isVisible: false, currentStep: 0, stepProgress: 0, overallProgress: 0, statusMessage: '' }));
         }, 300);
       }
      
    } catch (err) {
      console.error('Fetch real data failed:', err);
      setConnectionStatus('disconnected');
      const errorMsg = err.message || 'Error en la sincronización';
      if (!isSilent) {
        setSyncProgress(p => ({ ...p, error: errorMsg, statusMessage: errorMsg }));
      }
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
  
  // ── Competitive Intelligence State ────────────────────────────────────────
  const [competitors, setCompetitors] = useState([]);
  const [landscape, setLandscape] = useState(null);
  const [insights, setInsights] = useState(null);
  const [ciLoading, setCiLoading] = useState(false);

  const handleAddCompetitor = async (competitor) => {
    const exists = competitors.some(c => c.pageId === competitor.pageId);
    if (exists) {
      alert('Este competidor ya está en la lista');
      return;
    }
    setCompetitors(prev => [...prev, { ...competitor, _id: Date.now().toString() }]);
    // Save to cache
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

  // Load competitors on app start
  useEffect(() => {
    if (session && !authLoading) {
      loadCompetitorsFromCache();
    }
  }, [session, authLoading]);

  // ── Filter Clients locally based on Date Picker ──────────────────────
  // Uses string comparison (YYYY-MM-DD is lexicographically sortable)
  // to avoid timezone issues with new Date() parsing.
  const filteredClients = React.useMemo(() => {
    if (!unifiedClients || unifiedClients.length === 0) return [];

    const startDate = dateRange.startDate || '';
    const endDate = dateRange.endDate || '';

    return unifiedClients.map(client => {
      const purchases = client.purchases || [];
      const allTimeCount = client.purchaseCount || client.totalOrders || purchases.length;
      const allTimeSpent = client.totalSpent || purchases.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      const uiSegment = allTimeCount === 0 ? 'abandoned' : allTimeCount === 1 ? 'regular' : 'vip';

      if (!purchases.length) {
        return { ...client, purchaseCount: 0, totalSpent: 0, allTimePurchaseCount: allTimeCount, allTimeTotalSpent: allTimeSpent, segment: uiSegment };
      }

      const filteredPurchases = purchases.filter(purchase => {
        if (!purchase.date) return false;
        const d = typeof purchase.date === 'string' ? purchase.date.substring(0, 10) : '';
        return d >= startDate && d <= endDate;
      });

      const filteredTotal = filteredPurchases.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

      return {
        ...client,
        purchases,
        purchaseCount: filteredPurchases.length,
        totalSpent: filteredTotal,
        allTimePurchaseCount: allTimeCount,
        allTimeTotalSpent: allTimeSpent,
        filteredPurchaseCount: filteredPurchases.length,
        filteredTotalSpent: filteredTotal,
        segment: uiSegment,
      };
    });
  }, [unifiedClients, dateRange.startDate, dateRange.endDate]);


  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#091c35', color: 'white' }}>
        <h2>Cargando...</h2>
      </div>
    );
  }

  if (!session) {
    return (
      <ErrorBoundary>
        <AuthScreen onAuth={(s) => setSession(s)} />
      </ErrorBoundary>
    );
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
        metaInsightsLoading={metaInsightsLoading}
        googleAdsData={googleAdsData}
        tiktokData={tiktokData}
        gscPerformance={gscPerformance}
        mcProducts={mcProducts}
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
        aiInsights={aiInsights}
        ciLoading={ciLoading}
        onRefreshCompetitive={handleGenerateLandscape}
        onAddCompetitor={handleAddCompetitor}
        onAnalyzeCompetitor={handleAnalyzeCompetitor}
        onRemoveCompetitor={handleRemoveCompetitor}
        fetchMetaInsights={fetchMetaInsights}
        setWorkspaceData={setWorkspaceData}
        handleManualSync={handleManualSync}
        refreshSnapshot={refreshSnapshot}
      />
</TeamProvider>
      </ErrorBoundary>
    );
  }

function AppContent({
  activeView, setActiveView, theme, toggleTheme, sidebarOpen, setSidebarOpen,
  selectedClient, setSelectedClient, historicClients, unifiedClients, rawOrders,
  tiendanubeProducts, connectionStatus, storeId, lastSync, metaInsights, ga4Insights,
  metaInsightsLoading, googleAdsData, tiktokData, gscPerformance, mcProducts,
  workspaceData, isRefreshingStock, refreshStock, isSyncing, isFetchingInsights,
  session, dateRange, setDateRange, filteredClients, handleConnect, fetchRealData,
  syncProgress, setSyncProgress,
  competitors, landscape, insights, aiInsights, ciLoading,
  onRefreshCompetitive, onAddCompetitor, onAnalyzeCompetitor, onRemoveCompetitor,
  fetchMetaInsights, setWorkspaceData, handleManualSync, refreshSnapshot,
}) {
  const { currentMember, ROLE_LABELS, ROLE_COLORS, ROLE_ICONS } = useTeam();

  const snapshotRefreshTimerRef = useRef(null);
  const lastSyncRef = useRef(null);

  // Real-time sync: SSE + Supabase Realtime + Broadcast
  const handleRealtimeEvent = useCallback((data) => {
    if (data.type === 'config-changed' || data.table === 'system_config') {
      // Config changed - reload workspace data
      const loadConfig = async () => {
        const { data: config } = await supabase.from('system_config').select('*').eq('id', 'main').single();
        if (config) setWorkspaceData(prev => ({ ...prev, ...config }));
      };
      loadConfig();
    }
    if (data.type === 'order-changed' || data.event?.includes('order')) {
      // Order changed - refresh orders and clients
      const token = workspaceData?.tiendanube_access_token;
      if (storeId && token) fetchRealData(storeId, token, { isManual: false });
    }
    if (data.type === 'product-changed' || data.event?.includes('product')) {
      // Product changed - refresh products
      const token = workspaceData?.tiendanube_access_token;
      if (storeId && token) fetchRealData(storeId, token, { isManual: false });
    }
  }, [storeId, workspaceData, setWorkspaceData, fetchRealData]);

  const { connected: syncConnected, lastEvent } = useRealtimeSync({
    onConfigChange: handleRealtimeEvent,
    onOrderChange: handleRealtimeEvent,
    onProductChange: handleRealtimeEvent,
    onBroadcast: handleRealtimeEvent,
  });

  // ── Snapshot refresh helper (debounced, delegates to App-level refreshSnapshot) ─
  const debouncedRefresh = useCallback(() => {
    if (snapshotRefreshTimerRef.current) clearTimeout(snapshotRefreshTimerRef.current);
    snapshotRefreshTimerRef.current = setTimeout(() => {
      refreshSnapshot();
    }, 1500);
  }, [refreshSnapshot]);

  // ── Supabase Realtime: auto-refresh when server cache updates ──────────
  useEffect(() => {
    if (!session?.user?.id) return;
    let realtimeActive = false;
    const channel = supabase
      .channel('cache-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'server_cache', filter: 'id=eq.main' }, (payload) => {
        console.log('[Cache Realtime] Server cache updated, refreshing snapshot...');
        realtimeActive = true;
        debouncedRefresh();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') console.log('[Cache Realtime] Watching for server cache updates');
      });

    // Polling fallback: every 60s check if last_sync changed (if realtime isn't active)
    const pollInterval = setInterval(async () => {
      if (realtimeActive) return;
      try {
        const { data } = await supabase.from('server_cache').select('last_sync').eq('id', 'main').single();
        if (data?.last_sync && lastSyncRef.current && data.last_sync > lastSyncRef.current) {
          console.log('[Cache Poll] Server cache updated, refreshing snapshot...');
          debouncedRefresh();
        }
        if (data?.last_sync) lastSyncRef.current = data.last_sync;
      } catch {}
    }, 60000);

    return () => { supabase.removeChannel(channel); clearInterval(pollInterval); if (snapshotRefreshTimerRef.current) clearTimeout(snapshotRefreshTimerRef.current); };
  }, [session, debouncedRefresh]);

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <Sidebar 
        activeView={activeView} 
        onNavigate={(view) => { setActiveView(view); setSidebarOpen(false); setSyncProgress(p => ({ ...p, isVisible: false, error: null })); }} 
        theme={theme}
        toggleTheme={toggleTheme}
        currentMember={currentMember}
        ROLE_LABELS={ROLE_LABELS}
        ROLE_COLORS={ROLE_COLORS}
        ROLE_ICONS={ROLE_ICONS}
      />
      
      <main className="main-content">
        <div className="toolbar-row">
          {!['configuracion', 'exportar', 'pqr', 'inventario', 'taller', 'equipo', 'actividad', 'rendimiento', 'reportes'].includes(activeView) && (
            <div style={{ flex: '1 1 200px', minWidth: 0 }}>
              <GlobalDatePicker dateRange={dateRange} setDateRange={setDateRange} />
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, background: syncConnected ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', fontSize: 11, fontWeight: 600 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: syncConnected ? '#10b981' : '#ef4444', animation: syncConnected ? 'pulse 2s infinite' : 'none' }} />
              <span style={{ color: syncConnected ? '#10b981' : '#ef4444' }}>{syncConnected ? 'Sync' : 'Offline'}</span>
            </div>
            <NotificationCenter />
          </div>
        </div>
        
        <div key={activeView} className="view-enter" style={{ position: 'relative' }}>
          {isFetchingInsights && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              height: 3, zIndex: 50, overflow: 'hidden',
              background: 'rgba(99, 102, 241, 0.15)', borderRadius: 2,
            }}>
              <div style={{
                height: '100%', width: '40%',
                background: 'linear-gradient(90deg, transparent, var(--primary), transparent)',
                borderRadius: 2,
                animation: 'syncSlide 1.5s ease-in-out infinite',
              }} />
            </div>
          )}
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
            metaInsightsLoading={metaInsightsLoading}
            googleAdsData={googleAdsData}
            tiktokData={tiktokData}
            gscPerformance={gscPerformance}
            mcProducts={mcProducts}
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
            aiInsights={aiInsights}
            ciLoading={ciLoading}
            onRefreshCompetitive={onRefreshCompetitive}
            onAddCompetitor={onAddCompetitor}
            onAnalyzeCompetitor={onAnalyzeCompetitor}
            onRemoveCompetitor={onRemoveCompetitor}
            fetchMetaInsights={fetchMetaInsights}
            setWorkspaceData={setWorkspaceData}
            handleManualSync={handleManualSync}
          />
        </div>
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
  metaInsightsLoading, googleAdsData, tiktokData, gscPerformance, mcProducts,
  connectionStatus, lastSync, handleConnect, dateRange, historicClients,
  unifiedClients, setSelectedClient, fetchRealData,
  competitors, landscape, insights, aiInsights, ciLoading,
  onRefreshCompetitive, onAddCompetitor, onAnalyzeCompetitor, onRemoveCompetitor,
  fetchMetaInsights, setWorkspaceData, handleManualSync,
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
                <button
                  onClick={handleManualSync}
                  title="Sincronizar ahora"
                  style={{
                    marginLeft: 8, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
                    color: '#818cf8', borderRadius: 12, padding: '2px 8px', cursor: 'pointer',
                    fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  ↻ Sync
                </button>
              </div>
            )}
          </div>
          <GoalTrackerBanner clients={filteredClients} dateRange={dateRange} />
          <StatsCards clients={filteredClients} metaInsights={metaInsights} ga4Insights={ga4Insights} metaInsightsLoading={metaInsightsLoading} />
          <div className="bento-grid mt-md">
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
          <div className="bento-grid mt-md">
            <div className="bento-span-8" style={{ display: 'flex', flexDirection: 'column' }}>
              <AIInsightsWidget clients={filteredClients} storeId={storeId} />
            </div>
            <div className="bento-span-4" style={{ display: 'flex', flexDirection: 'column' }}>
              <ChurnRadar clients={filteredClients} />
            </div>
          </div>
          <div className="bento-grid mt-md">
            <div className="glass-card bento-span-7" style={{ padding: 0, overflow: 'hidden' }}>
              <FrequencyFunnel clients={filteredClients} onSelectClient={setSelectedClient} />
            </div>
            <div className="glass-card bento-span-5" style={{ padding: 0, overflow: 'hidden' }}>
              <ActiveCampaignsWidget workspace={workspaceData} onRefreshMeta={fetchMetaInsights} />
            </div>
          </div>
          <div className="bento-grid mt-md">
            <div className="bento-span-7">
              <RecentActivityFeed clients={filteredClients} rawOrders={rawOrders} dateRange={dateRange} />
            </div>
            <div className="glass-card bento-span-5" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--on-surface)' }}>
                  <Award size={18} color="#f59e0b" /> Top Clientes
                </h3>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {[...filteredClients]
                  .filter(c => (c.purchaseCount ?? 0) > 0)
                  .sort((a, b) => (b.totalSpent ?? 0) - (a.totalSpent ?? 0))
                  .slice(0, 8)
                  .map((client, i) => (
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
          <div className="glass-card bento-span-12 mt-md" style={{ padding: 0, overflow: 'hidden' }}>
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
    case 'inteligencia':
      return <BrandIntelligenceCenter session={session} />;
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
    case 'marketing_center':
      return <MarketingCommandCenter
        ga4Insights={ga4Insights} gscPerformance={gscPerformance} mcProducts={mcProducts}
        metaInsights={metaInsights} googleAdsData={googleAdsData} tiktokData={tiktokData}
        unifiedClients={unifiedClients} rawOrders={rawOrders} tiendanubeProducts={tiendanubeProducts}
        competitors={competitors} landscape={landscape} aiInsights={aiInsights}
        workspaceData={workspaceData} dateRange={dateRange}
      />;
    case 'meta_ads':
      return <MetaAdsPanel workspace={workspaceData} onRefreshMeta={fetchMetaInsights} clients={unifiedClients} metaInsights={metaInsights} allGoogleAdsData={googleAdsData} allTiktokData={tiktokData} />;
    case 'google_ads':
      return <GoogleAdsPanel googleAdsData={googleAdsData} workspace={workspaceData} dateRange={dateRange} onRefresh={() => {
        if (!workspaceData?.google_ads_customer_id) return;
        const api = new GoogleAdsAPI({ customerId: workspaceData.google_ads_customer_id, clientId: workspaceData.google_ads_client_id, clientSecret: workspaceData.google_ads_client_secret, refreshToken: workspaceData.google_ads_refresh_token, developerToken: workspaceData.google_ads_developer_token });
        api.fetchCampaigns(dateRange).then(campaigns => setGoogleAdsData(prev => ({ ...prev, campaigns }))).catch(console.warn);
      }} />;
    case 'tiktok_ads':
      return <TikTokAdsPanel tiktokData={tiktokData} workspace={workspaceData} dateRange={dateRange} onRefresh={() => {
        if (!workspaceData?.tiktok_advertiser_id) return;
        const api = new TikTokAdsAPI({ advertiserId: workspaceData.tiktok_advertiser_id, accessToken: workspaceData.tiktok_access_token, appSecret: workspaceData.tiktok_app_secret });
        api.fetchCampaigns(dateRange).then(campaigns => setTiktokData(prev => ({ ...prev, campaigns }))).catch(console.warn);
      }} />;
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
        <LogisticsCenter session={session} />
      );
    case 'equipo':
      return <TeamPanel />;
    case 'actividad':
      return <ActivityLog />;
    case 'rendimiento':
      return <ProductivityDashboard />;
    case 'configuracion':
      return <SettingsPanel onConnect={handleConnect} connectionStatus={connectionStatus} session={session} workspaceData={workspaceData} onSaveWorkspace={async (fields) => {
        if (!session?.user?.id) return;
        const { data, error } = await supabase.from('workspaces').upsert({ user_id: session.user.id, ...fields }, { onConflict: 'user_id' });
        if (error) {
          console.error('[Settings] Save error:', error);
          if (error.message?.includes('column') || error.code === '42703') {
            throw new Error('FALTAN COLUMNAS EN SUPABASE: Ejecuta la migración SQL en Supabase SQL Editor.');
          }
          throw new Error('Error al guardar: ' + error.message);
        }
        setWorkspaceData(prev => ({ ...prev, ...fields }));
        // Reload system_config to pick up GA4 changes
        try {
          const { data: sc } = await supabase.from('system_config').select('*').eq('id', 'main').single();
          if (sc) setWorkspaceData(prev => ({ ...prev, ...fields, ga4_property_id: sc.ga4_property_id || prev.ga4_property_id, ga4_credentials_json: sc.ga4_credentials_json || prev.ga4_credentials_json }));
        } catch {}
        console.log('[Settings] Guardado OK.');
      }} />;
    case 'reportes':
      return <ReportGenerator allData={{ metaInsights, googleAdsData, tiktokData, ga4Insights, gscPerformance, mcProducts, clients: filteredClients }} dateRange={dateRange} />;
    case 'ia_chat':
      return <AIChatAgent clients={unifiedClients} metaInsights={metaInsights} googleAdsData={googleAdsData} tiktokData={tiktokData} ga4Insights={ga4Insights} gscPerformance={gscPerformance} mcProducts={mcProducts} session={session} />;
    case 'utm_builder':
      return <UTMBuilder />;
    case 'exportar':
      return <ExportPanel clients={filteredClients} n8nWebhookUrl={workspaceData?.n8n_webhook_url} />;
    case 'inteligencia_competitiva':
      return <CompetitiveIntelligencePanel
        workspaceData={workspaceData}
        dateRange={dateRange}
        competitors={competitors}
        landscape={landscape}
        isLoading={ciLoading}
        onRefresh={onRefreshCompetitive}
        onAddCompetitor={onAddCompetitor}
        onAnalyzeCompetitor={onAnalyzeCompetitor}
        onRemoveCompetitor={onRemoveCompetitor}
        metaInsightsLoading={metaInsightsLoading}
      />;
    case 'merchant_center':
      return <MerchantCenterPanel
        workspaceData={workspaceData}
        dateRange={dateRange}
        filteredClients={filteredClients}
        rawOrders={rawOrders}
        isRefreshing={isRefreshingStock}
        refreshStock={refreshStock}
      />;
    case 'search_console':
      return <SearchConsolePanel
        workspaceData={workspaceData}
        dateRange={dateRange}
        filteredClients={filteredClients}
      />;
    default:
      return <div>Vista no encontrada</div>;
  }
}
