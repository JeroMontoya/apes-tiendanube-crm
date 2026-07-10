import React, { useState } from 'react';
import { useTeam } from '../contexts/TeamContext';
import {
  LayoutDashboard, Users, Target, Brain, TrendingUp,
  Megaphone, Globe, KanbanSquare, PackageSearch, ShoppingCart,
  Settings, Download, Menu, X, Zap, Calendar, Sun, Moon, Warehouse,
  Hammer, BarChart3, Clock, ChevronDown, ChevronRight
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

export default function Sidebar({ activeView, onNavigate, theme, toggleTheme, currentMember, ROLE_LABELS, ROLE_COLORS, ROLE_ICONS }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState({});
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
  const teamCtx = useTeam();
  const hasPermission = teamCtx?.hasPermission || (() => true);

  const handleNavigate = (id) => {
    onNavigate(id);
    if (isMobile) setMobileOpen(false);
  };

  const toggleGroup = (groupId) => {
    setCollapsed(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const filteredGroups = NAV_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item =>
      hasPermission(`view_${item.id}`) || item.roles.includes(currentMember?.role || 'admin')
    ),
  })).filter(group => group.items.length > 0);

  const isActive = (id) => activeView === id;

  return (
    <>
      {/* Mobile Toggle */}
      {isMobile && (
        <button className="sidebar-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      )}

      {/* Mobile Overlay */}
      {isMobile && mobileOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 98, backdropFilter: 'blur(4px)' }} onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`sidebar ${isMobile && mobileOpen ? 'open' : ''}`}>
        {/* ── Logo ── */}
        <div style={{ padding: '20px 16px 16px' }}>
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
            <div>
              <h1 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--on-surface)' }}>APES</h1>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--on-surface-variant)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>CRM & Analytics</div>
            </div>
          </div>
        </div>

        {/* ── Current Member Badge ── */}
        {currentMember && (
          <div style={{ padding: '0 14px', marginBottom: 14 }}>
            <div style={{
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
            const hasActiveItem = group.items.some(item => isActive(item.id));

            return (
              <div key={group.id} style={{ marginBottom: groupIdx < filteredGroups.length - 1 ? 6 : 0 }}>
                {/* Group Header */}
                {group.label && (
                  <div
                    onClick={() => toggleGroup(group.id)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 8px 4px', cursor: 'pointer', borderRadius: 6,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: 'var(--on-surface-variant)',
                      textTransform: 'uppercase', letterSpacing: '0.8px',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      {isCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
                      {group.label}
                    </span>
                    {group.items.length > 1 && (
                      <span style={{
                        fontSize: 9, fontWeight: 700, color: 'var(--on-surface-variant)',
                        background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 4,
                      }}>
                        {group.items.length}
                      </span>
                    )}
                  </div>
                )}

                {/* Group Items */}
                {(!group.label || !isCollapsed) && (
                  <div style={{ marginTop: group.label ? 2 : 0 }}>
                    {group.items.map(item => {
                      const active = isActive(item.id);
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
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
                          {/* Active indicator bar */}
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

                {/* Separator between groups */}
                {groupIdx < filteredGroups.length - 1 && (
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '8px 8px' }} />
                )}
              </div>
            );
          })}
        </nav>

        {/* ── Theme Toggle ── */}
        <div style={{ padding: '10px 14px' }}>
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
        <div style={{ padding: '12px 16px 16px', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
            <span className="live-dot" />
            <span style={{ fontSize: 10, color: 'var(--on-surface-variant)', fontWeight: 600 }}>Sistema Activo</span>
          </div>
          <p style={{ margin: 0, fontSize: 10, color: 'var(--on-surface-variant)', opacity: 0.5, fontWeight: 500 }}>APES DIGITAL v4.0</p>
        </div>
      </aside>
    </>
  );
}
