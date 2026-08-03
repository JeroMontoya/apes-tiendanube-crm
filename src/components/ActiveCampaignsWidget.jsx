import React, { useState, useEffect, useMemo } from 'react';
import { MetaAPI } from '../api/MetaAPI';
import { Megaphone, RefreshCw, AlertCircle } from 'lucide-react';

const ActiveCampaignsWidget = ({ workspace, onRefreshMeta }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);
  const [toast, setToast] = useState(null);

  const api = useMemo(() => {
    if (!workspace?.meta_ad_account_id || !workspace?.meta_access_token) return null;
    return new MetaAPI(workspace.meta_ad_account_id, workspace.meta_access_token);
  }, [workspace]);

  const formatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });

  useEffect(() => {
    if (!api) {
      setLoading(false);
      return;
    }
    loadCampaigns();
  }, [api]);

  const loadCampaigns = async () => {
    if (!api) return;
    setLoading(true);
    const data = await api.getCampaigns();
    setCampaigns(data);
    setLoading(false);
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleToggle = async (id, currentStatus) => {
    if (!api) return;
    setTogglingId(id);
    const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    const result = await api.updateCampaignStatus(id, newStatus);
    
    if (result.success) {
      setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: newStatus, effective_status: newStatus } : c));
      showToast(`Campaña ${newStatus === 'ACTIVE' ? 'activada' : 'pausada'} ✅`);
      if (onRefreshMeta) onRefreshMeta();
    } else {
      showToast(`Error: ${result.error}`, 'error');
    }
    setTogglingId(null);
  };

  const isActive = (camp) => camp.effective_status === 'ACTIVE' || camp.status === 'ACTIVE';

  if (!api) {
    return (
      <div className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, textAlign: 'center' }}>
        <AlertCircle size={32} color="var(--on-surface-variant)" style={{ marginBottom: 8 }} />
        <p style={{ fontSize: 13, color: 'var(--on-surface-variant)' }}>Conecta Meta Ads en Ajustes para controlar campañas desde aquí.</p>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '24px', position: 'relative' }}>
      {toast && (
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'error' ? '#BA1A1A' : '#1A7B45',
          color: 'var(--on-surface)', padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
          zIndex: 99, animation: 'fadeIn 0.3s', boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Megaphone size={20} color="var(--primary)" /> Control de Campañas
        </h3>
        <button onClick={loadCampaigns} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, transition: 'transform 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseEnter={e => e.currentTarget.style.transform = 'rotate(180deg)'} onMouseLeave={e => e.currentTarget.style.transform = 'rotate(0)'} title="Refrescar">
          <RefreshCw size={16} color="var(--on-surface-variant)" />
        </button>
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 4 }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--on-surface-variant)', fontSize: 13 }}>
            Cargando campañas...
          </div>
        ) : campaigns.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--on-surface-variant)', fontSize: 13 }}>
            No hay campañas en tu cuenta.
          </div>
        ) : (
          campaigns.map(camp => (
            <div key={camp.id} style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
              padding: '14px 16px', background: 'var(--glass-bg)', 
              backdropFilter: 'var(--glass-blur)',
              borderRadius: 12, border: '1px solid var(--glass-border)',
              transition: 'var(--transition-base)',
              boxShadow: 'var(--shadow-sm)'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              e.currentTarget.style.borderColor = 'var(--border-medium)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
              e.currentTarget.style.borderColor = 'var(--glass-border)';
            }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {camp.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--on-surface-variant)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: isActive(camp) ? '#06B6D4' : 'var(--primary-container)', boxShadow: isActive(camp) ? '0 0 8px rgba(16,185,129,0.5)' : 'none' }} />
                  {isActive(camp) ? 'Entregando' : 'Pausada'} • {camp.daily_budget ? formatter.format(parseInt(camp.daily_budget) / 100) + '/día' : 'CBO'}
                </div>
              </div>
              
              <div style={{ marginLeft: 12 }}>
                <button
                  onClick={() => handleToggle(camp.id, camp.status)}
                  disabled={togglingId === camp.id}
                  style={{
                    width: 44, height: 24, borderRadius: 12, position: 'relative', cursor: togglingId === camp.id ? 'wait' : 'pointer',
                    background: isActive(camp) ? 'linear-gradient(90deg, #06B6D4, #22d3ee)' : 'var(--surface-container-high)',
                    border: 'none', transition: 'background 0.3s',
                    opacity: togglingId === camp.id ? 0.5 : 1,
                    boxShadow: isActive(camp) ? '0 2px 8px rgba(16,185,129,0.3)' : 'none'
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 2, left: isActive(camp) ? 22 : 2,
                    width: 20, height: 20, borderRadius: '50%', background: '#fff',
                    transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                  }} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ActiveCampaignsWidget;
