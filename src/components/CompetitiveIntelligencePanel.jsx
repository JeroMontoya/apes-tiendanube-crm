import React, { useState, useEffect } from 'react';
import { 
  Target, TrendingUp, Search, Plus, ExternalLink, 
  ShoppingBag, Globe, Share2, Play, Image as ImageIcon,
  MessageCircle, ThumbsUp, BarChart2, Cpu, Loader2,
  CheckCircle2, MoreHorizontal, Info, Monitor, Smartphone
} from 'lucide-react';
import { analyzeAndClassifyAds } from '../services/aiAdClassifier';

// === Configuration ===
const FUNNEL_STAGES = [
  { id: 'perfil', label: 'VISITAS PERFIL', desc: 'Awareness / Descubrimiento' },
  { id: 'web', label: 'VISITAS WEB', desc: 'Consideración / Tráfico' },
  { id: 'venta', label: 'VENTA DIRECTA', desc: 'Conversión / BOFU' },
  { id: 'remarketing', label: 'REMARKETING', desc: 'Recuperación / Fidelización' }
];

const COMPETITORS = [
  { id: 'apes', name: 'APES ADVENTURE', isUs: true },
  { id: 'topara', name: 'TOPARA', badge: 'Mejor Rendimiento' },
  { id: 'qulybet', name: 'QULYBET' },
  { id: 'laskabran', name: 'LASKABRAN' },
  { id: 'columbia', name: 'COLUMBIA' },
];

// === Components ===

const AdCard = ({ ad }) => {
  const isVideo = ad.format === 'reel' || ad.format === 'video';
  
  // Generate stable mock data for the UI representation
  const mockData = React.useMemo(() => {
    const randomId = Math.floor(100000000000000 + Math.random() * 900000000000000).toString();
    const hasMultiple = Math.random() > 0.5;
    return {
      libraryId: randomId,
      startDate: '6 jul 2026', 
      hasMultiple: hasMultiple,
      advertiserName: ad.brand.charAt(0).toUpperCase() + ad.brand.slice(1),
      title: 'Hasta 40% OFF',
      subtitle: 'No te pierdas esta oportunidad'
    };
  }, [ad]);

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 8,
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      position: 'relative',
      overflow: 'hidden',
      color: 'var(--on-surface)',
      height: 'fit-content',
      width: '100%'
    }}>
      {/* Top Header Section (Status, ID, Date, Platforms) */}
      <div style={{ padding: '12px 12px 10px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10b981', fontSize: 12, fontWeight: 700 }}>
            <CheckCircle2 size={14} />
            Activo
          </div>
          <button style={{ background: 'none', border: 'none', color: 'var(--on-surface-variant)', cursor: 'pointer', padding: 0 }}>
            <MoreHorizontal size={18} />
          </button>
        </div>
        
        <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', marginBottom: 4 }}>
          Identificador de la biblioteca: {mockData.libraryId}
        </div>
        <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', marginBottom: 4 }}>
          En circulación desde el {mockData.startDate}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--on-surface-variant)', marginBottom: 10 }}>
          Plataformas
          <div style={{ display: 'flex', gap: 4, color: 'var(--on-surface-variant)' }}>
            <Monitor size={14} />
            <Smartphone size={14} />
            <MessageCircle size={14} />
            <Globe size={14} />
          </div>
        </div>

        {mockData.hasMultiple && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--on-surface-variant)', marginBottom: 10 }}>
            Este anuncio tiene varias versiones
            <Info size={14} />
          </div>
        )}

        <button style={{ width: '100%', padding: '8px 0', background: 'rgba(0,0,0,0.04)', border: 'none', borderRadius: 6, color: 'var(--on-surface)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}>
          Ver detalles del anuncio
        </button>
      </div>

      {/* Advertiser Header & Copy */}
      <div style={{ padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--surface-container-high)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: 'var(--on-surface)' }}>
            {ad.brand.substring(0, 3).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.1, color: 'var(--on-surface)' }}>{mockData.advertiserName}</div>
            <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', marginTop: 2 }}>Publicidad</div>
          </div>
        </div>

        <div style={{ fontSize: 13, color: 'var(--on-surface)', lineHeight: 1.4, marginBottom: 8, whiteSpace: 'pre-wrap' }}>
          {ad.copy}
        </div>
      </div>

      {/* Media placeholder */}
      <div style={{
        aspectRatio: '1 / 1', // Square to prevent massive vertical stretching
        width: '100%',
        background: 'var(--surface-container-high)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--on-surface-variant)',
        position: 'relative'
      }}>
        {isVideo ? (
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <Play size={24} fill="currentColor" style={{ marginLeft: 3 }} />
          </div>
        ) : (
           <ImageIcon size={36} opacity={0.4} />
        )}
      </div>

      {/* Bottom CTA Banner */}
      <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-container-lowest)', borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ flex: 1, paddingRight: 8, overflow: 'hidden' }}>
          <div style={{ fontSize: 10, color: 'var(--on-surface-variant)', textTransform: 'uppercase', marginBottom: 2 }}>{ad.brand}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mockData.title}</div>
          <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mockData.subtitle}</div>
        </div>
        <button style={{ padding: '6px 12px', background: 'rgba(0,0,0,0.04)', border: 'none', borderRadius: 4, color: 'var(--on-surface)', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
          Más info
        </button>
      </div>
    </div>
  );
};

