import React, { useMemo } from 'react';

const fmtMoney = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0);
const fmtDate = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' }); } catch { return d; }
};

const BENEFIT_COLORS = {
  coupon: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', label: 'Cupon' },
  promo_auto: { bg: 'rgba(168,85,247,0.12)', color: '#a855f7', label: 'Promo Auto' },
  promo_code: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', label: 'Promo Codigo' },
  normal: { bg: 'var(--surface-container)', color: 'var(--on-surface-variant)', label: 'Sin descuento' },
};

export default function ClientDetailModal({ client, allClients = [], onClose }) {
  if (!client) return null;

  const originalClient = allClients.find(c => c.id === client.id) || client;
  const displayClient = {
    ...client,
    purchases: originalClient.purchases || client.purchases,
    totalSpent: originalClient.totalSpent || client.totalSpent,
    purchaseCount: originalClient.purchaseCount || client.purchaseCount,
  };

  const analytics = useMemo(() => {
    const ps = displayClient.purchases || [];
    let totalCouponSaved = 0;
    let totalPromoSaved = 0;
    let totalDiscount = 0;
    let couponCount = 0;
    let promoCount = 0;
    const couponMap = {};

    ps.forEach(p => {
      const couponS = parseFloat(p.couponSaved) || 0;
      const promoS = parseFloat(p.promoDiscountAmount) || 0;
      const disc = parseFloat(p.discountTotal) || 0;
      totalCouponSaved += couponS;
      totalPromoSaved += promoS;
      totalDiscount += disc;
      if (p.coupon) {
        couponCount++;
        if (!couponMap[p.coupon]) couponMap[p.coupon] = { code: p.coupon, count: 0, totalSaved: 0, type: p.couponType, value: p.couponValue };
        couponMap[p.coupon].count++;
        couponMap[p.coupon].totalSaved += couponS;
      }
      if (p.benefitType === 'promo_auto' || p.benefitType === 'promo_code') promoCount++;
    });

    const paidWithDiscount = ps.filter(p => parseFloat(p.discountTotal) > 0).length;
    const avgDiscountPct = ps.length > 0 && totalDiscount > 0
      ? (totalDiscount / ps.reduce((s, p) => s + (parseFloat(p.amount) || 0) + (parseFloat(p.discountTotal) || 0), 0)) * 100
      : 0;

    return {
      totalCouponSaved, totalPromoSaved, totalDiscount, couponCount, promoCount,
      couponsUsed: Object.values(couponMap).sort((a, b) => b.totalSaved - a.totalSaved),
      paidWithDiscount, avgDiscountPct,
      totalOriginal: displayClient.totalSpent + totalDiscount,
    };
  }, [displayClient.purchases]);

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 20, animation: 'fadeIn 0.2s ease'
    }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{
        background: 'var(--surface)', color: 'var(--on-surface)', border: '1px solid var(--border-subtle)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)', borderRadius: 16, width: '100%', maxWidth: 900, maxHeight: '90vh',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        animation: 'slideUp 0.3s ease', minWidth: 0, wordBreak: 'break-word'
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 12, right: 12, zIndex: 1,
          background: 'var(--surface-container-high)', border: 'none', color: 'var(--on-surface-variant)',
          cursor: 'pointer', padding: 8, borderRadius: 8, display: 'flex', transition: 'all 0.2s',
          width: 36, height: 36, alignItems: 'center', justifyContent: 'center', fontSize: 20
        }} onMouseEnter={e => e.currentTarget.style.background = 'var(--error-container)'}
        onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-container-high)'}>
          x
        </button>

        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--on-surface)' }}>{displayClient.name}</h2>
            <span style={{
              padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              background: displayClient.segment === 'vip' ? 'rgba(251,191,36,0.15)' : displayClient.segment === 'regular' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
              color: displayClient.segment === 'vip' ? '#fbbf24' : displayClient.segment === 'regular' ? '#10b981' : '#ef4444',
            }}>
              {displayClient.segment === 'vip' ? 'VIP' : displayClient.segment === 'regular' ? 'Regular' : 'Abandonado'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--on-surface-variant)' }}>
            <span>{displayClient.email || 'Sin email'}</span>
            <span>{displayClient.phone || 'Sin telefono'}</span>
            <span>{displayClient.city || ''}{displayClient.province ? `, ${displayClient.province}` : ''}</span>
          </div>
        </div>

        <div style={{ padding: '0 24px 24px', overflow: 'auto', flex: 1, minWidth: 0 }}>

          {/* Analytics Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, margin: '16px 0', minWidth: 0 }}>
            <StatCard label="Total Pagado" value={fmtMoney(displayClient.totalSpent)} color="#10b981" />
            <StatCard label="Ahorro Total" value={fmtMoney(analytics.totalDiscount)} color="#f59e0b" />
            <StatCard label="Compras con Cupon" value={analytics.couponCount} sub={`de ${displayClient.purchases?.length || 0}`} color="#3b82f6" />
            <StatCard label="Ahorro en Cupones" value={fmtMoney(analytics.totalCouponSaved)} color="#3b82f6" />
            <StatCard label="Compras con Promo" value={analytics.promoCount} sub={`de ${displayClient.purchases?.length || 0}`} color="#a855f7" />
            <StatCard label="Ahorro en Promos" value={fmtMoney(analytics.totalPromoSaved)} color="#a855f7" />
          </div>

          {/* Coupons Used */}
          {analytics.couponsUsed.length > 0 && (
            <div style={{ background: 'var(--surface-container)', borderRadius: 12, padding: 14, marginBottom: 16, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
                Cupones Utilizados
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {analytics.couponsUsed.map((c, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 8,
                    background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
                  }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#3b82f6' }}>{c.code}</span>
                    <span style={{ fontSize: 11, color: 'var(--on-surface-variant)' }}>
                      {c.type === 'percentage' ? `${c.value}% off` : `${fmtMoney(c.value)} off`}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--on-surface-variant)' }}>x{c.count}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#10b981' }}>-{fmtMoney(c.totalSaved)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Purchase History */}
          <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--on-surface)' }}>
              Historial de Compras ({displayClient.purchases?.length || 0})
            </h3>
          </div>

          {displayClient.purchases && displayClient.purchases.length > 0 ? (
            <div style={{ overflowX: 'auto', minWidth: 0 }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 800 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Fecha</th>
                    <th style={{...thStyle, minWidth: 180}}>Producto</th>
                    <th style={thStyle}>Beneficio</th>
                    <th style={thStyle}>Cupon</th>
                    <th style={{...thStyle, textAlign: 'right'}}>Descuento</th>
                    <th style={{...thStyle, textAlign: 'right'}}>Ahorro Cupon</th>
                    <th style={{...thStyle, textAlign: 'right'}}>Ahorro Promo</th>
                    <th style={{...thStyle, textAlign: 'right'}}>Monto Pagado</th>
                  </tr>
                </thead>
                <tbody>
                  {displayClient.purchases.map((p, idx) => {
                    const benefit = BENEFIT_COLORS[p.benefitType] || BENEFIT_COLORS.normal;
                    const couponS = parseFloat(p.couponSaved) || 0;
                    const promoS = parseFloat(p.promoDiscountAmount) || 0;
                    const disc = parseFloat(p.discountTotal) || 0;
                    const original = (parseFloat(p.amount) || 0) + disc;
                    return (
                      <tr key={idx} style={{ transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-container)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={tdStyle}>{fmtDate(p.date)}</td>
                        <td style={{...tdStyle, wordBreak: 'break-word', maxWidth: 250, fontSize: 12}}>
                          {p.product || '—'}
                          {p.productsArray && p.productsArray.length > 1 && (
                            <div style={{ fontSize: 10, color: 'var(--outline)', marginTop: 2 }}>
                              +{p.productsArray.length - 1} productos mas
                            </div>
                          )}
                        </td>
                        <td style={tdStyle}>
                          <span style={{
                            display: 'inline-block', padding: '3px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700,
                            background: benefit.bg, color: benefit.color, textTransform: 'uppercase', whiteSpace: 'nowrap',
                          }}>
                            {benefit.label}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          {p.coupon ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                              <span style={{
                                background: 'rgba(59,130,246,0.12)', color: '#3b82f6', padding: '3px 8px',
                                borderRadius: 10, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                              }}>
                                {p.coupon}
                              </span>
                              {p.couponType && (
                                <span style={{ fontSize: 10, color: 'var(--on-surface-variant)' }}>
                                  {p.couponType === 'percentage' ? `${p.couponValue}%` : fmtMoney(p.couponValue)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--on-surface-variant)', opacity: 0.4, fontSize: 12 }}>—</span>
                          )}
                        </td>
                        <td style={{...tdStyle, textAlign: 'right', fontWeight: 600, color: disc > 0 ? '#f59e0b' : 'var(--on-surface-variant)'}}>
                          {disc > 0 ? `-${fmtMoney(disc)}` : '—'}
                          {disc > 0 && original > 0 && (
                            <div style={{ fontSize: 9, color: 'var(--outline)', marginTop: 1 }}>
                              -{((disc / original) * 100).toFixed(1)}%
                            </div>
                          )}
                        </td>
                        <td style={{...tdStyle, textAlign: 'right', fontWeight: 600, color: couponS > 0 ? '#3b82f6' : 'var(--on-surface-variant)'}}>
                          {couponS > 0 ? `-${fmtMoney(couponS)}` : '—'}
                        </td>
                        <td style={{...tdStyle, textAlign: 'right', fontWeight: 600, color: promoS > 0 ? '#a855f7' : 'var(--on-surface-variant)'}}>
                          {promoS > 0 ? `-${fmtMoney(promoS)}` : '—'}
                        </td>
                        <td style={{...tdStyle, textAlign: 'right', fontWeight: 700, color: '#10b981'}}>
                          {fmtMoney(p.amount)}
                          {disc > 0 && (
                            <div style={{ fontSize: 9, color: 'var(--outline)', textDecoration: 'line-through', marginTop: 1 }}>
                              {fmtMoney(original)}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'right', padding: '14px 12px', fontWeight: 700, color: 'var(--on-surface)', fontSize: 12, borderTop: '2px solid var(--border-subtle)' }}>
                      TOTALES:
                    </td>
                    <td style={{...tdStyle, textAlign: 'right', fontWeight: 700, color: '#f59e0b', borderTop: '2px solid var(--border-subtle)'}}>
                      -{fmtMoney(analytics.totalDiscount)}
                    </td>
                    <td style={{...tdStyle, textAlign: 'right', fontWeight: 700, color: '#3b82f6', borderTop: '2px solid var(--border-subtle)'}}>
                      -{fmtMoney(analytics.totalCouponSaved)}
                    </td>
                    <td style={{...tdStyle, textAlign: 'right', fontWeight: 700, color: '#a855f7', borderTop: '2px solid var(--border-subtle)'}}>
                      -{fmtMoney(analytics.totalPromoSaved)}
                    </td>
                    <td style={{...tdStyle, textAlign: 'right', fontWeight: 800, fontSize: 15, color: '#10b981', borderTop: '2px solid var(--border-subtle)'}}>
                      {fmtMoney(displayClient.totalSpent)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
              <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}></div>
              <p>No hay compras registradas (Carrito Abandonado)</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const thStyle = {
  background: 'var(--surface-container-low)', color: 'var(--on-surface-variant)',
  borderBottom: '1px solid var(--border-subtle)', padding: '10px 10px', textAlign: 'left',
  fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap',
};

const tdStyle = {
  padding: '10px 10px', borderBottom: '1px solid var(--border-subtle)',
  color: 'var(--on-surface)', fontSize: 12, whiteSpace: 'nowrap',
};

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: 'var(--surface-container)', borderRadius: 10, padding: '12px 14px',
      borderLeft: `3px solid ${color}`, minWidth: 0,
    }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color, lineHeight: 1.2 }}>
        {value}
        {sub && <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--on-surface-variant)', marginLeft: 4 }}>{sub}</span>}
      </div>
    </div>
  );
}
