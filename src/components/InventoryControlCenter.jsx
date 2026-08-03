import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { useTeam } from '../contexts/TeamContext';
import useInventory from '../hooks/useInventory';
import useInventoryRealtime from '../hooks/useInventoryRealtime';

import InventoryDashboard from './inventory/InventoryDashboard';
import ProductList from './inventory/ProductList';
import StockAdjuster from './inventory/StockAdjuster';
import StockTransfer from './inventory/StockTransfer';
import MovementHistory from './inventory/MovementHistory';
import AlertsPanel from './inventory/AlertsPanel';
import InventoryReports from './inventory/InventoryReports';
import UserRoles from './inventory/UserRoles';
import SyncStatus from './inventory/SyncStatus';
import AIScanTab from './inventory/AIScanTab';
import TallerStockControl from './inventory/TallerStockControl';

import {
  Home, Package, ArrowUpDown, History, Bell,
  RefreshCw, Menu, X, Wifi, WifiOff, Plus,
  ArrowLeftRight, Settings, Factory
} from 'lucide-react';

const TABS = [
  { id: 'dashboard', label: 'Inicio', icon: Home },
  { id: 'products', label: 'Productos', icon: Package },
  { id: 'stock', label: 'Stock', icon: ArrowUpDown },
  { id: 'history', label: 'Historial', icon: History },
  { id: 'alerts', label: 'Alertas', icon: Bell },
];

const MORE_TABS = [
  { id: 'reports', label: 'Reportes', icon: RefreshCw },
  { id: 'roles', label: 'Equipo', icon: Settings },
];

function SidebarNav({ activeTab, onTabChange, alerts, connected, sidebarOpen, onClose }) {
  const unreadAlerts = alerts?.filter(a => !a.acknowledged)?.length || 0;
  const [showMore, setShowMore] = useState(false);

  return (
    <>
      {sidebarOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 99, display: 'none',
          }}
          className="inv-overlay"
        />
      )}
      <nav style={{
        width: sidebarOpen ? '220px' : '56px',
        minWidth: sidebarOpen ? '220px' : '56px',
        background: 'var(--surface)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.2s, min-width 0.2s',
        overflow: 'hidden',
        height: '100%',
      }}>
        <div style={{
          padding: sidebarOpen ? '16px 14px' : '16px 0',
          display: 'flex', alignItems: 'center', justifyContent: sidebarOpen ? 'space-between' : 'center',
          borderBottom: '1px solid var(--border-subtle)', minHeight: '52px',
        }}>
          {sidebarOpen && (
            <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--on-surface)', whiteSpace: 'nowrap' }}>
              Inventario
            </span>
          )}
          <div style={{
            width: '24px', height: '24px', borderRadius: '6px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: connected ? '#06B6D418' : '#E11D4818',
          }}>
            {connected ? <Wifi size={12} color="#06B6D4" /> : <WifiOff size={12} color="#E11D48" />}
          </div>
        </div>
        <div style={{ flex: 1, padding: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isAlert = tab.id === 'alerts' && unreadAlerts > 0;
            return (
              <button
                key={tab.id}
                onClick={() => { onTabChange(tab.id); if (window.innerWidth < 768) onClose(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: sidebarOpen ? '10px 12px' : '10px',
                  justifyContent: sidebarOpen ? 'flex-start' : 'center',
                  borderRadius: '10px', border: 'none', cursor: 'pointer',
                  background: isActive ? '#6366f118' : 'transparent',
                  color: isActive ? '#6366f1' : 'var(--on-surface-variant)',
                  fontSize: '13px', fontWeight: isActive ? 600 : 400,
                  position: 'relative', transition: 'all 0.15s',
                  whiteSpace: 'nowrap', overflow: 'hidden',
                }}
              >
                <Icon size={18} />
                {sidebarOpen && <span>{tab.label}</span>}
                {isAlert && (
                  <span style={{
                    position: 'absolute', top: '6px', right: sidebarOpen ? '8px' : '6px',
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: '#E11D48',
                  }} />
                )}
              </button>
            );
          })}

          {sidebarOpen && (
            <>
              <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '6px 8px' }} />
              {MORE_TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => { onTabChange(tab.id); if (window.innerWidth < 768) onClose(); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 12px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                      background: isActive ? '#6366f118' : 'transparent',
                      color: isActive ? '#6366f1' : 'var(--on-surface-variant)',
                      fontSize: '13px', fontWeight: isActive ? 600 : 400,
                      transition: 'all 0.15s', whiteSpace: 'nowrap',
                    }}
                  >
                    <Icon size={18} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </>
          )}
        </div>
      </nav>
    </>
  );
}

