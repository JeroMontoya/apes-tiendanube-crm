import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity, Search, Filter, Calendar, MapPin, Package, Download,
  ChevronLeft, ChevronRight, RefreshCw, CheckCircle, XCircle, ArrowUpDown,
  Truck, ArrowLeftRight, RotateCcw, Clock, FileText,
} from 'lucide-react';

const MOVEMENT_TYPES = [
  { id: 'receive', label: 'Recepción', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  { id: 'dispatch', label: 'Despacho', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  { id: 'transfer', label: 'Transferencia', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  { id: 'adjustment', label: 'Ajuste', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  { id: 'sync', label: 'Sync TN', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  { id: 'production_in', label: 'Producción', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
  { id: 'return', label: 'Devolución', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
];

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('es-CO', {
    day: '2-digit', month: 'short', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function toCSV(movements) {
  const header = 'Fecha,Producto,Tipo,Cantidad,Origen,Destino,Usuario,Notas';
  const rows = (movements || []).map((m) =>
    [
      m.created_at || m.createdAt || '',
      m.product_name || m.productName || '',
      m.type || '',
      m.quantity || 0,
      m.from_location || m.fromLocation || '',
      m.to_location || m.toLocation || '',
      m.user_name || m.userName || '',
      (m.notes || '').replace(/,/g, ';'),
    ].join(',')
  );
  return [header, ...rows].join('\n');
}

function downloadCSV(content, filename) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function MovementHistory({ movements, locations, products, onRefresh, loading }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [productSearch, setProductSearch] = useState('');
  const [page, setPage] = useState(1);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;
  const pageSize = 50;

  const filteredMovements = useMemo(() => {
    let result = [...(movements || [])];
    if (startDate) {
      const sd = new Date(startDate).getTime();
      result = result.filter((m) => new Date(m.created_at || m.createdAt).getTime() >= sd);
    }
    if (endDate) {
      const ed = new Date(endDate).getTime() + 86400000;
      result = result.filter((m) => new Date(m.created_at || m.createdAt).getTime() < ed);
    }
    if (typeFilter !== 'all') {
      result = result.filter((m) => m.type === typeFilter);
    }
    if (locationFilter !== 'all') {
      result = result.filter((m) =>
        (m.from_location || m.fromLocation) === locationFilter ||
        (m.to_location || m.toLocation) === locationFilter ||
        (m.location_id || m.locationId) === locationFilter
      );
    }
    if (productSearch) {
      const q = productSearch.toLowerCase();
      result = result.filter((m) =>
        (m.product_name || m.productName || '').toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));
    return result;
  }, [movements, startDate, endDate, typeFilter, locationFilter, productSearch]);

  const totalPages = Math.ceil(filteredMovements.length / pageSize);
  const paginated = filteredMovements.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { setPage(1); }, [startDate, endDate, typeFilter, locationFilter, productSearch]);

  const handleExport = () => {
    const csv = toCSV(filteredMovements);
    downloadCSV(csv, `movimientos_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const inputStyle = {
    height: '36px', borderRadius: '8px',
    border: '1px solid var(--border-subtle)', background: 'var(--surface)',
    color: 'var(--on-surface)', fontSize: '12px', fontFamily: 'inherit',
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
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder="Buscar producto..."
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Calendar size={14} color="var(--on-surface-variant)" />
          <input type="date" style={inputStyle} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <span style={{ color: 'var(--on-surface-variant)', fontSize: '12px' }}>a</span>
        <input type="date" style={inputStyle} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <select style={{ ...inputStyle, cursor: 'pointer' }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">Todos los tipos</option>
          {MOVEMENT_TYPES.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
        <select style={{ ...inputStyle, cursor: 'pointer' }} value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
          <option value="all">Todas las ubicaciones</option>
          {(locations || []).map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
        <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
          <button onClick={onRefresh} style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--surface)', color: 'var(--on-surface)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={13} />
          </button>
          <button onClick={handleExport} style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--surface)', color: 'var(--on-surface)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={13} /> CSV
          </button>
        </div>
      </div>

      {/* Info */}
      <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>
        {filteredMovements.length} movimiento{filteredMovements.length !== 1 ? 's' : ''} encontrado{filteredMovements.length !== 1 ? 's' : ''}
      </div>

      {/* Table / List */}
      {loading && paginated.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', color: 'var(--on-surface-variant)' }}>
          <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', opacity: 0.3 }} />
        </div>
      ) : paginated.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', color: 'var(--on-surface-variant)' }}>
          <FileText size={36} style={{ opacity: 0.2, marginBottom: '10px' }} />
          <p style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>Sin movimientos</p>
          <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.7 }}>Ajusta los filtros o registra un movimiento</p>
        </div>
      ) : isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {paginated.map((m, i) => {
            const type = MOVEMENT_TYPES.find((t) => t.id === m.type) || MOVEMENT_TYPES[0];
            return (
              <div key={m.id || i} style={{ padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)', background: 'var(--surface)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', background: type.bg, color: type.color }}>{type.label}</span>
                    <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>{m.product_name || m.productName}</span>
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--on-surface-variant)' }}>{formatDate(m.created_at || m.createdAt)}</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--on-surface-variant)' }}>
                  <span style={{ fontWeight: '700', color: m.quantity > 0 ? '#10b981' : '#ef4444', fontFamily: "'JetBrains Mono', monospace" }}>
                    {m.quantity > 0 ? '+' : ''}{m.quantity}
                  </span>
                  {m.from_location && <span>{m.from_location}</span>}
                  {m.to_location && <span>→ {m.to_location}</span>}
                  {m.user_name && <span>· {m.user_name}</span>}
                </div>
                {m.notes && <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)', marginTop: '6px', fontStyle: 'italic' }}>{m.notes}</div>}
                {m.tn_synced !== undefined && (
                  <div style={{ marginTop: '6px' }}>
                    {m.tn_synced ? <CheckCircle size={12} color="#10b981" /> : <XCircle size={12} color="var(--on-surface-variant)" style={{ opacity: 0.3 }} />}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ borderRadius: '12px', border: '1px solid var(--border-subtle)', overflow: 'hidden', background: 'var(--surface)' }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1.5fr 100px 80px 1fr 1fr 100px 80px 40px', gap: '8px', padding: '10px 14px', background: 'var(--surface-container-low, rgba(255,255,255,0.03))', borderBottom: '1px solid var(--border-subtle)', fontSize: '10px', fontWeight: '700', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px', alignItems: 'center' }}>
            <span>Fecha</span>
            <span>Producto</span>
            <span>Tipo</span>
            <span>Cant.</span>
            <span>Origen</span>
            <span>Destino</span>
            <span>Usuario</span>
            <span>Notas</span>
            <span>TN</span>
          </div>
          {paginated.map((m, i) => {
            const type = MOVEMENT_TYPES.find((t) => t.id === m.type) || MOVEMENT_TYPES[0];
            return (
              <div key={m.id || i} style={{ display: 'grid', gridTemplateColumns: '140px 1.5fr 100px 80px 1fr 1fr 100px 80px 40px', gap: '8px', padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)', alignItems: 'center', fontSize: '12px' }}>
                <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>{formatDate(m.created_at || m.createdAt)}</span>
                <span style={{ fontWeight: '600', color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.product_name || m.productName}</span>
                <span style={{ fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', background: type.bg, color: type.color, textAlign: 'center', whiteSpace: 'nowrap' }}>{type.label}</span>
                <span style={{ fontWeight: '700', fontFamily: "'JetBrains Mono', monospace", color: m.quantity > 0 ? '#10b981' : '#ef4444' }}>{m.quantity > 0 ? '+' : ''}{m.quantity}</span>
                <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>{m.from_location || m.fromLocation || '—'}</span>
                <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>{m.to_location || m.toLocation || '—'}</span>
                <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>{m.user_name || m.userName || '—'}</span>
                <span style={{ fontSize: '10px', color: 'var(--on-surface-variant)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.notes || ''}</span>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  {m.tn_synced ? <CheckCircle size={13} color="#10b981" /> : <XCircle size={13} color="var(--on-surface-variant)" style={{ opacity: 0.3 }} />}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--surface)', color: 'var(--on-surface)', cursor: page <= 1 ? 'default' : 'pointer', opacity: page <= 1 ? 0.4 : 1, fontFamily: 'inherit' }}>
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>
            {page} / {totalPages}
          </span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--surface)', color: 'var(--on-surface)', cursor: page >= totalPages ? 'default' : 'pointer', opacity: page >= totalPages ? 0.4 : 1, fontFamily: 'inherit' }}>
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
