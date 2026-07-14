import React, { useState, useMemo, useEffect } from 'react';
import { loadFromCache, saveToCache, clearStaleCache } from '../data/cache';

const SEGMENTS = [
  { key: 'todos', icon: '', label: 'Todos' },
  { key: 'abandoned', icon: '🛒', label: 'Abandonados' },
  { key: 'regular', icon: '🛍️', label: 'Regulares' },
  { key: 'vip', icon: '🌟', label: 'VIP' },
  { key: 'con_cupon', icon: '🎟️', label: 'Con Cupón' },
];

const COLUMNS = [
  { key: 'name', label: 'Nombre', width: '18%' },
  { key: 'email', label: 'Email', width: '20%' },
  { key: 'phone', label: 'Teléfono', width: '13%' },
  { key: 'city', label: 'Ciudad', width: '12%' },
  { key: 'totalSpent', label: 'Total ($)', width: '12%' },
  { key: 'purchaseCount', label: 'Compras', width: '9%' },
  { key: 'segment', label: 'Segmento', width: '10%' },
];

const PAGE_SIZE = 10;

const SEGMENT_BADGES = {
  abandoned: { bg: 'rgba(239, 68, 68, 0.15)', color: '#F87171', border: '1px solid rgba(239, 68, 68, 0.3)', label: '🛒 Abandonado' },
  regular: { bg: 'rgba(59, 130, 246, 0.15)', color: '#60A5FA', border: '1px solid rgba(59, 130, 246, 0.3)', label: '🛍️ Regular' },
  vip: { bg: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24', border: '1px solid rgba(245, 158, 11, 0.3)', label: '🌟 VIP' },
};

const SOURCE_BADGES = {
  historic: { bg: 'rgba(139, 111, 71, 0.2)', color: '#A0845C', label: 'Histórico' },
  tiendanube: { bg: 'rgba(121, 82, 179, 0.2)', color: '#A78BFA', label: 'TiendaNube' },
  unified: { bg: 'rgba(45, 139, 78, 0.2)', color: '#34C759', label: 'Unificado' },
};

function getSegment(client) {
  const pc = client.allTimePurchaseCount ?? client.purchaseCount ?? 0;
  if (pc === 0) return 'abandoned';
  if (pc === 1) return 'regular';
  return 'vip';
}

const s = {
  container: {
    fontFamily: "'Montserrat', sans-serif",
  },
  searchRow: {
    display: 'flex',
    gap: 12,
    marginBottom: 16,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  searchBox: {
    flex: '1 1 260px',
    position: 'relative',
  },
  searchInput: {
    width: '100%',
    padding: '12px 16px 12px 44px',
    background: 'var(--surface)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 8,
    color: 'var(--on-surface)',
    fontSize: 14,
    fontFamily: "'Montserrat', sans-serif",
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  searchIcon: {
    position: 'absolute',
    left: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: 18,
    color: '#A8B2BC',
    pointerEvents: 'none',
  },
  filterRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterBtn: {
    padding: '8px 16px',
    borderRadius: 8,
    border: '1px solid var(--border-subtle)',
    background: 'var(--surface)',
    color: 'var(--on-surface-variant)',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: "'Montserrat', sans-serif",
    transition: 'all 0.2s',
  },
  filterBtnActive: {
    background: 'var(--surface-container)',
    color: 'var(--on-surface)',
    border: '1px solid #D1D5DB',
  },
  tableWrap: {
    background: 'var(--surface)',
    borderRadius: 16,
    border: '1px solid var(--border-subtle)',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '14px 16px',
    textAlign: 'left',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--on-surface-variant)',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    borderBottom: '1px solid var(--border-subtle)',
    background: 'var(--surface-container-low)',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'color 0.2s',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '12px 16px',
    fontSize: 13,
    color: 'var(--on-surface)',
    borderBottom: '1px solid var(--border-subtle)',
  },
  row: {
    transition: 'background 0.15s',
    cursor: 'pointer',
  },
  rowHover: {
    background: 'var(--surface-container-low)',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  sourceBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 500,
    marginLeft: 8,
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    borderTop: '1px solid var(--border-subtle)',
    fontSize: 13,
    color: 'var(--on-surface-variant)',
    background: 'var(--surface)',
  },
  pageBtn: {
    padding: '6px 14px',
    borderRadius: 8,
    border: '1px solid var(--border-subtle)',
    background: 'var(--surface)',
    color: 'var(--on-surface-variant)',
    fontSize: 13,
    cursor: 'pointer',
    fontFamily: "'Montserrat', sans-serif",
    transition: 'all 0.2s',
  },
  pageBtnDisabled: {
    opacity: 0.5,
    cursor: 'default',
    background: 'var(--surface-container-low)',
  },
  emptyState: {
    textAlign: 'center',
    padding: '48px 20px',
    color: '#A8B2BC',
    fontSize: 14,
  },
  sortArrow: {
    marginLeft: 4,
    fontSize: 10,
    opacity: 0.7,
  },
};

export default function MasterTable({ clients, onSelectClient }) {
  const [search, setSearch] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('todos');
  const [sortCol, setSortCol] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(0);
  const [hoveredRow, setHoveredRow] = useState(null);

  const processedClients = useMemo(() => {
    let arr = (clients || []).map(c => ({
      ...c,
      segment: getSegment(c),
    }));

    // Segment filter
    if (segmentFilter === 'abandoned') arr = arr.filter(c => c.segment === 'abandoned');
    else if (segmentFilter === 'regular') arr = arr.filter(c => c.segment === 'regular');
    else if (segmentFilter === 'vip') arr = arr.filter(c => c.segment === 'vip');
    else if (segmentFilter === 'con_cupon') arr = arr.filter(c => c.purchases && c.purchases.some(p => p.coupon));

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      arr = arr.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        (c.city || '').toLowerCase().includes(q)
      );
    }

    // Sort
    arr.sort((a, b) => {
      let sortKey = sortCol;
      if (sortCol === 'totalSpent') sortKey = 'allTimeTotalSpent';
      if (sortCol === 'purchaseCount') sortKey = 'allTimePurchaseCount';
      let va = a[sortKey] ?? '';
      let vb = b[sortKey] ?? '';
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va;
      }
      va = String(va).toLowerCase();
      vb = String(vb).toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return arr;
  }, [clients, segmentFilter, search, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(processedClients.length / PAGE_SIZE));
  const paged = processedClients.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
    setPage(0);
  };

  const handleFilterChange = (seg) => {
    setSegmentFilter(seg);
    setPage(0);
  };

  return (
    <div style={s.container}>
      {/* Search & Filters */}
      <div style={s.searchRow}>
        <div style={s.searchBox}>
          <span style={s.searchIcon}>🔍</span>
          <input
            style={s.searchInput}
            type="text"
            placeholder="Buscar por nombre, email, teléfono o ciudad..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
        </div>
        <div style={s.filterRow}>
          {SEGMENTS.map(seg => (
            <button
              key={seg.key}
              style={{
                ...s.filterBtn,
                ...(segmentFilter === seg.key ? s.filterBtnActive : {}),
              }}
              onClick={() => handleFilterChange(seg.key)}
            >
              {seg.icon} {seg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={s.tableWrap}>
        <div style={{ overflowX: 'auto' }}>
          <table style={s.table}>
            <thead>
              <tr>
                {COLUMNS.map(col => (
                  <th
                    key={col.key}
                    style={{ ...s.th, width: col.width }}
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label}
                    {sortCol === col.key && (
                      <span style={s.sortArrow}>
                        {sortDir === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} style={s.emptyState}>
                    No se encontraron clientes
                  </td>
                </tr>
              ) : (
                paged.map((client, idx) => {
                  const segBadge = SEGMENT_BADGES[client.segment] || SEGMENT_BADGES.regular;
                  const srcBadge = SOURCE_BADGES[client.source] || SOURCE_BADGES.historic;
                  return (
                    <tr
                      key={client.email || idx}
                      style={{
                        ...s.row,
                        ...(hoveredRow === idx ? s.rowHover : {}),
                      }}
                      onMouseEnter={() => setHoveredRow(idx)}
                      onMouseLeave={() => setHoveredRow(null)}
                      onClick={() => onSelectClient?.(client)}
                    >
                      <td style={s.td}>
                        {client.name || '—'}
                        {client.purchases && client.purchases.some(p => p.coupon) && (
                          <span title="Usó cupón promocional" style={{ marginLeft: 6, fontSize: 14 }}>🎟️</span>
                        )}
                        <span
                          style={{
                            ...s.sourceBadge,
                            background: srcBadge.bg,
                            color: srcBadge.color,
                          }}
                        >
                          {srcBadge.label}
                        </span>
                      </td>
                      <td style={{ ...s.td, color: 'var(--on-surface-variant)', fontSize: 12 }}>{client.email || '—'}</td>
                      <td style={{ ...s.td, fontSize: 12 }}>{client.phone || '—'}</td>
                      <td style={{ ...s.td, fontSize: 12 }}>{client.city || '—'}</td>
                      <td style={{ ...s.td, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                        {(client.allTimeTotalSpent ?? client.totalSpent ?? 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })}
                      </td>
                      <td style={{ ...s.td, textAlign: 'center', fontWeight: 600 }}>{client.allTimePurchaseCount ?? client.purchaseCount ?? 0}</td>
                      <td style={s.td}>
                        <span
                          style={{
                            ...s.badge,
                            background: segBadge.bg,
                            color: segBadge.color,
                            border: segBadge.border,
                          }}
                        >
                          {segBadge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={s.pagination}>
          <span>
            {processedClients.length} resultado{processedClients.length !== 1 ? 's' : ''} · Página {page + 1} de {totalPages}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              style={{ ...s.pageBtn, ...(page === 0 ? s.pageBtnDisabled : {}) }}
              disabled={page === 0}
              onClick={() => setPage(p => Math.max(0, p - 1))}
            >
              ← Anterior
            </button>
            <button
              style={{ ...s.pageBtn, ...(page >= totalPages - 1 ? s.pageBtnDisabled : {}) }}
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            >
              Siguiente →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
