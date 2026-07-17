import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { TiendanubeAPI } from '../utils/tiendanubeAPI';
import { 
  Warehouse, Package, Truck, AlertTriangle, CheckCircle, 
  Search, Filter, ArrowLeftRight, TrendingUp, BarChart2,
  MapPin, Store, Globe, Zap, Plus, Edit3, Save, X,
  ChevronDown, ChevronRight, Layers, Ruler, Palette, Hash,
  Calendar, User, Flag, ArrowRight, Sparkles, Box, 
  ClipboardList, BarChart3, Eye, RotateCcw, Link2, ExternalLink,
  Image as ImageIcon, MoreHorizontal, Bell, Download, Upload,
  ScanLine, CreditCard, Receipt, Printer, RefreshCw, 
  ShoppingCart, Minus, Plus as PlusIcon, AlertCircle, 
  Settings, Activity, Shield, Database, Zap as ZapIcon,
  FileSpreadsheet, X as XIcon, Building2, Loader2, 
  CheckCircle2, MessageSquare, Zap as ZapIcon2,
  ExternalLink as ExternalLinkIcon, Zap as ZapIcon3
} from 'lucide-react';

const LOCATIONS = [
  { id: 'r5', name: 'R5', type: 'physical', address: 'Local Principal', color: '#3b82f6', icon: Store, manager: 'Responsable R5' },
  { id: 'apes', name: 'APES', type: 'physical', address: 'Local Secundario', color: '#8b5cf6', icon: Building2, manager: 'Responsable APES' },
  { id: 'web', name: 'WEB (TiendaNube)', type: 'online', platform: 'TiendaNube', color: '#10b981', icon: Globe, manager: 'Sincronización Auto', sync: true },
];

const STOCK_STATUS = {
  unlimited: { label: 'Ilimitado', color: 'var(--stock-unlimited-color)', bg: 'var(--stock-unlimited-bg)', border: 'var(--stock-unlimited-border)', icon: '∞' },
  in_stock: { label: 'En Stock', color: 'var(--stock-instock-color)', bg: 'var(--stock-instock-bg)', border: 'var(--stock-instock-border)', icon: CheckCircle },
  low_stock: { label: 'Stock Bajo', color: 'var(--stock-low-color)', bg: 'var(--stock-low-bg)', border: 'var(--stock-low-border)', icon: AlertCircle },
  out_of_stock: { label: 'Sin Stock', color: 'var(--stock-out-color)', bg: 'var(--stock-out-bg)', border: 'var(--stock-out-border)', icon: Package },
  in_production: { label: 'En Producción', color: 'var(--stock-production-color)', bg: 'var(--stock-production-bg)', border: 'var(--stock-production-border)', icon: RotateCcw },
  ready_to_ship: { label: 'Listo para Despachar', color: 'var(--stock-ready-color)', bg: 'var(--stock-ready-bg)', border: 'var(--stock-ready-border)', icon: Truck },
};

const MOVEMENT_TYPES = [
  { id: 'receive', label: 'Recepción', icon: '⬇️', color: '#10b981', desc: 'Ingreso de mercadería' },
  { id: 'dispatch', label: 'Despacho', icon: '🚚', color: '#3b82f6', desc: 'Envío a cliente' },
  { id: 'transfer', label: 'Transferencia', icon: '↔️', color: '#8b5cf6', desc: 'Entre ubicaciones' },
  { id: 'production_in', label: 'Producción', icon: '🔄', color: '#f59e0b', desc: 'Ingreso de taller' },
  { id: 'return', label: 'Devolución', icon: '🔄', color: '#f59e0b', desc: 'Cliente devuelve' },
  { id: 'adjustment', label: 'Ajuste', icon: '⚠️', color: '#ef4444', desc: 'Corrección manual' },
];

