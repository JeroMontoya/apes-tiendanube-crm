import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTeam } from '../contexts/TeamContext';
import {
  LayoutDashboard, Users, Target, Brain, TrendingUp,
  Megaphone, Globe, KanbanSquare, PackageSearch, ShoppingCart,
  Settings, Download, Menu, X, Zap, Calendar, Sun, Moon, Warehouse,
  Hammer, BarChart3, Clock, ChevronDown, ChevronRight, MoreHorizontal,
  BarChart2, MessageSquare, Repeat, FileText, Sparkles,
  Compass, Music, Video, Link
} from 'lucide-react';

const NAV_GROUPS = [
  {
    id: 'principal',
    label: null,
    items: [
      { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'taller', 'ventas', 'atencion_cliente'] },
      { id: 'marketing_center', icon: Brain, label: 'Centro de Marketing', roles: ['admin'] },
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
      { id: 'reportes', icon: FileText, label: 'Reportes', roles: ['admin'] },
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
  {
    id: 'sistema',
    label: 'Sistema',
    items: [
      { id: 'equipo', icon: Users, label: 'Equipo', roles: ['admin'] },
      { id: 'actividad', icon: Clock, label: 'Actividad', roles: ['admin'] },
      { id: 'rendimiento', icon: BarChart3, label: 'Rendimiento', roles: ['admin'] },
      { id: 'configuracion', icon: Settings, label: 'Configuración', roles: ['admin'] },
      { id: 'exportar', icon: Download, label: 'Exportar', roles: ['admin'] },
    ],
  },
];

// Mobile quick-nav is handled by FloatingOrbNav component

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

  // All filtered items for "More" drawer
  const allItems = filteredGroups.flatMap(g => g.items);

  const isActive = (id) => activeView === id;

  // Close sidebar on escape
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

  // Prevent body scroll when mobile menu is open
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
          {/* Mobile/tablet hamburger toggle */}
          <button className="sidebar-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Overlay for mobile slide-in */}
          {mobileOpen && (
            <div
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 98, backdropFilter: 'blur(4px)' }}
              onClick={() => setMobileOpen(false)}
            />
          )}

          <aside className={`sidebar ${mobileOpen ? 'open' : ''}`} style={{
            background: 'var(--surface-container)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            borderRight: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-md)',
          }}>
            {/* ── Logo ── */}
            <div className="sidebar-logo" style={{ padding: '20px 16px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 14,
                  background: 'var(--primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Zap size={20} color="#fff" strokeWidth={2.5} />
                </div>
                <div className="brand-text">
                  <h1 style={{ fontSize: '1.3rem', margin: 0, fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--on-surface)' }}>APES</h1>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--on-surface-variant)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>CRM & Analytics</div>
                </div>
              </div>
            </div>

            {/* ── Current Member Badge ── */}
            {currentMember && (
              <div className="member-badge-wrapper" style={{ padding: '0 12px', marginBottom: 12 }}>
                <div className="member-info" style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  borderRadius: 14, background: 'var(--surface-container-high)',
                  border: '1px solid var(--border-subtle)',
                  backdropFilter: 'blur(10px)',
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 12,
                    background: `linear-gradient(135deg, ${ROLE_COLORS[currentMember.role]}40, ${ROLE_COLORS[currentMember.role]}15)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, flexShrink: 0,
                    boxShadow: `0 2px 12px ${ROLE_COLORS[currentMember.role]}25`,
                  }}>
                    {ROLE_ICONS[currentMember.role]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: ROLE_COLORS[currentMember.role], whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentMember.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--on-surface-variant)', fontWeight: 500 }}>{ROLE_LABELS[currentMember.role]}</div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Navigation Groups ── */}
            <nav className="sidebar-nav" style={{ flex: 1, overflowY: 'auto', padding: '4px 10px' }}>
              {filteredGroups.map((group, groupIdx) => {
                const isCollapsed = collapsed[group.id];
                return (
                  <div key={group.id} style={{ marginBottom: groupIdx < filteredGroups.length - 1 ? 8 : 0 }}>
                    {group.label && (
                      <div
                        className="nav-group-toggle"
                        onClick={() => toggleGroup(group.id)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '8px 10px 4px', cursor: 'pointer', borderRadius: 8,
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-container-highest)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <span className="nav-group-label" style={{
                          fontSize: 9, fontWeight: 700, color: 'var(--on-surface-variant)',
                          textTransform: 'uppercase', letterSpacing: '1.2px',
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          {isCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
                          {group.label}
                        </span>
                        {group.items.length > 1 && (
                          <span className="nav-group-count" style={{
                            fontSize: 9, fontWeight: 700, color: 'var(--on-surface-variant)',
                            background: 'var(--surface-container-high)', padding: '2px 7px', borderRadius: 6,
                          }}>
                            {group.items.length}
                          </span>
                        )}
                      </div>
                    )}

                    {(!group.label || !isCollapsed) && (
                      <div style={{ marginTop: group.label ? 4 : 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                                <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
                              </span>
                              <span>{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {groupIdx < filteredGroups.length - 1 && (
                      <div style={{ height: 1, background: 'var(--border-subtle)', margin: '8px 12px' }} />
                    )}
                  </div>
                );
              })}
            </nav>

            {/* ── Theme Toggle ── */}
            <div className="theme-toggle-row" style={{ padding: '8px 12px' }}>
              <div style={{ height: 1, background: 'var(--border-subtle)', marginBottom: 8 }} />
              <button
                onClick={toggleTheme}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: 'var(--surface-container-high)', color: 'var(--on-surface)',
                  fontSize: 13, fontWeight: 500, textAlign: 'left',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-container-highest)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-container-high)'; }}
              >
                <span style={{
                  width: 30, height: 30, borderRadius: 10, background: 'var(--surface-container-highest)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {theme === 'dark' ? <Moon size={15} /> : <Sun size={15} />}
                </span>
                <span>{theme === 'dark' ? 'Modo Oscuro' : 'Modo Claro'}</span>
              </button>
            </div>

            {/* ── Footer ── */}
            <div className="sidebar-footer" style={{ padding: '10px 12px 14px', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
                <span className="live-dot" />
                <span style={{ fontSize: 9, color: 'var(--on-surface-variant)', fontWeight: 600, letterSpacing: '0.5px' }}>Sistema Activo</span>
              </div>
              <p style={{ margin: 0, fontSize: 9, color: 'var(--on-surface-variant)', opacity: 0.7, fontWeight: 500, letterSpacing: '0.5px' }}>APES DIGITAL v4.0</p>
            </div>
          </aside>
        </>
      )}

      {/* ════════════════════════════════════════════
          MOBILE: Floating Glassmorphism Orb Navigation
          ════════════════════════════════════════════ */}
      {isMobile && (
        <>
          {/* Top bar for mobile */}
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 140,
            height: 56, background: 'var(--surface-container)', borderBottom: '1px solid var(--border-subtle)',
            display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12,
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Zap size={16} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--on-surface)', letterSpacing: '-0.02em' }}>APES</div>
            </div>
            {currentMember && (
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: `${ROLE_COLORS[currentMember.role]}15`,
                border: `1px solid ${ROLE_COLORS[currentMember.role]}25`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: ROLE_COLORS[currentMember.role],
              }}>
                {currentMember.name?.charAt(0)?.toUpperCase()}
              </div>
            )}
          </div>

          {/* ── Floating Orb + Expanded Menu ── */}
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
   Floating Orb Navigation — Innovative Glassmorphism Mobile Nav
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
      {/* Backdrop */}
      {expanded && (
        <div
          onClick={() => setExpanded(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 198,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.2s ease',
          }}
        />
      )}

      {/* Expanded menu pill */}
      <div style={{
        position: 'fixed', bottom: 90, left: '50%',
        zIndex: 200,
        display: 'flex', gap: 8, padding: '8px 12px',
        background: 'var(--surface)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        borderRadius: 28, border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-md)',
        opacity: expanded ? 1 : 0,
        pointerEvents: expanded ? 'auto' : 'none',
        transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        transform: `translateX(-50%) translateY(${expanded ? 0 : 20}px) scale(${expanded ? 1 : 0.8})`,
      }}>
        {quickNav.map((item, i) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                padding: '10px 6px 6px', borderRadius: 16, border: 'none', cursor: 'pointer',
                background: isActive ? `${item.color}20` : 'transparent',
                color: isActive ? item.color : 'rgba(255,255,255,0.5)',
                transition: 'all 0.25s ease',
                minWidth: 56,
                animation: expanded ? `orbItemIn 0.3s ease ${i * 0.05}s both` : 'none',
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 14,
                background: isActive ? `${item.color}18` : 'rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.25s ease',
                boxShadow: isActive ? `0 4px 16px ${item.color}30` : 'none',
              }}>
                <Icon size={19} strokeWidth={isActive ? 2.4 : 1.8} />
              </div>
              <span style={{ fontSize: 9, fontWeight: isActive ? 700 : 500, letterSpacing: '0.2px' }}>{item.label}</span>
            </button>
          );
        })}

        {/* Separator */}
        <div style={{ width: 1, background: 'rgba(255,255,255,0.06)', margin: '6px 2px', alignSelf: 'stretch' }} />

        {/* More items */}
        <button
          onClick={() => { setExpanded(false); setMoreOpen(true); }}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            padding: '10px 6px 6px', borderRadius: 16, border: 'none', cursor: 'pointer',
            background: moreOpen ? 'rgba(255,255,255,0.08)' : 'transparent',
            color: moreOpen ? '#a855f7' : 'rgba(255,255,255,0.5)',
            transition: 'all 0.25s ease',
            minWidth: 56,
          }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: 14,
            background: moreOpen ? 'rgba(168,85,247,0.12)' : 'rgba(255,255,255,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Sparkles size={19} strokeWidth={1.8} />
          </div>
          <span style={{ fontSize: 9, fontWeight: 500 }}>Más</span>
        </button>
      </div>

      {/* The Orb */}
      <button
        ref={orbRef}
        onClick={() => setExpanded(!expanded)}
        style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 201,
          width: expanded ? 52 : 56, height: expanded ? 52 : 56,
          borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: expanded
            ? 'linear-gradient(135deg, #6366f1, #a855f7)'
            : 'linear-gradient(135deg, #6366f1, #a855f7, #ec4899)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: expanded
            ? '0 8px 32px rgba(139,92,246,0.6), 0 0 60px rgba(139,92,246,0.25)'
            : '0 8px 32px rgba(139,92,246,0.5), 0 0 60px rgba(139,92,246,0.2), 0 0 0 3px rgba(139,92,246,0.15)',
          transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
          animation: expanded ? 'none' : 'orbPulse 3s ease-in-out infinite',
          color: '#fff',
          outline: 'none',
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

      {/* More Drawer (Bottom Sheet) */}
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
