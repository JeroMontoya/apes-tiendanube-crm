import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTeam } from '../contexts/TeamContext';
import {
  LayoutDashboard, Users, Target, Brain, TrendingUp,
  Megaphone, Globe, KanbanSquare, PackageSearch, ShoppingCart,
  Settings, Download, Menu, X, Zap, Calendar, Sun, Moon, Warehouse,
  Hammer, BarChart3, Clock, ChevronDown, ChevronRight, MoreHorizontal,
  BarChart2, MessageSquare, Repeat, FileText, Sparkles,
  Compass, Music, Video, Link, LogOut, Eye
} from 'lucide-react';

const NAV_GROUPS = [
  {
    id: 'principal',
    label: null,
    items: [
      { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'taller', 'ventas', 'atencion_cliente'] },
      { id: 'marketing_center', icon: Brain, label: 'Centro de Marketing', roles: ['admin'] },
      { id: 'inteligencia', icon: Eye, label: 'Inteligencia de Marca', roles: ['admin'] },
      { id: 'calendario', icon: Calendar, label: 'Calendario', roles: ['admin'] },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing & Analytics',
    items: [
      { id: 'marketing', icon: TrendingUp, label: 'Marketing', roles: ['admin'] },
      { id: 'meta_ads', icon: Megaphone, label: 'Meta Ads', roles: ['admin'] },
      { id: 'google_ads', icon: Megaphone, label: 'Google Ads', roles: ['admin'] },
      { id: 'tiktok_ads', icon: Music, label: 'TikTok Ads', roles: ['admin'] },
      { id: 'ga4', icon: Globe, label: 'Google Analytics', roles: ['admin'] },
      { id: 'analitica', icon: Brain, label: 'Analítica', roles: ['admin'] },
      { id: 'segmentos', icon: Target, label: 'Segmentos', roles: ['admin'] },
      { id: 'inteligencia_competitiva', icon: Compass, label: 'Inteligencia Competitiva', roles: ['admin'] },
      { id: 'merchant_center', icon: ShoppingCart, label: 'Merchant Center', roles: ['admin'] },
      { id: 'search_console', icon: Globe, label: 'Search Console', roles: ['admin'] },
      { id: 'ia_chat', icon: Sparkles, label: 'Asistente IA', roles: ['admin'] },
      { id: 'utm_builder', icon: Link, label: 'UTM Builder', roles: ['admin'] },
    ],
  },
  {
    id: 'taller',
    label: 'Taller & Producción',
    items: [
      { id: 'taller', icon: Hammer, label: 'Panel Taller', roles: ['admin', 'taller'] },
      { id: 'inventario', icon: Warehouse, label: 'Inventario', roles: ['admin', 'taller', 'ventas', 'atencion_cliente'] },
    ],
  },
  {
    id: 'clientes',
    label: 'Gestión de Clientes',
    items: [
      { id: 'clientes', icon: Users, label: 'Clientes', roles: ['admin', 'ventas', 'atencion_cliente'] },
      { id: 'ventas_view', icon: ShoppingCart, label: 'Seguimiento Ventas', roles: ['admin', 'ventas', 'atencion_cliente'] },
      { id: 'pipeline', icon: KanbanSquare, label: 'Pipeline CRM', roles: ['admin', 'ventas'] },
      { id: 'pqr', icon: PackageSearch, label: 'PQR & Soporte', roles: ['admin', 'taller', 'ventas', 'atencion_cliente'] },
    ],
  },
];

const PROFILE_MENU_ITEMS = [
  { id: 'reportes', icon: FileText, label: 'Reportes', roles: ['admin'] },
  { id: 'equipo', icon: Users, label: 'Equipo', roles: ['admin'] },
  { id: 'rendimiento', icon: BarChart3, label: 'Rendimiento', roles: ['admin'] },
  { id: 'configuracion', icon: Settings, label: 'Configuración', roles: ['admin'] },
  { id: 'exportar', icon: Download, label: 'Exportar', roles: ['admin'] },
];

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

