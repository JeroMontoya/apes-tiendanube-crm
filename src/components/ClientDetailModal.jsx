import React from 'react';

export default function ClientDetailModal({ client, onClose }) {
  if (!client) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', color: 'var(--on-surface)', border: '1px solid var(--border-subtle)', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
        <button className="modal-close" onClick={onClose} style={{ background: 'var(--surface-container)', color: 'var(--on-surface-variant)', border: 'none' }}>×</button>
        
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h2 style={{ margin: 0 }}>{client.name}</h2>
            <span className={`badge badge-${client.segment}`}>
              {client.segment === 'vip' ? '🌟 VIP' : client.segment === 'regular' ? '🛍️ Regular' : '🛒 Abandonado'}
            </span>
          </div>
          <span className={`badge-source ${client.source}`}>{client.source.toUpperCase()}</span>
        </div>

        <div className="info-grid">
          <div className="info-item">
            <label style={{ color: 'var(--on-surface-variant)' }}>Email</label>
            <span className={client.email.includes('@noinformado') ? 'text-red' : ''}>
              {client.email}
            </span>
          </div>
          <div className="info-item">
            <label style={{ color: 'var(--on-surface-variant)' }}>Teléfono</label>
            <span>{client.phone || 'No registrado'}</span>
          </div>
          <div className="info-item">
            <label style={{ color: 'var(--on-surface-variant)' }}>DNI / CUIT</label>
            <span>{client.dniCuit || 'No registrado'}</span>
          </div>
          <div className="info-item">
            <label style={{ color: 'var(--on-surface-variant)' }}>Ciudad</label>
            <span>{client.city || 'No registrada'}</span>
          </div>
        </div>

        <div className="section-header" style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1rem' }}>Historial de Compras</h3>
        </div>

        {client.purchases && client.purchases.length > 0 ? (
          <table className="purchase-table" style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ background: 'var(--surface-container-low)', color: 'var(--on-surface-variant)', borderBottom: '1px solid var(--border-subtle)', padding: '12px' }}>Fecha</th>
                <th style={{ background: 'var(--surface-container-low)', color: 'var(--on-surface-variant)', borderBottom: '1px solid var(--border-subtle)', padding: '12px' }}>Producto / Referencia</th>
                <th style={{ background: 'var(--surface-container-low)', color: 'var(--on-surface-variant)', borderBottom: '1px solid var(--border-subtle)', padding: '12px' }}>Promo / Cupón</th>
                <th style={{ background: 'var(--surface-container-low)', color: 'var(--on-surface-variant)', borderBottom: '1px solid var(--border-subtle)', padding: '12px', textAlign: 'right' }}>Monto</th>
              </tr>
            </thead>
            <tbody>
              {client.purchases.map((p, idx) => (
                <tr key={idx}>
                  <td style={{ padding: '12px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--on-surface-variant)' }}>{p.date}</td>
                  <td style={{ padding: '12px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--on-surface)' }}>{p.product || `Orden #${p.orderId || 'S/N'}`}</td>
                  <td style={{ padding: '12px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--on-surface-variant)' }}>
                    {p.coupon ? <span style={{ background: 'var(--primary-container)', color: 'var(--primary)', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>🎟️ {p.coupon}</span> : '-'}
                  </td>
                  <td style={{ padding: '12px', borderBottom: '1px solid var(--border-subtle)', textAlign: 'right', fontWeight: '600', color: '#2D8B4E' }}>
                    ${p.amount.toLocaleString('es-AR')}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="2" style={{ textAlign: 'right', padding: '16px 12px', fontWeight: 'bold', color: 'var(--on-surface)' }}>TOTAL:</td>
                <td style={{ textAlign: 'right', padding: '16px 12px', fontWeight: 'bold', fontSize: '1.1rem', color: '#2D8B4E' }}>
                  ${client.totalSpent.toLocaleString('es-AR')}
                </td>
              </tr>
            </tfoot>
          </table>
        ) : (
          <div className="empty-state" style={{ padding: '24px' }}>
            <p>No hay compras registradas (Carrito Abandonado)</p>
          </div>
        )}
      </div>
    </div>
  );
}
