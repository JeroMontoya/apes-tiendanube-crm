import React, { useState } from 'react';
import {
  LayoutDashboard, Users, Target, Brain, TrendingUp,
  Megaphone, Globe, KanbanSquare, PackageSearch,
  Settings, Download, Menu, X, Zap, Calendar, Sun, Moon, Warehouse,
  Hammer, BarChart3, DollarSign, Clock, Shield
} from 'lucide-react';

const ALL_NAV_ITEMS = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'taller', 'ventas', 'atencion_cliente'] },
  { id: 'calendario', icon: Calendar, label: 'Calendario', roles: ['admin'] },
  { id: 'clientes', icon: Users, label: 'Clientes', roles: ['admin', 'ventas', 'atencion_cliente'] },
  { id: 'segmentos', icon: Target, label: 'Segmentos', roles: ['admin'] },
  { id: 'analitica', icon: Brain, label: 'Analítica', roles: ['admin'] },
  { id: 'marketing', icon: TrendingUp, label: 'Marketing', roles: ['admin'] },
  { id: 'meta_ads', icon: Megaphone, label: 'Meta Ads', roles: ['admin'] },
  { id: 'ga4', icon: Globe, label: 'Google Analytics', roles: ['admin'] },
  { id: 'pipeline', icon: KanbanSquare, label: 'Pipeline CRM', roles: ['admin', 'ventas'] },
  { id: 'inventario', icon: Warehouse, label: 'Inventario', roles: ['admin', 'taller', 'ventas', 'atencion_cliente'] },
  { id: 'taller', icon: Hammer, label: 'Panel Taller', roles: ['admin', 'taller'] },
  { id: 'ventas_view', icon: DollarSign, label: 'Ventas', roles: ['admin', 'ventas'] },
  { id: 'pqr', icon: PackageSearch, label: 'PQR & Soporte', roles: ['admin', 'taller', 'ventas', 'atencion_cliente'] },
  { id: 'equipo', icon: Users, label: 'Equipo', roles: ['admin'] },
  { id: 'actividad', icon: Clock, label: 'Actividad', roles: ['admin'] },
  { id: 'rendimiento', icon: BarChart3, label: 'Rendimiento', roles: ['admin'] },
  { id: 'configuracion', icon: Settings, label: 'Configuración', roles: ['admin'] },
  { id: 'exportar', icon: Download, label: 'Exportar', roles: ['admin'] },
];

export default function Sidebar({ activeView, onNavigate, theme, toggleTheme, currentMember, ROLE_LABELS, ROLE_COLORS, ROLE_ICONS }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  const handleNavigate = (id) => {
    onNavigate(id);
    if (isMobile) setMobileOpen(false);
  };

  const visibleItems = currentMember
    ? ALL_NAV_ITEMS.filter(item => item.roles.includes(currentMember.role))
    : ALL_NAV_ITEMS;

  return (
    <>
      {isMobile && (
        <button
          className="sidebar-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      )}

      {isMobile && mobileOpen && (
        <div 
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 98, backdropFilter: 'blur(4px)' }} 
          onClick={() => setMobileOpen(false)} 
        />
      )}

      <aside className={`sidebar ${isMobile && mobileOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <div style={{ 
              width: 36, height: 36, borderRadius: 10, 
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(59,130,246,0.3)'
            }}>
              <Zap size={20} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.3rem', margin: 0, letterSpacing: '-0.02em' }}>APES</h1>
              <div className="logo-subtitle">CRM & Analytics</div>
            </div>
          </div>
        </div>

        {/* Current Member Badge */}
        {currentMember && (
          <div style={{ padding: '0 14px', marginBottom: 12 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
              borderRadius: 10, background: `${ROLE_COLORS[currentMember.role]}10`,
              border: `1px solid ${ROLE_COLORS[currentMember.role]}25`,
            }}>
              <span style={{ fontSize: 14 }}>{ROLE_ICONS[currentMember.role]}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: ROLE_COLORS[currentMember.role], whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentMember.name}</div>
                <div style={{ fontSize: 10, color: 'var(--on-surface-variant)' }}>{ROLE_LABELS[currentMember.role]}</div>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="sidebar-nav">
          {visibleItems.map((item) => {
            const isActive = activeView === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} />
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div style={{ padding: '0 12px', marginTop: 'auto', marginBottom: '16px' }}>
          <button 
            onClick={toggleTheme}
            className="sidebar-nav-item"
            style={{ width: '100%', justifyContent: 'flex-start' }}
          >
            <span className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            </span>
            <span>
              Modo {theme === 'dark' ? 'Oscuro' : 'Claro'}
            </span>
          </button>
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
            <span className="live-dot" />
            <span style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant)', fontWeight: 600 }}>Sistema Activo</span>
          </div>
          <p>APES DIGITAL v4.0</p>
        </div>
      </aside>
    </>
  );
}
