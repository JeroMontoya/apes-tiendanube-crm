import React, { useMemo } from 'react';
import { ShoppingCart, Tag, Ticket, Edit3, Circle, CheckCircle2, Package, Star, Calendar, Percent } from 'lucide-react';

const fmt = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0);
const fmtDate = (d) => {
  if (!d) return '';
  try { return new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' }); } catch { return d; }
};

const BADGE = {
  coupon:     { bg: 'rgba(59, 130, 246, 0.15)', fg: '#60A5FA', border: 'rgba(59, 130, 246, 0.3)', icon: Ticket, text: 'Cupón' },
  promo_auto: { bg: 'rgba(139, 92, 246, 0.15)', fg: '#A78BFA', border: 'rgba(139, 92, 246, 0.3)', icon: Star, text: 'Promo' },
  promo_code: { bg: 'rgba(245, 158, 11, 0.15)', fg: '#FBBF24', border: 'rgba(245, 158, 11, 0.3)', icon: Tag, text: 'Promo Código' },
  manual:     { bg: 'rgba(239, 68, 68, 0.15)', fg: '#F87171', border: 'rgba(239, 68, 68, 0.3)', icon: Edit3, text: 'Ajuste Manual' },
  normal:     { bg: 'rgba(156, 163, 175, 0.1)', fg: '#9CA3AF', border: 'rgba(156, 163, 175, 0.2)', icon: CheckCircle2, text: 'Normal' },
};

export default function ClientDetailModal({ client, allClients = [], onClose }) {
  if (!client) return null;

  const oc = allClients.find(c => c.id === client.id) || client;
  const dc = { ...client, purchases: oc.purchases || client.purchases, totalSpent: oc.totalSpent || client.totalSpent, purchaseCount: oc.purchaseCount || client.purchaseCount };

  const a = useMemo(() => {
    const ps = dc.purchases || [];
    let couponSaved = 0, promoSaved = 0, totalDiscount = 0, couponCount = 0, promoCount = 0;
    const coupons = {};
    const promos = {};
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
      if (p.benefitType === 'promo_auto' || p.benefitType === 'promo_code') {
        promoCount++;
        const name = p.promoName || 'Promocion automatica';
        if (!promos[name]) promos[name] = { name, count: 0, saved: 0, type: p.promoType, scope: p.promoScope };
        promos[name].count++;
        promos[name].saved += ps2;
      }
    });
    return {
      couponSaved, promoSaved, totalDiscount, couponCount, promoCount,
      coupons: Object.values(coupons).sort((a, b) => b.saved - a.saved),
      promos: Object.values(promos).sort((a, b) => b.saved - a.saved),
    };
  }, [dc.purchases]);

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
      fontFamily: "'Inter', 'Montserrat', sans-serif"
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#111827', // Tailwind gray-900
        borderRadius: 24, width: '100%', maxWidth: 880, maxHeight: '90vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 25px 80px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.1)', 
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}>

        {/* Header - Glassy Dark */}
        <div style={{ 
          padding: '32px 40px 24px', 
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)', 
          background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.8) 0%, rgba(17, 24, 39, 0.9) 100%)' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <h2 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#F9FAFB', letterSpacing: '-0.02em' }}>{dc.name}</h2>
                <Badge segment={dc.segment} />
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span style={pillStyle('rgba(255, 255, 255, 0.05)', '#D1D5DB', 'rgba(255, 255, 255, 0.1)')}>
                  <ShoppingCart size={14} style={{ marginRight: 6, opacity: 0.7 }} />
                  {dc.purchaseCount} compra{dc.purchaseCount !== 1 ? 's' : ''}
                </span>
                <span style={pillStyle('rgba(16, 185, 129, 0.1)', '#34D399', 'rgba(16, 185, 129, 0.2)')}>
                  {fmt(dc.totalSpent)}
                </span>
              </div>
            </div>
            <button onClick={onClose} style={{
              width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(255, 255, 255, 0.1)', 
              background: 'rgba(255, 255, 255, 0.03)', cursor: 'pointer', display: 'flex', 
              alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: 20, 
              transition: 'all 0.2s ease',
            }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)'; e.currentTarget.style.color = '#F87171'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'; e.currentTarget.style.color = '#9CA3AF'; }}>
              ✕
            </button>
          </div>
          <div style={{ display: 'flex', gap: 20, fontSize: 13, color: '#9CA3AF', flexWrap: 'wrap', fontWeight: 500 }}>
            {dc.email && <span>{dc.email}</span>}
            {dc.phone && <span>{dc.phone}</span>}
            {dc.city && <span>{dc.city}{dc.province ? `, ${dc.province}` : ''}</span>}
          </div>
        </div>

        <div style={{ padding: '0 40px 40px', overflow: 'auto', flex: 1, background: '#111827' }}>

          {/* 6 Summary Cards - Modern Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
            gap: 16, 
            margin: '32px 0' 
          }}>
            <SummaryCard label="Total Pagado" value={fmt(dc.totalSpent)} color="#34D399" accent="#059669" />
            <SummaryCard label="Ahorro Total" value={fmt(a.totalDiscount)} color="#FBBF24" accent="#D97706" />
            <SummaryCard label="Compras con Cupón" value={`${a.couponCount} de ${dc.purchases?.length || 0}`} color="#60A5FA" accent="#2563EB" />
            <SummaryCard label="Ahorro en Cupones" value={fmt(a.couponSaved)} color="#60A5FA" accent="#2563EB" />
            <SummaryCard label="Compras con Promo" value={`${a.promoCount} de ${dc.purchases?.length || 0}`} color="#A78BFA" accent="#7C3AED" />
            <SummaryCard label="Ahorro en Promos" value={fmt(a.promoSaved)} color="#A78BFA" accent="#7C3AED" />
          </div>

          {/* Coupons Used */}
          {a.coupons.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <SectionTitle title="Cupones Utilizados" icon={<Ticket size={16} />} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {a.coupons.map((c, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 12,
                    background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)',
                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.02)'
                  }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#60A5FA', letterSpacing: 0.5, wordBreak: 'break-all', maxWidth: 200, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={c.code}>
                      {c.code}
                    </span>
                    <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)' }}></div>
                    <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500 }}>
                      {c.type === 'percentage' ? `${c.value}%` : fmt(c.value)} <span style={{ opacity: 0.5, margin: '0 4px' }}>×</span> {c.count}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#34D399', marginLeft: 4 }}>
                      -{fmt(c.saved)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Promotions Applied */}
          {a.promos.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <SectionTitle title="Promociones Aplicadas" icon={<Percent size={16} />} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {a.promos.map((p, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                    padding: '12px 16px', borderRadius: 12,
                    background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.2)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                      <Percent size={14} color="#A78BFA" style={{ flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#E5E7EB', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.name}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2, display: 'flex', gap: 8 }}>
                          {p.type && <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>{p.type}</span>}
                          {p.scope && <span>{p.scope}</span>}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                      <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500 }}>x{p.count}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#A78BFA' }}>-{fmt(p.saved)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Purchase Timeline - Beautiful List, No Overlapping Tables */}
          <SectionTitle title={`Historial de Compras (${dc.purchases?.length || 0})`} icon={<Calendar size={16} />} />

          {dc.purchases && dc.purchases.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[...dc.purchases].sort((a, b) => (b.date || '').localeCompare(a.date || '')).map((p, idx) => {
                const b = BADGE[p.benefitType] || BADGE.normal;
                const cs = parseFloat(p.couponSaved) || 0;
                const ps = parseFloat(p.promoDiscountAmount) || 0;
                const disc = parseFloat(p.discountTotal) || 0;
                const original = (parseFloat(p.amount) || 0) + disc;
                const hasAnyDiscount = disc > 0;
                const Icon = b.icon;
                
                return (
                  <div key={idx} style={{
                    background: 'rgba(31, 41, 55, 0.4)', borderRadius: 16, 
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    padding: '20px 24px', transition: 'all 0.2s ease',
                    display: 'flex', gap: 20, alignItems: 'center'
                  }}
                  onMouseEnter={e => { 
                    e.currentTarget.style.background = 'rgba(31, 41, 55, 0.8)'; 
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'; 
                  }}
                  onMouseLeave={e => { 
                    e.currentTarget.style.background = 'rgba(31, 41, 55, 0.4)'; 
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)'; 
                  }}>
                    
                    {/* Left: Product Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <span style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 600, letterSpacing: 0.5 }}>{fmtDate(p.date)}</span>
                        <div style={{ width: 4, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)' }}></div>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '4px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                          background: b.bg, color: b.fg, border: `1px solid ${b.border}`,
                          textTransform: 'uppercase', letterSpacing: 0.5,
                        }}>
                          {Icon && <Icon size={12} strokeWidth={2.5} />}
                          {b.text}
                        </span>
                      </div>
                      
                      <div style={{ fontSize: 15, color: '#F3F4F6', fontWeight: 600, lineHeight: 1.5, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Package size={16} color="#9CA3AF" />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {p.product || 'Sin producto'}
                        </span>
                        {p.productsArray && p.productsArray.length > 1 && (
                          <span style={{ 
                            fontSize: 11, color: '#9CA3AF', background: 'rgba(255,255,255,0.05)', 
                            padding: '2px 8px', borderRadius: 10, whiteSpace: 'nowrap', border: '1px solid rgba(255,255,255,0.05)'
                          }}>
                            +{p.productsArray.length - 1} más
                          </span>
                        )}
                      </div>
                      
                      {/* Coupon Detail */}
                      {p.coupon && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                            background: 'rgba(59, 130, 246, 0.1)', color: '#60A5FA', border: '1px dashed rgba(59, 130, 246, 0.3)',
                          }}>
                            <Tag size={12} />
                            <span style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {p.coupon}
                            </span>
                            {p.couponType && (
                              <span style={{ fontWeight: 500, opacity: 0.6, marginLeft: 4 }}>
                                ({p.couponType === 'percentage' ? `${p.couponValue}%` : fmt(p.couponValue)})
                              </span>
                            )}
                          </span>
                          {cs > 0 && (
                            <span style={{ fontSize: 12, color: '#34D399', fontWeight: 600 }}>-{fmt(cs)}</span>
                          )}
                        </div>
                      )}
                      {/* Promo Detail */}
                      {p.promoName && (p.benefitType === 'promo_auto' || p.benefitType === 'promo_code') && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: p.coupon ? 6 : 12 }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                            background: 'rgba(168, 85, 247, 0.1)', color: '#A78BFA', border: '1px dashed rgba(168, 85, 247, 0.3)',
                          }}>
                            <Percent size={12} />
                            <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.promoName}>
                              {p.promoName}
                            </span>
                            {p.promoType && (
                              <span style={{ fontWeight: 500, opacity: 0.6, marginLeft: 4 }}>({p.promoType})</span>
                            )}
                          </span>
                          {ps > 0 && (
                            <span style={{ fontSize: 12, color: '#34D399', fontWeight: 600 }}>-{fmt(ps)}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right: Amounts */}
                    <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: 20, borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#F9FAFB', letterSpacing: '-0.02em' }}>{fmt(p.amount)}</div>
                      {hasAnyDiscount && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, marginTop: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 12, color: '#6B7280', textDecoration: 'line-through' }}>{fmt(original)}</span>
                            <span style={{ 
                              fontSize: 11, color: '#10B981', fontWeight: 700, background: 'rgba(16, 185, 129, 0.1)', 
                              padding: '2px 6px', borderRadius: 6, border: '1px solid rgba(16, 185, 129, 0.2)' 
                            }}>
                              -{((disc / original) * 100).toFixed(0)}%
                            </span>
                          </div>
                          
                          {(cs > 0 || ps > 0) && (
                            <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 500, display: 'flex', gap: 6, marginTop: 2 }}>
                              {cs > 0 && <span style={{ color: '#60A5FA' }}>CUP: -{fmt(cs)}</span>}
                              {cs > 0 && ps > 0 && <span style={{ opacity: 0.3 }}>|</span>}
                              {ps > 0 && <span style={{ color: '#A78BFA' }}>PRM: -{fmt(ps)}</span>}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '60px 40px', textAlign: 'center', background: 'rgba(31, 41, 55, 0.3)', borderRadius: 16, border: '1px dashed rgba(255,255,255,0.1)' }}>
              <Package size={48} color="#4B5563" style={{ marginBottom: 16, opacity: 0.5 }} />
              <h3 style={{ margin: '0 0 8px', fontSize: 16, color: '#E5E7EB', fontWeight: 600 }}>Sin historial</h3>
              <p style={{ margin: 0, fontSize: 14, color: '#9CA3AF' }}>Este cliente aún no tiene compras registradas en el sistema.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title, icon }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      {icon && <span style={{ color: '#9CA3AF' }}>{icon}</span>}
      <h4 style={{ fontSize: 13, fontWeight: 700, color: '#E5E7EB', textTransform: 'uppercase', letterSpacing: 1.2, margin: 0 }}>
        {title}
      </h4>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 0%, transparent 100%)', marginLeft: 8 }}></div>
    </div>
  );
}

