import React, { useState, useEffect, useMemo } from 'react';
import { MetaAPI } from '../api/MetaAPI';
import { 
  Plus, Loader2, Edit3, Target, Layers, Image as ImageIcon, ChevronRight, BarChart3, AlertCircle 
} from 'lucide-react';
import CampaignDrawer from './MetaAds/CampaignDrawer';
import AdSetDrawer from './MetaAds/AdSetDrawer';
import AdDrawer from './MetaAds/AdDrawer';

const fmt = (v) => parseFloat(v || 0).toLocaleString('es-CO', { minimumFractionDigits: 0 });
const fmtMoney = (v) => '$' + parseFloat(v || 0).toLocaleString('es-CO', { minimumFractionDigits: 0 });

export default function MetaAdsPanel({ workspace, onRefreshMeta }) {
  const [activeTab, setActiveTab] = useState('campaigns'); // 'campaigns', 'adsets', 'ads'
  
  // Selection State
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [selectedAdSet, setSelectedAdSet] = useState(null);

  // Data State
  const [campaigns, setCampaigns] = useState([]);
  const [adSets, setAdSets] = useState([]);
  const [ads, setAds] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Drawers State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // The item being edited (campaign, adset, or ad)

  const api = useMemo(() => {
    if (!workspace?.meta_ad_account_id || !workspace?.meta_access_token) return null;
    return new MetaAPI(workspace.meta_ad_account_id, workspace.meta_access_token);
  }, [workspace]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- Data Loading ---

  const loadCampaigns = async () => {
    if (!api) return;
    setLoading(true);
    const data = await api.getCampaigns();
    setCampaigns(data || []);
    setLoading(false);
  };

  const loadAdSets = async (campaignId) => {
    if (!api) return;
    setLoading(true);
    const data = await api.getAdSetsConfig(campaignId);
    setAdSets(data || []);
    setLoading(false);
  };

  const loadAds = async (adsetId) => {
    if (!api) return;
    setLoading(true);
    const data = await api.getAdsConfig(adsetId);
    setAds(data || []);
    setLoading(false);
  };

  // Initial load
  useEffect(() => {
    loadCampaigns();
  }, [api]);

  // Tab change handlers
  useEffect(() => {
    if (activeTab === 'adsets') {
      loadAdSets(selectedCampaign?.id);
    } else if (activeTab === 'ads') {
      loadAds(selectedAdSet?.id);
    }
  }, [activeTab, selectedCampaign, selectedAdSet]);

  const handleTabChange = (tab) => {
    if (tab === 'adsets' && !selectedCampaign && campaigns.length === 0) {
      showToast('Crea una campaña primero.', 'error');
      return;
    }
    if (tab === 'ads' && !selectedAdSet && adSets.length === 0) {
      showToast('Crea un conjunto de anuncios primero.', 'error');
      return;
    }
    setActiveTab(tab);
  };

  // Drawer handlers
  const handleCreate = () => {
    setEditingItem(null);
    setDrawerOpen(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setDrawerOpen(true);
  };

  const handleSaved = () => {
    showToast('Guardado exitosamente 🎉');
    if (onRefreshMeta) onRefreshMeta();
    if (activeTab === 'campaigns') loadCampaigns();
    else if (activeTab === 'adsets') loadAdSets(selectedCampaign?.id);
    else if (activeTab === 'ads') loadAds(selectedAdSet?.id);
  };

  // Navigation handlers
  const navigateToAdSets = (campaign) => {
    setSelectedCampaign(campaign);
    setSelectedAdSet(null);
    setActiveTab('adsets');
  };

  const navigateToAds = (adset) => {
    setSelectedAdSet(adset);
    setActiveTab('ads');
  };

  if (!api) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', textAlign: 'center' }}>
        <AlertCircle className="w-12 h-12 text-primary" style={{ marginBottom: '16px' }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '8px' }}>Meta Ads no conectado</h2>
        <p style={{ color: 'var(--on-surface-variant)' }}>Ve a Configuración y conecta tu cuenta publicitaria para empezar.</p>
      </div>
    );
  }

  const renderStatus = (status) => {
    const isActive = status === 'ACTIVE';
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: isActive ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
        color: isActive ? '#10b981' : '#f59e0b',
        padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? '#10b981' : '#f59e0b' }} />
        {isActive ? 'Activo' : 'Pausado'}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative' }}>
      
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24,
          background: toast.type === 'error' ? '#BA1A1A' : '#1A7B45',
          color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
          zIndex: 9999, animation: 'fadeIn 0.3s', boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
        }}>
          {toast.msg}
        </div>
      )}

      {/* Drawers */}
      {activeTab === 'campaigns' && (
        <CampaignDrawer 
          api={api} isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} 
          campaign={editingItem} onSaved={handleSaved} 
        />
      )}
      {activeTab === 'adsets' && (
        <AdSetDrawer 
          api={api} isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} 
          adSet={editingItem} campaignId={selectedCampaign?.id} onSaved={handleSaved} 
        />
      )}
      {activeTab === 'ads' && (
        <AdDrawer 
          api={api} isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} 
          ad={editingItem} adSetId={selectedAdSet?.id} onSaved={handleSaved} 
        />
      )}

      {/* Header & Tabs */}
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <BarChart3 className="text-primary" /> Administrador de Anuncios
        </h2>
        
        <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 16 }}>
          <button 
            onClick={() => handleTabChange('campaigns')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 8, background: activeTab === 'campaigns' ? 'var(--surface-container-high)' : 'transparent', border: 'none', color: activeTab === 'campaigns' ? 'var(--on-surface)' : 'var(--on-surface-variant)', fontWeight: 600, cursor: 'pointer' }}
          >
            <Target size={16} /> Campañas
          </button>
          
          <ChevronRight size={16} color="var(--on-surface-variant)" style={{ alignSelf: 'center' }} />
          
          <button 
            onClick={() => handleTabChange('adsets')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 8, background: activeTab === 'adsets' ? 'var(--surface-container-high)' : 'transparent', border: 'none', color: activeTab === 'adsets' ? 'var(--on-surface)' : 'var(--on-surface-variant)', fontWeight: 600, cursor: 'pointer' }}
          >
            <Layers size={16} /> 
            Conjuntos de Anuncios 
            {selectedCampaign && <span style={{ fontSize: 11, background: 'var(--primary)', color: 'white', padding: '2px 6px', borderRadius: 10, marginLeft: 4 }}>1 Seleccionada</span>}
          </button>
          
          <ChevronRight size={16} color="var(--on-surface-variant)" style={{ alignSelf: 'center' }} />

          <button 
            onClick={() => handleTabChange('ads')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 8, background: activeTab === 'ads' ? 'var(--surface-container-high)' : 'transparent', border: 'none', color: activeTab === 'ads' ? 'var(--on-surface)' : 'var(--on-surface-variant)', fontWeight: 600, cursor: 'pointer' }}
          >
            <ImageIcon size={16} /> 
            Anuncios
            {selectedAdSet && <span style={{ fontSize: 11, background: 'var(--primary)', color: 'white', padding: '2px 6px', borderRadius: 10, marginLeft: 4 }}>1 Seleccionado</span>}
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button 
          onClick={handleCreate}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--primary)', color: '#fff', padding: '10px 20px', 
            borderRadius: 8, border: 'none', fontWeight: 'bold', cursor: 'pointer'
          }}
        >
          <Plus size={18} /> 
          Crear {activeTab === 'campaigns' ? 'Campaña' : activeTab === 'adsets' ? 'Conjunto' : 'Anuncio'}
        </button>
        <button 
          onClick={() => {
            if (activeTab === 'campaigns') loadCampaigns();
            else if (activeTab === 'adsets') loadAdSets(selectedCampaign?.id);
            else if (activeTab === 'ads') loadAds(selectedAdSet?.id);
          }}
          style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--surface-container)', color: 'var(--on-surface)', fontWeight: 600, cursor: 'pointer' }}
        >
          🔄 Refrescar
        </button>
      </div>

      {/* Current Selection Context */}
      {(activeTab === 'adsets' && selectedCampaign) && (
        <div style={{ fontSize: 13, color: 'var(--on-surface-variant)', background: 'var(--surface-container)', padding: '8px 16px', borderRadius: 8, display: 'inline-block' }}>
          Mostrando conjuntos para la campaña: <strong>{selectedCampaign.name}</strong>
        </div>
      )}
      {(activeTab === 'ads' && selectedAdSet) && (
        <div style={{ fontSize: 13, color: 'var(--on-surface-variant)', background: 'var(--surface-container)', padding: '8px 16px', borderRadius: 8, display: 'inline-block' }}>
          Mostrando anuncios para el conjunto: <strong>{selectedAdSet.name}</strong>
        </div>
      )}

      {/* Main Table Content */}
      <div className="table-container" style={{ padding: 0, minHeight: 400, borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
            <Loader2 className="w-10 h-10 text-primary" style={{ animation: 'spin 1s linear infinite'}} />
          </div>
        ) : (
          <table className="master-table">
            
            {activeTab === 'campaigns' && (
              <>
                <thead>
                  <tr>
                    <th>Estado</th>
                    <th>Nombre de la Campaña</th>
                    <th>Presupuesto</th>
                    <th>Objetivo</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: 32, color: 'var(--on-surface-variant)' }}>No hay campañas creadas.</td></tr>
                  ) : (
                    campaigns.map(camp => (
                      <tr key={camp.id}>
                        <td>{renderStatus(camp.status)}</td>
                        <td onClick={() => navigateToAdSets(camp)} style={{ cursor: 'pointer', fontWeight: 600 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {camp.name} <ChevronRight size={14} className="text-primary" />
                          </span>
                        </td>
                        <td>{camp.daily_budget ? fmtMoney(parseInt(camp.daily_budget)/100) + '/día' : 'CBO Desactivado'}</td>
                        <td><span style={{ fontSize: 11, background: 'var(--surface-container-high)', padding: '4px 8px', borderRadius: 6 }}>{camp.objective?.replace('OUTCOME_','')}</span></td>
                        <td>
                          <button onClick={() => handleEdit(camp)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}><Edit3 size={18} /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </>
            )}

            {activeTab === 'adsets' && (
              <>
                <thead>
                  <tr>
                    <th>Estado</th>
                    <th>Nombre del Conjunto</th>
                    <th>Presupuesto (ABO)</th>
                    <th>Optimización</th>
                    <th>Segmentación</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {adSets.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: 32, color: 'var(--on-surface-variant)' }}>No hay conjuntos de anuncios.</td></tr>
                  ) : (
                    adSets.map(set => (
                      <tr key={set.id}>
                        <td>{renderStatus(set.status)}</td>
                        <td onClick={() => navigateToAds(set)} style={{ cursor: 'pointer', fontWeight: 600 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {set.name} <ChevronRight size={14} className="text-primary" />
                          </span>
                        </td>
                        <td>{set.daily_budget ? fmtMoney(parseInt(set.daily_budget)/100) + '/día' : '-'}</td>
                        <td><span style={{ fontSize: 11, background: 'var(--surface-container-high)', padding: '4px 8px', borderRadius: 6 }}>{set.optimization_goal}</span></td>
                        <td><span style={{ fontSize: 12 }}>{set.targeting?.geo_locations?.countries?.join(', ')}</span></td>
                        <td>
                          <button onClick={() => handleEdit(set)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}><Edit3 size={18} /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </>
            )}

            {activeTab === 'ads' && (
              <>
                <thead>
                  <tr>
                    <th>Estado</th>
                    <th>Creativo</th>
                    <th>Nombre del Anuncio</th>
                    <th>Destino (URL)</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {ads.length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: 32, color: 'var(--on-surface-variant)' }}>No hay anuncios creados.</td></tr>
                  ) : (
                    ads.map(ad => {
                      const creative = ad.creative;
                      const linkData = creative?.object_story_spec?.link_data;
                      return (
                        <tr key={ad.id}>
                          <td>{renderStatus(ad.status)}</td>
                          <td>
                            {creative?.thumbnail_url || creative?.image_url ? (
                              <img src={creative.thumbnail_url || creative.image_url} alt="ad" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6 }} />
                            ) : (
                              <div style={{ width: 40, height: 40, background: 'var(--surface-container-high)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <ImageIcon size={20} color="var(--on-surface-variant)" />
                              </div>
                            )}
                          </td>
                          <td style={{ fontWeight: 600 }}>
                            {ad.name}
                            {linkData?.name && <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', fontWeight: 'normal', marginTop: 4 }}>{linkData.name}</div>}
                          </td>
                          <td>
                            {linkData?.link ? (
                              <a href={linkData.link} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontSize: 12 }}>Ver Enlace</a>
                            ) : '-'}
                          </td>
                          <td>
                            <button onClick={() => handleEdit(ad)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}><Edit3 size={18} /></button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </>
            )}

          </table>
        )}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
