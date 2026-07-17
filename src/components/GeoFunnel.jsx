import React, { useMemo, useState } from 'react';
import { MapPin } from 'lucide-react';
import MetricTooltip from './MetricTooltip';
/**
 * GeoFunnel — Embudo Geográfico por Ciudad y Provincia
 * Shows where customers are buying from, grouped by province,
 * with expandable city breakdowns.
 * Respects date range filter.
 */
export default function GeoFunnel({ clients, onSelectClient, dateRange }) {
  const [viewMode, setViewMode] = useState('province'); // 'province' | 'city'
  const [expandedKey, setExpandedKey] = useState(null);

  const { provinceData, cityData, totalRevenue, totalClients } = useMemo(() => {
    const arr = (clients || []).filter(c => (c.purchaseCount ?? 0) > 0);
    
    // Get date range for filtering
    const startDate = dateRange?.startDate || '';
    const endDate = dateRange?.endDate || '';
    
    // Aggregate geography from individual DATE-FILTERED purchases
    const provinces = {};
    const cities = {};
    let totalRevenue = 0;
    let totalClients = arr.length;

    arr.forEach(c => {
      // Use date-filtered purchases (respects date range picker: hoy, ayer, 7d, este mes, etc.)
      const purchases = (c.purchases || []).filter(p => {
        if (!p.date) return false;
        const d = typeof p.date === 'string' ? p.date.substring(0, 10) : '';
        return d >= startDate && d <= endDate;
      });
      
      purchases.forEach(p => {
        const prov = p.province || c.province || 'Sin provincia';
        const city = p.city || c.city || 'Sin ciudad';
        const amt = p.amount || 0;
        totalRevenue += amt;

        // Province
        if (!provinces[prov]) provinces[prov] = { clientIds: new Set(), revenue: 0, cities: {} };
        provinces[prov].clientIds.add(c.id);
        provinces[prov].revenue += amt;
        if (!provinces[prov].cities[city]) provinces[prov].cities[city] = { count: 0, revenue: 0 };
        provinces[prov].cities[city].count += 1;
        provinces[prov].cities[city].revenue += amt;

        // City (flat)
        if (!cities[city]) cities[city] = { clientIds: new Set(), revenue: 0, province: prov };
        cities[city].clientIds.add(c.id);
        cities[city].revenue += amt;
      });
    });

    const maxProvRev = Math.max(...Object.values(provinces).map(p => p.revenue), 1);
    const provinceData = Object.entries(provinces)
      .map(([name, data]) => ({
        name,
        count: data.clientIds.size,
        revenue: data.revenue,
        pct: totalClients > 0 ? ((data.clientIds.size / totalClients) * 100).toFixed(1) : '0.0',
        revPct: totalRevenue > 0 ? ((data.revenue / totalRevenue) * 100).toFixed(1) : '0.0',
        barWidth: (data.revenue / maxProvRev) * 100,
        cities: Object.entries(data.cities)
          .map(([city, d]) => ({ city, ...d }))
          .sort((a, b) => b.revenue - a.revenue),
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const maxCityRev = Math.max(...Object.values(cities).map(c => c.revenue), 1);
    const cityData = Object.entries(cities)
      .map(([name, data]) => ({
        name,
        province: data.province,
        count: data.clientIds.size,
        revenue: data.revenue,
        pct: totalClients > 0 ? ((data.clientIds.size / totalClients) * 100).toFixed(1) : '0.0',
        revPct: totalRevenue > 0 ? ((data.revenue / totalRevenue) * 100).toFixed(1) : '0.0',
        barWidth: (data.revenue / maxCityRev) * 100,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return { provinceData, cityData, totalRevenue, totalClients };
  }, [clients]);

  const data = viewMode === 'province' ? provinceData : cityData;

  const GRADIENT_COLORS = [
    'var(--primary)', '#7C3AED', '#DB2777', 'var(--warning)', 'var(--success)',
    '#0891B2', '#4F46E5', '#9333EA', '#E11D48', 'var(--on-warning-container)',
  ];

  const formatCurrency = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

  return (
    <div style={{
      padding: 32,
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--on-surface)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={20} color="#60a5fa" /> Embudo Geográfico
            <MetricTooltip text="Muestra de qué ciudades y provincias vienen tus clientes en el periodo seleccionado (hoy, 7 dias, este mes, etc)." />
          </h3>
          <p style={{ fontSize: 12, color: 'var(--on-surface-variant)', margin: '4px 0 0' }}>
            Distribución geográfica por periodo seleccionado — {totalClients} clientes, {formatCurrency(totalRevenue)} revenue
          </p>
        </div>

        {/* Toggle Province/City */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 3, border: '1px solid rgba(255,255,255,0.05)' }}>
          {[
            { id: 'province', label: 'Provincias' },
            { id: 'city', label: 'Ciudades' },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => { setViewMode(opt.id); setExpandedKey(null); }}
              style={{
                padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: viewMode === opt.id ? 600 : 500,
                background: viewMode === opt.id ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                color: viewMode === opt.id ? '#60a5fa' : 'var(--on-surface-variant)',
                transition: 'all 0.2s', fontFamily: 'inherit',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ overflowX: 'auto', width: '100%' }}>
        <div style={{ minWidth: 600 }}>
          {/* Header Row */}
          <div style={{
            display: 'grid', gridTemplateColumns: '180px 1fr 80px 120px 90px',
            padding: '10px 12px', fontSize: 11, fontWeight: 600, color: 'var(--on-surface-variant)',
            textTransform: 'uppercase', letterSpacing: 0.8, borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--surface-container-low)', borderRadius: '8px 8px 0 0',
          }}>
            <span>{viewMode === 'province' ? 'Provincia' : 'Ciudad'}</span>
            <span>Revenue (participación)</span>
            <span style={{ textAlign: 'center' }}>Clientes</span>
            <span style={{ textAlign: 'right' }}>Revenue</span>
            <span style={{ textAlign: 'right' }}>% del Total</span>
          </div>

      {/* Data Rows */}
      {data.slice(0, 15).map((item, idx) => {
        const color = GRADIENT_COLORS[idx % GRADIENT_COLORS.length];
        const isExpanded = expandedKey === item.name;

        return (
          <div key={item.name}>
            <div
              onClick={() => setExpandedKey(isExpanded ? null : item.name)}
              style={{
                display: 'grid', gridTemplateColumns: '180px 1fr 80px 120px 90px',
                padding: '12px', alignItems: 'center', cursor: 'pointer',
                borderBottom: '1px solid var(--surface-container)',
                background: isExpanded ? 'var(--surface-container)' : 'transparent',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = 'var(--surface-container-high)'; }}
              onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = isExpanded ? 'var(--surface-container)' : 'transparent'; }}
            >
              {/* Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--on-surface)' }}>{item.name}</span>
                {viewMode === 'city' && item.province && (
                  <span style={{ fontSize: 10, color: 'var(--outline)' }}>({item.province})</span>
                )}
                <span style={{ fontSize: 10, color: 'var(--outline)' }}>{isExpanded ? '▲' : '▼'}</span>
              </div>

              {/* Bar */}
              <div style={{ padding: '0 12px' }}>
                <div style={{ background: 'var(--surface-container)', borderRadius: 4, height: 18, overflow: 'hidden' }}>
                  <div style={{
                    width: `${item.barWidth}%`, height: '100%',
                    background: `linear-gradient(90deg, ${color}99, ${color})`,
                    borderRadius: 4, transition: 'width 0.6s ease',
                    display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 6,
                  }}>
                    {item.barWidth > 20 && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#FFF' }}>{item.revPct}%</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Count */}
              <span style={{ textAlign: 'center', fontWeight: 700, fontSize: 14, color }}>{item.count}</span>

              {/* Revenue */}
              <span style={{ textAlign: 'right', fontWeight: 600, fontSize: 13, color: 'var(--on-surface)' }}>{formatCurrency(item.revenue)}</span>

              {/* Pct */}
              <span style={{ textAlign: 'right', fontSize: 12, color: 'var(--on-surface-variant)' }}>{item.revPct}%</span>
            </div>

            {/* Expanded Section */}
            {isExpanded && (
              <div style={{
                background: 'var(--surface-container)', borderBottom: '1px solid var(--border-subtle)',
                padding: '12px 20px 16px',
              }}>
                {/* If province view, show city breakdown */}
                {viewMode === 'province' && item.cities && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', marginBottom: 8 }}>
                      Desglose por ciudad
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {item.cities.map((city, ci) => (
                        <div key={ci} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '6px 10px', borderRadius: 6, background: 'var(--surface)',
                          border: '1px solid var(--border-subtle)', fontSize: 12,
                        }}>
                          <span style={{ fontWeight: 500, color: 'var(--on-surface-variant)' }}>📍 {city.city}</span>
                          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                            <span style={{ color: 'var(--on-surface-variant)' }}>{city.count} cliente{city.count !== 1 ? 's' : ''}</span>
                            <span style={{ fontWeight: 600, color: 'var(--on-surface)' }}>{formatCurrency(city.revenue)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Client count */}
                <div style={{ fontSize: 12, color: 'var(--on-surface-variant)', marginTop: 8 }}>
                  <span style={{ fontWeight: 600 }}>{item.count}</span> clientes en esta zona
                </div>
              </div>
            )}
          </div>
        );
      })}

      {data.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--outline)', fontSize: 14 }}>
          No hay datos geográficos disponibles. Asegúrate de que tus órdenes tengan dirección de envío.
        </div>
      )}

          {/* Summary Footer */}
          <div style={{
            display: 'grid', gridTemplateColumns: '180px 1fr 80px 120px 90px',
            padding: '12px', background: 'var(--surface-container-low)', borderRadius: '0 0 8px 8px',
            fontSize: 12, fontWeight: 700, color: 'var(--on-surface)', borderTop: '2px solid var(--border-subtle)',
          }}>
            <span>TOTAL ({data.length} {viewMode === 'province' ? 'provincias' : 'ciudades'})</span>
            <span></span>
            <span style={{ textAlign: 'center' }}>{totalClients}</span>
            <span style={{ textAlign: 'right' }}>{formatCurrency(totalRevenue)}</span>
            <span style={{ textAlign: 'right' }}>100%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
