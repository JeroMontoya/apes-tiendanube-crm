import React, { useState } from 'react';
import {
  LayoutDashboard, Users, Target, Brain, TrendingUp,
  Megaphone, Globe, KanbanSquare, PackageSearch,
  Settings, Download, Menu, X, Zap, Calendar, Sun, Moon
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'calendario', icon: Calendar, label: 'Calendario' },
  { id: 'clientes', icon: Users, label: 'Clientes' },
  { id: 'segmentos', icon: Target, label: 'Segmentos' },
  { id: 'analitica', icon: Brain, label: 'Analítica' },
  { id: 'marketing', icon: TrendingUp, label: 'Marketing' },
  { id: 'meta_ads', icon: Megaphone, label: 'Meta Ads' },
  { id: 'ga4', icon: Globe, label: 'Google Analytics' },
  { id: 'pipeline', icon: KanbanSquare, label: 'Pipeline CRM' },
  { id: 'pqr', icon: PackageSearch, label: 'PQR & Devoluciones' },
  { id: 'configuracion', icon: Settings, label: 'Configuración' },
  { id: 'exportar', icon: Download, label: 'Exportar' },
];

export default function Sidebar({ activeView, onNavigate, theme, toggleTheme }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  const handleNavigate = (id) => {
    onNavigate(id);
    if (isMobile) setMobileOpen(false);
  };

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

        {/* Nav */}
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
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
          <p>APES DIGITAL v3.0</p>
        </div>
      </aside>
    </>
  );
}
