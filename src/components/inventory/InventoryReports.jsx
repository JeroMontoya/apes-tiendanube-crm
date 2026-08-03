import React, { useState, useMemo } from 'react';
import {
  BarChart3, DollarSign, Package, TrendingUp, Download, Calendar,
  ArrowUpDown, MapPin, RefreshCw,
} from 'lucide-react';

function formatCurrency(v) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0);
}

function formatNumber(v) {
  return new Intl.NumberFormat('es-CO').format(v || 0);
}

function toCSV(rows, headers) {
  const header = headers.join(',');
  const lines = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','));
  return [header, ...lines].join('\n');
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

function MiniBar({ value, max, color, label }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--on-surface)' }}>{label}</span>
        <span style={{ fontSize: '12px', fontWeight: '700', color, fontFamily: "'JetBrains Mono', monospace" }}>{formatCurrency(value)}</span>
      </div>
      <div style={{ height: '8px', borderRadius: '4px', background: 'var(--border-subtle)', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: '4px', width: `${pct}%`, background: color, transition: 'width 0.4s' }} />
      </div>
    </div>
  );
}

export default function InventoryReports({ summary, movements, locations, products }) {
  const [activeTab, setActiveTab] = useState('summary');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const tabs = [
    { key: 'summary', label: 'Resumen', icon: BarChart3 },
    { key: 'movements', label: 'Movimientos', icon: ArrowUpDown },
    { key: 'valuation', label: 'Valoración', icon: DollarSign },
  ];

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
    return result;
  }, [movements, startDate, endDate]);

  const summaryData = useMemo(() => {
    const locBreakdown = summary?.locationBreakdown || summary?.location_breakdown || [];
    const totalValue = locBreakdown.reduce((s, l) => s + (l.total_value || 0), 0);
    const totalStock = locBreakdown.reduce((s, l) => s + (l.total_stock || 0), 0);
    const totalProducts = summary?.total_products || 0;
    return { locBreakdown, totalValue, totalStock, totalProducts };
  }, [summary]);

  const movementStats = useMemo(() => {
    const byType = {};
    filteredMovements.forEach((m) => {
      if (!byType[m.type]) byType[m.type] = { count: 0, totalQty: 0 };
      byType[m.type].count += 1;
      byType[m.type].totalQty += Math.abs(m.quantity || 0);
    });
    const topProducts = {};
    filteredMovements.forEach((m) => {
      const name = m.product_name || m.productName || 'Desconocido';
      if (!topProducts[name]) topProducts[name] = 0;
      topProducts[name] += Math.abs(m.quantity || 0);
    });
    const sortedTop = Object.entries(topProducts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const maxQty = Math.max(1, ...Object.values(byType).map((v) => v.count));
    return { byType, topProducts: sortedTop, maxQty, totalCount: filteredMovements.length };
  }, [filteredMovements]);

  const valuationData = useMemo(() => {
    const productValues = (products || []).map((p) => ({
      name: p.name,
      sku: p.sku,
      totalStock: p.total_stock || 0,
      unitCost: p.unit_cost || 0,
      sellPrice: p.sell_price || 0,
      stockValue: (p.total_stock || 0) * (p.unit_cost || 0),
      sellValue: (p.total_stock || 0) * (p.sell_price || 0),
    })).sort((a, b) => b.stockValue - a.stockValue);
    const totalStockValue = productValues.reduce((s, p) => s + p.stockValue, 0);
    const totalSellValue = productValues.reduce((s, p) => s + p.sellValue, 0);
    return { productValues: productValues.slice(0, 50), totalStockValue, totalSellValue, maxStockValue: Math.max(1, productValues[0]?.stockValue || 1) };
  }, [products]);

  const TYPE_COLORS = {
    receive: '#06B6D4', dispatch: '#E11D48', transfer: '#6366f1',
    adjustment: 'var(--primary-container)', sync: '#8b5cf6', production_in: '#06b6d4', return: 'var(--primary-container)',
  };
  const TYPE_LABELS = {
    receive: 'Recepción', dispatch: 'Despacho', transfer: 'Transferencia',
    adjustment: 'Ajuste', sync: 'Sync TN', production_in: 'Producción', return: 'Devolución',
  };

  const handleExport = (type) => {
    let csv = '';
    let filename = '';
    if (type === 'summary') {
      csv = toCSV(
        summaryData.locBreakdown.map((l) => [l.name || l.location_id, l.total_stock, l.total_value]),
        ['Ubicación', 'Stock Total', 'Valor']
      );
      filename = 'resumen_inventario';
    } else if (type === 'movements') {
      csv = toCSV(
        filteredMovements.map((m) => [m.created_at || m.createdAt, m.product_name || m.productName, m.type, m.quantity, m.from_location || '', m.to_location || '']),
        ['Fecha', 'Producto', 'Tipo', 'Cantidad', 'Origen', 'Destino']
      );
      filename = 'movimientos';
    } else {
      csv = toCSV(
        valuationData.productValues.map((p) => [p.name, p.sku, p.totalStock, p.unitCost, p.stockValue]),
        ['Producto', 'SKU', 'Stock', 'Costo Unitario', 'Valor Stock']
      );
      filename = 'valoracion';
    }
    downloadCSV(csv, `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const cardStyle = {
    padding: '20px', borderRadius: '16px',
    background: 'var(--surface)', border: '1px solid var(--border-subtle)',
  };
  const inputStyle = {
    height: '34px', borderRadius: '8px',
    border: '1px solid var(--border-subtle)', background: 'var(--surface)',
    color: 'var(--on-surface)', fontSize: '12px', fontFamily: 'inherit',
    padding: '0 10px', outline: 'none',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', padding: '4px', borderRadius: '12px', background: 'var(--surface-container-low, var(--surface-container-low))', border: '1px solid var(--border-subtle)' }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              flex: 1, padding: '10px 16px', borderRadius: '10px', border: 'none',
              background: activeTab === t.key ? '#6366f1' : 'transparent',
              color: activeTab === t.key ? '#fff' : 'var(--on-surface-variant)',
              fontSize: '13px', fontWeight: activeTab === t.key ? '700' : '500',
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'all 0.15s',
            }}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Date Range & Export */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Calendar size={13} color="var(--on-surface-variant)" />
          <input type="date" style={inputStyle} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>a</span>
        <input type="date" style={inputStyle} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <button onClick={() => handleExport(activeTab)} style={{ marginLeft: 'auto', padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--surface)', color: 'var(--on-surface)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Download size={13} /> Exportar CSV
        </button>
      </div>

      {/* Summary Tab */}
      {activeTab === 'summary' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '700', color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <DollarSign size={18} color="#06B6D4" /> Valor por Ubicación
            </h3>
            {summaryData.locBreakdown.length === 0 ? (
              <p style={{ color: 'var(--on-surface-variant)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>Sin datos disponibles</p>
            ) : (
              summaryData.locBreakdown.map((l) => (
                <MiniBar key={l.location_id || l.name} value={l.total_value || 0} max={Math.max(1, ...summaryData.locBreakdown.map((x) => x.total_value || 0))} color={(locations || []).find((loc) => loc.id === l.location_id)?.color || '#6366f1'} label={l.name || l.location_id} />
              ))
            )}
          </div>
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '700', color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={18} color="#6366f1" /> Resumen General
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                ['Total Productos', summaryData.totalProducts, '#6366f1'],
                ['Stock Total', formatNumber(summaryData.totalStock), '#06B6D4'],
                ['Valor Total', formatCurrency(summaryData.totalValue), '#8b5cf6'],
                ['Stock Bajo', summary?.low_stock_count || 0, 'var(--primary-container)'],
                ['Sin Stock', summary?.out_of_stock_count || 0, '#E11D48'],
              ].map(([label, value, color]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '8px', background: 'var(--surface-container-low, var(--surface-container-low))' }}>
                  <span style={{ fontSize: '13px', color: 'var(--on-surface-variant)' }}>{label}</span>
                  <span style={{ fontSize: '14px', fontWeight: '700', color, fontFamily: "'JetBrains Mono', monospace" }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Movements Tab */}
      {activeTab === 'movements' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '700', color: 'var(--on-surface)' }}>
              Movimientos por Tipo ({movementStats.totalCount} total)
            </h3>
            {Object.entries(movementStats.byType).length === 0 ? (
              <p style={{ color: 'var(--on-surface-variant)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>Sin movimientos en el período</p>
            ) : (
              Object.entries(movementStats.byType).sort((a, b) => b[1].count - a[1].count).map(([type, data]) => (
                <div key={type} style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--on-surface)' }}>{TYPE_LABELS[type] || type}</span>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: TYPE_COLORS[type] || '#6366f1', fontFamily: "'JetBrains Mono', monospace" }}>
                      {data.count} mov. · {formatNumber(data.totalQty)} und.
                    </span>
                  </div>
                  <div style={{ height: '8px', borderRadius: '4px', background: 'var(--border-subtle)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: '4px', width: `${(data.count / movementStats.maxQty) * 100}%`, background: TYPE_COLORS[type] || '#6366f1', transition: 'width 0.4s' }} />
                  </div>
                </div>
              ))
            )}
          </div>
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '700', color: 'var(--on-surface)' }}>
              Productos Más Movidos
            </h3>
            {movementStats.topProducts.length === 0 ? (
              <p style={{ color: 'var(--on-surface-variant)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>Sin datos</p>
            ) : (
              movementStats.topProducts.map(([name, qty], i) => {
                const maxP = movementStats.topProducts[0]?.[1] || 1;
                return (
                  <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--on-surface-variant)', width: '20px', textAlign: 'right' }}>{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                      <div style={{ height: '4px', borderRadius: '2px', background: 'var(--border-subtle)', marginTop: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: '2px', width: `${(qty / maxP) * 100}%`, background: '#6366f1' }} />
                      </div>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '700', fontFamily: "'JetBrains Mono', monospace", color: '#6366f1' }}>{formatNumber(qty)}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Valuation Tab */}
      {activeTab === 'valuation' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '700', color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <DollarSign size={18} color="#8b5cf6" /> Valoración Total
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#8b5cf6', fontFamily: "'JetBrains Mono', monospace" }}>{formatCurrency(valuationData.totalStockValue)}</div>
                <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>Valor de Costo</div>
              </div>
              <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#06B6D4', fontFamily: "'JetBrains Mono', monospace" }}>{formatCurrency(valuationData.totalSellValue)}</div>
                <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>Valor de Venta</div>
              </div>
              <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(99, 102, 241,0.1)', border: '1px solid rgba(99, 102, 241,0.2)' }}>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#6366f1', fontFamily: "'JetBrains Mono', monospace" }}>
                  {formatCurrency(valuationData.totalSellValue - valuationData.totalStockValue)}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>Utilidad Potencial</div>
              </div>
            </div>
          </div>
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '700', color: 'var(--on-surface)' }}>
              Valor por Producto (Top 50)
            </h3>
            {valuationData.productValues.length === 0 ? (
              <p style={{ color: 'var(--on-surface-variant)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>Sin productos</p>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {valuationData.productValues.map((p, i) => (
                  <div key={p.sku || i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: i < valuationData.productValues.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                    <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--on-surface-variant)', width: '20px', textAlign: 'right' }}>{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                      <div style={{ fontSize: '10px', color: 'var(--on-surface-variant)' }}>{p.sku} · {p.totalStock} und.</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', fontFamily: "'JetBrains Mono', monospace", color: '#8b5cf6' }}>{formatCurrency(p.stockValue)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
