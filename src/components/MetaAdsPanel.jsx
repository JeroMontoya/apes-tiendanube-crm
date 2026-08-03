import React, { useState, useEffect, useMemo } from 'react';
import { MetaAPI } from '../api/MetaAPI';
import { 
  Plus, Loader2, Edit3, Target, Layers, Image as ImageIcon, ChevronRight, BarChart3, AlertCircle,
  TrendingUp, TrendingDown, DollarSign, Users, Award, Trophy
} from 'lucide-react';
import CampaignDrawer from './MetaAds/CampaignDrawer';
import AdSetDrawer from './MetaAds/AdSetDrawer';
import AdDrawer from './MetaAds/AdDrawer';

const fmt = (v) => parseFloat(v || 0).toLocaleString('es-CO', { minimumFractionDigits: 0 });
const fmtMoney = (v) => '$' + parseFloat(v || 0).toLocaleString('es-CO', { minimumFractionDigits: 0 });

export default function MetaAdsPanel({ workspace, onRefreshMeta, clients, metaInsights, allGoogleAdsData, allTiktokData }) {
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

  // Attribution Logic
  const attribution = useMemo(() => {
    const metaList = (metaInsights?.campaigns || []);
    const googleList = (allGoogleAdsData?.campaigns || []);
    const tiktokList = (allTiktokData?.campaigns || []);
    const allCampaigns = [
      ...metaList.map(c => ({ ...c, platform: 'Meta', spend: c.spend || 0 })),
      ...googleList.map(c => ({ ...c, platform: 'Google', spend: c.cost || 0 })),
      ...tiktokList.map(c => ({ ...c, platform: 'TikTok', spend: c.spend || 0 })),
    ];
    const totalSpend = allCampaigns.reduce((s, c) => s + c.spend, 0);
    const totalConversions = allCampaigns.reduce((s, c) => s + (c.conversions || c.results || 0), 0);
    const totalRevenue = allCampaigns.reduce((s, c) => s + (c.revenue || 0), 0);
    const reportedROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const reportedCPA = totalConversions > 0 ? totalSpend / totalConversions : 0;
    const metaSpend = metaList.reduce((s, c) => s + (c.spend || 0), 0);
    const metaRevenue = metaList.reduce((s, c) => s + (c.revenue || 0), 0);
    const metaConversions = metaList.reduce((s, c) => s + (c.results || 0), 0);
    const metaReportedROAS = metaSpend > 0 ? metaRevenue / metaSpend : 0;
    const metaReportedCPA = metaConversions > 0 ? metaSpend / metaConversions : 0;
    return { allCampaigns, totalSpend, totalConversions, totalRevenue, reportedROAS, reportedCPA, metaSpend, metaRevenue, metaConversions, metaReportedROAS, metaReportedCPA };
  }, [metaInsights, allGoogleAdsData, allTiktokData]);

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
        background: isActive ? 'rgba(16,185,129,0.1)' : 'rgba(6, 182, 212,0.1)',
        color: isActive ? '#06B6D4' : 'var(--primary-container)',
        padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? '#06B6D4' : 'var(--primary-container)' }} />
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
          color: 'var(--on-surface)', padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
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

          <ChevronRight size={16} color="var(--on-surface-variant)" style={{ alignSelf: 'center' }} />

          <button 
            onClick={() => handleTabChange('attribution')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 8, background: activeTab === 'attribution' ? 'var(--surface-container-high)' : 'transparent', border: 'none', color: activeTab === 'attribution' ? 'var(--on-surface)' : 'var(--on-surface-variant)', fontWeight: 600, cursor: 'pointer' }}
          >
            <TrendingUp size={16} /> 
            Atribución ROAS
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button 
          onClick={handleCreate}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--primary)', color: 'var(--on-surface)', padding: '10px 20px', 
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
      <div className="table-container" style={{ padding: 0, minHeight: 400, borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
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

      {/* Attribution Tab Content */}
      {activeTab === 'attribution' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Hero ROAS Gauge */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <div style={{ background: 'var(--surface-container)', borderRadius: 16, padding: 24, textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 12, color: 'var(--on-surface-variant)', marginBottom: 8, fontWeight: 600 }} title="Autoreportado por Meta, Google y TikTok. No conciliado con la facturación real de Tiendanube.">ROAS REPORTADO (TODAS LAS PLATAFORMAS)</div>
              <div style={{ fontSize: 48, fontWeight: 900, color: attribution.reportedROAS >= 4 ? '#06B6D4' : attribution.reportedROAS >= 2 ? 'var(--primary-container)' : '#E11D48' }}>
                {attribution.reportedROAS.toFixed(2)}x
              </div>
              <div style={{ fontSize: 12, color: 'var(--on-surface-variant)', marginTop: 4 }}>
                {attribution.reportedROAS >= 4 ? 'Excelente' : attribution.reportedROAS >= 2 ? 'Bueno' : 'Necesita Optimización'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--on-surface-variant)', marginTop: 6, opacity: 0.7 }}>⚠ Autoreportado por cada plataforma — no conciliado con Tiendanube</div>
            </div>
            <div style={{ background: 'var(--surface-container)', borderRadius: 16, padding: 24, textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 12, color: 'var(--on-surface-variant)', marginBottom: 8, fontWeight: 600 }}>INVERSIÓN TOTAL</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--on-surface)' }}>
                ${attribution.totalSpend.toLocaleString('es-CO')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--on-surface-variant)', marginTop: 4 }}>
                {attribution.totalConversions} conversiones
              </div>
            </div>
            <div style={{ background: 'var(--surface-container)', borderRadius: 16, padding: 24, textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 12, color: 'var(--on-surface-variant)', marginBottom: 8, fontWeight: 600 }} title="Autoreportado por las plataformas. No conciliado con la facturación real de Tiendanube.">CPA REPORTADO</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--on-surface)' }}>
                ${attribution.reportedCPA.toLocaleString('es-CO')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--on-surface-variant)', marginTop: 4 }}>
                por conversión
              </div>
            </div>
          </div>

          {/* Meta Ads Attribution Detail */}
          <div style={{ background: 'var(--surface-container)', borderRadius: 16, padding: 24, border: '1px solid var(--border-subtle)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>📘</span> Meta Ads — Atribución Detallada
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 11, color: 'var(--on-surface-variant)', opacity: 0.8 }}>
              ⚠ Revenue y conversiones son lo que Meta reporta como atribuido a tus anuncios (ventana 7d clic / 1d vista).
              No están conciliados contra las órdenes reales de Tiendanube. No usar como base para decisiones de presupuesto.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
              <div style={{ background: 'rgba(99,102,241,0.08)', borderRadius: 12, padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', fontWeight: 600 }}>INVERSIÓN</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#6366f1' }}>${attribution.metaSpend.toLocaleString('es-CO')}</div>
              </div>
              <div style={{ background: 'rgba(16,185,129,0.08)', borderRadius: 12, padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', fontWeight: 600 }}>REVENUE (AUTOREPORTADO)</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#06B6D4' }}>${attribution.metaRevenue.toLocaleString('es-CO')}</div>
              </div>
              <div style={{ background: 'rgba(6, 182, 212,0.08)', borderRadius: 12, padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', fontWeight: 600 }}>ROAS (AUTOREPORTADO)</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: attribution.metaReportedROAS >= 3 ? '#06B6D4' : 'var(--primary-container)' }}>{attribution.metaReportedROAS.toFixed(2)}x</div>
              </div>
              <div style={{ background: 'rgba(239,68,68,0.08)', borderRadius: 12, padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', fontWeight: 600 }}>CPA (AUTOREPORTADO)</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#E11D48' }}>${attribution.metaReportedCPA.toLocaleString('es-CO')}</div>
              </div>
            </div>
            {attribution.allCampaigns.filter(c => c.platform === 'Meta').length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, color: 'var(--on-surface-variant)', fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid var(--border-subtle)' }}>Campaña</th>
                    <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: 11, color: 'var(--on-surface-variant)', fontWeight: 700 }}>Inversión</th>
                    <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: 11, color: 'var(--on-surface-variant)', fontWeight: 700 }}>Revenue</th>
                    <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: 11, color: 'var(--on-surface-variant)', fontWeight: 700 }}>ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  {attribution.allCampaigns.filter(c => c.platform === 'Meta').sort((a, b) => b.spend - a.spend).map((c, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--surface-container-low)' }}>
                      <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600 }}>{c.name}</td>
                      <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'right' }}>${c.spend.toLocaleString('es-CO')}</td>
                      <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'right', color: '#06B6D4' }}>${(c.revenue || 0).toLocaleString('es-CO')}</td>
                      <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'right', fontWeight: 700, color: (c.roas || 0) >= 3 ? '#06B6D4' : 'var(--primary-container)' }}>{(c.roas || 0).toFixed(2)}x</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Cross-platform comparison */}
          {attribution.allCampaigns.filter(c => c.platform !== 'Meta').length > 0 && (
            <div style={{ background: 'var(--surface-container)', borderRadius: 16, padding: 24, border: '1px solid var(--border-subtle)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>Comparación Multi-Plataforma</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, color: 'var(--on-surface-variant)', fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid var(--border-subtle)' }}>Plataforma</th>
                    <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: 11, color: 'var(--on-surface-variant)', fontWeight: 700 }}>Inversión</th>
                    <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: 11, color: 'var(--on-surface-variant)', fontWeight: 700 }}>Conversiones</th>
                    <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: 11, color: 'var(--on-surface-variant)', fontWeight: 700 }}>ROAS</th>
                    <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: 11, color: 'var(--on-surface-variant)', fontWeight: 700 }}>% del Presupuesto</th>
                  </tr>
                </thead>
                <tbody>
                  {['Meta', 'Google', 'TikTok'].map(platform => {
                    const platCampaigns = attribution.allCampaigns.filter(c => c.platform === platform);
                    const platSpend = platCampaigns.reduce((s, c) => s + c.spend, 0);
                    const platConv = platCampaigns.reduce((s, c) => s + (c.conversions || c.results || 0), 0);
                    const platROAS = platSpend > 0 ? platCampaigns.reduce((s, c) => s + (c.revenue || 0), 0) / platSpend : 0;
                    const pct = attribution.totalSpend > 0 ? ((platSpend / attribution.totalSpend) * 100).toFixed(1) : 0;
                    return platCampaigns.length > 0 ? (
                      <tr key={platform} style={{ borderBottom: '1px solid var(--surface-container-low)' }}>
                        <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700 }}>{platform === 'Meta' ? '📘' : platform === 'Google' ? '🔍' : '🎵'} {platform}</td>
                        <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'right' }}>${platSpend.toLocaleString('es-CO')}</td>
                        <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'right' }}>{platConv}</td>
                        <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'right', fontWeight: 700, color: platROAS >= 3 ? '#06B6D4' : 'var(--primary-container)' }}>{platROAS.toFixed(2)}x</td>
                        <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                            <div style={{ width: 60, height: 6, background: 'var(--border-medium)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: pct + '%', background: platform === 'Meta' ? '#6366f1' : platform === 'Google' ? '#34a853' : '#ff0050', borderRadius: 3 }} />
                            </div>
                            {pct}%
                          </div>
                        </td>
                      </tr>
                    ) : null;
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
