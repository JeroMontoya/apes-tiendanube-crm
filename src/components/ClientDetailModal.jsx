import React from 'react';

export default function ClientDetailModal({ client, allClients = [], onClose }) {
  if (!client) return null;

  const originalClient = allClients.find(c => c.id === client.id) || client;
  const displayClient = {
    ...client,
    purchases: originalClient.purchases || client.purchases,
    totalSpent: originalClient.totalSpent || client.totalSpent,
    purchaseCount: originalClient.purchaseCount || client.purchaseCount,
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', 
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', 
      zIndex: 1000, padding: 20, animation: 'fadeIn 0.2s ease'
    }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{
        background: 'var(--surface)', color: 'var(--on-surface)', border: '1px solid var(--border-subtle)', 
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)', borderRadius: 16, width: '100%', maxWidth: 720, maxHeight: '85vh',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        animation: 'slideUp 0.3s ease', minWidth: 0, wordBreak: 'break-word'
      }}>
        <button className="modal-close" onClick={onClose} style={{ 
          position: 'absolute', top: 12, right: 12, zIndex: 1,
          background: 'var(--surface-container-high)', border: 'none', color: 'var(--on-surface-variant)', 
          cursor: 'pointer', padding: 8, borderRadius: 8, display: 'flex', transition: 'all 0.2s',
          width: 36, height: 36, alignItems: 'center', justifyContent: 'center', fontSize: 20, lineHeight: 1
        }} onMouseEnter={e => e.currentTarget.style.background = 'var(--error-container)'} 
        onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-container-high)'}>
        ×
        </button>
        
        <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--on-surface)', wordBreak: 'break-word' }}>{displayClient.name}</h2>
            <span style={{ 
              padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              background: displayClient.segment === 'vip' ? 'rgba(251,191,36,0.15)' : displayClient.segment === 'regular' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
              color: displayClient.segment === 'vip' ? '#fbbf24' : displayClient.segment === 'regular' ? '#10b981' : '#ef4444',
              whiteSpace: 'nowrap'
            }}>
              {displayClient.segment === 'vip' ? '★ VIP' : displayClient.segment === 'regular' ? 'Regular' : 'Abandonado'}
            </span>
          </div>
          <span style={{ 
            padding: '4px 10px', borderRadius: 12, fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            background: 'rgba(59,130,246,0.15)', color: '#3b82f6', whiteSpace: 'nowrap'
          }}>{displayClient.source?.toUpperCase() || 'WEB'}</span>
        </div>

        <div style={{ padding: '0 24px 24px', overflow: 'auto', flex: 1, minWidth: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24, minWidth: 0 }}>
            <div style={{ background: 'var(--surface-container)', borderRadius: 12, padding: 16, minWidth: 0 }}>
              <label style={{ color: 'var(--on-surface-variant)', fontSize: 10, textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: 4 }}>Email</label>
              <span style={{ color: displayClient.email?.includes('@noinformado') ? '#ef4444' : 'var(--on-surface)', fontWeight: 500, wordBreak: 'break-all', display: 'block' }}>{displayClient.email || '—'}</span>
            </div>
            <div style={{ background: 'var(--surface-container)', borderRadius: 12, padding: 16, minWidth: 0 }}>
              <label style={{ color: 'var(--on-surface-variant)', fontSize: 10, textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: 4 }}>Teléfono</label>
              <span style={{ color: 'var(--on-surface)', fontWeight: 500, wordBreak: 'break-all', display: 'block' }}>{displayClient.phone || 'No registrado'}</span>
            </div>
            <div style={{ background: 'var(--surface-container)', borderRadius: 12, padding: 16, minWidth: 0 }}>
              <label style={{ color: 'var(--on-surface-variant)', fontSize: 10, textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: 4 }}>DNI / CUIT</label>
              <span style={{ color: 'var(--on-surface)', fontWeight: 500, wordBreak: 'break-all', display: 'block' }}>{displayClient.dniCuit || 'No registrado'}</span>
            </div>
            <div style={{ background: 'var(--surface-container)', borderRadius: 12, padding: 16, minWidth: 0 }}>
              <label style={{ color: 'var(--on-surface-variant)', fontSize: 10, textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: 4 }}>Ciudad</label>
              <span style={{ color: 'var(--on-surface)', fontWeight: 500, wordBreak: 'break-all', display: 'block' }}>{displayClient.city || 'No registrada'}</span>
            </div>
          </div>

          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--on-surface)' }}>Historial de Compras ({displayClient.purchases?.length || 0})</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: 'var(--on-surface-variant)' }}>
              <span>Total gastado: <strong style={{ color: '#10b981', fontSize: 16 }}>${displayClient.totalSpent?.toLocaleString('es-AR') || 0}</strong></span>
            </div>
          </div>

          {displayClient.purchases && displayClient.purchases.length > 0 ? (
            <div style={{ overflowX: 'auto', minWidth: 0 }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 600 }}>
                <thead>
                  <tr>
                    <th style={{ background: 'var(--surface-container-low)', color: 'var(--on-surface-variant)', borderBottom: '1px solid var(--border-subtle)', padding: '12px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Fecha</th>
                    <th style={{ background: 'var(--surface-container-low)', color: 'var(--on-surface-variant)', borderBottom: '1px solid var(--border-subtle)', padding: '12px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', minWidth: 200 }}>Producto / Referencia</th>
                    <th style={{ background: 'var(--surface-container-low)', color: 'var(--on-surface-variant)', borderBottom: '1px solid var(--border-subtle)', padding: '12px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Promo / Cupón</th>
                    <th style={{ background: 'var(--surface-container-low)', color: 'var(--on-surface-variant)', borderBottom: '1px solid var(--border-subtle)', padding: '12px', textAlign: 'right', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {displayClient.purchases.map((p, idx) => (
                    <tr key={idx} style={{ transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-container)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '12px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--on-surface-variant)', fontSize: 13, whiteSpace: 'nowrap' }}>{p.date}</td>
                      <td style={{ padding: '12px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--on-surface)', fontSize: 13, wordBreak: 'break-word', maxWidth: 300 }}>{p.product || `Orden #${p.orderId || 'S/N'}`}</td>
                      <td style={{ padding: '12px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--on-surface-variant)', fontSize: 12 }}>
                        {p.coupon ? <span style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', padding: '4px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>🎟️ {p.coupon}</span> : <span style={{ color: 'var(--on-surface-variant)', opacity: 0.5 }}>—</span>}
                      </td>
                      <td style={{ padding: '12px', borderBottom: '1px solid var(--border-subtle)', textAlign: 'right', fontWeight: 600, color: '#10b981', fontSize: 13, whiteSpace: 'nowrap' }}>${p.amount.toLocaleString('es-AR')}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'right', padding: '16px 12px', fontWeight: 700, color: 'var(--on-surface)', fontSize: 13, borderTop: '2px solid var(--border-subtle)' }}>TOTAL:</td>
                    <td style={{ textAlign: 'right', padding: '16px 12px', fontWeight: 800, fontSize: 16, color: '#10b981', borderTop: '2px solid var(--border-subtle)' }}>
                      ${displayClient.totalSpent.toLocaleString('es-AR')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
              <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>🛒</div>
              <p>No hay compras registradas (Carrito Abandonado)</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}