export default function Sidebar({ activeView, onNavigate, theme, toggleTheme, currentMember, ROLE_LABELS, ROLE_COLORS, ROLE_ICONS }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [collapsed, setCollapsed] = useState({});
  const teamCtx = useTeam();
  const hasPermission = teamCtx?.hasPermission || (() => true);
  const { logout } = teamCtx || {};

  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1200px)');

  const handleNavigate = useCallback((id) => {
    onNavigate(id);
    setMobileOpen(false);
    setMoreOpen(false);
  }, [onNavigate]);

  const toggleGroup = (groupId) => {
    setCollapsed(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const filteredGroups = NAV_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item =>
      hasPermission(`view_${item.id}`) || item.roles.includes(currentMember?.role || 'admin')
    ),
  })).filter(group => group.items.length > 0);

  const allItems = filteredGroups.flatMap(g => g.items);

  const isActive = (id) => activeView === id;

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setMobileOpen(false);
        setMoreOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  useEffect(() => {
    if (mobileOpen || moreOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen, moreOpen]);

  return (
    <>
      {/* ════════════════════════════════════════════
          DESKTOP & TABLET SIDEBAR
          ════════════════════════════════════════════ */}
      {!isMobile && (
        <>
          <button className="sidebar-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {mobileOpen && (
            <div
              className="sidebar-overlay"
              onClick={() => setMobileOpen(false)}
            />
          )}

          <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
            {/* ── Logo ── */}
            <div className="sidebar-logo">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="sidebar-logo-icon">
                  <Zap size={18} color="#fff" strokeWidth={2.5} />
                </div>
                <div className="brand-text">
                  <h1>APES</h1>
                  <div className="logo-subtitle">CRM & Analytics</div>
                </div>
              </div>
            </div>

            {/* ── Current Member Badge ── */}
            <div className="member-badge-wrapper">
              <SidebarProfile
                currentMember={currentMember}
                logout={logout}
                ROLE_COLORS={ROLE_COLORS}
                ROLE_ICONS={ROLE_ICONS}
                ROLE_LABELS={ROLE_LABELS}
                collapsed={false}
                isMobile={false}
                onNavigate={handleNavigate}
              />
            </div>

            {/* ── Navigation Groups ── */}
            <nav className="sidebar-nav">
              {filteredGroups.map((group, groupIdx) => {
                const isCollapsed = collapsed[group.id];
                return (
                  <div key={group.id} className="sidebar-nav-group">
                    {group.label && (
                      <div
                        className="nav-group-toggle"
                        onClick={() => toggleGroup(group.id)}
                      >
                        <span className="nav-group-label">
                          {isCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
                          {group.label}
                        </span>
                        {group.items.length > 1 && (
                          <span className="nav-group-count">
                            {group.items.length}
                          </span>
                        )}
                      </div>
                    )}

                    {(!group.label || !isCollapsed) && (
                      <div className="sidebar-nav-items">
                        {group.items.map(item => {
                          const active = isActive(item.id);
                          const Icon = item.icon;
                          return (
                            <button
                              key={item.id}
                              className={`sidebar-nav-item ${active ? 'active' : ''}`}
                              onClick={() => handleNavigate(item.id)}
                            >
                              <span className="nav-icon">
                                <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
                              </span>
                              <span>{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            {/* ── Theme Toggle ── */}
            <div className="theme-toggle-row">
              <button className="theme-toggle-btn" onClick={toggleTheme}>
                <span className="theme-toggle-icon">
                  {theme === 'dark' ? <Moon size={15} /> : <Sun size={15} />}
                </span>
                <span className="theme-toggle-label">{theme === 'dark' ? 'Modo Oscuro' : 'Modo Claro'}</span>
              </button>
            </div>

            {/* ── Footer ── */}
            <div className="sidebar-footer">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
                <span className="live-dot" />
                <span className="sidebar-footer-label">Sistema Activo</span>
              </div>
              <p>APES DIGITAL v4.0</p>
            </div>
          </aside>
        </>
      )}

      {/* ════════════════════════════════════════════
          MOBILE: Floating Glassmorphism Orb Navigation
          ════════════════════════════════════════════ */}
      {isMobile && (
        <>
          <div className="mobile-topbar">
            <div className="mobile-topbar-logo">
              <Zap size={18} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--on-surface)', letterSpacing: '-0.02em' }}>APES</div>
            </div>
            <SidebarProfile
              currentMember={currentMember}
              logout={logout}
              ROLE_COLORS={ROLE_COLORS}
              ROLE_ICONS={ROLE_ICONS}
              ROLE_LABELS={ROLE_LABELS}
              collapsed={false}
              isMobile={true}
              onNavigate={handleNavigate}
            />
          </div>

          <FloatingOrbNav
            activeView={activeView}
            onNavigate={handleNavigate}
            moreOpen={moreOpen}
            setMoreOpen={setMoreOpen}
            theme={theme}
            toggleTheme={toggleTheme}
            filteredGroups={filteredGroups}
            allItems={allItems}
          />
        </>
      )}
    </>
  );
}

/* ════════════════════════════════════════════════════════════
   Sidebar Profile Dropdown Component
   ════════════════════════════════════════════════════════════ */
function SidebarProfile({ currentMember, logout, ROLE_COLORS, ROLE_ICONS, ROLE_LABELS, collapsed, isMobile, onNavigate }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const teamCtx = useTeam();
  const hasPermission = teamCtx?.hasPermission || (() => true);

  useEffect(() => {
    const handler = e => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!currentMember) return null;

  const visibleMenuItems = PROFILE_MENU_ITEMS.filter(item =>
    hasPermission(`view_${item.id}`) || item.roles.includes(currentMember?.role || 'admin')
  );

  return (
    <div ref={dropdownRef} className="sidebar-profile-wrapper">
      {isMobile ? (
        <div onClick={() => setOpen(!open)} className="sidebar-avatar">
          {currentMember.name?.charAt(0)?.toUpperCase()}
        </div>
      ) : (
        <div onClick={() => setOpen(!open)} className="member-info">
          <div className="member-avatar">
            {ROLE_ICONS[currentMember.role]}
          </div>
          {!collapsed && (
            <div className="member-text-desktop">
              <div className="member-name">{currentMember.name}</div>
              <div className="member-role">{ROLE_LABELS[currentMember.role]}</div>
            </div>
          )}
        </div>
      )}

      {open && (
        <div className="sidebar-profile-dropdown" style={{ left: 'auto', right: 0 }}>
          {/* User info header */}
          <div className="dropdown-user-header">
            <div className="dropdown-user-avatar">
              {ROLE_ICONS[currentMember.role]}
            </div>
            <div className="dropdown-user-info">
              <div className="dropdown-user-name">{currentMember.name}</div>
              <div className="dropdown-user-email">{currentMember.email}</div>
            </div>
          </div>

          <div className="dropdown-divider" />

          {/* Menu items */}
          {visibleMenuItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className="dropdown-menu-item"
                onClick={() => { setOpen(false); onNavigate?.(item.id); }}
              >
                <Icon size={15} />
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Theme toggle in profile menu */}
          <button
            className="dropdown-menu-item"
            onClick={() => { setOpen(false); }}
          >
            <Sun size={15} />
            <span>Tema</span>
          </button>

          <div className="dropdown-divider" />

          {/* Logout */}
          <button className="dropdown-menu-item dropdown-logout" onClick={() => { setOpen(false); logout?.(); }}>
            <LogOut size={15} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   Floating Orb Navigation — Mobile
   ════════════════════════════════════════════════════════════ */

function FloatingOrbNav({ activeView, onNavigate, moreOpen, setMoreOpen, theme, toggleTheme, filteredGroups, allItems }) {
  const [expanded, setExpanded] = useState(false);
  const orbRef = useRef(null);

  const quickNav = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Inicio', color: '#3b82f6' },
    { id: 'clientes', icon: Users, label: 'Clientes', color: '#10b981' },
    { id: 'taller', icon: Hammer, label: 'Taller', color: '#f59e0b' },
    { id: 'marketing', icon: TrendingUp, label: 'Marketing', color: '#ec4899' },
    { id: 'ventas_view', icon: BarChart2, label: 'Ventas', color: '#06b6d4' },
    { id: 'inteligencia_competitiva', icon: Compass, label: 'Int. Competitiva', color: '#8b5cf6' },
  ];

  const handleNav = (id) => {
    onNavigate(id);
    setExpanded(false);
  };

  const activeItem = quickNav.find(n => n.id === activeView) || quickNav.find(n => n.id === 'dashboard');
  const ActiveIcon = activeItem?.icon || LayoutDashboard;

  return (
    <>
      {expanded && (
        <div
          onClick={() => setExpanded(false)}
          className="orb-backdrop"
        />
      )}

      <div className="orb-menu-pill" style={{
        opacity: expanded ? 1 : 0,
        pointerEvents: expanded ? 'auto' : 'none',
        transform: `translateX(-50%) translateY(${expanded ? 0 : 20}px) scale(${expanded ? 1 : 0.8})`,
      }}>
        {quickNav.map((item, i) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className="orb-menu-item"
              style={{
                background: isActive ? `${item.color}20` : 'transparent',
                color: isActive ? item.color : 'rgba(255,255,255,0.5)',
                animation: expanded ? `orbItemIn 0.3s ease ${i * 0.05}s both` : 'none',
              }}
            >
              <div className="orb-menu-icon" style={{
                background: isActive ? `linear-gradient(135deg, ${item.color}25, ${item.color}05)` : 'rgba(255,255,255,0.03)',
                boxShadow: isActive ? `0 4px 16px ${item.color}40, inset 0 2px 4px rgba(255,255,255,0.1)` : 'inset 0 2px 4px rgba(255,255,255,0.02)',
                border: isActive ? `1px solid ${item.color}30` : '1px solid transparent',
              }}>
                <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
              </div>
              <span style={{ fontSize: 9, fontWeight: isActive ? 800 : 500, letterSpacing: '0.3px' }}>{item.label}</span>
            </button>
          );
        })}

        <div style={{ width: 1, background: 'rgba(255,255,255,0.06)', margin: '6px 2px', alignSelf: 'stretch' }} />

        <button
          onClick={() => { setExpanded(false); setMoreOpen(true); }}
          className="orb-menu-item"
          style={{
            background: moreOpen ? 'rgba(255,255,255,0.08)' : 'transparent',
            color: moreOpen ? '#a855f7' : 'rgba(255,255,255,0.5)',
          }}
        >
          <div className="orb-menu-icon" style={{
            background: moreOpen ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.03)',
            border: moreOpen ? '1px solid rgba(168,85,247,0.3)' : '1px solid transparent',
            boxShadow: moreOpen ? '0 4px 16px rgba(168,85,247,0.3), inset 0 2px 4px rgba(255,255,255,0.1)' : 'inset 0 2px 4px rgba(255,255,255,0.02)',
          }}>
            <Sparkles size={20} strokeWidth={moreOpen ? 2.4 : 1.8} />
          </div>
          <span style={{ fontSize: 9, fontWeight: moreOpen ? 800 : 500, letterSpacing: '0.3px' }}>Más</span>
        </button>
      </div>

      <button
        ref={orbRef}
        onClick={() => setExpanded(!expanded)}
        className="orb-fab"
        style={{
          width: expanded ? 54 : 60, height: expanded ? 54 : 60,
          background: expanded
            ? 'linear-gradient(135deg, #4f46e5, #9333ea)'
            : 'linear-gradient(135deg, #6366f1, #a855f7, #ec4899)',
          boxShadow: expanded
            ? '0 8px 32px rgba(139,92,246,0.5), inset 0 2px 8px rgba(255,255,255,0.3)'
            : '0 12px 36px rgba(139,92,246,0.6), 0 0 40px rgba(139,92,246,0.4), inset 0 2px 10px rgba(255,255,255,0.3)',
          animation: expanded ? 'none' : 'orbPulse 3s ease-in-out infinite',
        }}
      >
        <div style={{
          transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: expanded ? 'rotate(45deg) scale(0.9)' : 'rotate(0) scale(1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {expanded ? <X size={22} strokeWidth={2.5} /> : <ActiveIcon size={22} strokeWidth={2.5} />}
        </div>
      </button>

      {moreOpen && (
        <div className="mobile-more-overlay" onClick={() => setMoreOpen(false)}>
          <div className="mobile-more-sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />

            <button className="mobile-more-item" onClick={() => { toggleTheme(); }}>
              {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
              Modo {theme === 'dark' ? 'Oscuro' : 'Claro'}
            </button>

            {filteredGroups.filter(g => g.id !== 'principal').map(group => (
              <div key={group.id} className="mobile-more-group">
                <div className="mobile-more-group-label">{group.label}</div>
                {group.items.map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      className="mobile-more-item"
                      onClick={() => handleNav(item.id)}
                      style={{
                        color: activeView === item.id ? 'var(--primary)' : 'var(--on-surface)',
                        fontWeight: activeView === item.id ? 700 : 500,
                      }}
                    >
                      <Icon size={20} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
