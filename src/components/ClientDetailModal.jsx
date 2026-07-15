import React, { useMemo } from 'react';

const fmt = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0);
const fmtDate = (d) => {
  if (!d) return '';
  try { return new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' }); } catch { return d; }
};

const BADGE = {
  coupon:     { bg: '#EFF6FF', fg: '#2563EB', icon: ' coupon', text: 'Cupon' },
  promo_auto: { bg: '#F5F3FF', fg: '#7C3AED', icon: ' promo', text: 'Promo' },
  promo_code: { bg: '#FFFBEB', fg: '#D97706', icon: ' tag', text: 'Promo Codigo' },
  manual:     { bg: '#FEF2F2', fg: '#DC2626', icon: ' edit', text: 'Ajuste Manual' },
  normal:     { bg: '#F9FAFB', fg: '#6B7280', icon: '', text: 'Normal' },
};

export default function ClientDetailModal({ client, allClients = [], onClose }) {
  if (!client) return null;

  const oc = allClients.find(c => c.id === client.id) || client;
  const dc = { ...client, purchases: oc.purchases || client.purchases, totalSpent: oc.totalSpent || client.totalSpent, purchaseCount: oc.purchaseCount || client.purchaseCount };

  const a = useMemo(() => {
    const ps = dc.purchases || [];
    let couponSaved = 0, promoSaved = 0, totalDiscount = 0, couponCount = 0;
    const coupons = {};
    ps.forEach(p => {
      const cs = parseFloat(p.couponSaved) || 0;
      const ps2 = parseFloat(p.promoDiscountAmount) || 0;
      couponSaved += cs; promoSaved += ps2; totalDiscount += parseFloat(p.discountTotal) || 0;
      if (p.coupon) {
        couponCount++;
        if (!coupons[p.coupon]) coupons[p.coupon] = { code: p.coupon, count: 0, saved: 0, type: p.couponType, value: p.couponValue };
        coupons[p.coupon].count++;
        coupons[p.coupon].saved += cs;
      }
    });
    return { couponSaved, promoSaved, totalDiscount, couponCount, coupons: Object.values(coupons).sort((a, b) => b.saved - a.saved) };
  }, [dc.purchases]);

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 820, maxHeight: '88vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 25px 80px rgba(0,0,0,0.25)', border: '1px solid rgba(0,0,0,0.06)',
      }}>

        {/* Header */}
        <div style={{ padding: '28px 32px 20px', borderBottom: '1px solid #F3F4F6', background: 'linear-gradient(135deg, #FAFBFC 0%, #F8FAFC 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827', letterSpacing: -0.3 }}>{dc.name}</h2>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <Badge segment={dc.segment} />
                <span style={pillStyle('#F3F4F6', '#6B7280')}>{dc.purchaseCount} compra{dc.purchaseCount !== 1 ? 's' : ''}</span>
                <span style={pillStyle('#ECFDF5', '#059669')}>{fmt(dc.totalSpent)}</span>
              </div>
            </div>
            <button onClick={onClose} style={{
              width: 32, height: 32, borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#9CA3AF', fontSize: 18, flexShrink: 0, transition: 'all 0.15s',
            }} onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.borderColor = '#FECACA'; e.currentTarget.style.color = '#DC2626'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.color = '#9CA3AF'; }}>
              x
            </button>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6B7280', flexWrap: 'wrap' }}>
            {dc.email && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{dc.email}</span>}
            {dc.phone && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{dc.phone}</span>}
            {dc.city && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{dc.city}{dc.province ? `, ${dc.province}` : ''}</span>}
          </div>
        </div>

        <div style={{ padding: '0 32px 28px', overflow: 'auto', flex: 1 }}>

          {/* Summary Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, margin: '20px 0' }}>
            <SummaryCard label="Compras con Cupon" value={a.couponCount} sub={`de ${dc.purchases?.length || 0}`} color="#2563EB" />
            <SummaryCard label="Ahorro Cupones" value={fmt(a.couponSaved)} color="#2563EB" />
            <SummaryCard label="Compras con Promo" value={dc.purchases?.filter(p => p.benefitType === 'promo_auto' || p.benefitType === 'promo_code').length || 0} sub={`de ${dc.purchases?.length || 0}`} color="#7C3AED" />
            <SummaryCard label="Ahorro Promos" value={fmt(a.promoSaved)} color="#7C3AED" />
          </div>

          {/* Coupons Used */}
          {a.coupons.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px' }}>Cupones Utilizados</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {a.coupons.map((c, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10,
                    background: '#EFF6FF', border: '1px solid #DBEAFE',
                  }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#1D4ED8' }}>{c.code}</span>
                    <span style={{ fontSize: 11, color: '#6B7280' }}>{c.type === 'percentage' ? `${c.value}%` : fmt(c.value)}</span>
                    <span style={{ fontSize: 11, color: '#9CA3AF' }}>x{c.count}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#059669' }}>-{fmt(c.saved)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Purchase Timeline */}
          <h4 style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 12px' }}>Historial de Compras</h4>

          {dc.purchases && dc.purchases.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...dc.purchases].sort((a, b) => (b.date || '').localeCompare(a.date || '')).map((p, idx) => {
                const b = BADGE[p.benefitType] || BADGE.normal;
                const cs = parseFloat(p.couponSaved) || 0;
                const ps = parseFloat(p.promoDiscountAmount) || 0;
                const disc = parseFloat(p.discountTotal) || 0;
                const original = (parseFloat(p.amount) || 0) + disc;
                const hasAnyDiscount = disc > 0;
                return (
                  <div key={idx} style={{
                    background: '#FAFBFC', borderRadius: 12, border: '1px solid #F3F4F6',
                    padding: '14px 18px', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#F3F4F6'; e.currentTarget.style.boxShadow = 'none'; }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      {/* Left: Date + Products */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 500 }}>{fmtDate(p.date)}</span>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                            padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                            background: b.bg, color: b.fg, textTransform: 'uppercase', letterSpacing: 0.3,
                          }}>
                            {b.icon && <span style={{ fontSize: 10 }}>{b.icon}</span>}
                            {b.text}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: '#374151', fontWeight: 500, lineHeight: 1.4 }}>
                          {p.product || 'Sin producto'}
                          {p.productsArray && p.productsArray.length > 1 && (
                            <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 6 }}>+{p.productsArray.length - 1} mas</span>
                          )}
                        </div>
                        {/* Coupon Detail */}
                        {p.coupon && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                              background: '#EFF6FF', color: '#2563EB', border: '1px solid #DBEAFE',
                            }}>
                              {p.coupon}
                              {p.couponType && (
                                <span style={{ fontWeight: 500, opacity: 0.7, marginLeft: 2 }}>
                                  {p.couponType === 'percentage' ? `${p.couponValue}%` : fmt(p.couponValue)}
                                </span>
                              )}
                            </span>
                            {cs > 0 && (
                              <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>-{fmt(cs)} ahorrado</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right: Amount */}
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{fmt(p.amount)}</div>
                        {hasAnyDiscount && (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, marginTop: 2 }}>
                            <span style={{ fontSize: 11, color: '#9CA3AF', textDecoration: 'line-through' }}>{fmt(original)}</span>
                            <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>-{fmt(disc)} ({((disc / original) * 100).toFixed(0)}% off)</span>
                            {(cs > 0 || ps > 0) && (
                              <span style={{ fontSize: 10, color: '#9CA3AF' }}>
                                {cs > 0 && `cupon: -${fmt(cs)}`}
                                {cs > 0 && ps > 0 && ' | '}
                                {ps > 0 && `promo: -${fmt(ps)}`}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF' }}>
              <div style={{ fontSize: 40, marginBottom: 8, opacity: 0.3 }}></div>
              <p style={{ fontSize: 13 }}>No hay compras registradas</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Badge({ segment }) {
  const s = segment === 'vip' ? { bg: '#FEF3C7', fg: '#D97706', label: 'VIP' }
    : segment === 'regular' || segment === 'Fiel' ? { bg: '#ECFDF5', fg: '#059669', label: 'Fiel' }
    : { bg: '#FEF2F2', fg: '#DC2626', label: 'Ocasional' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
      background: s.bg, color: s.fg, textTransform: 'uppercase', letterSpacing: 0.3,
    }}>
      {segment === 'vip' ? '' : ''} {s.label}
    </span>
  );
}

function SummaryCard({ label, value, sub, color }) {
  return (
    <div style={{ background: '#FAFBFC', borderRadius: 10, padding: '12px 14px', border: '1px solid #F3F4F6' }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1.2 }}>
        {value}
        {sub && <span style={{ fontSize: 11, fontWeight: 500, color: '#9CA3AF', marginLeft: 4 }}>{sub}</span>}
      </div>
    </div>
  );
}

function pillStyle(bg, fg) {
  return { display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: bg, color: fg };
}
