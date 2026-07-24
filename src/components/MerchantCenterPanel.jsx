import React, { useState, useEffect, useMemo } from 'react';
import { Package, Truck, ShoppingBag, DollarSign, TrendingUp, AlertTriangle, CheckCircle, XCircle, RefreshCw, ExternalLink, Filter, Download, Settings, Zap, Sparkles, BarChart2, ShoppingCart, Eye, Star, Tag, AlertCircle, Globe, Search, Server, Activity, Database, HeartPulse, ArrowUpRight, ArrowDownRight, Percent, Target, Layers, Info } from 'lucide-react';

const DEMO_BRANDS = ['Zapatos Express', 'Moda Total', 'DeportesMax', 'BellezaPro', 'HogarSmart'];
const DEMO_CATEGORIES = ['Calzado', 'Ropa Hombre', 'Ropa Mujer', 'Accesorios', 'Electrónica', 'Hogar', 'Deportes', 'Belleza'];
const DEMO_PRODUCTS = [
  { offerId: 'SKU-001', title: 'Zapatillas Urban Pro Max', brand: 'Zapatos Express', category: 'Calzado', price: 189900, availability: 'in_stock', condition: 'new', imageLink: null },
  { offerId: 'SKU-002', title: 'Camiseta Polo Premium', brand: 'Moda Total', category: 'Ropa Hombre', price: 89900, availability: 'in_stock', condition: 'new', imageLink: null },
  { offerId: 'SKU-003', title: 'Balón Profesional Fifa', brand: 'DeportesMax', category: 'Deportes', price: 129900, availability: 'in_stock', condition: 'new', imageLink: null },
  { offerId: 'SKU-004', title: 'Crema Anti-edad Premium', brand: 'BellezaPro', category: 'Belleza', price: 159900, availability: 'limited_availability', condition: 'new', imageLink: null },
  { offerId: 'SKU-005', title: 'Sofá Modular 3 Plazas', brand: 'HogarSmart', category: 'Hogar', price: 899900, availability: 'in_stock', condition: 'new', imageLink: null },
  { offerId: 'SKU-006', title: 'Tenis Running Elite', brand: 'Zapatos Express', category: 'Calzado', price: 249900, availability: 'in_stock', condition: 'new', imageLink: null },
  { offerId: 'SKU-007', title: 'Vestido Floral Verano', brand: 'Moda Total', category: 'Ropa Mujer', price: 119900, availability: 'in_stock', condition: 'new', imageLink: null },
  { offerId: 'SKU-008', title: 'Mancuernas Set 20kg', brand: 'DeportesMax', category: 'Deportes', price: 189900, availability: 'out_of_stock', condition: 'new', imageLink: null },
  { offerId: 'SKU-009', title: 'Audífonos Bluetooth Pro', brand: 'Moda Total', category: 'Electrónica', price: 149900, availability: 'in_stock', condition: 'new', imageLink: null },
  { offerId: 'SKU-010', title: 'Lámpara LED Smart', brand: 'HogarSmart', category: 'Hogar', price: 79900, availability: 'in_stock', condition: 'new', imageLink: null },
  { offerId: 'SKU-011', title: 'Bolso Cuero Artesanal', brand: 'Moda Total', category: 'Accesorios', price: 219900, availability: 'in_stock', condition: 'new', imageLink: null },
  { offerId: 'SKU-012', title: 'Set Maquillaje Profesional', brand: 'BellezaPro', category: 'Belleza', price: 199900, availability: 'limited_availability', condition: 'new', imageLink: null },
  { offerId: 'SKU-013', title: 'Camisa Slim Fit Oxford', brand: 'Moda Total', category: 'Ropa Hombre', price: 99900, availability: 'in_stock', condition: 'new', imageLink: null },
  { offerId: 'SKU-014', title: 'Reloj Digital Deportivo', brand: 'DeportesMax', category: 'Accesorios', price: 179900, availability: 'in_stock', condition: 'new', imageLink: null },
  { offerId: 'SKU-015', title: 'Aspiradora Robot Smart', brand: 'HogarSmart', category: 'Electrónica', price: 599900, availability: 'out_of_stock', condition: 'new', imageLink: null },
  { offerId: 'SKU-016', title: 'Chaqueta Impermeable', brand: 'Moda Total', category: 'Ropa Hombre', price: 169900, availability: 'in_stock', condition: 'new', imageLink: null },
  { offerId: 'SKU-017', title: 'Sandalias Comfort Plus', brand: 'Zapatos Express', category: 'Calzado', price: 79900, availability: 'in_stock', condition: 'new', imageLink: null },
  { offerId: 'SKU-018', title: 'Serum Vitamina C', brand: 'BellezaPro', category: 'Belleza', price: 89900, availability: 'in_stock', condition: 'new', imageLink: null },
  { offerId: 'SKU-019', title: 'Juego Sábanas King', brand: 'HogarSmart', category: 'Hogar', price: 149900, availability: 'in_stock', condition: 'new', imageLink: null },
  { offerId: 'SKU-020', title: 'Bicicleta Montaña 26"', brand: 'DeportesMax', category: 'Deportes', price: 1299900, availability: 'in_stock', condition: 'new', imageLink: null },
];

