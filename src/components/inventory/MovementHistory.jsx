import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity, Search, Calendar, Download,
  ChevronLeft, ChevronRight, RefreshCw, CheckCircle, XCircle,
  ArrowUpDown, ArrowLeftRight, RotateCcw, Package, FileText,
} from 'lucide-react';

const MOVEMENT_TYPES = [
  { id: 'receive', label: 'Entró', color: '#06B6D4', bg: 'rgba(16,185,129,0.1)' },
  { id: 'dispatch', label: 'Salió', color: '#E11D48', bg: 'rgba(239,68,68,0.1)' },
  { id: 'transfer', label: 'Movido', color: '#6366f1', bg: 'rgba(99, 102, 241,0.1)' },
  { id: 'adjustment', label: 'Ajuste', color: 'var(--primary-container)', bg: 'rgba(6, 182, 212,0.1)' },
  { id: 'sync', label: 'Sync', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  { id: 'production_in', label: 'Producción', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
  { id: 'return', label: 'Devolución', color: 'var(--primary-container)', bg: 'rgba(6, 182, 212,0.1)' },
];

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('es-CO', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  return `Hace ${Math.floor(hrs / 24)}d`;
}

export default function MovementHistory({ movements, locations, products, onRefresh, loading }) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;
  const pageSize = 30;

  const filteredMovements = useMemo(() => {
    let result = [...(movements || [])];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(m =>
        (m.product_name || m.productName || '').toLowerCase().includes(q)
      );
    }
    if (typeFilter !== 'all') {
      result = result.filter(m => m.type === typeFilter);
    }
    result.sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));
    return result;
  }, [movements, search, typeFilter]);

  const totalPages = Math.ceil(filteredMovements.length / pageSize);
  const paginated = filteredMovements.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { setPage(1); }, [search, typeFilter]);

  const inputStyle = {
    height: '38px', borderRadius: '10px',
    border: '1px solid var(--border-subtle)', background: 'var(--surface)',
    color: 'var(--on-surface)', fontSize: '13px', fontFamily: 'inherit',
    padding: '0 10px', outline: 'none',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '180px' }}>
          <Search size={14} color="var(--on-surface-variant)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            style={{ ...inputStyle, paddingLeft: '32px', width: '100%', boxSizing: 'border-box' }}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar producto..."
          />
        </div>
        <select style={{ ...inputStyle, cursor: 'pointer' }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="all">Todos los movimientos</option>
          {MOVEMENT_TYPES.map(t => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
        <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
          <button onClick={onRefresh} style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--surface)', color: 'var(--on-surface)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>
        {filteredMovements.length} movimiento{filteredMovements.length !== 1 ? 's' : ''}
      </div>

      {loading && paginated.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', color: 'var(--on-surface-variant)' }}>
          <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', opacity: 0.3 }} />
        </div>
      ) : paginated.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', color: 'var(--on-surface-variant)' }}>
          <FileText size={36} style={{ opacity: 0.2, marginBottom: '10px' }} />
          <p style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>Sin movimientos</p>
          <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.7 }}>Los movimientos aparecen cuando ajustás o transferís stock</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {paginated.map((m, i) => {
            const type = MOVEMENT_TYPES.find(t => t.id === m.type) || MOVEMENT_TYPES[0];
            return (
              <div key={m.id || i} style={{
                padding: isMobile ? '12px' : '12px 16px',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                <div style={{
                  width: '34px', height: '34px', borderRadius: '10px',
                  background: `${type.color}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: type.color, fontFamily: "'JetBrains Mono', monospace" }}>
                    {m.quantity > 0 ? '+' : ''}{m.quantity}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {m.product_name || m.productName || 'Producto'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', background: type.bg, color: type.color }}>
                      {type.label}
                    </span>
                    {m.from_location && <span>{m.from_location}</span>}
                    {m.to_location && <span>→ {m.to_location}</span>}
                    {m.notes && <span style={{ fontStyle: 'italic' }}>· {m.notes}</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>
                    {isMobile ? timeAgo(m.created_at || m.createdAt) : formatDate(m.created_at || m.createdAt)}
                  </div>
                  {m.tn_synced !== undefined && (
                    <div style={{ marginTop: '2px' }}>
                      {m.tn_synced ? <CheckCircle size={11} color="#06B6D4" /> : <XCircle size={11} color="var(--on-surface-variant)" style={{ opacity: 0.3 }} />}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--surface)', color: page <= 1 ? 'var(--on-surface-variant)' : 'var(--on-surface)', cursor: page <= 1 ? 'default' : 'pointer', opacity: page <= 1 ? 0.4 : 1, fontFamily: 'inherit' }}>
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>
            {page} / {totalPages}
          </span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--surface)', color: page >= totalPages ? 'var(--on-surface-variant)' : 'var(--on-surface)', cursor: page >= totalPages ? 'default' : 'pointer', opacity: page >= totalPages ? 0.4 : 1, fontFamily: 'inherit' }}>
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
