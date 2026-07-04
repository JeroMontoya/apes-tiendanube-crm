import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, LineChart, Line, ScatterChart, Scatter, ZAxis,
  PieChart, Pie, Cell
} from 'recharts';

// ═══════════════════════════════════════════════════════════════
//  APES CRM — Dashboard Analítico Completo
//  Referencia visual: Estadísticas de TiendaNube (Visión General,
//  Productos, Ventas y Clientes, Visitas, Reporte de Cupones)
//  Con selector de fechas personalizadas y modo comparación.
// ═══════════════════════════════════════════════════════════════

const BRAND_BLUE = 'var(--primary)';
const BRAND_BLUE_LIGHT = 'var(--primary-fixed)';
const BRAND_GREEN = 'var(--success)';
const BRAND_RED = 'var(--error)';
const BRAND_ORANGE = 'var(--warning)';
const BRAND_GRAY = 'var(--on-surface-variant)';
const CARD_BG = 'var(--surface)';
const BORDER = 'var(--border-subtle)';

// ─── Helpers ────────────────────────────────────────────
const parseDate = (d) => {
  if (!d) return new Date(0);
  if (d instanceof Date) return d;
  return new Date(d);
};

const fmtMoney = (v) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(v);

const fmtNum = (v) =>
  v >= 1000 ? `${(v / 1000).toFixed(2)}k` : String(v);

const pct = (a, b) => (b === 0 ? 0 : ((a / b) * 100).toFixed(2));

const calcDelta = (curr, prev) => {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return ((curr - prev) / prev * 100).toFixed(1);
};

const dateToISO = (d) => d.toISOString().substring(0, 10);

// ─── Presets rápidos ────────────────────────────────────
function getPresetRange(preset) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let from, to;
  to = new Date(today);
  switch (preset) {
    case 'hoy':
      from = new Date(today);
      break;
    case 'ayer': {
      const y = new Date(today); y.setDate(y.getDate() - 1);
      from = y; to = y;
      break;
    }
    case '7dias':
      from = new Date(today); from.setDate(from.getDate() - 7);
      break;
    case '30dias':
      from = new Date(today); from.setDate(from.getDate() - 30);
      break;
    case 'este_mes':
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'mes_pasado':
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      to = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    case 'este_ano':
      from = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      from = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return { from: dateToISO(from), to: dateToISO(to) };
}

function getPreviousPeriod(fromStr, toStr) {
  const from = new Date(fromStr);
  const to = new Date(toStr);
  const diff = to - from;
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - diff);
  return { from: dateToISO(prevFrom), to: dateToISO(prevTo) };
}

// ─── Componente DeltaBadge ──────────────────────────────
function DeltaBadge({ value, suffix = '%' }) {
  if (value === null || value === undefined) return null;
  const v = parseFloat(value);
  const isUp = v >= 0;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 2,
      padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 600,
      color: isUp ? 'var(--on-success-container)' : 'var(--on-error-container)',
      background: isUp ? 'var(--success-container)' : 'var(--error-container)',
    }}>
      {isUp ? '▲' : '▼'} {Math.abs(v)}{suffix}
    </span>
  );
}

