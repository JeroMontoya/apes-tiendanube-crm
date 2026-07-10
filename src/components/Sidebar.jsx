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

          <aside className={`sidebar ${mobileOpen ? 'open' : ''}`} style={{
            background: 'rgba(15, 20, 30, 0.85)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '4px 0 24px rgba(0,0,0,0.2)',
          }}>
            {/* ── Logo ── */}
            <div className="sidebar-logo" style={{ padding: '20px 16px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 14,
                  background: 'linear-gradient(135deg, #6366f1, #a855f7, #ec4899)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 20px rgba(139,92,246,0.4), 0 0 40px rgba(139,92,246,0.15)',
                  flexShrink: 0,
                  animation: 'logoPulse 3s ease-in-out infinite',
                }}>
                  <Zap size={20} color="#fff" strokeWidth={2.5} />
                </div>
                <div className="brand-text">
                  <h1 style={{ fontSize: '1.3rem', margin: 0, fontWeight: 900, letterSpacing: '-0.04em', background: 'linear-gradient(135deg, #c4b5fd, #f0abfc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>APES</h1>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>CRM & Analytics</div>
                </div>
              </div>
            </div>

            {/* ── Current Member Badge ── */}
            {currentMember && (
              <div className="member-badge-wrapper" style={{ padding: '0 12px', marginBottom: 12 }}>
                <div className="member-info" style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  borderRadius: 14, background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
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
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{ROLE_LABELS[currentMember.role]}</div>
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
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <span className="nav-group-label" style={{
                          fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)',
                          textTransform: 'uppercase', letterSpacing: '1.2px',
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          {isCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
                          {group.label}
                        </span>
                        {group.items.length > 1 && (
                          <span className="nav-group-count" style={{
                            fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.25)',
                            background: 'rgba(255,255,255,0.06)', padding: '2px 7px', borderRadius: 6,
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
                              className="sidebar-nav-item"
                              onClick={() => handleNavigate(item.id)}
                              style={{
                                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                                padding: '10px 12px', borderRadius: 12, border: 'none', cursor: 'pointer',
                                background: active
                                  ? 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(99,102,241,0.12))'
                                  : 'transparent',
                                color: active ? '#c4b5fd' : 'rgba(255,255,255,0.5)',
                                fontSize: 13, fontWeight: active ? 700 : 500,
                                textAlign: 'left', transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                position: 'relative',
                                boxShadow: active ? '0 2px 12px rgba(139,92,246,0.15)' : 'none',
                              }}
                              onMouseEnter={e => {
                                if (!active) {
                                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                                  e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
                                  e.currentTarget.style.transform = 'translateX(4px)';
                                }
                              }}
                              onMouseLeave={e => {
                                if (!active) {
                                  e.currentTarget.style.background = 'transparent';
                                  e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
                                  e.currentTarget.style.transform = 'translateX(0)';
                                }
                              }}
                            >
                              {active && (
                                <div style={{
                                  position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                                  width: 3, height: 20, borderRadius: 2,
                                  background: 'linear-gradient(180deg, #a855f7, #6366f1)',
                                  boxShadow: '0 0 8px rgba(139,92,246,0.5)',
                                }} />
                              )}
                              <span style={{
                                width: 30, height: 30, borderRadius: 10,
                                background: active
                                  ? 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(99,102,241,0.15))'
                                  : 'rgba(255,255,255,0.05)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                transition: 'all 0.2s',
                                boxShadow: active ? '0 0 12px rgba(139,92,246,0.2)' : 'none',
                              }}>
                                <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
                              </span>
                              <span>{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {groupIdx < filteredGroups.length - 1 && (
                      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)', margin: '8px 12px' }} />
                    )}
                  </div>
                );
              })}
            </nav>

            {/* ── Theme Toggle ── */}
            <div className="theme-toggle-row" style={{ padding: '8px 12px' }}>
              <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)', marginBottom: 8 }} />
              <button
                onClick={toggleTheme}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)',
                  fontSize: 13, fontWeight: 500, textAlign: 'left',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
              >
                <span style={{
                  width: 30, height: 30, borderRadius: 10, background: 'rgba(255,255,255,0.06)',
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
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '0.5px' }}>Sistema Activo</span>
              </div>
              <p style={{ margin: 0, fontSize: 9, color: 'rgba(255,255,255,0.15)', fontWeight: 500, letterSpacing: '0.5px' }}>APES DIGITAL v4.0</p>
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