function Badge({ segment }) {
  const s = segment === 'vip' ? { bg: 'rgba(245, 158, 11, 0.15)', fg: '#FBBF24', border: 'rgba(245, 158, 11, 0.3)', label: 'VIP' }
    : segment === 'regular' || segment === 'Fiel' ? { bg: 'rgba(16, 185, 129, 0.15)', fg: '#34D399', border: 'rgba(16, 185, 129, 0.3)', label: 'Fiel' }
    : { bg: 'rgba(239, 68, 68, 0.15)', fg: '#F87171', border: 'rgba(239, 68, 68, 0.3)', label: 'Ocasional' };
  
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: 800,
      background: s.bg, color: s.fg, border: `1px solid ${s.border}`,
      textTransform: 'uppercase', letterSpacing: 0.5,
    }}>
      {s.label}
    </span>
  );
}

function SummaryCard({ label, value, color, accent }) {
  return (
    <div style={{ 
      background: 'rgba(31, 41, 55, 0.6)', 
      borderRadius: 16, 
      padding: '16px 20px', 
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderLeft: `4px solid ${accent}`,
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      display: 'flex', flexDirection: 'column', justifyContent: 'center'
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: color, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
        {value}
      </div>
    </div>
  );
}

function pillStyle(bg, fg, border) {
  return { 
    display: 'inline-flex', alignItems: 'center', padding: '6px 14px', borderRadius: 8, 
    fontSize: 13, fontWeight: 600, background: bg, color: fg, border: `1px solid ${border}` 
  };
}