function MobileTabBar({ activeTab, onTabChange, alerts }) {
  const unreadAlerts = alerts?.filter(a => !a.acknowledged)?.length || 0;
  const visibleTabs = TABS;
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'var(--surface)', borderTop: '1px solid var(--border-subtle)',
      display: 'flex', justifyContent: 'space-around', padding: '6px 0',
      zIndex: 50, paddingBottom: 'max(6px, env(safe-area-inset-bottom))',
    }}>
      {visibleTabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
              padding: '6px 14px', borderRadius: '10px', border: 'none', cursor: 'pointer',
              background: isActive ? '#6366f118' : 'transparent',
              color: isActive ? '#6366f1' : 'var(--on-surface-variant)',
              fontSize: '10px', fontWeight: isActive ? 600 : 400,
              position: 'relative',
            }}
          >
            <Icon size={20} />
            <span>{tab.label}</span>
            {tab.id === 'alerts' && unreadAlerts > 0 && (
              <span style={{
                position: 'absolute', top: '2px', right: '6px',
                width: '16px', height: '16px', borderRadius: '50%',
                background: '#E11D48', color: 'var(--on-surface)', fontSize: '9px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700,
              }}>
                {unreadAlerts > 9 ? '9+' : unreadAlerts}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function InventoryControlCenter({
  session,
  supabase: supabaseProp,
  workspaceData,
  tiendanubeProducts = [],
  connectionStatus = 'disconnected',
  isRefreshingStock = false,
  lastSync = null,
  refreshStock = () => {},
  onStockUpdate,
}) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stockSubTab, setStockSubTab] = useState('adjust');
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);

  const { addToast } = useNotifications();
  const { currentMember } = useTeam();

  const {
    products,
    locations,
    stock,
    movements,
    alerts,
    summary,
    roles,
    loading,
    fetchProducts,
    fetchAlerts,
    fetchMovements,
    adjustStock,
    transferStock,
    createProduct,
    updateProduct,
    deleteProduct,
    acknowledgeAlert,
    checkAlerts,
    init,
    aiSearch,
    setUserRole,
  } = useInventory();

  const handleStockChange = useCallback(() => {
    fetchProducts();
    fetchAlerts();
  }, [fetchProducts, fetchAlerts]);

  const handleMovementChange = useCallback(() => {
    fetchMovements({ limit: 50 });
  }, [fetchMovements]);

  const handleAlertChange = useCallback(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleSyncEvent = useCallback((event) => {
    if (event?.type === 'sync-complete') {
      fetchProducts();
      addToast({ type: 'success', title: 'Sincronización', message: 'Stock actualizado desde TiendaNube' });
    }
  }, [fetchProducts, addToast]);

  const { connected: realtimeConnected, lastEvent } = useInventoryRealtime({
    onStockChange: handleStockChange,
    onMovementChange: handleMovementChange,
    onAlertChange: handleAlertChange,
    onSyncEvent: handleSyncEvent,
  });

  useEffect(() => {
    init();
  }, [init]);

const handleAdjust = useCallback(async (data) => {
    const result = await adjustStock(data.productId, data.locationId, data.quantity, data.type, data.notes);
    if (result?.success !== false) {
      addToast({ type: 'success', title: 'Stock actualizado', message: 'El cambio se registró correctamente' });
      fetchProducts();
      fetchAlerts();
    } else {
      addToast({ type: 'error', title: 'Error', message: result?.error || 'No se pudo actualizar el stock' });
    }
    return result;
  }, [adjustStock, addToast, fetchProducts, fetchAlerts]);

  const handleTransfer = useCallback(async (data) => {
    const result = await transferStock(data.productId, data.fromLocationId, data.toLocationId, data.quantity, data.notes);
    if (result?.success !== false) {
      addToast({ type: 'success', title: 'Transferencia lista', message: 'El stock se movió correctamente' });
      fetchProducts();
      fetchAlerts();
    } else {
      addToast({ type: 'error', title: 'Error', message: result?.error || 'No se pudo transferir' });
    }
    return result;
  }, [transferStock, addToast, fetchProducts, fetchAlerts]);

  const handleCreateProduct = useCallback(async (data) => {
    const result = await createProduct(data);
    if (result?.success !== false) {
      addToast({ type: 'success', title: 'Producto creado', message: `${data.name} se agregó al inventario` });
      fetchProducts();
    }
    return result;
  }, [createProduct, addToast, fetchProducts]);

  const handleUpdateProduct = useCallback(async (id, data) => {
    const result = await updateProduct(id, data);
    if (result?.success !== false) {
      addToast({ type: 'success', title: 'Guardado', message: 'Los cambios se actualizaron' });
      fetchProducts();
    }
    return result;
  }, [updateProduct, addToast, fetchProducts]);

  const handleDeleteProduct = useCallback(async (id) => {
    const result = await deleteProduct(id);
    if (result?.success !== false) {
      addToast({ type: 'success', title: 'Eliminado', message: 'Se quitó del inventario' });
      fetchProducts();
    }
    return result;
  }, [deleteProduct, addToast, fetchProducts]);

  const handleAcknowledgeAlert = useCallback(async (alertId) => {
    await acknowledgeAlert(alertId);
    fetchAlerts();
  }, [acknowledgeAlert, fetchAlerts]);

  const handleCheckAlerts = useCallback(async () => {
    await checkAlerts();
    fetchAlerts();
    addToast({ type: 'info', title: 'Listo', message: 'Se revisaron los niveles de stock' });
  }, [checkAlerts, fetchAlerts, addToast]);

  const unreadAlerts = alerts?.filter(a => !a.acknowledged)?.length || 0;
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <InventoryDashboard
            summary={summary}
            alerts={alerts}
            movements={movements}
            locations={locations}
            onAction={(action) => {
              if (action === 'new-product') setActiveTab('products');
              else if (action === 'adjust') { setActiveTab('stock'); setStockSubTab('adjust'); }
              else if (action === 'transfer') { setActiveTab('stock'); setStockSubTab('transfer'); }
              else if (action === 'alerts') setActiveTab('alerts');
              else if (action === 'sync') refreshStock();
            }}
          />
        );
      case 'products':
        return (
          <ProductList
            products={products}
            locations={locations}
            stock={stock}
            onAdjust={handleAdjust}
            onTransfer={handleTransfer}
            onCreate={handleCreateProduct}
            onUpdate={handleUpdateProduct}
            onDelete={handleDeleteProduct}
            onRefresh={fetchProducts}
            loading={loading}
            aiSearch={aiSearch}
            onOpenAIScan={() => setActiveTab('aiscan')}
          />
        );
      case 'aiscan':
        return (
          <div>
            <button
              onClick={() => setActiveTab('products')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px',
                padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)',
                background: 'var(--surface)', color: 'var(--on-surface)',
                fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              ← Volver a Productos
            </button>
            <AIScanTab
              products={products}
              onAdjust={handleAdjust}
            />
          </div>
        );
      case 'stock':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setStockSubTab('adjust')}
                style={{
                  padding: '10px 20px', borderRadius: '10px', border: 'none',
                  background: stockSubTab === 'adjust' ? '#6366f1' : 'var(--surface)',
                  color: stockSubTab === 'adjust' ? '#fff' : 'var(--on-surface)',
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  boxShadow: stockSubTab === 'adjust' ? '0 2px 8px rgba(99, 102, 241,0.3)' : 'none',
                }}
              >
                <ArrowUpDown size={16} /> Sumar / Restar
              </button>
              <button
                onClick={() => setStockSubTab('transfer')}
                style={{
                  padding: '10px 20px', borderRadius: '10px', border: 'none',
                  background: stockSubTab === 'transfer' ? '#8b5cf6' : 'var(--surface)',
                  color: stockSubTab === 'transfer' ? '#fff' : 'var(--on-surface)',
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  boxShadow: stockSubTab === 'transfer' ? '0 2px 8px rgba(139,92,246,0.3)' : 'none',
                }}
              >
                <ArrowLeftRight size={16} /> Mover entre locales
              </button>
              <button
                onClick={() => setStockSubTab('taller')}
                style={{
                  padding: '10px 20px', borderRadius: '10px', border: 'none',
                  background: stockSubTab === 'taller' ? '#06B6D4' : 'var(--surface)',
                  color: stockSubTab === 'taller' ? '#fff' : 'var(--on-surface)',
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  boxShadow: stockSubTab === 'taller' ? '0 2px 8px rgba(16,185,129,0.3)' : 'none',
                }}
              >
                <Factory size={16} /> Control Taller
              </button>
            </div>
            {stockSubTab === 'adjust' ? (
              <StockAdjuster
                products={products}
                locations={locations}
                onAdjust={handleAdjust}
                onClose={() => setActiveTab('products')}
              />
            ) : stockSubTab === 'transfer' ? (
              <StockTransfer
                products={products}
                locations={locations}
                stock={stock}
                onTransfer={handleTransfer}
                onClose={() => setActiveTab('products')}
              />
            ) : (
              <TallerStockControl />
            )}
          </div>
        );
      case 'history':
        return (
          <MovementHistory
            movements={movements}
            locations={locations}
            products={products}
            onRefresh={() => fetchMovements({ limit: 200 })}
            loading={loading}
          />
        );
      case 'alerts':
        return (
          <AlertsPanel
            alerts={alerts}
            onAcknowledge={handleAcknowledgeAlert}
            onCheck={handleCheckAlerts}
            loading={loading}
          />
        );
      case 'reports':
        return (
          <InventoryReports
            summary={summary}
            movements={movements}
            locations={locations}
            products={products}
          />
        );
      case 'roles':
        return (
          <UserRoles
            roles={roles || []}
            locations={locations}
            onUpdateRole={setUserRole}
            loading={loading}
          />
        );
      default:
        return null;
    }
  };

  const currentTabLabel = TABS.find(t => t.id === activeTab)?.label
    || MORE_TABS.find(t => t.id === activeTab)?.label
    || 'Inventario';

  return (
    <div style={{
      display: 'flex', height: '100%', background: 'var(--background, #0a0e1a)',
      color: 'var(--on-surface, #f8fafc)', fontFamily: 'Inter, sans-serif',
      position: 'relative', overflow: 'hidden',
    }}>
      {!isMobile && (
        <SidebarNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          alerts={alerts}
          connected={realtimeConnected}
          sidebarOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: isMobile ? '12px 16px' : '12px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--surface)', minHeight: '50px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isMobile ? (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                style={{ background: 'none', border: 'none', color: 'var(--on-surface)', cursor: 'pointer', padding: '4px' }}
              >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            ) : (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                style={{ background: 'none', border: 'none', color: 'var(--on-surface-variant)', cursor: 'pointer', padding: '4px' }}
              >
                <Menu size={18} />
              </button>
            )}
            <h1 style={{ margin: 0, fontSize: isMobile ? '16px' : '18px', fontWeight: 700 }}>
              {currentTabLabel}
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SyncStatus
              connected={realtimeConnected}
              lastSync={lastSync}
              onSync={refreshStock}
              events={[]}
              autoSync={true}
              onToggleAutoSync={() => {}}
            />
            {unreadAlerts > 0 && (
              <button
                onClick={() => setActiveTab('alerts')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px', borderRadius: '8px',
                  background: '#E11D4818', border: '1px solid #E11D4838',
                  color: '#E11D48', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                }}
              >
                <Bell size={14} />
                {unreadAlerts}
              </button>
            )}
          </div>
        </header>

        <main style={{
          flex: 1, overflow: 'auto', padding: isMobile ? '12px' : '20px',
          paddingBottom: isMobile ? '80px' : '20px',
        }}>
          {renderTab()}
        </main>
      </div>

      {isMobile && (
        <MobileTabBar activeTab={activeTab} onTabChange={setActiveTab} alerts={alerts} />
      )}
    </div>
  );
}
