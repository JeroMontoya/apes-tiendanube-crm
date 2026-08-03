import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTeam } from '../contexts/TeamContext';
import WorkspaceSelector from './WorkspaceSelector';
import {
  LayoutDashboard, Users, Target, Brain, TrendingUp,
  Megaphone, Globe, KanbanSquare, PackageSearch, ShoppingCart,
  Settings, Download, Menu, X, Zap, Calendar, Sun, Moon, Warehouse,
  Hammer, BarChart3, Clock, ChevronDown, ChevronRight, ChevronLeft, MoreHorizontal,
  BarChart2, MessageSquare, Repeat, FileText, Sparkles, CheckSquare,
  Music, Video, Link, LogOut, Eye, Factory, Activity, Search, Command
} from 'lucide-react';

const GROUP_COLORS = {
  principal: '#8B5CF6',
  taller: '#06B6D4',
  clientes: '#3B82F6',
};

const NAV_GROUPS = [
  {
    id: 'principal',
    label: null,
    items: [
      { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'taller', 'ventas', 'atencion_cliente'] },
      { id: 'organizador', icon: CheckSquare, label: 'Productividad', roles: ['admin', 'ventas', 'taller'] },
      { id: 'marketing_center', icon: Brain, label: 'Centro de Marketing', roles: ['admin'] },
      { id: 'calendario', icon: Calendar, label: 'Calendario', roles: ['admin'] },
    ],
  },
  {
    id: 'taller',
    label: 'Taller & Inventario',
    items: [
      { id: 'inventario', icon: Warehouse, label: 'Inventario', roles: ['admin', 'taller', 'ventas', 'atencion_cliente'] },
      { id: 'taller_stock', icon: Factory, label: 'Control Stock Taller', roles: ['admin', 'taller'] },
      { id: 'predictive', icon: Activity, label: 'Inteligencia Predictiva', roles: ['admin', 'taller'] },
    ],
  },
  {
    id: 'clientes',
    label: 'Gestión de Clientes',
    items: [
      { id: 'clientes', icon: Users, label: 'Clientes', roles: ['admin', 'ventas', 'atencion_cliente'] },
      { id: 'hot_leads', icon: Zap, label: 'Leads Calientes', roles: ['admin', 'ventas'] },
      { id: 'predictive_intelligence', icon: Brain, label: 'Predictive Engine', roles: ['admin'] },
      { id: 'segmentos', icon: Target, label: 'Segmentos (Árbol)', roles: ['admin'] },
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
  const [railCollapsed, setRailCollapsed] = useState(() => {
    try { 
      const stored = localStorage.getItem('apes_sidebar_rail');
      if (stored !== null) return stored === 'true';
      return true; // Start collapsed by default for the new dashboard
    } catch { return true; }
  });
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-sidebar', railCollapsed ? 'collapsed' : 'expanded');
    try { localStorage.setItem('apes_sidebar_rail', String(railCollapsed)); } catch {}
  }, [railCollapsed]);
  const teamCtx = useTeam();
  const hasPermission = teamCtx?.hasPermission || (() => true);
  const { logout } = teamCtx || {};

  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1200px)');

  const handleNavigate = useCallback((id) => {
    onNavigate(id);
    setMobileOpen(false);
    setMoreOpen(false);
    setSearchOpen(false);
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
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // ── Cmd/Ctrl+K command palette ──
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(o => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (mobileOpen || moreOpen || searchOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen, moreOpen, searchOpen]);

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

          <aside className={`sidebar ${mobileOpen ? 'open' : ''} ${railCollapsed ? 'rail-collapsed' : ''}`}>
            <button
              className="sidebar-rail-toggle"
              onClick={() => setRailCollapsed(v => !v)}
              title={railCollapsed ? 'Expandir menú' : 'Minimizar menú'}
            >
              {railCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            {/* ── Brand Header ── */}
            <div className="sidebar-brand">
              <div className="sidebar-brand-icon">
                <img src="/favicon.svg" alt="Onyx" width={22} height={22} />
                <span className="sidebar-brand-badge"><Sparkles size={9} /></span>
              </div>
              <div className="brand-text">
                <span className="sidebar-brand-name">Onyx</span>
                <span className="sidebar-brand-sub">CRM Tiendanube</span>
              </div>
            </div>

            {/* ── Workspace / Brand Selector ── */}
            <div style={{ marginTop: 4 }}>
              <WorkspaceSelector collapsed={railCollapsed} />
            </div>

            {/* ── Quick Search ── */}
            <div className="sidebar-search-wrap" title={railCollapsed ? 'Buscar (Ctrl+K)' : undefined}>
              <button className="sidebar-search-btn" onClick={() => setSearchOpen(true)}>
                <Search size={15} />
                <span>Buscar módulo…</span>
                <kbd className="sidebar-search-kbd">⌘K</kbd>
              </button>
            </div>

            {/* ── Navigation Groups ── */}
            <nav className="sidebar-nav">
              {filteredGroups.map((group, groupIdx) => {
                const isCollapsed = collapsed[group.id];
                const accent = GROUP_COLORS[group.id] || 'var(--primary)';
                return (
                  <div key={group.id} className="sidebar-nav-group" data-group={group.id}>
                    {group.label && (
                      <div
                        className="nav-group-toggle"
                        onClick={() => toggleGroup(group.id)}
                      >
                        <span className="nav-group-label">
                          {isCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
                          <span className="nav-group-dot" style={{ background: accent }} />
                          {group.label}
                        </span>
                        {group.items.length > 1 && (
                          <span className="nav-group-count">{group.items.length}</span>
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
                              title={railCollapsed ? item.label : undefined}
                              style={{ '--group-accent': accent }}
                            >
                              <span className="nav-icon">
                                <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
                              </span>
                              <span>{item.label}</span>
                              {active && <span className="nav-item-active-bar" />}
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
              <div className="collapse-content">
                <p>Apes Tiendanube CRM</p>
                <span>Panel Administrativo</span>
              </div>
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
              <img src="/favicon.svg" alt="Onyx Logo" style={{ width: 24, height: 24 }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--on-surface)', letterSpacing: '-0.02em' }}>Onyx</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--on-surface-variant)', letterSpacing: '0.5px' }}>CRM Tiendanube</div>
            </div>
            <button className="mobile-topbar-search" onClick={() => setSearchOpen(true)}>
              <Search size={16} />
            </button>
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

      {/* ════════════════════════════════════════════
          COMMAND PALETTE (Ctrl+K) — all devices
          ════════════════════════════════════════════ */}
      <SearchPalette
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={handleNavigate}
        groups={filteredGroups}
        activeView={activeView}
      />
    </>
  );
}

/* ════════════════════════════════════════════════════════════
   Sidebar Profile Dropdown Component
   ════════════════════════════════════════════════════════════ */
const ROLE_GRADIENTS = {
  admin: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
  taller: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
  ventas: 'linear-gradient(135deg, #06b6d4, #14b8a6)',
  atencion_cliente: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
};

export function SidebarProfile({ currentMember, logout, ROLE_COLORS, ROLE_ICONS, ROLE_LABELS, collapsed, isMobile, onNavigate }) {
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

  const roleColor = ROLE_COLORS[currentMember.role] || 'var(--primary)';
  const gradient = ROLE_GRADIENTS[currentMember.role] || 'linear-gradient(135deg, #8b5cf6, #6366f1)';
  const initial = (currentMember.name || '?').charAt(0).toUpperCase();
  const roleLabel = ROLE_LABELS[currentMember.role] || currentMember.role;
  const roleIcon = ROLE_ICONS[currentMember.role] || '👤';

  const avatar = (extraClass) => (
    <span className={`member-avatar-ring ${extraClass || ''}`} style={{ '--ring-color': roleColor }}>
      <span className="member-avatar" style={{ background: gradient, color: '#fff' }}>
        {initial}
        <span className="member-status-dot" />
      </span>
    </span>
  );

  return (
    <div ref={dropdownRef} className="sidebar-profile-wrapper">
      {isMobile ? (
        <div
          onClick={() => setOpen(!open)}
          className={`sidebar-avatar sidebar-avatar--gradient${open ? ' open' : ''}`}
          style={{ background: gradient, color: '#fff' }}
          title={currentMember.name}
        >
          {avatar()}
        </div>
      ) : collapsed ? (
        <div
          onClick={() => setOpen(!open)}
          className={`sidebar-avatar sidebar-avatar--gradient${open ? ' open' : ''}`}
          style={{ background: gradient, color: '#fff' }}
          title={currentMember.name}
        >
          {avatar()}
        </div>
      ) : (
        <div onClick={() => setOpen(!open)} className={`member-info${open ? ' open' : ''}`}>
          {avatar()}
          {!collapsed && (
            <div className="member-text-desktop">
              <div className="member-name">{currentMember.name}</div>
              <div className="member-role" style={{ color: roleColor }}>
                <span className="member-role-dot" style={{ background: roleColor }} />
                {roleLabel}
              </div>
            </div>
          )}
          {!collapsed && (
            <ChevronDown size={13} className={`member-chevron${open ? ' open' : ''}`} />
          )}
        </div>
      )}

      {open && (
        <div className="sidebar-profile-dropdown" style={{ left: 'auto', right: 0 }}>
          {/* Glow header */}
          <div className="dropdown-glow" style={{ background: `radial-gradient(120px 60px at 20% 0%, ${roleColor}33, transparent 70%), radial-gradient(100px 50px at 90% 10%, ${roleColor}22, transparent 70%)` }} />

          {/* User info header */}
          <div className="dropdown-user-header">
            <div className="dropdown-user-avatar-wrap">
              {avatar('dropdown')}
            </div>
            <div className="dropdown-user-info">
              <div className="dropdown-user-name">{currentMember.name}</div>
              <div className="dropdown-user-email">{currentMember.email}</div>
              <div className="dropdown-user-meta">
                <span className="member-status-chip">
                  <span className="member-status-dot" />
                  En línea
                </span>
                <span className="dropdown-user-role-badge" style={{ borderColor: `${roleColor}55`, color: roleColor, background: `${roleColor}14` }}>
                  {roleIcon} {roleLabel}
                </span>
              </div>
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
                <span className="dropdown-menu-icon"><Icon size={15} /></span>
                <span>{item.label}</span>
                <ChevronRight size={13} className="dropdown-menu-arrow" />
              </button>
            );
          })}

          <div className="dropdown-divider" />

          {/* Logout */}
          <button className="dropdown-menu-item dropdown-logout" onClick={() => { setOpen(false); logout?.(); }}>
            <span className="dropdown-menu-icon"><LogOut size={15} /></span>
            <span>Cerrar sesión</span>
          </button>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   Command Palette — Search across all modules
   ════════════════════════════════════════════════════════════ */
function SearchPalette({ open, onClose, onNavigate, groups, activeView }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  if (!open) return null;

  const q = query.trim().toLowerCase();
  const results = groups
    .map(group => ({
      ...group,
      items: group.items.filter(item =>
        !q || item.label.toLowerCase().includes(q) || group.label?.toLowerCase().includes(q)
      ),
    }))
    .filter(group => group.items.length > 0);

  return (
    <div className="palette-backdrop" onClick={onClose}>
      <div className="palette-dialog" onClick={e => e.stopPropagation()}>
        <div className="palette-input-row">
          <Search size={18} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && results[0]?.items[0]) onNavigate(results[0].items[0].id);
              if (e.key === 'Escape') onClose();
            }}
            placeholder="Buscar módulo o sección…"
          />
          <kbd>ESC</kbd>
        </div>

        <div className="palette-results">
          {results.length === 0 && (
            <div className="palette-empty">
              <Eye size={18} />
              Sin resultados para “{query}”
            </div>
          )}
          {results.map(group => (
            <div key={group.id} className="palette-group">
              <div className="palette-group-label">
                <span className="nav-group-dot" style={{ background: GROUP_COLORS[group.id] || 'var(--primary)' }} />
                {group.label || 'Principal'}
              </div>
              {group.items.map(item => {
                const Icon = item.icon;
                const active = item.id === activeView;
                return (
                  <button
                    key={item.id}
                    className={`palette-item ${active ? 'active' : ''}`}
                    onClick={() => onNavigate(item.id)}
                  >
                    <span className="palette-item-icon"><Icon size={15} /></span>
                    <span className="palette-item-label">{item.label}</span>
                    {active && <span className="palette-item-check">●</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="palette-footer">
          <span><kbd>↵</kbd> ir</span>
          <span><kbd>ESC</kbd> cerrar</span>
          <span className="palette-footer-brand">Onyx Command</span>
        </div>
      </div>
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
    { id: 'dashboard', icon: LayoutDashboard, label: 'Inicio', color: '#6366f1' },
    { id: 'clientes', icon: Users, label: 'Clientes', color: '#06B6D4' },
    { id: 'taller_stock', icon: Factory, label: 'Control Taller', color: 'var(--primary-container)' },
    { id: 'marketing_center', icon: TrendingUp, label: 'Marketing', color: '#8B5CF6' },
    { id: 'ventas_view', icon: BarChart2, label: 'Ventas', color: '#06b6d4' },
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
                color: isActive ? item.color : 'var(--on-surface-variant)',
                animation: expanded ? `orbItemIn 0.3s ease ${i * 0.05}s both` : 'none',
              }}
            >
              <div className="orb-menu-icon" style={{
                background: isActive ? `linear-gradient(135deg, ${item.color}25, ${item.color}05)` : 'var(--surface-container-low)',
                boxShadow: isActive ? `0 4px 16px ${item.color}40, inset 0 2px 4px var(--border-medium)` : 'inset 0 2px 4px rgba(255,255,255,0.02)',
                border: isActive ? `1px solid ${item.color}30` : '1px solid transparent',
              }}>
                <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
              </div>
              <span style={{ fontSize: 9, fontWeight: isActive ? 800 : 500, letterSpacing: '0.3px' }}>{item.label}</span>
            </button>
          );
        })}

        <div style={{ width: 1, background: 'var(--glass-border)', margin: '6px 2px', alignSelf: 'stretch' }} />

        <button
          onClick={() => { setExpanded(false); setMoreOpen(true); }}
          className="orb-menu-item"
          style={{
            background: moreOpen ? 'var(--outline)' : 'transparent',
            color: moreOpen ? '#a855f7' : 'var(--on-surface-variant)',
          }}
        >
          <div className="orb-menu-icon" style={{
            background: moreOpen ? 'rgba(168,85,247,0.15)' : 'var(--surface-container-low)',
            border: moreOpen ? '1px solid rgba(168,85,247,0.3)' : '1px solid transparent',
            boxShadow: moreOpen ? '0 4px 16px rgba(168,85,247,0.3), inset 0 2px 4px var(--border-medium)' : 'inset 0 2px 4px rgba(255,255,255,0.02)',
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
            : 'linear-gradient(135deg, #6366f1, #a855f7, #8B5CF6)',
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
                <div className="mobile-more-group-label">
                  <span className="nav-group-dot" style={{ background: GROUP_COLORS[group.id] || 'var(--primary)' }} />
                  {group.label}
                </div>
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