const PRIORITY = {
  urgente: { label: 'Urgente', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  alta: { label: 'Alta', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  normal: { label: 'Normal', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  baja: { label: 'Baja', color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
};

const CATEGORIES = ['Camisetas', 'Buzos', 'Pantalones', 'Gorras', 'Accesorios', 'Materiales', 'Otros'];

function formatCurrency(v) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0);
}

function formatNumber(v) {
  return new Intl.NumberFormat('es-CO').format(v || 0);
}

// ════════════════════════════════════════════════════════════════
// PRODUCT PICKER MODAL
// ═══════════════════════════════════════════════════════════════
function ProductPickerModal({ products, fromLocation, onSelect, onClose }) {
  const [search, setSearch] = useState('');

  const availableProducts = useMemo(() => 
    products.filter(p => p.location === fromLocation && (p.currentStock === null || p.currentStock > 0))
  , [products, fromLocation]);

  const filtered = useMemo(() => 
    availableProducts
      .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()))
      .slice(0, 100)
  , [availableProducts, search]);

  const hasProducts = availableProducts.length > 0;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(12px)' }} onClick={onClose}>
      <div style={{ width: '600px', maxHeight: '85vh', overflow: 'auto', borderRadius: '20px', background: 'var(--surface)', border: '1px solid var(--glass-border)', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={18} color="#fff" /></div>
            <div><h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '700', color: 'var(--on-surface)' }}>Seleccionar Producto</h3><p style={{ margin: 0, fontSize: '11px', color: 'var(--on-surface-variant)' }}>Ubicación: {LOCATIONS.find(l => l.id === fromLocation)?.name}</p></div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--on-surface-variant)', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div style={{ padding: '0 24px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} color="var(--on-surface-variant)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, SKU, color..." style={{ width: '100%', height: '40px', borderRadius: '10px', border: '1px solid var(--border-subtle)', background: 'var(--surface-container)', color: 'var(--on-surface)', paddingLeft: '36px', paddingRight: '12px', fontFamily: 'inherit', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ padding: '16px 24px', maxHeight: '50vh', overflowY: 'auto' }}>
          {availableProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--on-surface-variant)' }}><Package size={36} style={{ opacity: 0.2, marginBottom: '12px' }} /><p>No hay productos con stock en esta ubicación</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {filtered.map(item => (
                <button key={item.id} onClick={() => onSelect(item)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--on-surface)', cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'all 0.15s', fontFamily: 'inherit', fontSize: '13px' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-container)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  {item.image ? <img src={item.image} alt="" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} /> : <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={18} color="var(--on-surface-variant)" style={{ opacity: 0.3 }} /></div>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '600', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)', marginTop: '2px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {item.color && <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', background: item.color || '#888' }} /> {item.color}</span>}
                      {item.size && <span>{item.size}</span>}
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--on-surface-variant)' }}>{item.sku}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: '100px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', fontFamily: "'JetBrains Mono', monospace", color: '#10b981' }}>{item.currentStock === null ? '∞' : item.currentStock} und.</div>
                    <div style={{ fontSize: '10px', color: 'var(--on-surface-variant)' }}>Disponibles</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// STAT CARD