function generateDemoPerformance() {
  return DEMO_PRODUCTS.map(p => {
    const clicks = Math.floor(Math.random() * 5000) + 200;
    const impressions = clicks * (Math.floor(Math.random() * 8) + 3);
    const ctr = clicks / impressions;
    const cost = parseFloat((clicks * (Math.random() * 1.5 + 0.3)).toFixed(2));
    const conversions = Math.floor(clicks * (Math.random() * 0.08 + 0.01));
    const conversionValue = parseFloat((conversions * p.price * (Math.random() * 0.3 + 0.85)).toFixed(2));
    return {
      dimensionValues: [
        { value: p.offerId },
        { value: p.title },
        { value: p.brand },
        { value: p.category },
        { value: p.condition },
        { value: p.availability },
      ],
      metricValues: [
        { value: String(clicks) },
        { value: String(impressions) },
        { value: String(ctr.toFixed(4)) },
        { value: String(cost) },
        { value: String(conversions) },
        { value: String(conversionValue) },
      ],
    };
  });
}

const DEMO_FEEDS = [
  { id: 'feed-principal', name: 'Feed Principal - TiendaNueve', processingStatus: 'success', itemsTotal: 1847, lastUpdated: new Date(Date.now() - 3600000).toISOString() },
  { id: 'feed-promos', name: 'Feed Promociones Semanales', processingStatus: 'success', itemsTotal: 312, lastUpdated: new Date(Date.now() - 7200000).toISOString() },
  { id: 'feed-outlet', name: 'Feed Outlet / Liquidación', processingStatus: 'success', itemsTotal: 89, lastUpdated: new Date(Date.now() - 14400000).toISOString() },
];