export default function CompetitiveIntelligencePanel({ dateRange }) {
  const [activeTab, setActiveTab] = useState('pauta'); // 'pauta', 'precios'
  const [isClassifying, setIsClassifying] = useState(true);
  const [adMatrixData, setAdMatrixData] = useState(null);
  const [pricingData, setPricingData] = useState(null);
  const [seoData, setSeoData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsClassifying(true);
      try {
        const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : '';
        const [classified, pricingRes, seoRes] = await Promise.all([
          analyzeAndClassifyAds(),
          fetch(`${API_BASE}/api/competitors/pricing`).then(res => res.json()),
          fetch(`${API_BASE}/api/competitors/seo`).then(res => res.json())
        ]);
        setAdMatrixData(classified);
        setPricingData(pricingRes.data);
        setSeoData(seoRes.data);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setIsClassifying(false);
      }
    };

    fetchData();
  }, [dateRange]);

  if (isClassifying || !adMatrixData) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
        <Loader2 size={48} color="var(--primary)" className="spin" />
        <h2 style={{ color: 'var(--on-surface)', margin: 0, fontSize: 20 }}>Gemini AI Engine</h2>
        <p style={{ color: 'var(--on-surface-variant)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Cpu size={16} /> Extrayendo y clasificando la intención de los anuncios del mercado...
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40, height: '100%' }}>
      
      {/* Header */}
      <div className="section-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: 12 }}>
            Centro de Marketing Competitivo
            <span style={{ fontSize: 11, background: 'var(--primary-container)', color: 'var(--primary)', padding: '4px 10px', borderRadius: 12, fontWeight: 700 }}>
              AI Powered
            </span>
          </h1>
          <p style={{ fontSize: 14, color: 'var(--on-surface-variant)', margin: '4px 0 0' }}>
            Análisis profundo de mercado unificado para <strong>tiendaapes.com</strong>.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', gap: 32 }}>
        <button 
          onClick={() => setActiveTab('pauta')}
          style={{ 
            background: 'none', border: 'none', padding: '12px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            color: activeTab === 'pauta' ? 'var(--primary)' : 'var(--on-surface-variant)',
            borderBottom: activeTab === 'pauta' ? '2px solid var(--primary)' : '2px solid transparent',
            display: 'flex', alignItems: 'center', gap: 8
          }}
        >
          <Share2 size={16} /> Matriz de Pauta (Funnel)
        </button>
        <button 
          onClick={() => setActiveTab('precios')}
          style={{ 
            background: 'none', border: 'none', padding: '12px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            color: activeTab === 'precios' ? 'var(--primary)' : 'var(--on-surface-variant)',
            borderBottom: activeTab === 'precios' ? '2px solid var(--primary)' : '2px solid transparent',
            display: 'flex', alignItems: 'center', gap: 8
          }}
        >
          <BarChart2 size={16} /> Precios & SEO
        </button>
      </div>

      {activeTab === 'pauta' && (
        <div className="glass-card" style={{ padding: 24, overflowX: 'auto', width: '100%', maxWidth: 'calc(100vw - 32px)' }}>
          <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--on-surface)', margin: 0 }}>Referencias de Pauta Estratégica</h3>
            <a href="https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=CO&is_targeted_country=false&media_type=all&search_type=page&sort_data[direction]=desc&sort_data[mode]=total_impressions&view_all_page_id=101541715669629" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--primary)', textDecoration: 'none', background: 'var(--primary-container)', padding: '8px 16px', borderRadius: 8 }}>
              Auditar en Meta Ads Library <ExternalLink size={16} />
            </a>
          </div>

          <div style={{ width: 'max-content', minWidth: '100%' }}>
            {/* Grid Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '180px repeat(5, minmax(250px, 280px))', gap: 16, marginBottom: 16, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
              <div></div> {/* Empty top-left cell */}
              {COMPETITORS.map(comp => (
                <div key={comp.id} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: comp.isUs ? 'var(--primary)' : 'var(--on-surface)', marginBottom: 4 }}>
                    {comp.name}
                  </div>
                  {comp.badge && (
                    <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '2px 8px', borderRadius: 12 }}>
                      {comp.badge}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Grid Body */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              {FUNNEL_STAGES.map(stage => (
                <div key={stage.id} style={{ display: 'grid', gridTemplateColumns: '180px repeat(5, minmax(250px, 280px))', gap: 16, alignItems: 'start' }}>
                  {/* Stage Label */}
                  <div style={{ position: 'sticky', left: 0, paddingRight: 16 }}>
                    <div style={{ background: 'var(--surface-container-low)', padding: '16px', borderRadius: 8, border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--on-surface)', marginBottom: 4 }}>{stage.label}</div>
                      <div style={{ fontSize: 10, color: 'var(--on-surface-variant)' }}>{stage.desc}</div>
                    </div>
                  </div>

                  {/* Competitor Ads for this Stage */}
                  {COMPETITORS.map(comp => {
                    const ads = adMatrixData[comp.id]?.[stage.id] || [];
                    return (
                      <div key={comp.id} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {ads.length > 0 ? ads.map((ad, idx) => (
                          <AdCard key={idx} ad={ad} />
                        )) : (
                          <div style={{ height: 100, border: '1px dashed var(--border-subtle)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-surface-variant)', fontSize: 11 }}>
                            Sin pauta activa
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'precios' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {/* Merchant Center */}
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--on-surface)' }}>Merchant Center</div>
                  <div style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>ID: {pricingData?.merchantId}</div>
                </div>
              </div>
              <a href={`https://merchants.google.com/mc/overview?a=${pricingData?.merchantId}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                <ExternalLink size={16} />
              </a>
            </div>
            <p style={{ fontSize: 13, color: 'var(--on-surface-variant)', margin: '0 0 16px 0' }}>
              Precios un {pricingData?.leaderGap}% por debajo del líder (Topara). {pricingData?.approvalRate}% de productos aprobados.
            </p>
            <div style={{ height: 4, background: 'rgba(59,130,246,0.2)', borderRadius: 2 }}>
               <div style={{ width: `${pricingData?.approvalRate}%`, height: '100%', background: '#3b82f6', borderRadius: 2 }}></div>
            </div>
          </div>

          {/* Search Console */}
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(16,185,129,0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Globe size={20} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--on-surface)' }}>Search Console (SEO)</div>
                  <div style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>{seoData?.domain}</div>
                </div>
              </div>
              <a href={`https://search.google.com/search-console?utm_source=about-page&resource_id=https://www.${seoData?.domain}/`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                <ExternalLink size={16} />
              </a>
            </div>
            <p style={{ fontSize: 13, color: 'var(--on-surface-variant)', margin: '0 0 16px 0' }}>
              +{seoData?.clickGrowth}% clics orgánicos vs mes anterior. Oportunidad: {seoData?.opportunity}
            </p>
            <div style={{ height: 4, background: 'rgba(16,185,129,0.2)', borderRadius: 2 }}>
               <div style={{ width: '75%', height: '100%', background: '#10b981', borderRadius: 2 }}></div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
