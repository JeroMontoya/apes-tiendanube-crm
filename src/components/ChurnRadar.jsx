import React, { useMemo } from 'react';
import { calculateChurnScore } from '../utils/predictiveEngine';
import { AlertTriangle, TrendingDown } from 'lucide-react';

export default function ChurnRadar({ clients }) {
  const atRisk = useMemo(() => {
    if (!clients) return [];
    return clients
      .map(c => ({ ...c, churnRisk: calculateChurnScore(c) }))
      .filter(c => c.churnRisk >= 50)
      .sort((a, b) => b.churnRisk - a.churnRisk)
      .slice(0, 5); // Top 5 highest risk
  }, [clients]);

  return (
    <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--on-surface)' }}>
          <AlertTriangle color="#ef4444" size={20} />
          Radar de Fuga (Churn)
        </h3>
        <span style={{ fontSize: 12, color: 'var(--on-surface-variant)', fontWeight: 600 }}>Alto Riesgo</span>
      </div>

      {atRisk.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--on-surface-variant)', fontSize: 13 }}>
          No hay clientes en riesgo crítico de fuga actualmente.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {atRisk.map((client, i) => {
             // Calculate days since roughly
             const sorted = [...(client.purchases||[])].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
             const lastDate = sorted[0] ? new Date(sorted[0].date) : new Date();
             const days = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
             
             return (
              <div key={client.id || i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: 'var(--surface-container)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--on-surface)' }}>{client.name || client.email || 'Desconocido'}</div>
                  <div style={{ fontSize: 11, color: 'var(--on-surface-variant)' }}>Última compra hace {days} días</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#ef4444' }}>{client.churnRisk}%</span>
                    <span style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--on-surface-variant)', fontWeight: 600 }}>Riesgo</span>
                  </div>
                  <TrendingDown size={16} color="#ef4444" />
                </div>
              </div>
             );
          })}
        </div>
      )}
    </div>
  );
}