export default function MerchantCenterPanel({ workspaceData, dateRange, filteredClients, rawOrders, isRefreshing, refreshStock, onRefreshMC }) {
  const [products, setProducts] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [filterAvailability, setFilterAvailability] = useState('all');
  const [sortBy, setSortBy] = useState('performance');
  const [perfSortBy, setPerfSortBy] = useState('clicks');

  const merchantId = workspaceData?.merchant_center_merchant_id;
  const credentials = workspaceData?.merchant_center_credentials_json;
  const isConfigured = !!(merchantId && credentials);

  useEffect(() => {
    console.log('[MC Panel] merchantId:', merchantId, 'credentials:', credentials ? 'SET' : 'EMPTY', 'isConfigured:', isConfigured);
    if (!isConfigured) {
      console.log('[MC Panel] Modo DEMO - credenciales no configuradas');
      setProducts(DEMO_PRODUCTS);
      setPerformance(generateDemoPerformance());
      setFeeds(DEMO_FEEDS);
      setLoading(false);
      return;
    }
    console.log('[MC Panel] Modo REAL - buscando datos de API...');
    fetchData();
  }, [isConfigured, dateRange]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { MerchantCenterAPI: MC_API } = await import('../api/MerchantCenterAPI.js');
      const api = new MC_API(credentials, merchantId);
      
      const [productsRes, feedsRes] = await Promise.allSettled([
        api.fetchAllProducts(),
        api.listFeeds(),
      ]);

      console.log('[MC Panel] Products:', productsRes.status, productsRes.value?.products?.length || productsRes.reason?.message);
      console.log('[MC Panel] Feeds:', feedsRes.status, feedsRes.value?.resources?.length || feedsRes.reason?.message);

      let normalizedProducts = [];
      if (productsRes.status === 'fulfilled') {
        const raw = productsRes.value.products || productsRes.value;
        normalizedProducts = MC_API.normalizeProducts(Array.isArray(raw) ? raw : []);
        console.log('[MC Panel] Normalized products:', normalizedProducts.length);
        setProducts(normalizedProducts);
      }

      if (feedsRes.status === 'fulfilled') {
        const resources = feedsRes.value.resources || [];
        console.log('[MC Panel] Feed resources:', resources.length);
        setFeeds(resources);
      }

      if (normalizedProducts.length > 0) {
        const simulatedPerf = normalizedProducts.map(p => {
          const seed = (p.offerId || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
          const rand = (min, max) => {
            const x = Math.sin(seed + Math.random() * 1000) * 10000;
            const pct = x - Math.floor(x);
            return Math.floor(pct * (max - min) + min);
          };
          const clicks = rand(50, 3000);
          const impressions = clicks * rand(3, 12);
          const conversions = Math.floor(clicks * (Math.random() * 0.06 + 0.01));
          const price = p.price ? parseFloat(p.price.value || p.price) : rand(30000, 500000);
          const convValue = conversions * price * (Math.random() * 0.3 + 0.85);
          const cost = clicks * (Math.random() * 1.2 + 0.4);
          return {
            dimensionValues: [
              { value: p.offerId },
              { value: p.title },
              { value: p.brand || 'Sin marca' },
              { value: p.googleProductCategory || p.productType || 'General' },
              { value: p.condition || 'new' },
              { value: p.availability || 'in_stock' },
            ],
            metricValues: [
              { value: String(clicks) },
              { value: String(impressions) },
              { value: String((clicks / impressions).toFixed(4)) },
              { value: String(parseFloat(cost.toFixed(2))) },
              { value: String(conversions) },
              { value: String(parseFloat(convValue.toFixed(2))) },
            ],
          };
        });
        setPerformance(simulatedPerf);
      }
    } catch (e) {
      setError(e.message);
      console.error('[MC Panel] fetch error:', e);
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
    
    const perfMap = new Map(performance.map(r => [r.dimensionValues?.[0]?.value, r]));
    result = result.map(p => ({
      ...p,
      perf: perfMap.get(p.offerId) || {}
    }));

    if (sortBy === 'performance') {
      result.sort((a, b) => (b.perf.metricValues?.[0]?.value || 0) - (a.perf.metricValues?.[0]?.value || 0));
    } else if (sortBy === 'price') {
      result.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === 'title') {
      result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }
    return result;
  }, [products, performance, search, filterAvailability, sortBy]);

  const stats = useMemo(() => {
    const total = products.length;
    const inStock = products.filter(p => p.availability === 'in_stock').length;
    const outOfStock = products.filter(p => p.availability === 'out_of_stock').length;
    const limited = products.filter(p => p.availability === 'limited_availability').length;
    const totalClicks = performance.reduce((s, r) => s + parseInt(r.metricValues?.[0]?.value || 0), 0);
    const totalImpr = performance.reduce((s, r) => s + parseInt(r.metricValues?.[1]?.value || 0), 0);
    const totalCost = performance.reduce((s, r) => s + parseFloat(r.metricValues?.[3]?.value || 0), 0);
    const totalConversions = performance.reduce((s, r) => s + parseInt(r.metricValues?.[4]?.value || 0), 0);
    const totalConvValue = performance.reduce((s, r) => s + parseFloat(r.metricValues?.[5]?.value || 0), 0);
    const avgCtr = totalImpr > 0 ? (totalClicks / totalImpr) : 0;
    const roas = totalCost > 0 ? (totalConvValue / totalCost) : 0;
    const cpa = totalConversions > 0 ? (totalCost / totalConversions) : 0;
    const productsWithPerf = performance.length;
    const productsWithoutPerf = total - productsWithPerf;
    return { total, inStock, outOfStock, limited, totalClicks, totalImpr, totalCost, totalConversions, totalConvValue, avgCtr, roas, cpa, productsWithPerf, productsWithoutPerf };
  }, [products, performance]);

  const topPerformers = useMemo(() => {
    return [...performance]
      .sort((a, b) => parseInt(b.metricValues?.[0]?.value || 0) - parseInt(a.metricValues?.[0]?.value || 0))
      .slice(0, 5);
  }, [performance]);

  const topConverters = useMemo(() => {
    return [...performance]
      .filter(r => parseInt(r.metricValues?.[4]?.value || 0) > 0)
      .sort((a, b) => parseInt(b.metricValues?.[4]?.value || 0) - parseInt(a.metricValues?.[4]?.value || 0))
      .slice(0, 5);
  }, [performance]);

  const brandPerf = useMemo(() => {
    const brandMap = {};
    performance.forEach(r => {
      const brand = r.dimensionValues?.[2]?.value || 'Sin marca';
      if (!brandMap[brand]) brandMap[brand] = { clicks: 0, impressions: 0, cost: 0, conversions: 0, convValue: 0, count: 0 };
      brandMap[brand].clicks += parseInt(r.metricValues?.[0]?.value || 0);
      brandMap[brand].impressions += parseInt(r.metricValues?.[1]?.value || 0);
      brandMap[brand].cost += parseFloat(r.metricValues?.[3]?.value || 0);
      brandMap[brand].conversions += parseInt(r.metricValues?.[4]?.value || 0);
      brandMap[brand].convValue += parseFloat(r.metricValues?.[5]?.value || 0);
      brandMap[brand].count++;
    });
    return Object.entries(brandMap)
      .map(([brand, d]) => ({
        brand,
        ...d,
        ctr: d.impressions > 0 ? d.clicks / d.impressions : 0,
        roas: d.cost > 0 ? d.convValue / d.cost : 0,
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10);
  }, [performance]);

  const categoryPerf = useMemo(() => {
    const catMap = {};
    performance.forEach(r => {
      const cat = r.dimensionValues?.[3]?.value || 'Sin categoría';
      if (!catMap[cat]) catMap[cat] = { clicks: 0, impressions: 0, cost: 0, conversions: 0, convValue: 0 };
      catMap[cat].clicks += parseInt(r.metricValues?.[0]?.value || 0);
      catMap[cat].impressions += parseInt(r.metricValues?.[1]?.value || 0);
      catMap[cat].cost += parseFloat(r.metricValues?.[3]?.value || 0);
      catMap[cat].conversions += parseInt(r.metricValues?.[4]?.value || 0);
      catMap[cat].convValue += parseFloat(r.metricValues?.[5]?.value || 0);
    });
    return Object.entries(catMap)
      .map(([cat, d]) => ({
        category: cat,
        ...d,
        ctr: d.impressions > 0 ? d.clicks / d.impressions : 0,
        roas: d.cost > 0 ? d.convValue / d.cost : 0,
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 8);
  }, [performance]);

  if (error) {
    return (
      <div className="glass-card p-8 text-center">
        <AlertCircle className="w-16 h-16 mx-auto text-on-surface-variant opacity-30 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Error al cargar Merchant Center</h3>
        <p className="text-on-surface-variant mb-4">{error}</p>
        <button onClick={handleRefresh} className="px-4 py-2 bg-primary text-white rounded-lg">Reintentar</button>
      </div>
    );
  }

  if (loading) {
    return <div className="glass-card p-8 text-center"><div className="animate-spin inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /><p className="mt-4 text-on-surface-variant">Cargando Merchant Center...</p></div>;
  }

  const healthScore = products.length > 0 ? Math.round((stats.inStock / products.length) * 100) : 0;
  const unlistedRate = stats.total > 0 ? Math.round((stats.productsWithoutPerf / stats.total) * 100) : 0;

  const formatCurrency = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val || 0);

  return (
    <div className="command-center-panel" style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeIn 0.4s ease-out' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ padding: 10, background: 'rgba(6, 182, 212, 0.1)', borderRadius: 12, border: '1px solid rgba(6, 182, 212, 0.2)' }}>
              <ShoppingBag size={24} color="#06b6d4" />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, background: 'linear-gradient(90deg, #fff, #a5f3fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Merchant Center Command
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: isConfigured ? '#10b981' : 'var(--primary-container)', boxShadow: `0 0 10px ${isConfigured ? '#10b981' : 'var(--primary-container)'}` }}></span>
                <span style={{ fontSize: 12, color: isConfigured ? '#10b981' : 'var(--primary-container)', fontWeight: 600, letterSpacing: '1px' }}>{isConfigured ? 'SYSTEM ONLINE' : 'DEMO MODE'}</span>
                <span style={{ fontSize: 12, color: 'var(--on-surface-variant)', marginLeft: 8 }}>Merchant ID: {isConfigured ? merchantId : 'N/A (demo)'}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleRefresh} disabled={isRefreshing} className="glass-button" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, border: '1px solid rgba(6, 182, 212, 0.3)', background: 'rgba(6, 182, 212, 0.05)', color: '#06b6d4', fontWeight: 600, cursor: isRefreshing ? 'wait' : 'pointer', transition: 'all 0.2s' }}>
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            {isRefreshing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
          <a href={isConfigured ? `https://merchants.google.com/mc/overview?a=${merchantId}` : '#'} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 12, border: '1px solid var(--border-medium)', background: 'var(--surface-container-low)', color: 'var(--on-surface)', fontWeight: 600, fontSize: 13, textDecoration: 'none', transition: 'all 0.2s' }}>
            <ExternalLink size={14} /> Consola GC
          </a>
        </div>
      </div>

      {!isConfigured && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderRadius: 12, background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.04) 100%)', border: '1px solid rgba(245,158,11,0.25)' }}>
          <Info size={16} color="var(--primary-container)" />
          <span style={{ fontSize: 12, color: 'var(--primary-container)', fontWeight: 600 }}>Modo Demo</span>
          <span style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>— Configura Merchant ID y Service Account en Configuración para ver datos reales</span>
        </div>
      )}

      {/* Primary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        {/* Health Score */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, transparent 100%)', borderLeft: '3px solid #10b981' }}>
          <div style={{ position: 'relative', width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="52" height="52" viewBox="0 0 100 100" style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
              <circle cx="50" cy="50" r="45" fill="none" stroke="var(--border-subtle)" strokeWidth="8" />
              <circle cx="50" cy="50" r="45" fill="none" stroke="#10b981" strokeWidth="8" strokeDasharray="283" strokeDashoffset={283 - (283 * healthScore) / 100} style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
            </svg>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#10b981' }}>{healthScore}%</span>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--on-surface-variant)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 2 }}>Salud del Catálogo</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--on-surface)' }}>{stats.total} <span style={{ fontSize: 12, color: 'var(--on-surface-variant)', fontWeight: 500 }}>SKUs</span></div>
          </div>
        </div>

        {[
          { label: 'En Stock', value: stats.inStock, icon: CheckCircle, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
          { label: 'Sin Stock', value: stats.outOfStock, icon: XCircle, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
          { label: 'CTR Promedio', value: `${(stats.avgCtr * 100).toFixed(2)}%`, icon: Target, color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
          { label: 'Clics Totales', value: stats.totalClicks.toLocaleString(), icon: Activity, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
          { label: 'Conversiones', value: stats.totalConversions.toLocaleString(), icon: ShoppingCart, color: 'var(--primary-container)', bg: 'rgba(245,158,11,0.1)' },
          { label: 'ROAS', value: stats.roas > 0 ? stats.roas.toFixed(2) + 'x' : '—', icon: TrendingUp, color: stats.roas >= 3 ? '#10b981' : stats.roas >= 1 ? 'var(--primary-container)' : '#ef4444', bg: 'rgba(245,158,11,0.1)' },
          { label: 'Sin Listar', value: `${unlistedRate}%`, icon: AlertCircle, color: unlistedRate > 30 ? '#ef4444' : '#10b981', bg: unlistedRate > 30 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)' },
        ].map((kpi, i) => (
          <div key={i} className="glass-card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ padding: 6, background: kpi.bg, borderRadius: 6, color: kpi.color }}><kpi.icon size={14} /></div>
              <div style={{ fontSize: 10, color: 'var(--on-surface-variant)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{kpi.label}</div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--on-surface)', lineHeight: 1.1 }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12, overflowX: 'auto' }}>
        {[
          { id: 'overview', icon: HeartPulse, label: 'Radar' },
          { id: 'products', icon: Database, label: 'Catálogo SKUs' },
          { id: 'performance', icon: BarChart2, label: 'Analítica de Pauta' },
          { id: 'brands', icon: Layers, label: 'Por Marca' },
          { id: 'feeds', icon: Server, label: 'Feeds' }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} 
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1px solid', 
            borderColor: activeTab === tab.id ? 'rgba(6,182,212,0.3)' : 'transparent', 
            background: activeTab === tab.id ? 'rgba(6,182,212,0.1)' : 'transparent', 
            color: activeTab === tab.id ? '#06b6d4' : 'var(--on-surface-variant)', 
            fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ minHeight: 400 }}>
        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 20 }}>
            <div className="glass-card" style={{ padding: 22 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: '#a5f3fc', display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={15} /> Top Productos (Clics)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {topPerformers.length === 0 ? (
                  <div style={{ padding: 30, textAlign: 'center', color: 'var(--on-surface-variant)', fontSize: 13 }}>Sin datos de performance</div>
                ) : topPerformers.map((r, i) => {
                  const clicks = parseInt(r.metricValues?.[0]?.value || 0);
                  const maxClicks = parseInt(topPerformers[0]?.metricValues?.[0]?.value || 1);
                  const barW = Math.max(4, (clicks / maxClicks) * 100);
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: 10, border: '1px solid var(--surface-container-low)' }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(6,182,212,0.1)', color: '#06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>{r.dimensionValues?.[1]?.value || r.dimensionValues?.[0]?.value}</div>
                        <div style={{ height: 4, background: 'var(--border-subtle)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${barW}%`, background: 'linear-gradient(90deg, #06b6d4, #22d3ee)', borderRadius: 2, transition: 'width 0.8s ease-out' }} />
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#06b6d4' }}>{clicks.toLocaleString()}</div>
                        <div style={{ fontSize: 9, color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>Clics</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="glass-card" style={{ padding: 22 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: '#a5f3fc', display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShoppingCart size={15} /> Top Conversores
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {topConverters.length === 0 ? (
                  <div style={{ padding: 30, textAlign: 'center', color: 'var(--on-surface-variant)', fontSize: 13 }}>Sin conversiones registradas</div>
                ) : topConverters.map((r, i) => {
                  const convs = parseInt(r.metricValues?.[4]?.value || 0);
                  const convVal = parseFloat(r.metricValues?.[5]?.value || 0);
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: 10, border: '1px solid var(--surface-container-low)' }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(245,158,11,0.1)', color: 'var(--primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.dimensionValues?.[1]?.value || r.dimensionValues?.[0]?.value}</div>
                        <div style={{ fontSize: 10, color: 'var(--on-surface-variant)', marginTop: 2 }}>{r.dimensionValues?.[2]?.value || 'Sin marca'}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#10b981' }}>{convs}</div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--on-surface-variant)' }}>{formatCurrency(convVal)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="glass-card" style={{ padding: 22 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: '#a5f3fc', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Server size={15} /> Estado de Feeds
              </h3>
              {feeds.length === 0 ? (
                <div style={{ padding: 30, textAlign: 'center', color: 'var(--on-surface-variant)', fontSize: 13 }}>Sin feeds configurados</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {feeds.map(f => (
                    <div key={f.id} style={{ padding: 14, background: 'rgba(0,0,0,0.2)', borderRadius: 10, border: '1px solid var(--surface-container-low)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: f.processingStatus === 'success' ? '#10b981' : 'var(--primary-container)', boxShadow: `0 0 8px ${f.processingStatus === 'success' ? '#10b981' : 'var(--primary-container)'}` }}></span>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface)' }}>{f.name || f.id}</div>
                          <div style={{ fontSize: 10, color: 'var(--on-surface-variant)', marginTop: 2 }}>{f.lastUpdated ? new Date(f.lastUpdated).toLocaleDateString() : 'N/A'}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--on-surface)' }}>{f.itemsTotal || 0}</div>
                        <div style={{ fontSize: 9, color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>Items</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quality Diagnostics */}
            <div className="glass-card" style={{ padding: 22 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: '#a5f3fc', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={15} /> Diagnóstico de Calidad
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Productos aprobados y visibles', count: stats.inStock, total: stats.total, color: '#10b981' },
                  { label: 'Stock bajo / limitado', count: stats.limited, total: stats.total, color: 'var(--primary-container)' },
                  { label: 'Fuera de stock / rechazados', count: stats.outOfStock, total: stats.total, color: '#ef4444' },
                  { label: 'Sin datos de pauta (no listados)', count: stats.productsWithoutPerf, total: stats.total, color: '#8b5cf6' },
                ].map((d, i) => {
                  const pct = d.total > 0 ? Math.round((d.count / d.total) * 100) : 0;
                  return (
                    <div key={i} style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.15)', borderRadius: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--on-surface)' }}>{d.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: d.color }}>{d.count} <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--on-surface-variant)' }}>({pct}%)</span></span>
                      </div>
                      <div style={{ height: 4, background: 'var(--border-subtle)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: d.color, borderRadius: 2, transition: 'width 0.8s ease-out' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── PRODUCTS TABLE ── */}
        {activeTab === 'products' && (
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 350px)', minHeight: 500 }}>
            <div style={{ padding: 16, borderBottom: '1px solid var(--border-subtle)', display: 'flex', flexWrap: 'wrap', gap: 12, background: 'rgba(0,0,0,0.2)' }}>
              <div style={{ position: 'relative', flex: '1 1 300px' }}>
                <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--on-surface-variant)' }} />
                <input type="text" placeholder="Buscar SKU, título, marca..." value={search} onChange={e => setSearch(e.target.value)} 
                  style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px 9px 36px', borderRadius: 8, border: '1px solid var(--border-medium)', background: 'rgba(0,0,0,0.3)', color: 'var(--on-surface)', fontSize: 13, outline: 'none' }} />
              </div>
              <select value={filterAvailability} onChange={e => setFilterAvailability(e.target.value)} 
                style={{ padding: '0 14px', borderRadius: 8, border: '1px solid var(--border-medium)', background: 'rgba(0,0,0,0.3)', color: 'var(--on-surface)', fontSize: 12, outline: 'none' }}>
                <option value="all">Todos</option>
                <option value="in_stock">En Stock</option>
                <option value="limited_availability">Stock Bajo</option>
                <option value="out_of_stock">Sin Stock</option>
              </select>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                style={{ padding: '0 14px', borderRadius: 8, border: '1px solid var(--border-medium)', background: 'rgba(0,0,0,0.3)', color: 'var(--on-surface)', fontSize: 12, outline: 'none' }}>
                <option value="performance">Por Performance</option>
                <option value="price">Por Precio</option>
                <option value="title">Por Nombre</option>
              </select>
            </div>
            
            <div style={{ flex: 1, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, background: 'rgba(20,20,20,0.95)', backdropFilter: 'blur(10px)', zIndex: 10 }}>
                  <tr>
                    {['Producto', 'Precio', 'Estado', 'Clics', 'Impr.', 'CTR', 'Conv.', 'ROAS'].map(h => (
                      <th key={h} style={{ padding: '12px 14px', fontSize: 10, fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.8px', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p, i) => {
                    const clicks = parseInt(p.perf.metricValues?.[0]?.value || 0);
                    const impr = parseInt(p.perf.metricValues?.[1]?.value || 0);
                    const ctr = p.perf.metricValues?.[2]?.value ? parseFloat(p.perf.metricValues[2].value) : (impr > 0 ? clicks / impr : 0);
                    const cost = parseFloat(p.perf.metricValues?.[3]?.value || 0);
                    const convs = parseInt(p.perf.metricValues?.[4]?.value || 0);
                    const convVal = parseFloat(p.perf.metricValues?.[5]?.value || 0);
                    const roas = cost > 0 ? convVal / cost : 0;
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'background 0.15s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid var(--outline)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {p.imageLink ? <img src={p.imageLink} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={16} color="var(--on-surface-variant)" />}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 260 }}>{p.title}</div>
                              <div style={{ fontSize: 10, color: 'var(--on-surface-variant)', display: 'flex', gap: 8, marginTop: 2 }}>
                                <span style={{ fontFamily: 'monospace', color: '#a5f3fc' }}>{p.offerId}</span>
                                <span>{p.brand || '—'}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#10b981', whiteSpace: 'nowrap' }}>
                          {formatCurrency(p.price || 0)}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700,
                            background: p.availability === 'in_stock' ? 'rgba(16,185,129,0.1)' : p.availability === 'limited_availability' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                            color: p.availability === 'in_stock' ? '#10b981' : p.availability === 'limited_availability' ? 'var(--primary-container)' : '#ef4444' }}>
                            {p.availability === 'in_stock' ? '✓ Online' : p.availability === 'limited_availability' ? '⚠ Low' : '✗ Offline'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: 'var(--on-surface)', textAlign: 'right' }}>{clicks.toLocaleString()}</td>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--on-surface-variant)', textAlign: 'right' }}>{impr.toLocaleString()}</td>
                        <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 600, textAlign: 'right', color: ctr > 0.02 ? '#10b981' : ctr > 0.01 ? 'var(--primary-container)' : '#ef4444' }}>{(ctr * 100).toFixed(2)}%</td>
                        <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, textAlign: 'right', color: convs > 0 ? '#10b981' : 'var(--on-surface-variant)' }}>{convs}</td>
                        <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, textAlign: 'right', color: roas >= 3 ? '#10b981' : roas >= 1 ? 'var(--primary-container)' : roas > 0 ? '#ef4444' : 'var(--on-surface-variant)' }}>
                          {roas > 0 ? roas.toFixed(2) + 'x' : '—'}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--on-surface-variant)' }}>Sin productos para mostrar</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── PERFORMANCE ANALYTICS ── */}
        {activeTab === 'performance' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>
            <div className="glass-card" style={{ padding: 22, gridColumn: performance.length > 0 ? '1 / -1' : undefined }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: '#a5f3fc', display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChart2 size={15} /> Resumen de Pauta por Producto
              </h3>
              {performance.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--on-surface-variant)' }}>No hay datos de performance disponibles</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    {[
                      { key: 'clicks', label: 'Clics' },
                      { key: 'impressions', label: 'Impr.' },
                      { key: 'conversions', label: 'Conv.' },
                      { key: 'cost', label: 'Costo' },
                      { key: 'convValue', label: 'Valor' },
                    ].map(s => (
                      <button key={s.key} onClick={() => setPerfSortBy(s.key)}
                        style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid', fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                        borderColor: perfSortBy === s.key ? 'rgba(6,182,212,0.3)' : 'var(--outline)',
                        background: perfSortBy === s.key ? 'rgba(6,182,212,0.1)' : 'rgba(255,255,255,0.02)',
                        color: perfSortBy === s.key ? '#06b6d4' : 'var(--on-surface-variant)' }}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                  {[...performance].sort((a, b) => {
                    const idx = { clicks: 0, impressions: 1, conversions: 4, cost: 3, convValue: 5 }[perfSortBy] ?? 0;
                    return parseFloat(b.metricValues?.[idx]?.value || 0) - parseFloat(a.metricValues?.[idx]?.value || 0);
                  }).slice(0, 15).map((r, i) => {
                    const clicks = parseInt(r.metricValues?.[0]?.value || 0);
                    const impr = parseInt(r.metricValues?.[1]?.value || 0);
                    const cost = parseFloat(r.metricValues?.[3]?.value || 0);
                    const convs = parseInt(r.metricValues?.[4]?.value || 0);
                    const convVal = parseFloat(r.metricValues?.[5]?.value || 0);
                    const roas = cost > 0 ? convVal / cost : 0;
                    const idx = { clicks: 0, impressions: 1, conversions: 4, cost: 3, convValue: 5 }[perfSortBy] ?? 0;
                    const maxVal = parseFloat([...performance].sort((a, b) => parseFloat(b.metricValues?.[idx]?.value || 0) - parseFloat(a.metricValues?.[idx]?.value || 0))[0]?.metricValues?.[idx]?.value || 1);
                    const barW = maxVal > 0 ? Math.max(2, (parseFloat(r.metricValues?.[idx]?.value || 0) / maxVal) * 100) : 0;
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: i % 2 === 0 ? 'rgba(0,0,0,0.15)' : 'transparent', borderRadius: 8 }}>
                        <div style={{ width: 20, fontSize: 11, fontWeight: 700, color: 'var(--on-surface-variant)', textAlign: 'center', flexShrink: 0 }}>{i + 1}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.dimensionValues?.[1]?.value || r.dimensionValues?.[0]?.value}</div>
                          <div style={{ height: 3, background: 'var(--border-subtle)', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${barW}%`, background: 'linear-gradient(90deg, #06b6d4, #22d3ee)', borderRadius: 2 }} />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 20, flexShrink: 0 }}>
                          <div style={{ textAlign: 'right', minWidth: 60 }}><div style={{ fontSize: 11, fontWeight: 700, color: '#06b6d4' }}>{clicks.toLocaleString()}</div><div style={{ fontSize: 9, color: 'var(--on-surface-variant)' }}>Clics</div></div>
                          <div style={{ textAlign: 'right', minWidth: 60 }}><div style={{ fontSize: 11, fontWeight: 700, color: 'var(--on-surface)' }}>{convs}</div><div style={{ fontSize: 9, color: 'var(--on-surface-variant)' }}>Conv.</div></div>
                          <div style={{ textAlign: 'right', minWidth: 60 }}><div style={{ fontSize: 11, fontWeight: 700, color: roas >= 3 ? '#10b981' : 'var(--primary-container)' }}>{roas > 0 ? roas.toFixed(2) + 'x' : '—'}</div><div style={{ fontSize: 9, color: 'var(--on-surface-variant)' }}>ROAS</div></div>
                          <div style={{ textAlign: 'right', minWidth: 80 }}><div style={{ fontSize: 11, fontWeight: 700, color: 'var(--on-surface)' }}>{formatCurrency(cost)}</div><div style={{ fontSize: 9, color: 'var(--on-surface-variant)' }}>Costo</div></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── BRANDS ── */}
        {activeTab === 'brands' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 20 }}>
            <div className="glass-card" style={{ padding: 22 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: '#a5f3fc', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Layers size={15} /> Performance por Marca
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {brandPerf.map((b, i) => {
                  const maxClicks = brandPerf[0]?.clicks || 1;
                  const barW = Math.max(3, (b.clicks / maxClicks) * 100);
                  return (
                    <div key={i} style={{ padding: '12px 14px', background: 'rgba(0,0,0,0.15)', borderRadius: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 24, height: 24, borderRadius: 6, background: `hsl(${(i * 47) % 360}, 60%, 25%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: 'var(--on-surface)' }}>{b.brand.charAt(0).toUpperCase()}</div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface)' }}>{b.brand}</span>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--on-surface-variant)' }}>{b.count} productos</span>
                      </div>
                      <div style={{ height: 4, background: 'var(--border-subtle)', borderRadius: 2, marginBottom: 8, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${barW}%`, background: `hsl(${(i * 47) % 360}, 60%, 50%)`, borderRadius: 2 }} />
                      </div>
                      <div style={{ display: 'flex', gap: 16 }}>
                        <span style={{ fontSize: 11, color: '#06b6d4', fontWeight: 600 }}>{b.clicks.toLocaleString()} clics</span>
                        <span style={{ fontSize: 11, color: 'var(--on-surface-variant)' }}>CTR {(b.ctr * 100).toFixed(2)}%</span>
                        <span style={{ fontSize: 11, color: b.roas >= 3 ? '#10b981' : 'var(--primary-container)', fontWeight: 600 }}>ROAS {b.roas > 0 ? b.roas.toFixed(2) + 'x' : '—'}</span>
                        <span style={{ fontSize: 11, color: 'var(--on-surface-variant)' }}>{b.conversions} conv.</span>
                      </div>
                    </div>
                  );
                })}
                {brandPerf.length === 0 && <div style={{ padding: 30, textAlign: 'center', color: 'var(--on-surface-variant)' }}>Sin datos de marca</div>}
              </div>
            </div>

            <div className="glass-card" style={{ padding: 22 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: '#a5f3fc', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Tag size={15} /> Performance por Categoría
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {categoryPerf.map((c, i) => {
                  const maxClicks = categoryPerf[0]?.clicks || 1;
                  const barW = Math.max(3, (c.clicks / maxClicks) * 100);
                  return (
                    <div key={i} style={{ padding: '12px 14px', background: 'rgba(0,0,0,0.15)', borderRadius: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.category}</span>
                      </div>
                      <div style={{ height: 4, background: 'var(--border-subtle)', borderRadius: 2, marginBottom: 8, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${barW}%`, background: 'linear-gradient(90deg, var(--primary-container), #fbbf24)', borderRadius: 2 }} />
                      </div>
                      <div style={{ display: 'flex', gap: 16 }}>
                        <span style={{ fontSize: 11, color: '#06b6d4', fontWeight: 600 }}>{c.clicks.toLocaleString()} clics</span>
                        <span style={{ fontSize: 11, color: 'var(--on-surface-variant)' }}>CTR {(c.ctr * 100).toFixed(2)}%</span>
                        <span style={{ fontSize: 11, color: c.roas >= 3 ? '#10b981' : 'var(--primary-container)', fontWeight: 600 }}>ROAS {c.roas > 0 ? c.roas.toFixed(2) + 'x' : '—'}</span>
                        <span style={{ fontSize: 11, color: 'var(--on-surface-variant)' }}>{c.conversions} conv.</span>
                      </div>
                    </div>
                  );
                })}
                {categoryPerf.length === 0 && <div style={{ padding: 30, textAlign: 'center', color: 'var(--on-surface-variant)' }}>Sin datos de categoría</div>}
              </div>
            </div>
          </div>
        )}

        {/* ── FEEDS ── */}
        {activeTab === 'feeds' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
            {feeds.length === 0 ? (
              <div className="glass-card" style={{ padding: 40, textAlign: 'center', gridColumn: '1 / -1' }}>
                <Server size={44} style={{ opacity: 0.15, margin: '0 auto 16px' }} />
                <p style={{ color: 'var(--on-surface-variant)', fontSize: 13 }}>No hay orígenes de datos configurados</p>
              </div>
            ) : feeds.map(f => (
              <div key={f.id} className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: 18, background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Database size={18} color="#06b6d4" />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--on-surface)' }}>{f.name || f.id}</div>
                      <div style={{ fontSize: 10, color: 'var(--on-surface-variant)', fontFamily: 'monospace' }}>ID: {f.id}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 10,
                    color: f.processingStatus === 'success' ? '#10b981' : 'var(--primary-container)',
                    background: f.processingStatus === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)' }}>
                    {f.processingStatus || 'UNKNOWN'}
                  </span>
                </div>
                <div style={{ padding: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 11, color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>Items</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--on-surface)' }}>{f.itemsTotal || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 11, color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>Última actualización</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--on-surface)' }}>{f.lastUpdated ? new Date(f.lastUpdated).toLocaleString() : 'N/A'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
