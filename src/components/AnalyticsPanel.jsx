import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function AnalyticsPanel({ clients }) {
  // --- Data Processing ---
  const { kpi, topSpent, topVolume, starProductData, cityData, recentActivity } = useMemo(() => {
    let totalSales = 0;
    let totalPurchases = 0;
    let totalVolume = 0;
    let ordersWithCoupon = 0;
    
    let productCounts = {};
    let cityStats = {};
    let allPurchases = [];
    
    // Client-level aggregations
    let clientVolume = [];

    (clients || []).forEach(client => {
      let clientTotalVol = 0;
      
      // City stats
      if (client.purchaseCount > 0 && client.city) {
        cityStats[client.city] = (cityStats[client.city] || 0) + client.totalSpent;
      }

      (client.purchases || []).forEach(purchase => {
        totalSales += purchase.amount;
        totalPurchases += 1;
        
        let vol = 1;
        if (purchase.productsArray && purchase.productsArray.length > 0) {
          vol = purchase.productsArray.reduce((acc, p) => acc + (parseInt(p.quantity) || 1), 0);
          
          purchase.productsArray.forEach(p => {
             productCounts[p.name] = (productCounts[p.name] || 0) + (parseInt(p.quantity) || 1);
          });
        } else if (purchase.product) {
          // Historic fallback
          productCounts[purchase.product] = (productCounts[purchase.product] || 0) + 1;
        }
        
        clientTotalVol += vol;
        totalVolume += vol;
        
        if (purchase.coupon) {
          ordersWithCoupon += 1;
        }

        allPurchases.push({
          ...purchase,
          clientName: client.name || 'Sin nombre',
          clientEmail: client.email,
          vol,
          hasDiscount: purchase.hasDiscount
        });
      });
      
      clientVolume.push({
        name: client.name || 'Sin nombre',
        volume: clientTotalVol,
        spent: client.totalSpent
      });
    });

    const frequency = clients?.length ? (totalPurchases / clients.length) : 0;
    const couponImpact = totalPurchases > 0 ? (ordersWithCoupon / totalPurchases) * 100 : 0;

    const kpi = {
      totalSales,
      frequency: frequency.toFixed(1),
      totalVolume,
      couponImpact: couponImpact.toFixed(1)
    };

    const topSpent = [...clientVolume].sort((a, b) => b.spent - a.spent).slice(0, 5);
    const topVolume = [...clientVolume].sort((a, b) => b.volume - a.volume).slice(0, 5);

    // Star Product
    const sortedProducts = Object.entries(productCounts)
      .map(([name, count]) => ({ name, value: count }))
      .sort((a, b) => b.value - a.value);
      
    let starProductData = [];
    if (sortedProducts.length > 0) {
      const top5 = sortedProducts.slice(0, 5);
      const others = sortedProducts.slice(5).reduce((acc, p) => acc + p.value, 0);
      starProductData = [...top5];
      if (others > 0) starProductData.push({ name: 'Otros', value: others });
    }

    // City Data
    const cData = Object.entries(cityStats)
      .map(([city, total]) => ({ city, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Recent activity
    allPurchases.sort((a, b) => new Date(b.date) - new Date(a.date));
    const recentActivity = allPurchases.slice(0, 15); // Show last 15

    return { kpi, topSpent, topVolume, starProductData, cityData: cData, recentActivity };
  }, [clients]);

  // Colors
  const COLORS = ['#2D8B4E', '#1E6FBA', '#D4A843', '#8B5CF6', '#FF6B6B', '#A8B2BC'];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', padding: '12px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <p style={{ margin: 0, fontWeight: 600, color: 'var(--on-surface)', fontSize: 13, marginBottom: 4 }}>{label || payload[0].name}</p>
          <p style={{ margin: 0, color: 'var(--on-surface-variant)', fontSize: 13 }}>
            {payload[0].name === 'total' || payload[0].name === 'spent' || payload[0].name === 'totalSales'
              ? `$${payload[0].value.toLocaleString('es-AR')}` 
              : `${payload[0].value} unidades`}
          </p>
        </div>
      );
    }
    return null;
  };

  // Inline styles for fast light theme implementation
  const s = {
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' },
    card: { background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    kpiValue: { fontSize: '24px', fontWeight: 800, color: 'var(--on-surface)', margin: '8px 0 4px 0' },
    kpiLabel: { fontSize: '12px', fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '1px' },
    kpiIcon: { fontSize: '20px', display: 'inline-block', padding: '8px', borderRadius: '8px', background: 'var(--surface-container)' },
    sectionTitle: { fontSize: '16px', fontWeight: 700, color: 'var(--on-surface)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' },
    chartsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
    th: { textAlign: 'left', padding: '12px 16px', color: 'var(--on-surface-variant)', fontWeight: 600, borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-container-low)', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '1px' },
    td: { padding: '12px 16px', color: 'var(--on-surface)', borderBottom: '1px solid var(--border-subtle)' },
    badge: { padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: 'var(--warning-container)', color: 'var(--on-warning-container)', border: '1px solid #FDE68A' }
  };

  return (
    <div style={{ fontFamily: "'Montserrat', sans-serif" }}>
      
      {/* 1. KPIs */}
      <div style={s.grid}>
        <div style={s.card}>
          <div style={s.kpiIcon}>💰</div>
          <div style={s.kpiValue}>${kpi.totalSales.toLocaleString('es-AR')}</div>
          <div style={s.kpiLabel}>Ventas Totales</div>
        </div>
        <div style={s.card}>
          <div style={s.kpiIcon}>🔄</div>
          <div style={s.kpiValue}>{kpi.frequency}</div>
          <div style={s.kpiLabel}>Frecuencia de Compra</div>
        </div>
        <div style={s.card}>
          <div style={s.kpiIcon}>📦</div>
          <div style={s.kpiValue}>{kpi.totalVolume.toLocaleString('es-AR')}</div>
          <div style={s.kpiLabel}>Volumen de Productos</div>
        </div>
        <div style={s.card}>
          <div style={s.kpiIcon}>🎟️</div>
          <div style={s.kpiValue}>{kpi.couponImpact}%</div>
          <div style={s.kpiLabel}>Órdenes c/ Cupón</div>
        </div>
      </div>

      {/* 2. Análisis de Clientes */}
      <div style={s.chartsGrid}>
        <div style={s.card}>
          <div style={s.sectionTitle}>🏆 Top Clientes (Ingresos)</div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={topSpent} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-container)" horizontal={false} />
              <XAxis type="number" stroke="var(--outline)" tickFormatter={(v) => `$${v/1000}k`} fontSize={12} />
              <YAxis dataKey="name" type="category" stroke="var(--on-surface-variant)" width={100} fontSize={11} tick={{fill: 'var(--on-surface-variant)'}} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="spent" fill="#1E6FBA" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={s.card}>
          <div style={s.sectionTitle}>🛒 Top Clientes (Volumen Items)</div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={topVolume} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-container)" horizontal={false} />
              <XAxis type="number" stroke="var(--outline)" fontSize={12} />
              <YAxis dataKey="name" type="category" stroke="var(--on-surface-variant)" width={100} fontSize={11} tick={{fill: 'var(--on-surface-variant)'}} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="volume" fill="#2D8B4E" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Inteligencia de Producto y Mercado */}
      <div style={s.chartsGrid}>
        <div style={s.card}>
          <div style={s.sectionTitle}>⭐ Producto Estrella (Mix de Ventas)</div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={starProductData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
                labelLine={false}
              >
                {starProductData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
            {starProductData.map((entry, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#4B5563' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[index % COLORS.length] }}></div>
                {entry.name.substring(0, 15)}{entry.name.length > 15 ? '...' : ''} ({entry.value})
              </div>
            ))}
          </div>
        </div>

        <div style={s.card}>
          <div style={s.sectionTitle}>🏙️ Mercados Fuertes (Ventas por Ciudad)</div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={cityData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-container)" vertical={false} />
              <XAxis dataKey="city" stroke="var(--outline)" fontSize={11} tick={{fill: 'var(--on-surface-variant)'}} />
              <YAxis stroke="var(--outline)" fontSize={11} tickFormatter={(v) => `$${v/1000}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total" fill="#D4A843" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Detalle Operativo */}
      <div style={s.card}>
        <div style={s.sectionTitle}>📋 Actividad Reciente</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={{...s.th, borderRadius: '8px 0 0 0'}}>Fecha</th>
                <th style={s.th}>Cliente</th>
                <th style={s.th}>Productos</th>
                <th style={s.th}>Volumen</th>
                <th style={s.th}>Total</th>
                <th style={{...s.th, borderRadius: '0 8px 0 0'}}>Beneficio / Cupón</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.map((act, idx) => (
                <tr key={idx} style={{ background: idx % 2 === 0 ? 'var(--surface)' : 'var(--surface-container-low)' }}>
                  <td style={{...s.td, color: 'var(--on-surface-variant)', fontSize: '12px'}}>{act.date}</td>
                  <td style={{...s.td, fontWeight: 600}}>{act.clientName}</td>
                  <td style={{...s.td, fontSize: '12px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                    {act.product}
                  </td>
                  <td style={{...s.td, textAlign: 'center'}}>{act.vol}</td>
                  <td style={{...s.td, fontWeight: 600}}>${(act.amount || 0).toLocaleString('es-AR')}</td>
                  <td style={s.td}>
                    {act.coupon ? (
                      <span style={s.badge}>🏷️ {act.coupon}</span>
                    ) : act.hasDiscount ? (
                      <span style={{...s.badge, background: 'var(--error-container)', color: 'var(--on-error-container)', border: '1px solid #FBCFE8'}}>🔥 Promoción</span>
                    ) : (
                      <span style={{...s.badge, background: 'var(--surface-container)', color: '#4B5563', border: '1px solid var(--border-subtle)'}}>📦 Normal</span>
                    )}
                  </td>
                </tr>
              ))}
              {recentActivity.length === 0 && (
                <tr>
                  <td colSpan="6" style={{...s.td, textAlign: 'center', padding: '32px', color: 'var(--outline)'}}>
                    No hay actividad registrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
