import React, { useMemo, useEffect, useState } from 'react';
import { ShoppingCart, Tag, Ticket, Edit3, CheckCircle2, Package, Star, Calendar, Mail, Phone, MapPin, TrendingUp, CreditCard, Award, ArrowRight, X } from 'lucide-react';

const fmt = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0);
const fmtDate = (d) => {
  if (!d) return '';
  try { 
    return new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { 
      year: 'numeric', month: 'short', day: 'numeric' 
    }); 
  } catch { return d; }
};

const BADGE = {
  coupon:     { fg: '#60A5FA', icon: Ticket, text: 'Cupón' },
  promo_auto: { fg: '#A78BFA', icon: Star, text: 'Promo' },
  promo_code: { fg: '#FBBF24', icon: Tag, text: 'Código' },
  manual:     { fg: '#F87171', icon: Edit3, text: 'Manual' },
  normal:     { fg: '#9CA3AF', icon: CheckCircle2, text: 'Regular' },
};

export default function ClientDetailModal({ client, allClients = [], onClose }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

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
      couponSaved += cs; 
      promoSaved += ps2; 
      totalDiscount += parseFloat(p.discountTotal) || 0;
      
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
      coupons: Object.values(coupons).sort((a, b) => b.saved - a.saved).slice(0, 10),
      promos: Object.values(promos).sort((a, b) => b.saved - a.saved),
    };
  }, [dc.purchases]);

  const sortedPurchases = useMemo(() => {
    return [...(dc.purchases || [])].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [dc.purchases]);

  return (
    <>
      <style>{`
        @keyframes modalEnter {
          0% { opacity: 0; transform: scale(0.97) translateY(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .ultra-modal-overlay {
          animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .ultra-modal-content {
          animation: modalEnter 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .premium-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .premium-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .premium-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .premium-scroll:hover::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
        }
        .linear-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.2s ease;
        }
        .linear-card:hover {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
      `}</style>

      <div 
        onClick={onClose} 
        className="ultra-modal-overlay"
        style={{
          position: 'fixed', inset: 0, 
          background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          zIndex: 9999, padding: '24px', fontFamily: "'Inter', sans-serif",
          opacity: mounted ? 1 : 0
        }}
      >
        <div 
          onClick={e => e.stopPropagation()} 
          className="ultra-modal-content"
          style={{
            background: '#09090B', // Zinc 950 - Vercel/Linear dark
            borderRadius: 16, width: '100%', maxWidth: 1040, height: '85vh',
            display: 'flex', overflow: 'hidden',
            boxShadow: '0 40px 100px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)', 
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {/* LEFT SIDEBAR - PROFILE & KPIS */}
          <div style={{
            width: '320px', flexShrink: 0, 
            background: '#09090B',
            borderRight: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex', flexDirection: 'column', position: 'relative',
          }}>
            {/* Header Ambient Glow */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 150, background: 'radial-gradient(ellipse at top, rgba(167, 139, 250, 0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
            
            <div style={{ padding: '32px 24px', position: 'relative', zIndex: 1, flex: 1, overflowY: 'auto' }} className="premium-scroll">
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div style={{ 
                  width: 48, height: 48, borderRadius: 12, 
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 100%)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, fontWeight: 600, color: '#E4E4E7',
                }}>
                  {dc.name.charAt(0).toUpperCase()}
                </div>
                <button 
                  onClick={onClose}
                  style={{
                    width: 28, height: 28, borderRadius: 6, background: 'transparent',
                    border: 'none', color: '#71717A', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#FAFAFA'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#71717A'; e.currentTarget.style.background = 'transparent'; }}
                >
                  <X size={18} />
                </button>
              </div>

              <h2 style={{ margin: '0 0 12px 0', fontSize: 24, fontWeight: 600, color: '#FAFAFA', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                {dc.name}
              </h2>
              
              <div style={{ marginBottom: 24 }}>
                <Badge segment={dc.segment} />
              </div>

              {/* Contact Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
                {dc.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#A1A1AA', fontSize: 13 }}>
                    <Mail size={14} style={{ opacity: 0.6 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dc.email}</span>
                  </div>
                )}
                {dc.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#A1A1AA', fontSize: 13 }}>
                    <Phone size={14} style={{ opacity: 0.6 }} />
                    <span>{dc.phone}</span>
                  </div>
                )}
                {dc.city && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#A1A1AA', fontSize: 13 }}>
                    <MapPin size={14} style={{ opacity: 0.6 }} />
                    <span>{dc.city}{dc.province ? `, ${dc.province}` : ''}</span>
                  </div>
                )}
              </div>

              {/* Minimal KPIs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 32 }}>
                <MetricBlock label="Total Pagado" value={fmt(dc.totalSpent)} icon={<CreditCard size={14} />} highlight />
                <MetricBlock label="Total de Órdenes" value={dc.purchaseCount} icon={<ShoppingCart size={14} />} />
                <MetricBlock label="Ahorro Total" value={fmt(a.totalDiscount)} icon={<TrendingUp size={14} />} />
                {a.couponCount > 0 && <MetricBlock label="Compras con Cupón" value={`${a.couponCount} / ${dc.purchaseCount}`} icon={<Tag size={14} />} />}
                {a.promoCount > 0 && <MetricBlock label="Compras con Promo" value={`${a.promoCount} / ${dc.purchaseCount}`} icon={<Star size={14} />} />}
              </div>

              {/* Savings Breakdown */}
              {(a.couponSaved > 0 || a.promoSaved > 0) && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: '#71717A', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                    Desglose de Ahorro
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {a.couponSaved > 0 && <SubMetric label="Cupones" value={fmt(a.couponSaved)} color="#60A5FA" />}
                    {a.promoSaved > 0 && <SubMetric label="Promociones" value={fmt(a.promoSaved)} color="#A78BFA" />}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT CONTENT AREA - ACTIVITY & TIMELINE */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#09090B' }}>
            
            {/* Header Right */}
            <div style={{ 
              padding: '24px 32px', borderBottom: '1px solid rgba(255, 255, 255, 0.04)', 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              position: 'sticky', top: 0, zIndex: 10,
              background: 'rgba(9, 9, 11, 0.8)', backdropFilter: 'blur(12px)',
            }}>
              <div style={{ display: 'flex', gap: 24, fontSize: 14, fontWeight: 500 }}>
                <div style={{ color: '#FAFAFA', borderBottom: '1px solid #FAFAFA', paddingBottom: 4 }}>Historial de Compras</div>
              </div>
            </div>

            <div style={{ padding: '32px', overflowY: 'auto', flex: 1 }} className="premium-scroll">
              
              {/* Top Coupons Minimal Pills */}
              {a.coupons.length > 0 && (
                <div style={{ marginBottom: 40 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: '#71717A', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
                    Cupones Recurrentes
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {a.coupons.map((c, i) => (
                      <div key={i} className="linear-card" style={{
                        display: 'flex', alignItems: 'center', padding: '6px 12px', borderRadius: 8, gap: 8
                      }}>
                        <Ticket size={12} color="#71717A" />
                        <span style={{ fontSize: 12, color: '#E4E4E7', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.code}>
                          {c.code}
                        </span>
                        <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.1)' }} />
                        <span style={{ fontSize: 12, color: '#A1A1AA' }}>x{c.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Promotions Applied */}
              {a.promos.length > 0 && (
                <div style={{ marginBottom: 40 }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: '#71717A', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
                    Promociones Aplicadas
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {a.promos.map((p, i) => (
                      <div key={i} className="linear-card" style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 14px', borderRadius: 8,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                          <Star size={12} color="#A78BFA" style={{ flexShrink: 0 }} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 12, color: '#E4E4E7', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.name}>
                              {p.name}
                            </div>
                            <div style={{ fontSize: 10, color: '#52525B', marginTop: 2 }}>
                              {p.type && <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>{p.type}</span>}
                              {p.type && p.scope && <span style={{ margin: '0 4px', opacity: 0.4 }}>|</span>}
                              {p.scope && <span>{p.scope}</span>}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                          <span style={{ fontSize: 11, color: '#52525B' }}>x{p.count}</span>
                          <span style={{ fontSize: 12, color: '#A78BFA', fontWeight: 600 }}>-{fmt(p.saved)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sleek Timeline */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, color: '#71717A', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 24 }}>
                  Línea de Tiempo
                </div>

                {sortedPurchases.length > 0 ? (
                  <div style={{ position: 'relative', paddingLeft: 12 }}>
                    {/* Minimalist Vertical Line */}
                    <div style={{ position: 'absolute', left: 0, top: 8, bottom: 20, width: 1, background: 'rgba(255,255,255,0.08)' }} />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                      {sortedPurchases.map((p, idx) => {
                        const b = BADGE[p.benefitType] || BADGE.normal;
                        const cs = parseFloat(p.couponSaved) || 0;
                        const ps = parseFloat(p.promoDiscountAmount) || 0;
                        const disc = parseFloat(p.discountTotal) || 0;
                        const original = (parseFloat(p.amount) || 0) + disc;
                        const hasAnyDiscount = disc > 0;
                        
                        return (
                          <div key={idx} style={{ position: 'relative', paddingBottom: 32 }}>
                            {/* Timeline Node */}
                            <div style={{ 
                              position: 'absolute', left: -14, top: 6, width: 5, height: 5, 
                              borderRadius: '50%', background: b.fg,
                              boxShadow: `0 0 8px ${b.fg}`
                            }} />

                            <div className="linear-card" style={{
                              borderRadius: 12, padding: '20px', marginLeft: 16,
                              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20
                            }}>
                              
                              {/* Left Info */}
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                  <span style={{ fontSize: 12, color: '#A1A1AA' }}>{fmtDate(p.date)}</span>
                                  {p.benefitType !== 'normal' && (
                                    <span style={{
                                      fontSize: 10, color: b.fg, background: `${b.fg}15`,
                                      padding: '2px 8px', borderRadius: 4, fontWeight: 500
                                    }}>
                                      {b.text}
                                    </span>
                                  )}
                                </div>
                                
                                <div style={{ fontSize: 14, color: '#FAFAFA', fontWeight: 500, lineHeight: 1.5 }}>
                                  {p.product || 'Sin producto'}
                                  {p.productsArray && p.productsArray.length > 1 && (
                                    <span style={{ fontSize: 12, color: '#71717A', marginLeft: 8 }}>
                                      +{p.productsArray.length - 1} más
                                    </span>
                                  )}
                                </div>
                                
                                {p.coupon && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
                                    <div style={{ 
                                      display: 'flex', alignItems: 'center', gap: 4, 
                                      fontSize: 11, color: '#A1A1AA', background: 'rgba(255,255,255,0.03)',
                                      padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.04)'
                                    }}>
                                      <Tag size={10} />
                                      <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {p.coupon}
                                      </span>
                                    </div>
                                    {cs > 0 && <span style={{ fontSize: 11, color: '#34D399' }}>Ahorró {fmt(cs)}</span>}
                                  </div>
                                )}
                                {p.promoName && (p.benefitType === 'promo_auto' || p.benefitType === 'promo_code') && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: p.coupon ? 6 : 12 }}>
                                    <div style={{ 
                                      display: 'flex', alignItems: 'center', gap: 4, 
                                      fontSize: 11, color: '#A78BFA', background: 'rgba(167, 139, 250, 0.05)',
                                      padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(167, 139, 250, 0.1)'
                                    }}>
                                      <Star size={10} />
                                      <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.promoName}>
                                        {p.promoName}
                                      </span>
                                      {p.promoType && (
                                        <span style={{ opacity: 0.5, marginLeft: 2 }}>({p.promoType})</span>
                                      )}
                                    </div>
                                    {ps > 0 && <span style={{ fontSize: 11, color: '#A78BFA' }}>Ahorró {fmt(ps)}</span>}
                                  </div>
                                )}
                              </div>

                              {/* Right Amount */}
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 16, fontWeight: 600, color: '#FAFAFA' }}>{fmt(p.amount)}</div>
                                {hasAnyDiscount && (
                                  <div style={{ marginTop: 4 }}>
                                    <div style={{ fontSize: 12, color: '#71717A', textDecoration: 'line-through', marginBottom: 2 }}>
                                      {fmt(original)}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#10B981', fontWeight: 500 }}>
                                      -{((disc / original) * 100).toFixed(0)}%
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '60px 0', textAlign: 'center' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 24, background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <Package size={20} color="#52525B" />
                    </div>
                    <div style={{ fontSize: 14, color: '#E4E4E7', fontWeight: 500, marginBottom: 4 }}>Sin transacciones</div>
                    <div style={{ fontSize: 13, color: '#71717A' }}>Este cliente no tiene compras registradas.</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function MetricBlock({ label, value, icon, highlight }) {
  return (
    <div className="linear-card" style={{ 
      padding: '16px', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' 
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: highlight ? '#FAFAFA' : '#A1A1AA' }}>
        <div style={{ color: highlight ? '#FAFAFA' : '#71717A' }}>{icon}</div>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: highlight ? 16 : 14, fontWeight: 600, color: '#FAFAFA' }}>
        {value}
      </div>
    </div>
  );
}

function SubMetric({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
        <span style={{ fontSize: 12, color: '#A1A1AA' }}>{label}</span>
      </div>
      <span style={{ fontSize: 12, color: '#E4E4E7', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function Badge({ segment }) {
  const isVip = segment === 'vip';
  const isFiel = segment === 'regular' || segment === 'Fiel';
  
  const s = isVip ? { fg: '#FBBF24', label: 'VIP' }
    : isFiel ? { fg: '#34D399', label: 'Fiel' }
    : { fg: '#F87171', label: 'Ocasional' };
  
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
      background: 'rgba(255,255,255,0.03)', color: s.fg, border: '1px solid rgba(255,255,255,0.08)',
    }}>
      {isVip && <Star size={10} fill="currentColor" />}
      {s.label}
    </span>
  );
}
