import React, { useState, useEffect, useCallback } from 'react';
import { useTeam } from '../contexts/TeamContext';
import {
  LayoutDashboard, Users, Target, Brain, TrendingUp,
  Megaphone, Globe, KanbanSquare, PackageSearch, ShoppingCart,
  Settings, Download, Menu, X, Zap, Calendar, Sun, Moon, Warehouse,
  Hammer, BarChart3, Clock, ChevronDown, ChevronRight, MoreHorizontal
} from 'lucide-react';

const NAV_GROUPS = [
  {
    id: 'principal',
    label: null,
    items: [
      { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'taller', 'ventas', 'atencion_cliente'] },
      { id: 'calendario', icon: Calendar, label: 'Calendario', roles: ['admin'] },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing & Analytics',
    items: [
      { id: 'marketing', icon: TrendingUp, label: 'Marketing', roles: ['admin'] },
      { id: 'meta_ads', icon: Megaphone, label: 'Meta Ads', roles: ['admin'] },
      { id: 'ga4', icon: Globe, label: 'Google Analytics', roles: ['admin'] },
      { id: 'analitica', icon: Brain, label: 'Analítica', roles: ['admin'] },
      { id: 'segmentos', icon: Target, label: 'Segmentos', roles: ['admin'] },
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

// Mobile bottom nav: 5 main items
const MOBILE_NAV = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Inicio' },
  { id: 'clientes', icon: Users, label: 'Clientes' },
  { id: 'taller', icon: Hammer, label: 'Taller' },
  { id: 'marketing', icon: TrendingUp, label: 'Marketing' },
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

          <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
            {/* ── Logo ── */}
            <div className="sidebar-logo" style={{ padding: '20px 16px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 12,
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
                  flexShrink: 0,
                }}>
                  <Zap size={20} color="#fff" />
                </div>
                <div className="brand-text">
                  <h1 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--on-surface)' }}>APES</h1>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--on-surface-variant)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>CRM & Analytics</div>
                </div>
              </div>
            </div>

            {/* ── Current Member Badge ── */}
            {currentMember && (
              <div className="member-badge-wrapper" style={{ padding: '0 14px', marginBottom: 14 }}>
                <div className="member-info" style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  borderRadius: 12, background: `${ROLE_COLORS[currentMember.role]}08`,
                  border: `1px solid ${ROLE_COLORS[currentMember.role]}18`,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10,
                    background: `linear-gradient(135deg, ${ROLE_COLORS[currentMember.role]}20, ${ROLE_COLORS[currentMember.role]}08)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, flexShrink: 0,
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
            <nav className="sidebar-nav" style={{ flex: 1, overflowY: 'auto', padding: '0 10px' }}>
              {filteredGroups.map((group, groupIdx) => {
                const isCollapsed = collapsed[group.id];
                return (
                  <div key={group.id} style={{ marginBottom: groupIdx < filteredGroups.length - 1 ? 6 : 0 }}>
                    {group.label && (
                      <div
                        className="nav-group-toggle"
                        onClick={() => toggleGroup(group.id)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '8px 8px 4px', cursor: 'pointer', borderRadius: 6,
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <span className="nav-group-label" style={{
                          fontSize: 10, fontWeight: 700, color: 'var(--on-surface-variant)',
                          textTransform: 'uppercase', letterSpacing: '0.8px',
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          {isCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
                          {group.label}
                        </span>
                        {group.items.length > 1 && (
                          <span className="nav-group-count" style={{
                            fontSize: 9, fontWeight: 700, color: 'var(--on-surface-variant)',
                            background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 4,
                          }}>
                            {group.items.length}
                          </span>
                        )}
                      </div>
                    )}

                    {(!group.label || !isCollapsed) && (
                      <div style={{ marginTop: group.label ? 2 : 0 }}>
                        {group.items.map(item => {
                          const active = isActive(item.id);
                          const Icon = item.icon;
                          return (
                            <button
                              key={item.id}
                              className="sidebar-nav-item"
                              onClick={() => handleNavigate(item.id)}
                              style={{
                                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                                padding: '9px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                                marginBottom: 2,
                                background: active
                                  ? 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(99,102,241,0.1))'
                                  : 'transparent',
                                color: active ? '#8b5cf6' : 'var(--on-surface-variant)',
                                fontSize: 13, fontWeight: active ? 700 : 500,
                                textAlign: 'left', transition: 'all 0.12s',
                                position: 'relative',
                              }}
                              onMouseEnter={e => {
                                if (!active) {
                                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                                  e.currentTarget.style.color = 'var(--on-surface)';
                                }
                              }}
                              onMouseLeave={e => {
                                if (!active) {
                                  e.currentTarget.style.background = 'transparent';
                                  e.currentTarget.style.color = 'var(--on-surface-variant)';
                                }
                              }}
                            >
                              {active && (
                                <div style={{
                                  position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                                  width: 3, height: 18, borderRadius: 2,
                                  background: 'linear-gradient(180deg, #8b5cf6, #6366f1)',
                                }} />
                              )}
                              <span style={{
                                width: 28, height: 28, borderRadius: 8,
                                background: active ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.04)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                transition: 'background 0.12s',
                              }}>
                                <Icon size={16} />
                              </span>
                              <span>{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {groupIdx < filteredGroups.length - 1 && (
                      <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '8px 8px' }} />
                    )}
                  </div>
                );
              })}
            </nav>

            {/* ── Theme Toggle ── */}
            <div className="theme-toggle-row" style={{ padding: '10px 14px' }}>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', marginBottom: 10 }} />
              <button
                onClick={toggleTheme}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: 'transparent', color: 'var(--on-surface-variant)',
                  fontSize: 13, fontWeight: 500, textAlign: 'left',
                  transition: 'all 0.12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{
                  width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.04)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                </span>
                <span>Modo {theme === 'dark' ? 'Oscuro' : 'Claro'}</span>
              </button>
            </div>

            {/* ── Footer ── */}
            <div className="sidebar-footer" style={{ padding: '12px 16px 16px', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
                <span className="live-dot" />
                <span style={{ fontSize: 10, color: 'var(--on-surface-variant)', fontWeight: 600 }}>Sistema Activo</span>
              </div>
              <p style={{ margin: 0, fontSize: 10, color: 'var(--on-surface-variant)', opacity: 0.5, fontWeight: 500 }}>APES DIGITAL v4.0</p>
            </div>
          </aside>
        </>
      )}

      {/* ════════════════════════════════════════════
          MOBILE: Bottom Navigation Bar
          ════════════════════════════════════════════ */}
      {isMobile && (
        <>
          {/* Top bar for mobile */}
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 140,
            height: 56, background: 'var(--surface)', borderBottom: '1px solid var(--border-subtle)',
            display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12,
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
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

          {/* Bottom Nav */}
          <nav className="mobile-bottom-nav">
            {MOBILE_NAV.map(item => {
              const active = isActive(item.id);
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={`mobile-nav-item ${active ? 'active' : ''}`}
                  onClick={() => handleNavigate(item.id)}
                >
                  <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
                  <span className="mobile-nav-label">{item.label}</span>
                </button>
              );
            })}
            <button
              className={`mobile-nav-item ${moreOpen ? 'active' : ''}`}
              onClick={() => setMoreOpen(!moreOpen)}
            >
              <MoreHorizontal size={22} strokeWidth={moreOpen ? 2.5 : 1.8} />
              <span className="mobile-nav-label">Más</span>
            </button>
          </nav>

          {/* More Drawer */}
          {moreOpen && (
            <div className="mobile-more-overlay" onClick={() => setMoreOpen(false)}>
              <div className="mobile-more-sheet" onClick={e => e.stopPropagation()}>
                <div className="sheet-handle" />

                {/* Theme toggle */}
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
                          onClick={() => handleNavigate(item.id)}
                          style={{
                            color: isActive(item.id) ? 'var(--primary)' : 'var(--on-surface)',
                            fontWeight: isActive(item.id) ? 700 : 500,
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
      )}
    </>
  );
}
