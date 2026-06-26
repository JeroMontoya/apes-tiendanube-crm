import React, { useState } from 'react';

const NAV_ITEMS = [
  { id: 'dashboard', icon: '📊', label: 'Dashboard' },
  { id: 'clientes', icon: '👥', label: 'Clientes' },
  { id: 'segmentos', icon: '🎯', label: 'Segmentos' },
  { id: 'analitica', icon: '🧠', label: 'Analítica' },
  { id: 'marketing', icon: '📈', label: 'Marketing' },
  { id: 'configuracion', icon: '⚙️', label: 'Configuración' },
  { id: 'exportar', icon: '📤', label: 'Exportar' },
];

export default function Sidebar({ activeView, onNavigate }) {
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
          {mobileOpen ? '✕' : '☰'}
        </button>
      )}

      {isMobile && mobileOpen && (
        <div 
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 98 }} 
          onClick={() => setMobileOpen(false)} 
        />
      )}

      <aside className={`sidebar ${isMobile && mobileOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <h1>🦍 APES</h1>
          <div className="logo-subtitle">CRM & Analytics</div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  width: '100%',
                  fontFamily: 'inherit',
                  textAlign: 'left'
                }}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <p>APES DIGITAL v2.0</p>
        </div>
      </aside>
    </>
  );
}