// ═══════════════════════════════════════════════════════════════
function StatCard({ label, value, sub, color, icon }) {
  return (
    <div style={{ padding: '16px 20px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
      <div>
        <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--on-surface)' }}>{typeof value === 'number' ? value.toLocaleString('es-CO') : value}</div>
        <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{label}</div>
        {sub && <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)', opacity: 0.7, marginTop: '4px' }}>{sub}</div>}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════
export default function InventoryHub({ 
  initialProducts = [], 
  session,
  supabase,
  workspaceData,
  onMovement,
  onStockUpdate,
  onTransfer,
  lowStockThreshold = 5,
  showPredictive = true 
}) {
  const [activeView, setActiveView] = useState('dashboard');
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [showTransferModal, setShowTransferModal] = useState(null);
  const [showAdjustModal, setShowAdjustModal] = useState(null);
  const [movementHistory, setMovementHistory] = useState([]);
  const [predictiveAlerts, setPredictiveAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState({ web: 'synced', lastSync: new Date().toISOString() });
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [tiendanubeApi, setTiendanubeApi] = useState(null);
  const [syncQueue, setSyncQueue] = useState([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  const syncQueueRef = useRef([]);
  const isProcessingRef = useRef(false);

  // Initialize TiendaNube API
  useEffect(() => {
    if (session && workspaceData) {
      let mounted = true;
      const initApi = async () => {
        let token = workspaceData.tiendanube_access_token;
        let storeId = workspaceData.tiendanube_store_id;
        
        if (!token) {
          const { data: sysCfg } = await supabase.from('system_config').select('tiendanube_access_token, tiendanube_store_id').eq('id', 'main').single();
          token = sysCfg?.tiendanube_access_token;
          storeId = sysCfg?.tiendanube_store_id;
        }
        
        if (token && storeId && mounted) {
          const api = new TiendanubeAPI(storeId, token);
          setTiendanubeApi(api);
        }
      };
      initApi();
      return () => { mounted = false; };
    }
  }, [session, workspaceData]);

  // Mock data for demo - replace with real API calls
  const [inventory, setInventory] = useState(() => {
    const mock = [];
    const categories = ['Camisetas', 'Buzos', 'Pantalones', 'Gorras', 'Accesorios'];
    const colors = ['Negro', 'Blanco', 'Azul', 'Rojo', 'Gris', 'Verde', 'Rosa', 'Morado'];
    const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    const locations = ['r5', 'apes', 'web'];
    
    for (let i = 1; i <= 200; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const basePrice = Math.floor(Math.random() * 30000) + 10000;
      
      locations.forEach(loc => {
        const isWeb = loc === 'web';
        const stock = isWeb ? null : Math.floor(Math.random() * 80);
        const minStock = Math.floor(Math.random() * 15) + 5;
        const reserved = Math.floor(Math.random() * 10);
        const incoming = Math.floor(Math.random() * 30);
        
        let status = 'in_stock';
        if (isWeb) status = 'in_stock';
        else if (stock === 0) status = 'out_of_stock';
        else if (stock <= minStock) status = 'low_stock';
        else if (!isWeb && Math.random() > 0.9) status = 'in_production';
        
        mock.push({
          id: `inv-${i}-${loc}`,
          productId: `prod-${i}`,
          sku: `SKU-${String(i).padStart(5, '0')}`,
          barcode: `779${String(i).padStart(10, '0')}`,
          name: `${category} ${color}`,
          category,
          color,
          size: sizes[Math.floor(Math.random() * sizes.length)],
          location: loc,
          locationName: LOCATIONS.find(l => l.id === loc)?.name || loc,
          currentStock: stock,
          minStock,
          reserved,
          incoming,
          status,
          unitCost: basePrice,
          sellPrice: Math.floor(basePrice * (1.5 + Math.random() * 1.5)),
          lastMovement: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          lastCounted: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          image: null,
          supplier: `Proveedor ${Math.floor(Math.random() * 10) + 1}`,
          season: ['Verano', 'Invierno', 'Todo el año'][Math.floor(Math.random() * 3)],
          tags: [],
          notes: '',
          tiendanubeProductId: `tn-${i}`,
          tiendanubeVariantId: `tv-${i}-${loc}`,
        });
      });
    }
    return mock;
  });

  // Compute unified product view
  const unifiedProducts = useMemo(() => {
    const grouped = {};
    inventory.forEach(item => {
      if (!grouped[item.productId]) {
        grouped[item.productId] = {
          productId: item.productId,
          sku: item.sku,
          barcode: item.barcode,
          name: item.name,
          category: item.category,
          color: item.color,
          size: item.size,
          image: item.image,
          barcode: item.barcode,
          locations: {},
          totalStock: 0,
          totalReserved: 0,
          totalIncoming: 0,
          availableStock: 0,
          statuses: new Set(),
          unitCost: item.unitCost,
          sellPrice: item.sellPrice,
          supplier: item.supplier,
        };
      }
      const g = grouped[item.productId];
      g.locations[item.location] = item;
      if (item.currentStock !== null) {
        g.totalStock += item.currentStock;
        g.availableStock += Math.max(0, (item.currentStock || 0) - (item.reserved || 0));
      } else {
        g.totalStock = null;
      }
      g.totalReserved += item.reserved || 0;
      g.totalIncoming += item.incoming || 0;
      g.statuses.add(item.status);
    });
    return Object.values(grouped);
  }, [inventory]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return unifiedProducts.filter(p => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && 
          !p.sku.toLowerCase().includes(search.toLowerCase()) &&
          !p.category.toLowerCase().includes(search.toLowerCase()) &&
          !p.barcode.toLowerCase().includes(search.toLowerCase())) return false;
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      
      if (locationFilter !== 'all') {
        const locItem = p.locations[locationFilter];
        if (!locItem) return false;
        if (statusFilter !== 'all' && locItem.status !== statusFilter) return false;
      } else if (statusFilter !== 'all') {
        if (!p.statuses.has(statusFilter)) return false;
      }
      return true;
    });
  }, [unifiedProducts, search, locationFilter, statusFilter, categoryFilter]);

  // Sort
  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      let va, vb;
      if (sortBy === 'name') { va = a.name; vb = b.name; }
      else if (sortBy === 'sku') { va = a.sku; vb = b.sku; }
      else if (sortBy === 'stock') { va = a.totalStock ?? 999999; vb = b.totalStock ?? 999999; }
      else if (sortBy === 'category') { va = a.category; vb = b.category; }
      else if (sortBy === 'value') { va = (a.totalStock || 0) * a.unitCost; vb = (b.totalStock || 0) * b.unitCost; }
      else { va = a[sortBy] || ''; vb = b[sortBy] || ''; }
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === 'asc' ? va - vb : vb - va;
    });
  }, [filteredProducts, sortBy, sortDir]);

  // Compute stats
  const stats = useMemo(() => {
    const total = inventory.length;
    const totalProducts = unifiedProducts.length;
    const totalStock = inventory.filter(i => i.currentStock !== null).reduce((s, i) => s + (i.currentStock || 0), 0);
    const lowStock = inventory.filter(i => i.currentStock !== null && i.currentStock > 0 && i.currentStock <= (i.minStock || lowStockThreshold)).length;
    const outOfStock = inventory.filter(i => i.currentStock === 0).length;
    const inProduction = inventory.filter(i => i.status === 'in_production').length;
    const unlimited = inventory.filter(i => i.currentStock === null).length;
    const totalValue = inventory.reduce((s, i) => s + ((i.currentStock || 0) * (i.unitCost || 0)), 0);
    
    const byLocation = {};
    LOCATIONS.forEach(l => {
      const locItems = inventory.filter(i => i.location === l.id);
      byLocation[l.id] = {
        name: l.name,
        color: l.color,
        type: l.type,
        total: locItems.length,
        stock: locItems.filter(i => i.currentStock !== null).reduce((s, i) => s + (i.currentStock || 0), 0),
        low: locItems.filter(i => i.currentStock !== null && i.currentStock > 0 && i.currentStock <= (i.minStock || lowStockThreshold)).length,
        out: locItems.filter(i => i.currentStock === 0).length,
        value: locItems.reduce((s, i) => s + ((i.currentStock || 0) * (i.unitCost || 0)), 0),
      };
    });
    
    return {
      totalProducts,
      totalVariants: total,
      totalStock,
      lowStock,
      outOfStock,
      inProduction,
      unlimited,
      totalValue,
      byLocation,
    };
  }, [inventory]);

  // Predictive alerts
  useEffect(() => {
    if (!showPredictive) return;
    const alerts = [];
    unifiedProducts.forEach(p => {
      const available = p.totalStock !== null ? p.totalStock - p.totalReserved : null;
      const daysOfStock = p.totalReserved > 0 && available !== null ? available / (p.totalReserved / 30) : null;
      
      if (available !== null && available <= 0) {
        alerts.push({ type: 'critical', product: p, message: `SIN STOCK: ${p.name}`, action: 'reorder', priority: 'critical' });
      } else if (available !== null && available <= 5) {
        alerts.push({ type: 'warning', product: p, message: `Stock crítico: ${p.name} (${available} disp.)`, action: 'reorder', priority: 'high' });
      } else if (daysOfStock && daysOfStock < 7) {
        alerts.push({ type: 'info', product: p, message: `${p.name} se agota en ~${Math.round(daysOfStock)} días`, action: 'plan', priority: 'medium' });
      }
      
      if (p.season === 'Invierno' && new Date().getMonth() >= 2 && new Date().getMonth() <= 5) {
        alerts.push({ type: 'seasonal', product: p, message: `Temporada de ${p.category} - preparar stock`, action: 'prepare', priority: 'medium' });
      }
    });
    setPredictiveAlerts(alerts.slice(0, 15));
  }, [unifiedProducts]);

  // Queue processing for sync
  const processSyncQueue = useCallback(async () => {
    if (isProcessingRef.current || syncQueueRef.current.length === 0 || !tiendanubeApi) return;
    
    isProcessingRef.current = true;
    setIsProcessingQueue(true);
    
    while (syncQueueRef.current.length > 0) {
      const item = syncQueueRef.current.shift();
      try {
        await tiendanubeApi.updateVariantStock(
          item.tiendanubeProductId,
          item.tiendanubeVariantId,
          item.newStock
        );
        console.log('[Sync] Updated variant', item.tiendanubeVariantId, 'to', item.newStock);
      } catch (error) {
        console.error('[Sync] Failed to update variant', item.tiendanubeVariantId, error);
        syncQueueRef.current.unshift(item);
        break;
      }
    }
    
    isProcessingRef.current = false;
    setIsProcessingQueue(false);
  }, [tiendanubeApi]);

  // Add to sync queue when stock changes
  const queueStockSync = useCallback((productId, variantId, newStock, tiendanubeProductId, tiendanubeVariantId) => {
    if (!tiendanubeProductId || !tiendanubeVariantId) return;
    syncQueueRef.current.push({ productId, variantId, newStock, tiendanubeProductId, tiendanubeVariantId });
    if (!isProcessingRef.current) {
      processSyncQueue();
    }
  }, [processSyncQueue]);

  // Sync web inventory with TiendaNube
  const syncWebInventory = useCallback(async () => {
    if (!tiendanubeApi) {
      alert('TiendaNube no configurado');
      return false;
    }
    
    setSyncStatus(prev => ({ ...prev, web: 'syncing' }));
    try {
      const webItems = inventory.filter(i => i.location === 'web' && i.tiendanubeProductId && i.tiendanubeVariantId);
      
      for (const webItem of webItems) {
        const productId = webItem.productId;
        const localItems = inventory.filter(i => i.productId === productId && i.location !== 'web' && i.currentStock !== null);
        const totalLocalStock = localItems.reduce((sum, item) => sum + (item.currentStock || 0), 0);
        
        try {
          await tiendanubeApi.updateVariantStock(
            webItem.tiendanubeProductId,
            webItem.tiendanubeVariantId,
            totalLocalStock
          );
          
          setInventory(prev => prev.map(item => {
            if (item.id === webItem.id) {
              return { ...item, currentStock: totalLocalStock, lastSync: new Date().toISOString() };
            }
            return item;
          }));
        } catch (error) {
          console.error('[Sync] Failed to update variant', webItem.tiendanubeVariantId, error);
        }
      }
      
      setSyncStatus(prev => ({ ...prev, web: 'synced', lastSync: new Date().toISOString() }));
      return true;
    } catch (error) {
      setSyncStatus(prev => ({ ...prev, web: 'error' }));
      console.error('Sync error:', error);
      return false;
    }
  }, [tiendanubeApi, inventory]);

  // Sync web inventory from local warehouses
  const syncWebFromLocal = useCallback(async () => {
    if (!tiendanubeApi) {
      alert('TiendaNube no configurado. Ve a Configuración para agregar credenciales.');
      return false;
    }
    
    setSyncStatus(prev => ({ ...prev, web: 'syncing' }));
    try {
      const productsWithLocalStock = unifiedProducts.filter(p => {
        const localStock = Object.values(p.locations).filter(l => l.location !== 'web' && l.currentStock !== null).reduce((s, l) => s + (l.currentStock || 0), 0);
        return localStock > 0;
      });
      
      for (const product of productsWithLocalStock) {
        const localStock = Object.values(product.locations)
          .filter(l => l.location !== 'web' && l.currentStock !== null)
          .reduce((s, l) => s + (l.currentStock || 0), 0);
        
        const webVariant = product.locations.web;
        if (webVariant && webVariant.tiendanubeProductId && webVariant.tiendanubeVariantId) {
          try {
            await tiendanubeApi.updateVariantStock(
              webVariant.tiendanubeProductId,
              webVariant.tiendanubeVariantId,
              localStock
            );
            
            setInventory(prev => prev.map(item => {
              if (item.id === webVariant.id) {
                return { ...item, currentStock: localStock, lastSync: new Date().toISOString() };
              }
              return item;
            }));
          } catch (error) {
            console.error('[Sync] Failed to update variant', webVariant.tiendanubeVariantId, error);
          }
        }
      }
      
      setSyncStatus(prev => ({ ...prev, web: 'synced', lastSync: new Date().toISOString() }));
      return true;
    } catch (error) {
      setSyncStatus(prev => ({ ...prev, web: 'error' }));
      console.error('Sync error:', error);
      return false;
    }
  }, [tiendanubeApi, unifiedProducts]);

  // Auto-sync when local stock changes
  useEffect(() => {
    if (syncQueueRef.current.length > 0) {
      processSyncQueue();
    }
  }, [inventory]);

  const handleSort = (key) => {
    if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(key); setSortDir('asc'); }
  };

  const openTransfer = (product) => setShowTransferModal(product);
  const openAdjust = (variant) => setShowAdjustModal(variant);

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: '0 0 8px', fontSize: '28px', fontWeight: '800', color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #3b82f6, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(16,185,129,0.3)' }}>
              <Warehouse size={26} color="#fff" />
            </div>
            Inventario Unificado R5 + APES + WEB
          </h1>
          <p style={{ margin: '0', fontSize: '14px', color: 'var(--on-surface-variant)' }}>
            {stats.totalProducts} productos · {stats.totalVariants} variantes · {formatNumber(stats.totalStock)} unidades · Valor: {formatCurrency(stats.totalValue)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={syncWebFromLocal} disabled={syncStatus.web === 'syncing' || !tiendanubeApi} style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid var(--border-subtle)', background: 'var(--surface)', color: 'var(--on-surface)', cursor: tiendanubeApi ? 'pointer' : 'not-allowed', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px', opacity: tiendanubeApi ? 1 : 0.5 }}>
            {syncStatus.web === 'syncing' ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Loader2 size={14} />}
            {syncStatus.web === 'syncing' ? 'Sincronizando...' : 'Sync WEB ← Locales'}
          </button>
          <button onClick={syncWebInventory} disabled={syncStatus.web === 'syncing' || !tiendanubeApi} style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid var(--border-subtle)', background: 'var(--surface)', color: 'var(--on-surface)', cursor: tiendanubeApi ? 'pointer' : 'not-allowed', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px', opacity: tiendanubeApi ? 1 : 0.5 }}>
            {syncStatus.web === 'syncing' ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <ZapIcon3 size={14} />}
            {syncStatus.web === 'syncing' ? 'Sincronizando...' : 'Sync TiendaNube'}
          </button>
          <button style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid var(--border-subtle)', background: 'var(--surface)', color: 'var(--on-surface)', cursor: 'pointer', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={14} /> Exportar
          </button>
          <button style={{ padding: '10px 18px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #3b82f6, #10b981)', color: '#fff', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={14} /> Nueva Variante
          </button>
        </div>
      </div>

      {/* Sync Status Indicator */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {LOCATIONS.map(loc => (
          <div key={loc.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', background: 'var(--surface-container)', border: '1px solid var(--border-subtle)', fontSize: '11px', fontWeight: '600' }}>
            <loc.icon size={12} color={loc.color} />
            <span style={{ color: loc.color }}>{loc.name}</span>
            {loc.sync && (
              <span style={{ 
                width: '8px', height: '8px', borderRadius: '50%', 
                background: syncStatus.web === 'synced' ? '#10b981' : syncStatus.web === 'syncing' ? '#f59e0b' : '#ef4444',
                animation: syncStatus.web === 'syncing' ? 'pulse 1s infinite' : 'none'
              }} />
            )}
          </div>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--on-surface-variant)' }}>
          Última sync: {syncStatus.lastSync ? new Date(syncStatus.lastSync).toLocaleTimeString('es-CO') : '—'}
          {isProcessingQueue && <span style={{ marginLeft: '8px', color: '#8b5cf6' }}>(Procesando cola: {syncQueueRef.current.length})</span>}
        </span>
      </div>

      {/* Predictive Alerts */}
      {predictiveAlerts.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', padding: '8px 12px', background: 'var(--warning-container)', borderRadius: '8px', border: '1px solid var(--warning)' }}>
            <Bell size={16} color="var(--warning)" />
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--warning)' }}>
              {predictiveAlerts.length} alertas inteligentes
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {predictiveAlerts.map((alert, i) => (
              <div key={i} style={{ padding: '10px 14px', borderRadius: '8px', background: `var(--${alert.type}-container)`, border: `1px solid var(--${alert.type})`, display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '280px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: `var(--${alert.type})` }} />
                <span style={{ fontSize: '12px', color: `var(--${alert.type})`, flex: 1 }}>{alert.message}</span>
                <button style={{ padding: '4px 10px', borderRadius: '6px', background: `var(--${alert.type})`, color: '#fff', fontSize: '11px', fontWeight: '600', border: 'none', cursor: 'pointer' }}>
                  {alert.action === 'reorder' ? 'Pedir' : alert.action === 'plan' ? 'Planificar' : 'Preparar'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <StatCard label="Productos Únicos" value={stats.totalProducts} sub={`${stats.totalVariants} variantes`} color='#3b82f6' icon={<Box size={20} />} />
        <StatCard label="Stock Total" value={formatNumber(stats.totalStock)} color='#10b981' icon={<Package size={20} />} />
        <StatCard label="Valor Inventario" value={formatCurrency(stats.totalValue)} color='#8b5cf6' icon={<TrendingUp size={20} />} />
        <StatCard label="En Producción" value={stats.inProduction} color='#f59e0b' icon={<RotateCcw size={20} />} />
        <StatCard label="Stock Bajo" value={stats.lowStock} color='#f59e0b' icon={<AlertTriangle size={20} />} />
        <StatCard label="Sin Stock" value={stats.outOfStock} color='#ef4444' icon={<Package size={20} />} />
        <StatCard label="Ilimitados" value={stats.unlimited} color='#06b6d4' icon={<Sparkles size={20} />} />
        <StatCard label="Valor Total" value={formatCurrency(stats.totalValue)} color='#6366f1' icon={<TrendingUp size={20} />} />
      </div>

      {/* Location Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {LOCATIONS.map(loc => {
          const d = stats.byLocation[loc.id] || { total: 0, stock: 0, low: 0, out: 0, value: 0 };
          return (
            <div key={loc.id} style={{ padding: '16px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderLeft: `4px solid ${loc.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <loc.icon size={14} color={loc.color} />
                <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--on-surface)' }}>{loc.name}</span>
                <span style={{ fontSize: '10px', fontWeight: '600', padding: '2px 6px', borderRadius: '6px', background: `${loc.color}20`, color: loc.color, marginLeft: 'auto' }}>
                  {loc.type === 'physical' ? '🏪' : loc.type === 'online' ? '🌐' : '✨'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                <div style={{ padding: '8px', borderRadius: '8px', background: 'var(--surface-container-low)' }}>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--on-surface)', fontFamily: "'JetBrains Mono', monospace" }}>{formatNumber(d.stock)}</div>
                  <div style={{ fontSize: '10px', color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>Stock</div>
                </div>
                <div style={{ padding: '8px', borderRadius: '8px', background: 'var(--surface-container-low)' }}>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#ef4444', fontFamily: "'JetBrains Mono', monospace" }}>{d.out}</div>
                  <div style={{ fontSize: '10px', color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>Sin Stock</div>
                </div>
                <div style={{ padding: '8px', borderRadius: '8px', background: 'var(--surface-container-low)' }}>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#f59e0b', fontFamily: "'JetBrains Mono', monospace" }}>{d.low}</div>
                  <div style={{ fontSize: '10px', color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>Bajo</div>
                </div>
                <div style={{ padding: '8px', borderRadius: '8px', background: 'var(--surface-container-low)' }}>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#3b82f6', fontFamily: "'JetBrains Mono', monospace" }}>{d.total}</div>
                  <div style={{ fontSize: '10px', color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>Variantes</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '16px', padding: '16px', background: 'var(--surface-container)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
        <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--on-surface-variant)' }} />
          <input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Buscar producto, SKU, categoría..." 
            style={{ width: '100%', padding: '12px 14px 12px 44px', borderRadius: '10px', border: '1px solid var(--border-subtle)', background: 'var(--surface)', color: 'var(--on-surface)', fontSize: '14px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} 
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)} style={selectStyle}>
            <option value="all">📍 Todas las ubicaciones</option>
            {LOCATIONS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle}>
            <option value="all">📦 Todos los estados</option>
            <option value="in_stock">✅ En Stock</option>
            <option value="low_stock">⚠️ Stock Bajo</option>
            <option value="out_of_stock">❌ Sin Stock</option>
            <option value="in_production">🔄 En Producción</option>
            <option value="ready_to_ship">📦 Listo para Despachar</option>
            <option value="unlimited">♾️ Ilimitado</option>
          </select>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={selectStyle}>
            <option value="all">🏷️ Todas las categorías</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ ...selectStyle, minWidth: '160px' }}>
            <option value="name">📝 Nombre</option>
            <option value="sku">🔢 SKU</option>
            <option value="stock">📦 Stock Total</option>
            <option value="category">🏷️ Categoría</option>
            <option value="value">💰 Valor</option>
          </select>
          <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--surface)', color: 'var(--on-surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            {sortDir === 'asc' ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div style={{ background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr 100px 80px 100px 90px 80px 100px 120px', padding: '14px 20px', fontSize: '11px', fontWeight: '700', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-container-low)', overflowX: 'auto' }}>
          <span></span>
          <span onClick={() => handleSort('name')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>Producto {sortBy==='name' && (sortDir==='asc'?'↑':'↓')}</span>
          <span onClick={() => handleSort('sku')} style={{ cursor: 'pointer', textAlign: 'center' }}>SKU {sortBy==='sku' && (sortDir==='asc'?'↑':'↓')}</span>
          <span onClick={() => handleSort('stock')} style={{ cursor: 'pointer', textAlign: 'center' }}>Stock {sortBy==='stock' && (sortDir==='asc'?'↑':'↓')}</span>
          <span onClick={() => handleSort('category')} style={{ cursor: 'pointer' }}>Categoría {sortBy==='category' && (sortDir==='asc'?'↑':'↓')}</span>
          <span style={{ textAlign: 'center' }}>Ubicaciones</span>
          <span style={{ textAlign: 'center' }}>Estado</span>
          <span style={{ textAlign: 'center' }}>Valor</span>
          <span style={{ textAlign: 'center' }}>Acciones</span>
        </div>

        <div style={{ maxHeight: '65vh', overflowY: 'auto' }}>
          {sortedProducts.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
              <Package size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
              <p style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 8px' }}>No se encontraron productos</p>
              <p style={{ fontSize: '13px', opacity: 0.7, margin: '0' }}>Intenta ajustar los filtros o busca con otros términos</p>
            </div>
          ) : (
            sortedProducts.map((product, idx) => (
              <ProductRow 
                key={product.productId} 
                product={product} 
                index={idx}
                onTransfer={openTransfer}
                onAdjust={openAdjust}
                selected={selectedItems.has(product.productId)}
                onSelect={id => setSelectedItems(prev => {
                  const n = new Set(prev);
                  n.has(id) ? n.delete(id) : n.add(id);
                  return n;
                })}
              />
            ))
          )}
        </div>
      </div>

      {/* Modals */}
      {showTransferModal && (
        <TransferModal 
          product={showTransferModal} 
          locations={LOCATIONS}
          inventory={inventory}
          onClose={() => setShowTransferModal(null)}
          onConfirm={handleTransfer}
        />
      )}
      {showAdjustModal && (
        <AdjustModal 
          variant={showAdjustModal} 
          onClose={() => setShowAdjustModal(null)}
          onConfirm={handleAdjustConfirm}
        />
      )}
    </div>
  );
}

const selectStyle = {
  padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)',
  background: 'var(--surface)', color: 'var(--on-surface)', fontSize: '12px', fontWeight: '500',
  cursor: 'pointer', fontFamily: 'inherit', minWidth: '160px',
};

function ProductRow({ product, index, onTransfer, onAdjust, selected, onSelect }) {
  const statuses = Array.from(product.statuses);
  const primaryStatus = statuses[0] || 'in_stock';
  const statusInfo = STOCK_STATUS[primaryStatus] || STOCK_STATUS.in_stock;
  const available = product.totalStock !== null ? product.totalStock - product.totalReserved : null;
  const locationCount = Object.keys(product.locations).length;

  return (
    <div 
      style={{ 
        display: 'grid', gridTemplateColumns: '48px 1fr 100px 80px 100px 90px 80px 100px 120px', 
        padding: '12px 20px', alignItems: 'center', 
        borderBottom: '1px solid var(--border-subtle)',
        background: selected ? 'var(--primary-container)' : (index % 2 === 0 ? 'transparent' : 'var(--surface-container-low)'),
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = selected ? 'var(--primary-container)' : 'var(--surface-container)'}
      onMouseLeave={e => e.currentTarget.style.background = selected ? 'var(--primary-container)' : (index % 2 === 0 ? 'transparent' : 'var(--surface-container-low)')}
      onClick={() => onSelect(product.productId)}
    >
      <input type="checkbox" checked={selected} onChange={e => { e.stopPropagation(); onSelect(product.productId); }} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
      
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</div>
        <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)', display: 'flex', gap: '12px', marginTop: '2px' }}>
          <span>{product.category}</span>
          <span>{product.color}</span>
          <span>{product.size}</span>
        </div>
      </div>
      
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '16px', fontWeight: '800', fontFamily: "'JetBrains Mono', monospace", color: product.totalStock > 0 ? 'var(--on-surface)' : '#06b6d4' }}>
          {product.totalStock > 0 ? formatNumber(product.totalStock) : '∞'}
        </div>
        {product.totalReserved > 0 && (
          <div style={{ fontSize: '10px', color: '#f59e0b' }}>({formatNumber(product.totalReserved)} reserv.)</div>
        )}
      </div>
      
      <div style={{ textAlign: 'center' }}>
        {product.totalIncoming > 0 ? (
          <span style={{ fontSize: '11px', color: '#3b82f6', fontWeight: '600' }}>+{formatNumber(product.totalIncoming)} entr.</span>
        ) : (
          <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)', opacity: 0.5 }}>—</span>
        )}
      </div>
      
      <div style={{ textAlign: 'center' }}>
        <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--on-surface)' }}>
          {product.category}
        </span>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
        <span style={{ fontSize: '10px', fontWeight: '600', color: 'var(--on-surface-variant)' }}>{locationCount}</span>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusInfo.color }} />
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
        <span style={{ 
          display: 'inline-flex', alignItems: 'center', gap: '4px',
          padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '600',
          background: statusInfo.bg, color: statusInfo.color, border: `1px solid ${statusInfo.color}30`
        }}>
          {statusInfo.icon && <statusInfo.icon size={10} />}
          {statusInfo.label}
        </span>
      </div>
      
      <div style={{ textAlign: 'right', fontSize: '14px', fontWeight: '700', color: 'var(--on-surface)', fontFamily: "'JetBrains Mono', monospace" }}>
        {formatCurrency(product.locations[Object.keys(product.locations)[0]]?.unitCost * product.totalStock || 0)}
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
        <button onClick={e => { e.stopPropagation(); onTransfer(product); }} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--surface)', color: 'var(--primary)', fontSize: '11px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <ArrowLeftRight size={12} /> Mover
        </button>
        <button onClick={e => { e.stopPropagation(); onAdjust(product.locations[Object.keys(product.locations)[0]]); }} style={{ padding: '6px 10px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: '#fff', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
          <Edit3 size={12} /> Ajustar
        </button>
      </div>
    </div>
  );
}

export { InventoryHub };