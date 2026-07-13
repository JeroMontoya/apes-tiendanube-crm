const fs = require('fs');
const path = 'C:\\Users\\jerom\\.gemini\\antigravity\\scratch\\App TiendaNueve\\src\\components\\CompetitiveIntelligencePanel.jsx';

let content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

// Keep first 60 lines (imports and utilities), then add the component
const newContent = lines.slice(0, 60).join('\n') + `

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
        <p>Agrega tu Merchant ID y credenciales en Configuración para ver datos de productos y rendimiento.</        </p>
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
  }, [unifiedClients, dateRange];

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
`;
fs.writeFileSync(path, newContent, 'utf8');
console.log('Rewritten');
"