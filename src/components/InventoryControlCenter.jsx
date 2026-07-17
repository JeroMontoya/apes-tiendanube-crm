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

import {
  LayoutDashboard, Package, ArrowLeftRight, History, Bell,
  BarChart3, Users, RefreshCw, Menu, X, Wifi, WifiOff,
  ChevronRight
} from 'lucide-react';

const TABS = [
  { id: 'dashboard', label: 'Panel', icon: LayoutDashboard },
  { id: 'products', label: 'Productos', icon: Package },
  { id: 'adjust', label: 'Ajustar Stock', icon: ChevronRight },
  { id: 'transfer', label: 'Transferir', icon: ArrowLeftRight },
  { id: 'movements', label: 'Movimientos', icon: History },
  { id: 'alerts', label: 'Alertas', icon: Bell },
  { id: 'reports', label: 'Reportes', icon: BarChart3 },
  { id: 'roles', label: 'Usuarios', icon: Users },
];

function SidebarNav({ activeTab, onTabChange, alerts, connected, sidebarOpen, onClose }) {
  const unreadAlerts = alerts?.filter(a => !a.acknowledged)?.length || 0;
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
        width: sidebarOpen ? '240px' : '64px',
        minWidth: sidebarOpen ? '240px' : '64px',
        background: 'var(--surface)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.2s, min-width 0.2s',
        overflow: 'hidden',
        height: '100%',
      }}>
        <div style={{
          padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-subtle)', minHeight: '56px',
        }}>
          {sidebarOpen && (
            <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--on-surface)', whiteSpace: 'nowrap' }}>
              Inventario
            </span>
          )}
          <div style={{
            width: '28px', height: '28px', borderRadius: '6px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: connected ? '#10b98118' : '#ef444418',
          }}>
            {connected ? <Wifi size={14} color="#10b981" /> : <WifiOff size={14} color="#ef4444" />}
          </div>
        </div>
        <div style={{ flex: 1, padding: '8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
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
                  borderRadius: '8px', border: 'none', cursor: 'pointer',
                  background: isActive ? '#3b82f618' : 'transparent',
                  color: isActive ? '#3b82f6' : 'var(--on-surface-variant)',
                  fontSize: '13px', fontWeight: isActive ? 600 : 400,
                  position: 'relative', transition: 'background 0.15s',
                  whiteSpace: 'nowrap', overflow: 'hidden',
                }}
              >
                <Icon size={18} />
                {sidebarOpen && <span>{tab.label}</span>}
                {isAlert && (
                  <span style={{
                    position: 'absolute', top: '6px', right: sidebarOpen ? '8px' : '6px',
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: '#ef4444',
                  }} />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}

function MobileTabBar({ activeTab, onTabChange, alerts }) {
  const unreadAlerts = alerts?.filter(a => !a.acknowledged)?.length || 0;
  const visibleTabs = TABS.filter(t => ['dashboard', 'products', 'adjust', 'transfer', 'alerts'].includes(t.id));
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'var(--surface)', borderTop: '1px solid var(--border-subtle)',
      display: 'flex', justifyContent: 'space-around', padding: '8px 0',
      zIndex: 50, paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
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
              padding: '4px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: isActive ? '#3b82f618' : 'transparent',
              color: isActive ? '#3b82f6' : 'var(--on-surface-variant)',
              fontSize: '10px', fontWeight: isActive ? 600 : 400,
              position: 'relative',
            }}
          >
            <Icon size={18} />
            <span>{tab.label}</span>
            {tab.id === 'alerts' && unreadAlerts > 0 && (
              <span style={{
                position: 'absolute', top: '0', right: '4px',
                width: '16px', height: '16px', borderRadius: '50%',
                background: '#ef4444', color: '#fff', fontSize: '9px',
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
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [modalStack, setModalStack] = useState(null);

  const { addToast } = useNotifications();
  const { currentMember } = useTeam();

  const inventory = useInventory();

  const handleStockChange = useCallback(() => {
    inventory.fetchProducts();
    inventory.fetchAlerts();
  }, [inventory]);

  const handleMovementChange = useCallback(() => {
    inventory.fetchMovements({ limit: 50 });
  }, [inventory]);

  const handleAlertChange = useCallback(() => {
    inventory.fetchAlerts();
  }, [inventory]);

  const handleSyncEvent = useCallback((event) => {
    if (event?.type === 'sync-complete') {
      inventory.fetchProducts();
      addToast({ type: 'success', title: 'Sincronización TN', message: 'Stock actualizado desde TiendaNube' });
    }
  }, [inventory, addToast]);

  const { connected: realtimeConnected, lastEvent } = useInventoryRealtime({
    onStockChange: handleStockChange,
    onMovementChange: handleMovementChange,
    onAlertChange: handleAlertChange,
    onSyncEvent: handleSyncEvent,
  });

  useEffect(() => {
    inventory.init();
  }, []);

  const handleAdjust = useCallback(async (data) => {
    const result = await inventory.adjustStock(data.productId, data.locationId, data.quantity, data.type, data.notes);
    if (result?.success !== false) {
      addToast({ type: 'success', title: 'Stock ajustado', message: 'El ajuste se registró correctamente' });
      inventory.fetchProducts();
      inventory.fetchAlerts();
    } else {
      addToast({ type: 'error', title: 'Error', message: result?.error || 'No se pudo ajustar el stock' });
    }
    return result;
  }, [inventory, addToast]);

  const handleTransfer = useCallback(async (data) => {
    const result = await inventory.transferStock(data.productId, data.fromLocationId, data.toLocationId, data.quantity, data.notes);
    if (result?.success !== false) {
      addToast({ type: 'success', title: 'Transferencia completada', message: 'El stock se transfirió correctamente' });
      inventory.fetchProducts();
      inventory.fetchAlerts();
    } else {
      addToast({ type: 'error', title: 'Error', message: result?.error || 'No se pudo transferir el stock' });
    }
    return result;
  }, [inventory, addToast]);

  const handleCreateProduct = useCallback(async (data) => {
    const result = await inventory.createProduct(data);
    if (result?.success !== false) {
      addToast({ type: 'success', title: 'Producto creado', message: `${data.name} agregado al inventario` });
      inventory.fetchProducts();
    }
    return result;
  }, [inventory, addToast]);

  const handleUpdateProduct = useCallback(async (id, data) => {
    const result = await inventory.updateProduct(id, data);
    if (result?.success !== false) {
      addToast({ type: 'success', title: 'Producto actualizado', message: 'Los cambios se guardaron' });
      inventory.fetchProducts();
    }
    return result;
  }, [inventory, addToast]);

  const handleDeleteProduct = useCallback(async (id) => {
    const result = await inventory.deleteProduct(id);
    if (result?.success !== false) {
      addToast({ type: 'success', title: 'Producto eliminado', message: 'Se eliminó del inventario' });
      inventory.fetchProducts();
    }
    return result;
  }, [inventory, addToast]);

  const handleAcknowledgeAlert = useCallback(async (alertId) => {
    await inventory.acknowledgeAlert(alertId);
    inventory.fetchAlerts();
  }, [inventory]);

  const handleCheckAlerts = useCallback(async () => {
    await inventory.checkAlerts();
    inventory.fetchAlerts();
    addToast({ type: 'info', title: 'Verificación completa', message: 'Se revisaron los niveles de stock' });
  }, [inventory, addToast]);

  const unreadAlerts = inventory.alerts?.filter(a => !a.acknowledged)?.length || 0;
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <InventoryDashboard
            summary={inventory.summary}
            alerts={inventory.alerts}
            movements={inventory.movements}
            locations={inventory.locations}
            onAction={(action) => {
              if (action === 'new-product') setModalStack('add-product');
              else if (action === 'adjust') setActiveTab('adjust');
              else if (action === 'transfer') setActiveTab('transfer');
              else if (action === 'alerts') setActiveTab('alerts');
              else if (action === 'sync') refreshStock();
            }}
          />
        );
      case 'products':
        return (
          <ProductList
            products={inventory.products}
            locations={inventory.locations}
            stock={inventory.stock}
            onAdjust={handleAdjust}
            onTransfer={handleTransfer}
            onCreate={handleCreateProduct}
            onUpdate={handleUpdateProduct}
            onDelete={handleDeleteProduct}
            onRefresh={() => inventory.fetchProducts()}
            loading={inventory.loading}
          />
        );
      case 'adjust':
        return (
          <StockAdjuster
            products={inventory.products}
            locations={inventory.locations}
            onAdjust={handleAdjust}
            onClose={() => setActiveTab('products')}
          />
        );
      case 'transfer':
        return (
          <StockTransfer
            products={inventory.products}
            locations={inventory.locations}
            stock={inventory.stock}
            onTransfer={handleTransfer}
            onClose={() => setActiveTab('products')}
          />
        );
      case 'movements':
        return (
          <MovementHistory
            movements={inventory.movements}
            locations={inventory.locations}
            products={inventory.products}
            onRefresh={() => inventory.fetchMovements({ limit: 200 })}
            loading={inventory.loading}
          />
        );
      case 'alerts':
        return (
          <AlertsPanel
            alerts={inventory.alerts}
            onAcknowledge={handleAcknowledgeAlert}
            onCheck={handleCheckAlerts}
            loading={inventory.loading}
          />
        );
      case 'reports':
        return (
          <InventoryReports
            summary={inventory.summary}
            movements={inventory.movements}
            locations={inventory.locations}
            products={inventory.products}
          />
        );
      case 'roles':
        return (
          <UserRoles
            roles={inventory.roles || []}
            locations={inventory.locations}
            onUpdateRole={(userId, role, locations) => inventory.setUserRole(userId, role, locations)}
            loading={inventory.loading}
          />
        );
      default:
        return null;
    }
  };

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
          alerts={inventory.alerts}
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
          background: 'var(--surface)', minHeight: '52px',
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
            <div>
              <h1 style={{ margin: 0, fontSize: isMobile ? '16px' : '18px', fontWeight: 700 }}>
                {TABS.find(t => t.id === activeTab)?.label || 'Inventario'}
              </h1>
            </div>
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
                  background: '#ef444418', border: '1px solid #ef444438',
                  color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
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
        <MobileTabBar activeTab={activeTab} onTabChange={setActiveTab} alerts={inventory.alerts} />
      )}
    </div>
  );
}