// ─── Mini Sparkline ─────────────────────────────────────
function Sparkline({ data, color = BRAND_BLUE, height = 50 }) {
  if (!data || data.length < 2) return <div style={{ height }} />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── KPI Card ───────────────────────────────────────────
function KpiCard({ title, value, delta, sparkData, sparkColor, info }) {
  return (
    <div style={{
      background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 8,
      padding: '20px 24px', flex: '1 1 220px', minWidth: 200,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: BRAND_GRAY, fontWeight: 500 }}>{title}</span>
        {delta !== null && delta !== undefined && <DeltaBadge value={delta} />}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--on-surface)', marginBottom: 8 }}>{value}</div>
      {sparkData && <Sparkline data={sparkData} color={sparkColor} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export default function MarketingReport({ rawClients, dateRange }) {
  const clients = rawClients || [];

  // ─── State: Inputs manuales persistidos ───────────────
  const [manualMetrics, setManualMetrics] = useState(() => {
    const saved = localStorage.getItem('apes_marketing_metrics');
    return saved ? JSON.parse(saved) : {
      visitas: 1160,
      vistaCategoria: 852,
      vistaProducto: 658,
      carritosCreados: 66,
      checkoutIniciado: 41,
      etapaEntrega: 36,
      etapaPago: 27,
      gastosOperacion: 3455875,
      gastoPublicidad: 1138830,
      seguidoresNuevos: 450,
    };
  });

  useEffect(() => {
    localStorage.setItem('apes_marketing_metrics', JSON.stringify(manualMetrics));
  }, [manualMetrics]);

  const updateManual = (key, val) => {
    setManualMetrics(prev => ({ ...prev, [key]: Number(val) || 0 }));
  };

  // ─── COMPUTE ──────────────────────────────────────────
  const report = useMemo(() => {
    const dFrom = new Date(dateRange.startDate);
    dFrom.setHours(0, 0, 0, 0);
    const dTo = new Date(dateRange.endDate);
    dTo.setHours(23, 59, 59, 999);

    // Periodo anterior automático
    const prev = getPreviousPeriod(dateRange.startDate, dateRange.endDate);
    const pFrom = new Date(prev.from);
    pFrom.setHours(0, 0, 0, 0);
    const pTo = new Date(prev.to);
    pTo.setHours(23, 59, 59, 999);

    let currRevenue = 0, prevRevenue = 0;
    let currSales = 0, prevSales = 0;
    let currProductsSold = 0;
    const productStats = {};
    const couponStats = {};
    const promoStats = {};
    const discountTransactions = [];
    const dailyRevenue = {};
    const dailyProductsPerSale = {};

    clients.forEach(client => {
      client.purchases.forEach(purchase => {
        const pDate = parseDate(purchase.date);

        // Current period
        if (pDate >= dFrom && pDate <= dTo) {
          currRevenue += purchase.amount;
          currSales += 1;

          const dayKey = purchase.date;
          if (!dailyRevenue[dayKey]) dailyRevenue[dayKey] = 0;
          dailyRevenue[dayKey] += purchase.amount;

          // Products
          if (purchase.productsArray && purchase.productsArray.length > 0) {
            let dayProducts = 0;
            purchase.productsArray.forEach(p => {
              const qty = parseInt(p.quantity, 10) || 1;
              currProductsSold += qty;
              dayProducts += qty;
              const name = p.name || 'Sin nombre';
              if (!productStats[name]) productStats[name] = { name, quantity: 0, revenue: 0, variant: p.variant || '' };
              productStats[name].quantity += qty;
              productStats[name].revenue += (parseFloat(p.price) || 0) * qty;
            });
            if (!dailyProductsPerSale[dayKey]) dailyProductsPerSale[dayKey] = { total: 0, sales: 0 };
            dailyProductsPerSale[dayKey].total += dayProducts;
            dailyProductsPerSale[dayKey].sales += 1;
          } else if (purchase.product) {
            currProductsSold += 1;
            const pName = purchase.product;
            if (!productStats[pName]) productStats[pName] = { name: pName, quantity: 0, revenue: 0, variant: '' };
            productStats[pName].quantity += 1;
            productStats[pName].revenue += purchase.amount;
          }

          // Coupons & Discounts — enriched extraction
          if (purchase.coupon) {
            const code = String(purchase.coupon).toUpperCase();
            if (!couponStats[code]) couponStats[code] = {
              code,
              type: purchase.couponType,
              value: purchase.couponValue,
              uses: 0,
              revenue: 0,
              totalSaved: 0,
            };
            couponStats[code].uses += 1;
            couponStats[code].revenue += purchase.amount;
            couponStats[code].totalSaved += purchase.couponSaved || 0;
          }

          if (purchase.promoDiscountAmount > 0) {
            let promoType = purchase.smartPromoName || 'Descuento Automático';
            if (!promoStats[promoType]) promoStats[promoType] = { name: promoType, uses: 0, revenue: 0, totalSaved: 0 };
            promoStats[promoType].uses += 1;
            promoStats[promoType].revenue += purchase.amount;
            promoStats[promoType].totalSaved += purchase.promoDiscountAmount;
          }
          
          if (purchase.hasDiscount || purchase.coupon) {
            discountTransactions.push({
              clientName: client.name || 'Sin nombre',
              clientEmail: client.email,
              date: purchase.date,
              amount: purchase.amount,
              product: purchase.product,
              // Benefit classification
              benefitType: purchase.benefitType,
              smartPromoName: purchase.smartPromoName,
              coupon: purchase.coupon,
              couponType: purchase.couponType,
              couponValue: purchase.couponValue,
              couponSaved: purchase.couponSaved || 0,
              // Full breakdown
              discountTotal: purchase.discountTotal || 0,
              discountCoupon: purchase.discountCoupon || 0,
              discountGateway: purchase.discountGateway || 0,
              promoDiscountAmount: purchase.promoDiscountAmount || 0,
            });
          }
        }

        // Previous period
        if (pFrom && pTo && pDate >= pFrom && pDate <= pTo) {
          prevRevenue += purchase.amount;
          prevSales += 1;
        }
      });
    });

    // Timeline
    const timeline = Object.keys(dailyRevenue).sort().map(d => ({ date: d, value: dailyRevenue[d] }));

    // Products per sale per day
    const productsPerSaleTimeline = Object.keys(dailyProductsPerSale).sort().map(d => ({
      date: d.substring(8),
      value: parseFloat((dailyProductsPerSale[d].total / dailyProductsPerSale[d].sales).toFixed(2))
    }));

    // Product ranking
    const allProducts = Object.values(productStats).sort((a, b) => b.quantity - a.quantity);
    const topProducts = allProducts.slice(0, 10);
    const bottomProducts = [...allProducts].sort((a, b) => a.quantity - b.quantity).slice(0, 5);

    // Coupons
    const topCoupons = Object.values(couponStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
      
    const topPromos = Object.values(promoStats)
      .sort((a, b) => b.revenue - a.revenue);

    // Derived KPIs
    const ticketPromedio = currSales > 0 ? currRevenue / currSales : 0;
    const prevTicket = prevSales > 0 ? prevRevenue / prevSales : 0;

    // Conversions (using manual visit data)
    const visitasAVentas = manualMetrics.visitas > 0 ? pct(currSales, manualMetrics.visitas) : 0;
    const visitasACarritos = manualMetrics.visitas > 0 ? pct(manualMetrics.carritosCreados, manualMetrics.visitas) : 0;
    const checkoutsAVentas = manualMetrics.checkoutIniciado > 0 ? pct(currSales, manualMetrics.checkoutIniciado) : 0;

    // Ganancia
    const gananciaLibre = currRevenue - manualMetrics.gastosOperacion - manualMetrics.gastoPublicidad;
    const roas = manualMetrics.gastoPublicidad > 0 ? (currRevenue / manualMetrics.gastoPublicidad).toFixed(2) : 0;

    // Scatter data (stock vs ventas) — simplified mock from product data
    const scatterData = allProducts.slice(0, 15).map(p => ({
      name: p.name, x: Math.round(Math.random() * 7), y: p.quantity
    }));

    // Sparkline data (ventas por dia)
    const salesSparkline = Object.keys(dailyRevenue).sort().map(d => ({ date: d, value: dailyRevenue[d] }));
    const salesCountSparkline = [];
    const countByDay = {};
    clients.forEach(c => c.purchases.forEach(p => {
      const pd = parseDate(p.date);
      if (pd >= dFrom && pd <= dTo) {
        const k = p.date;
        countByDay[k] = (countByDay[k] || 0) + 1;
      }
    }));
    Object.keys(countByDay).sort().forEach(k => salesCountSparkline.push({ date: k, value: countByDay[k] }));

    // Products sold sparkline
    const prodByDay = {};
    clients.forEach(c => c.purchases.forEach(p => {
      const pd = parseDate(p.date);
      if (pd >= dFrom && pd <= dTo) {
        const k = p.date;
        let qty = 1;
        if (p.productsArray) p.productsArray.forEach(pp => { qty += (parseInt(pp.quantity, 10) || 1); });
        prodByDay[k] = (prodByDay[k] || 0) + qty;
      }
    }));
    const prodSparkline = Object.keys(prodByDay).sort().map(k => ({ date: k, value: prodByDay[k] }));

    return {
      currRevenue, prevRevenue,
      currSales, prevSales,
      currProductsSold,
      ticketPromedio, prevTicket,
      timeline, salesSparkline, salesCountSparkline, prodSparkline,
      productsPerSaleTimeline,
      topProducts, bottomProducts, allProducts,
      topCoupons,
      topPromos,
      discountTransactions,
      avgProductsPerSale: currSales > 0 ? (currProductsSold / currSales) : 0,
      visitasAVentas, visitasACarritos, checkoutsAVentas,
      gananciaLibre, roas,
      scatterData,
      deltaRevenue: calcDelta(currRevenue, prevRevenue),
      deltaSales: calcDelta(currSales, prevSales),
      deltaTicket: calcDelta(ticketPromedio, prevTicket),
    };
  }, [clients, dateRange, manualMetrics]);

  // ─── Styles ───────────────────────────────────────────
  const cardStyle = {
    background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 8,
    padding: 24,
  };
  const sectionTitle = { fontSize: 18, fontWeight: 700, color: 'var(--on-surface)', marginBottom: 20 };
  const gridTwo = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 };
  const labelStyle = { fontSize: 12, color: BRAND_GRAY, fontWeight: 500, display: 'block', marginBottom: 4 };
  const inputStyle = {
    padding: '8px 12px', border: `1px solid ${BORDER}`, borderRadius: 6,
    fontSize: 14, width: '100%', outline: 'none', color: 'var(--on-surface)'
  };

  // ═══════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── ROW 1: KPIs PRINCIPALES ──────────────────── */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <KpiCard
          title="Visitas"
          value={fmtNum(manualMetrics.visitas)}
          delta={null}
          sparkData={report.salesCountSparkline}
          sparkColor={BRAND_BLUE}
        />
        <KpiCard
          title="Ventas"
          value={report.currSales}
          delta={report.deltaSales}
          sparkData={report.salesCountSparkline}
          sparkColor={BRAND_BLUE}
        />
        <KpiCard
          title="Facturación"
          value={fmtMoney(report.currRevenue)}
          delta={report.deltaRevenue}
          sparkData={report.salesSparkline}
          sparkColor={BRAND_BLUE}
        />
        <KpiCard
          title="Ticket promedio"
          value={fmtMoney(report.ticketPromedio)}
          delta={report.deltaTicket}
          sparkData={report.salesSparkline}
          sparkColor={BRAND_BLUE}
        />
      </div>

      {/* ── ROW 2: COMPORTAMIENTO VISITANTES + CONVERSIONES ── */}
      <div style={gridTwo}>
        {/* Comportamiento de los visitantes */}
        <div style={cardStyle}>
          <h3 style={sectionTitle}>Comportamiento de los visitantes</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart layout="vertical" data={[
              { name: 'Total de visitas', value: manualMetrics.visitas },
              { name: 'Vista de categoría', value: manualMetrics.vistaCategoria },
              { name: 'Vista de producto', value: manualMetrics.vistaProducto },
              { name: 'Carritos creados', value: manualMetrics.carritosCreados },
            ]} margin={{ left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--surface-container)" />
              <XAxis type="number" stroke="var(--outline)" fontSize={11} />
              <YAxis dataKey="name" type="category" width={130} stroke="var(--outline)" fontSize={12} />
              <Tooltip formatter={(v) => v.toLocaleString()} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
              <Bar dataKey="value" fill={BRAND_BLUE} radius={[0, 4, 4, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
          <p style={{ fontSize: 11, color: BRAND_GRAY, marginTop: 8 }}>✏️ Edita estos valores en la sección de ajustes abajo.</p>
        </div>

        {/* Tasas de conversión */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={cardStyle}>
            <div style={{ fontSize: 13, color: BRAND_GRAY, marginBottom: 4 }}>Visitas a ventas</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{report.visitasAVentas}%</div>
            <Sparkline data={report.salesCountSparkline} color={BRAND_BLUE} height={40} />
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: 13, color: BRAND_GRAY, marginBottom: 4 }}>Visitas a carritos creados</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{report.visitasACarritos}%</div>
            <Sparkline data={report.salesCountSparkline} color={BRAND_BLUE} height={40} />
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: 13, color: BRAND_GRAY, marginBottom: 4 }}>Checkouts iniciados a ventas</div>
            <div style={{ fontSize: 32, fontWeight: 700 }}>{report.checkoutsAVentas}%</div>
            <Sparkline data={report.salesCountSparkline} color={BRAND_BLUE} height={40} />
          </div>
        </div>
      </div>

      {/* ── ROW 3: CHECKOUT FUNNEL ───────────────────── */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Comportamiento en el checkout</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart layout="vertical" data={[
            { name: 'Checkout iniciado', value: manualMetrics.checkoutIniciado },
            { name: 'Etapa de entrega', value: manualMetrics.etapaEntrega },
            { name: 'Etapa de pago', value: manualMetrics.etapaPago },
            { name: 'Pedidos creados', value: report.currSales },
            { name: 'Pedidos pagos', value: report.currSales },
          ]} margin={{ left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--surface-container)" />
            <XAxis type="number" stroke="var(--outline)" fontSize={11} />
            <YAxis dataKey="name" type="category" width={140} stroke="var(--outline)" fontSize={12} />
            <Tooltip formatter={(v) => v.toLocaleString()} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
            <Bar dataKey="value" fill={BRAND_BLUE} radius={[0, 4, 4, 0]} barSize={28}>
              {[0,1,2,3,4].map((_, i) => (
                <Cell key={i} fill={BRAND_BLUE} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── ROW 4: PRODUCTOS ─────────────────────────── */}
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: '8px 0 0' }}>Productos</h2>
      <div style={gridTwo}>
        {/* Productos vendidos */}
        <div style={cardStyle}>
          <h3 style={sectionTitle}>Productos vendidos</h3>
          <div style={{ fontSize: 36, fontWeight: 700, marginBottom: 12 }}>{report.currProductsSold}</div>
          <Sparkline data={report.prodSparkline} color={BRAND_BLUE} height={60} />
        </div>

        {/* Productos por ventas (daily avg) */}
        <div style={cardStyle}>
          <h3 style={sectionTitle}>Productos por ventas</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={report.productsPerSaleTimeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-container)" />
              <XAxis dataKey="date" stroke="var(--outline)" fontSize={11} />
              <YAxis stroke="var(--outline)" fontSize={11} />
              <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
              <Bar dataKey="value" fill={BRAND_BLUE} radius={[4, 4, 0, 0]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top 50 productos más vendidos */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Top productos más vendidos</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 12, color: BRAND_GRAY, fontWeight: 600 }}>Producto</th>
                <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: 12, color: BRAND_GRAY, fontWeight: 600, width: 200 }}>Unidades vendidas</th>
              </tr>
            </thead>
            <tbody>
              {report.topProducts.map((p, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ padding: '12px 16px' }}>{p.name}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
                      <div style={{ flex: '0 0 120px', height: 18, background: 'var(--surface-container)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 4,
                          background: BRAND_BLUE,
                          width: `${report.topProducts[0] ? (p.quantity / report.topProducts[0].quantity * 100) : 0}%`,
                        }} />
                      </div>
                      <span style={{ fontWeight: 600, minWidth: 30, textAlign: 'right' }}>{p.quantity}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {report.topProducts.length === 0 && <p style={{ textAlign: 'center', color: BRAND_GRAY, padding: 24 }}>No hay datos en este periodo.</p>}
        </div>
      </div>

      {/* Detalle por variante de producto */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Detalle por variante de producto</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 12, color: BRAND_GRAY, fontWeight: 600 }}>Producto</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 12, color: BRAND_GRAY, fontWeight: 600 }}>Variante</th>
                <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: 12, color: BRAND_GRAY, fontWeight: 600 }}>Unidades vendidas</th>
                <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: 12, color: BRAND_GRAY, fontWeight: 600 }}>Facturación</th>
              </tr>
            </thead>
            <tbody>
              {report.allProducts.slice(0, 10).map((p, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ padding: '12px 16px' }}>{p.name}</td>
                  <td style={{ padding: '12px 16px', color: BRAND_GRAY }}>{p.variant || '—'}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>{p.quantity}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>{fmtMoney(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dispersión de ventas e inventario + Stock reservado */}
      <div style={gridTwo}>
        <div style={cardStyle}>
          <h3 style={sectionTitle}>Con stock reservado</h3>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, color: BRAND_GRAY }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>ℹ️</div>
            <p>Conecta la API para ver datos de stock en tiempo real.</p>
          </div>
        </div>
        <div style={cardStyle}>
          <h3 style={sectionTitle}>Dispersión de ventas e inventario</h3>
          <ResponsiveContainer width="100%" height={250}>
            <ScatterChart margin={{ bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-container)" />
              <XAxis dataKey="x" name="Stock" stroke="var(--outline)" fontSize={11} label={{ value: 'Stock', position: 'bottom', fontSize: 12, fill: BRAND_GRAY }} />
              <YAxis dataKey="y" name="Ventas" stroke="var(--outline)" fontSize={11} label={{ value: 'Nº de ventas', angle: -90, position: 'insideLeft', fontSize: 12, fill: BRAND_GRAY }} />
              <ZAxis range={[40, 400]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
              <Scatter data={report.scatterData} fill={BRAND_BLUE}>
                {report.scatterData.map((_, i) => (
                  <Cell key={i} fill={i % 3 === 0 ? BRAND_RED : BRAND_BLUE} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── ROW 5: FINANZAS + CUPONES ────────────────── */}
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: '8px 0 0' }}>Finanzas y Promociones</h2>
      <div style={gridTwo}>
        <div style={cardStyle}>
          <h3 style={sectionTitle}>💰 Resumen Financiero</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: 'Facturación Bruta', value: fmtMoney(report.currRevenue), color: BRAND_GREEN },
              { label: 'Gastos Operación', value: fmtMoney(manualMetrics.gastosOperacion), color: BRAND_RED, editable: 'gastosOperacion' },
              { label: 'Gasto Publicidad', value: fmtMoney(manualMetrics.gastoPublicidad), color: BRAND_ORANGE, editable: 'gastoPublicidad' },
              { label: 'Ganancia Libre', value: fmtMoney(report.gananciaLibre), color: report.gananciaLibre >= 0 ? BRAND_GREEN : BRAND_RED },
              { label: 'ROAS', value: `${report.roas}x`, color: BRAND_BLUE },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--surface-container-low)', borderRadius: 8 }}>
                <span style={{ fontSize: 14, color: 'var(--on-surface-variant)' }}>{item.label}</span>
                {item.editable ? (
                  <input
                    type="number"
                    value={manualMetrics[item.editable]}
                    onChange={(e) => updateManual(item.editable, e.target.value)}
                    style={{ ...inputStyle, width: 140, textAlign: 'right', fontWeight: 700, color: item.color }}
                  />
                ) : (
                  <span style={{ fontSize: 18, fontWeight: 700, color: item.color }}>{item.value}</span>
                )}
              </div>
            ))}
          </div>
        </div>
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h3 style={{ ...sectionTitle, marginBottom: 0 }}>🎟️ Rendimiento de Cupones</h3>
          </div>
          <p style={{ fontSize: 12, color: BRAND_GRAY, marginBottom: 20 }}>
            Mide el impacto de los descuentos manuales (códigos).
          </p>
          {report.topCoupons.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '0 12px', fontSize: 11, color: BRAND_GRAY, textTransform: 'uppercase' }}>Código</th>
                    <th style={{ textAlign: 'center', padding: '0 12px', fontSize: 11, color: BRAND_GRAY, textTransform: 'uppercase' }}>Tipo</th>
                    <th style={{ textAlign: 'right', padding: '0 12px', fontSize: 11, color: BRAND_GRAY, textTransform: 'uppercase' }}>Valor</th>
                    <th style={{ textAlign: 'right', padding: '0 12px', fontSize: 11, color: BRAND_GRAY, textTransform: 'uppercase' }}>Usos</th>
                    <th style={{ textAlign: 'right', padding: '0 12px', fontSize: 11, color: BRAND_GRAY, textTransform: 'uppercase' }}>Ahorro</th>
                    <th style={{ textAlign: 'right', padding: '0 12px', fontSize: 11, color: BRAND_GRAY, textTransform: 'uppercase' }}>Ventas</th>
                  </tr>
                </thead>
                <tbody>
                  {report.topCoupons.map((c, i) => (
                    <tr key={i} style={{ background: 'var(--surface-container-low)', borderRadius: 8 }}>
                      <td style={{ padding: '12px', fontWeight: 700 }}>
                        <span style={{ background: 'var(--primary-container)', border: '1px dashed #93C5FD', color: BRAND_BLUE, padding: '4px 8px', borderRadius: 6, fontSize: 12 }}>{c.code}</span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                          background: c.type === 'percentage' ? 'var(--warning-container)' : 'var(--primary-fixed)',
                          color: c.type === 'percentage' ? 'var(--on-warning-container)' : 'var(--on-primary-container)',
                        }}>
                          {c.type === 'percentage' ? '% Pct' : '$ Fijo'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: 'var(--on-surface-variant)' }}>
                        {c.type === 'percentage' ? `${c.value}%` : fmtMoney(parseFloat(c.value) || 0)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>
                        <span style={{ background: 'var(--surface-container)', padding: '2px 8px', borderRadius: 12 }}>{c.uses}</span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: BRAND_RED }}>
                        -{fmtMoney(c.totalSaved)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 800, color: BRAND_GREEN }}>
                        {fmtMoney(c.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', background: 'var(--surface-container-low)', padding: '32px 16px', borderRadius: 8 }}>
              <span style={{ fontSize: 24 }}>🏷️</span>
              <p style={{ color: BRAND_GRAY, fontWeight: 500, marginTop: 8 }}>No se registraron cupones en este periodo.</p>
            </div>
          )}
        </div>
      </div>

      <div style={{ ...cardStyle, marginTop: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ ...sectionTitle, marginBottom: 0 }}>🔥 Promociones Automáticas</h3>
        </div>
        <p style={{ fontSize: 12, color: BRAND_GRAY, marginBottom: 20 }}>
          Mide el impacto de los descuentos aplicados automáticamente a los productos (ej. Colecciones, 2x1).
        </p>
        {report.topPromos.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0 12px', fontSize: 11, color: BRAND_GRAY, textTransform: 'uppercase' }}>Campaña Automática</th>
                  <th style={{ textAlign: 'right', padding: '0 12px', fontSize: 11, color: BRAND_GRAY, textTransform: 'uppercase' }}>Órdenes</th>
                  <th style={{ textAlign: 'right', padding: '0 12px', fontSize: 11, color: BRAND_GRAY, textTransform: 'uppercase' }}>Inversión (Ahorro)</th>
                  <th style={{ textAlign: 'right', padding: '0 12px', fontSize: 11, color: BRAND_GRAY, textTransform: 'uppercase' }}>Retorno (Ventas)</th>
                </tr>
              </thead>
              <tbody>
                {report.topPromos.map((p, i) => (
                  <tr key={i} style={{ background: 'var(--error-container)', borderRadius: 8 }}>
                    <td style={{ padding: '12px', fontWeight: 700 }}>
                      <span style={{ background: 'var(--error-container)', color: 'var(--on-error-container)', padding: '4px 10px', borderRadius: 6, fontSize: 12 }}>{p.name}</span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>
                      <span style={{ background: 'var(--error-container)', padding: '2px 8px', borderRadius: 12, color: 'var(--on-error-container)' }}>{p.uses}</span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: BRAND_RED }}>
                      -{fmtMoney(p.totalSaved)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 800, color: BRAND_GREEN }}>
                      {fmtMoney(p.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', background: 'var(--surface-container-low)', padding: '32px 16px', borderRadius: 8 }}>
            <span style={{ fontSize: 24 }}>✨</span>
            <p style={{ color: BRAND_GRAY, fontWeight: 500, marginTop: 8 }}>No hubo promociones automáticas en este periodo.</p>
          </div>
        )}
      </div>

      {/* DETALLE COMPLETO DE MARKETING */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>🔍 Análisis Detallado de Conversiones con Descuento</h3>
        <p style={{ fontSize: 12, color: BRAND_GRAY, marginBottom: 16 }}>
          Desglose completo de cada venta que tuvo algún tipo de beneficio: cupón manual, promoción automática, o descuento por pasarela de pago.
        </p>
        {report.discountTransactions.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${BORDER}`, background: 'var(--surface-container-low)' }}>
                  <th style={{ textAlign: 'left', padding: '12px', color: BRAND_GRAY, fontWeight: 600 }}>Fecha</th>
                  <th style={{ textAlign: 'left', padding: '12px', color: BRAND_GRAY, fontWeight: 600 }}>Cliente</th>
                  <th style={{ textAlign: 'left', padding: '12px', color: BRAND_GRAY, fontWeight: 600 }}>Tipo Beneficio</th>
                  <th style={{ textAlign: 'left', padding: '12px', color: BRAND_GRAY, fontWeight: 600 }}>Detalle</th>
                  <th style={{ textAlign: 'left', padding: '12px', color: BRAND_GRAY, fontWeight: 600 }}>Productos</th>
                  <th style={{ textAlign: 'right', padding: '12px', color: BRAND_GRAY, fontWeight: 600 }}>Dto. Cupón</th>
                  <th style={{ textAlign: 'right', padding: '12px', color: BRAND_GRAY, fontWeight: 600 }}>Dto. Promo</th>
                  <th style={{ textAlign: 'right', padding: '12px', color: BRAND_GRAY, fontWeight: 600 }}>Dto. Pasarela</th>
                  <th style={{ textAlign: 'right', padding: '12px', color: BRAND_GRAY, fontWeight: 600 }}>Total Pagado</th>
                </tr>
              </thead>
              <tbody>
                {report.discountTransactions.sort((a,b) => new Date(b.date) - new Date(a.date)).map((tx, i) => {
                  const badgeMap = {
                    coupon:     { bg: 'var(--primary-container)', color: 'var(--on-primary-container)', icon: '🏷️', label: 'Cupón' },
                    promo_auto: { bg: 'var(--error-container)', color: 'var(--on-error-container)', icon: '🔥', label: 'Promo Auto' },
                    gateway:    { bg: 'var(--warning-container)', color: 'var(--on-warning-container)', icon: '🏦', label: 'Pasarela' },
                    manual:     { bg: '#ede9fe', color: '#6d28d9', icon: '✏️', label: 'Manual' },
                    normal:     { bg: 'var(--surface-container)', color: '#4B5563', icon: '📦', label: 'Normal' },
                  };
                  const badge = badgeMap[tx.benefitType] || badgeMap.normal;
                  return (
                    <tr key={i} style={{ borderBottom: `1px solid ${BORDER}`, background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface-container-low)' }}>
                      <td style={{ padding: '10px 12px', color: BRAND_GRAY, whiteSpace: 'nowrap', fontSize: 12 }}>{tx.date}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{tx.clientName}</div>
                        <div style={{ fontSize: 11, color: BRAND_GRAY }}>{tx.clientEmail}</div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ background: badge.bg, color: badge.color, padding: '4px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {badge.icon} {badge.label}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 12 }}>
                        {tx.coupon ? (
                          <div>
                            <span style={{ fontWeight: 700 }}>{tx.coupon}</span>
                            <span style={{ color: BRAND_GRAY, marginLeft: 4 }}>
                              ({tx.couponType === 'percentage' ? `${tx.couponValue}% off` : `${fmtMoney(parseFloat(tx.couponValue) || 0)} off`})
                            </span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {tx.promoDiscountAmount > 0 && (
                              <span style={{ color: 'var(--on-error-container)', fontWeight: 600 }}>{tx.smartPromoName || 'Descuento automático'}</span>
                            )}
                            {tx.discountGateway > 0 && (
                              <span style={{ color: 'var(--on-warning-container)', fontWeight: 600 }}>Pago A Convenir</span>
                            )}
                            {tx.promoDiscountAmount === 0 && tx.discountGateway === 0 && (
                              <span style={{ color: BRAND_GRAY }}>Descuento manual</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 12 }} title={tx.product}>
                        {tx.product}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: tx.discountCoupon > 0 ? BRAND_RED : BRAND_GRAY, fontWeight: 600 }}>
                        {tx.discountCoupon > 0 ? `-${fmtMoney(tx.discountCoupon)}` : '—'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: tx.promoDiscountAmount > 0 ? 'var(--on-error-container)' : BRAND_GRAY, fontWeight: 600 }}>
                        {tx.promoDiscountAmount > 0 ? `-${fmtMoney(tx.promoDiscountAmount)}` : '—'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: tx.discountGateway > 0 ? 'var(--on-warning-container)' : BRAND_GRAY, fontWeight: 600 }}>
                        {tx.discountGateway > 0 ? `-${fmtMoney(tx.discountGateway)}` : '—'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: BRAND_GREEN, fontWeight: 700 }}>
                        {fmtMoney(tx.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: BRAND_GRAY, padding: 32 }}>No hubo ventas con descuento o cupones en este periodo.</p>
        )}
      </div>

      {/* ── ROW 6: AJUSTES MANUALES ──────────────────── */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>⚙️ Métricas de Tráfico (Editable)</h3>
        <p style={{ fontSize: 13, color: BRAND_GRAY, marginBottom: 16 }}>
          Estos datos no vienen de la API de TiendaNube. Ingresalos manualmente desde tu panel de Estadísticas → Visitas.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {[
            { key: 'visitas', label: 'Total de visitas' },
            { key: 'vistaCategoria', label: 'Vista de categoría' },
            { key: 'vistaProducto', label: 'Vista de producto' },
            { key: 'carritosCreados', label: 'Carritos creados' },
            { key: 'checkoutIniciado', label: 'Checkout iniciado' },
            { key: 'etapaEntrega', label: 'Etapa de entrega' },
            { key: 'etapaPago', label: 'Etapa de pago' },
            { key: 'seguidoresNuevos', label: 'Seguidores nuevos (IG)' },
          ].map(m => (
            <div key={m.key}>
              <label style={labelStyle}>{m.label}</label>
              <input
                type="number"
                value={manualMetrics[m.key]}
                onChange={(e) => updateManual(m.key, e.target.value)}
                style={inputStyle}
              />
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
