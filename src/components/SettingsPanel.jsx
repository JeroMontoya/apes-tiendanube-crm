import React, { useEffect, useState } from 'react';
import { useTeam } from '../contexts/TeamContext';
import { supabase } from '../lib/supabase';
import { Settings, ShoppingBag, Globe, Save, CheckCircle, AlertCircle, Eye, EyeOff, Megaphone, Music, BarChart3 } from 'lucide-react';

export default function SettingsPanel({ connectionStatus, session, workspaceData, onSaveWorkspace }) {
  const { currentMember, logout } = useTeam();
  const isAdmin = currentMember?.role === 'admin';
  const [pulse, setPulse] = useState(false);

  const [mcMerchantId, setMcMerchantId] = useState('');
  const [mcCredentials, setMcCredentials] = useState('');
  const [scSiteUrl, setScSiteUrl] = useState('');
  const [scCredentials, setScCredentials] = useState('');
  const [gadsCustomerId, setGadsCustomerId] = useState('');
  const [gadsClientId, setGadsClientId] = useState('');
  const [gadsClientSecret, setGadsClientSecret] = useState('');
  const [gadsRefreshToken, setGadsRefreshToken] = useState('');
  const [gadsDeveloperToken, setGadsDeveloperToken] = useState('');
  const [tiktokAdvId, setTiktokAdvId] = useState('');
  const [tiktokToken, setTiktokToken] = useState('');
  const [tiktokSecret, setTiktokSecret] = useState('');
  const [ga4PropertyId, setGa4PropertyId] = useState('');
  const [ga4Credentials, setGa4Credentials] = useState('');
  const [ga4ReuseMC, setGa4ReuseMC] = useState(true);
  const [showMcCreds, setShowMcCreds] = useState(false);
  const [showScCreds, setShowScCreds] = useState(false);
  const [showGa4Creds, setShowGa4Creds] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    const interval = setInterval(() => setPulse(p => !p), 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (workspaceData) {
      setMcMerchantId(workspaceData.merchant_center_merchant_id || '');
      setMcCredentials(workspaceData.merchant_center_credentials_json || '');
      setScSiteUrl(workspaceData.search_console_site_url || '');
      setScCredentials(workspaceData.search_console_credentials_json || '');
      setGa4PropertyId(workspaceData.ga4_property_id || '');
      setGa4Credentials(workspaceData.ga4_credentials_json || '');
      setGa4ReuseMC(!workspaceData.ga4_credentials_json);
      setGadsCustomerId(workspaceData.google_ads_customer_id || '');
      setGadsClientId(workspaceData.google_ads_client_id || '');
      setGadsClientSecret(workspaceData.google_ads_client_secret || '');
      setGadsRefreshToken(workspaceData.google_ads_refresh_token || '');
      setGadsDeveloperToken(workspaceData.google_ads_developer_token || '');
      setTiktokAdvId(workspaceData.tiktok_advertiser_id || '');
      setTiktokToken(workspaceData.tiktok_access_token || '');
      setTiktokSecret(workspaceData.tiktok_app_secret || '');
    }
  }, [workspaceData]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      // Save GA4 settings to system_config (which has the columns)
      const finalGa4Creds = ga4ReuseMC ? mcCredentials.trim() : ga4Credentials.trim();
      const { error: ga4Err } = await supabase
        .from('system_config')
        .upsert({ id: 'main', ga4_property_id: ga4PropertyId.trim(), ga4_credentials_json: finalGa4Creds }, { onConflict: 'id' });
      if (ga4Err) console.warn('[Settings] GA4 save warning:', ga4Err.message);

      // Save the rest to workspace
      await onSaveWorkspace({
        merchant_center_merchant_id: mcMerchantId.trim(),
        merchant_center_credentials_json: mcCredentials.trim(),
        search_console_site_url: scSiteUrl.trim(),
        search_console_credentials_json: scCredentials.trim(),
        google_ads_customer_id: gadsCustomerId.trim(),
        google_ads_client_id: gadsClientId.trim(),
        google_ads_client_secret: gadsClientSecret.trim(),
        google_ads_refresh_token: gadsRefreshToken.trim(),
        google_ads_developer_token: gadsDeveloperToken.trim(),
        tiktok_advertiser_id: tiktokAdvId.trim(),
        tiktok_access_token: tiktokToken.trim(),
        tiktok_app_secret: tiktokSecret.trim(),
      });
      setSaveMsg('Configuración guardada correctamente');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (e) {
      setSaveMsg('Error al guardar: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const IntegracionCard = ({ title, status, desc, icon }) => (
    <div className="glass-card" style={{
      padding: '20px 24px',
      marginBottom: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid var(--border-subtle)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0, width: '3px',
        background: status === 'active' ? 'var(--success)' : 'var(--on-surface-variant)'
      }} />
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: 'var(--border-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <h3 style={{ margin: '0 0 3px', fontSize: 14, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: 8 }}>
          {title}
          <span style={{
            fontSize: 9, padding: '2px 7px', borderRadius: 10,
            background: status === 'active' ? 'rgba(16,185,129,0.1)' : 'var(--border-medium)',
            color: status === 'active' ? '#10b981' : 'var(--on-surface-variant)',
            textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700
          }}>
            {status === 'active' ? 'Activo' : 'Inactivo'}
          </span>
        </h3>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--on-surface-variant)' }}>{desc}</p>
      </div>
      {status === 'active' && (
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          background: 'var(--success)',
          boxShadow: pulse ? '0 0 12px var(--success)' : 'none',
          transition: 'all 1s ease', flexShrink: 0,
        }} />
      )}
    </div>
  );

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 8,
    border: '1px solid var(--border-medium)', background: 'rgba(0,0,0,0.3)',
    color: 'var(--on-surface)', fontSize: 13, outline: 'none', fontFamily: 'monospace',
    transition: 'border-color 0.2s',
  };

  const labelStyle = {
    fontSize: 11, fontWeight: 700, color: 'var(--on-surface-variant)',
    textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6, display: 'block',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeIn 0.4s ease-out' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{ padding: 10, background: 'rgba(99, 102, 241, 0.1)', borderRadius: 12, border: '1px solid rgba(99, 102, 241, 0.2)' }}>
            <Settings size={22} color="#6366f1" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: 'var(--on-surface)' }}>Centro de Integraciones</h1>
            <p style={{ fontSize: 12, color: 'var(--on-surface-variant)', margin: '2px 0 0' }}>Configuración de credenciales y servicios externos</p>
          </div>
        </div>
      </div>

      {/* Active Integrations */}
      <div>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--on-surface)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Servicios Activos</h3>
        <IntegracionCard title="TiendaNube Core API" desc="Clientes, productos y órdenes en tiempo real." status={connectionStatus === 'connected' ? 'active' : 'active'} icon="🛍️" />
        <IntegracionCard title="Meta Graph API v19.0" desc="Campañas y analítica de pauta publicitaria." status="active" icon="📘" />
        <IntegracionCard title="Google Analytics 4" desc="Tráfico y conversiones via Service Account." status="active" icon="📊" />
        <IntegracionCard title="n8n Webhook Engine" desc="Automatizaciones de flujos de trabajo." status="active" icon="⚡" />
        <IntegracionCard title="Merchant Center" desc="Productos, feeds y performance de Shopping." status={mcMerchantId && mcCredentials ? 'active' : 'inactive'} icon="🛒" />
        <IntegracionCard title="Search Console" desc="SEO orgánico: queries, páginas y posicionamiento." status={scSiteUrl && scCredentials ? 'active' : 'inactive'} icon="🔍" />
      </div>

      {/* Merchant Center Config */}
      <div className="glass-card" style={{ padding: 24, borderLeft: '3px solid #06b6d4' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <ShoppingBag size={20} color="#06b6d4" />
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--on-surface)' }}>Google Merchant Center</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Merchant ID</label>
            <input
              type="text"
              placeholder="Ej: 1234567890"
              value={mcMerchantId}
              onChange={e => setMcMerchantId(e.target.value)}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'rgba(6,182,212,0.5)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-medium)'}
            />
          </div>
          <div>
            <label style={labelStyle}>Service Account JSON</label>
            <div style={{ position: 'relative' }}>
              <textarea
                placeholder='Pega aquí el JSON completo del Service Account de Google Cloud...'
                value={mcCredentials}
                onChange={e => setMcCredentials(e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 60, paddingRight: 40 }}
                onFocus={e => e.target.style.borderColor = 'rgba(6,182,212,0.5)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-medium)'}
              />
            </div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', background: 'rgba(6,182,212,0.05)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(6,182,212,0.1)' }}>
          <strong style={{ color: '#06b6d4' }}>Instrucciones:</strong> Crea un Service Account en Google Cloud Console con permisos <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 4px', borderRadius: 3 }}>Merchant Center Admin</code>, genera una clave JSON y pega el contenido aquí. El Merchant ID lo encuentras en Google Merchant Center → Configuración → Cuenta.
        </div>
      </div>

      {/* Google Analytics 4 Config */}
      <div className="glass-card" style={{ padding: 24, borderLeft: '3px solid var(--primary-container)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <BarChart3 size={20} color="var(--primary-container)" />
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--on-surface)' }}>Google Analytics 4</h3>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Property ID</label>
          <input
            type="text"
            placeholder="Ej: 123456789 (número, sin guiones)"
            value={ga4PropertyId}
            onChange={e => setGa4PropertyId(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="checkbox"
            id="ga4-reuse-mc"
            checked={ga4ReuseMC}
            onChange={e => setGa4ReuseMC(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: 'var(--primary-container)' }}
          />
          <label htmlFor="ga4-reuse-mc" style={{ fontSize: 13, color: 'var(--on-surface)', cursor: 'pointer' }}>
            Reutilizar credenciales de Merchant Center (mismo Service Account)
          </label>
        </div>
        {!ga4ReuseMC && (
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Service Account JSON (separado)</label>
            <textarea
              placeholder='JSON del Service Account para GA4...'
              value={ga4Credentials}
              onChange={e => setGa4Credentials(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }}
            />
          </div>
        )}
        <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', background: 'rgba(245,158,11,0.05)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(245,158,11,0.1)' }}>
          <strong style={{ color: 'var(--primary-container)' }}>Instrucciones:</strong> El Property ID es un número que encuentras en GA4 → Administrador → Detalles del Flujo de Datos → Stream Web. El Service Account debe tener permisos de <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 4px', borderRadius: 3 }}>Lector</code> en tu propiedad GA4.
        </div>
      </div>

      {/* Search Console Config */}
      <div className="glass-card" style={{ padding: 24, borderLeft: '3px solid #4285f4' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Globe size={20} color="#4285f4" />
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--on-surface)' }}>Google Search Console</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Site URL</label>
            <input
              type="url"
              placeholder="Ej: https://mitienda.com"
              value={scSiteUrl}
              onChange={e => setScSiteUrl(e.target.value)}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'rgba(66,133,244,0.5)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-medium)'}
            />
          </div>
          <div>
            <label style={labelStyle}>Service Account JSON</label>
            <div style={{ position: 'relative' }}>
              <textarea
                placeholder='Pega aquí el JSON completo del Service Account de Google Cloud...'
                value={scCredentials}
                onChange={e => setScCredentials(e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 60, paddingRight: 40 }}
                onFocus={e => e.target.style.borderColor = 'rgba(66,133,244,0.5)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-medium)'}
              />
            </div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', background: 'rgba(66,133,244,0.05)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(66,133,244,0.1)' }}>
          <strong style={{ color: '#4285f4' }}>Instrucciones:</strong> Crea un Service Account en Google Cloud Console con permisos <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 4px', borderRadius: 3 }}>Propietario o Editor</code> en Search Console. Genera una clave JSON y pega el contenido. La Site URL debe coincidir exactamente con la registrada en Search Console (con https://).
        </div>
      </div>

      {/* Google Ads Config */}
      <div className="glass-card" style={{ padding: 24, borderLeft: '3px solid #34a853' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Megaphone size={20} color="#34a853" />
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--on-surface)' }}>Google Ads</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Customer ID</label>
            <input type="text" placeholder="Ej: 123-456-7890" value={gadsCustomerId} onChange={e => setGadsCustomerId(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Developer Token</label>
            <input type="text" placeholder="Tu developer token de Google Ads API" value={gadsDeveloperToken} onChange={e => setGadsDeveloperToken(e.target.value)} style={inputStyle} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Client ID (OAuth2)</label>
            <input type="text" placeholder="xxx.apps.googleusercontent.com" value={gadsClientId} onChange={e => setGadsClientId(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Client Secret (OAuth2)</label>
            <input type="password" placeholder="GOCSPX-..." value={gadsClientSecret} onChange={e => setGadsClientSecret(e.target.value)} style={inputStyle} />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Refresh Token</label>
          <input type="password" placeholder="1//0..." value={gadsRefreshToken} onChange={e => setGadsRefreshToken(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', background: 'rgba(52,168,83,0.05)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(52,168,83,0.1)' }}>
          <strong style={{ color: '#34a853' }}>Instrucciones:</strong> Necesitas crear un proyecto en Google Cloud Console, habilitar la Google Ads API, crear credenciales OAuth2, y obtener un refresh token con el OAuth Playground. El Developer Token lo obtienes al solicitar acceso a la Google Ads API.
        </div>
      </div>

      {/* TikTok Ads Config */}
      <div className="glass-card" style={{ padding: 24, borderLeft: '3px solid #ff0050' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Music size={20} color="#ff0050" />
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--on-surface)' }}>TikTok Ads</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Advertiser ID</label>
            <input type="text" placeholder="Tu TikTok Advertiser ID" value={tiktokAdvId} onChange={e => setTiktokAdvId(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Access Token</label>
            <input type="password" placeholder=" TOKEN DE ACCESO" value={tiktokToken} onChange={e => setTiktokToken(e.target.value)} style={inputStyle} />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>App Secret</label>
          <input type="password" placeholder="Tu TikTok App Secret" value={tiktokSecret} onChange={e => setTiktokSecret(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', background: 'rgba(255,0,80,0.05)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,0,80,0.1)' }}>
          <strong style={{ color: '#ff0050' }}>Instrucciones:</strong> Crea una app en TikTok Marketing Platform (business-api.tiktok.com), genera un Access Token de largo plazo, y obtén el App Secret. El Advertiser ID lo encuentras en tu cuenta de TikTok Ads.
        </div>
      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ fontSize: 13, color: saveMsg.includes('Error') ? '#ef4444' : '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          {saveMsg && (saveMsg.includes('Error') ? <AlertCircle size={16} /> : <CheckCircle size={16} />)}
          {saveMsg}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderRadius: 12,
            border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: 'var(--on-surface)', fontWeight: 700, fontSize: 14, cursor: saving ? 'wait' : 'pointer',
            boxShadow: '0 4px 20px rgba(99,102,241,0.3)', transition: 'all 0.2s',
          }}
        >
          <Save size={16} /> {saving ? 'Guardando...' : 'Guardar Configuración'}
        </button>
      </div>

      {/* Info Card */}
      <div className="glass-card" style={{ padding: '16px 20px', background: 'rgba(59, 130, 246, 0.03)', borderColor: 'rgba(59, 130, 246, 0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>🛡️</span>
          <div>
            <strong style={{ fontSize: 12, color: '#60a5fa' }}>Infraestructura Segura</strong>
            <p style={{ fontSize: 11, color: 'var(--on-surface-variant)', margin: '2px 0 0', lineHeight: 1.5 }}>
              Las credenciales se almacenan de forma segura en Supabase. Puedes configurar Merchant Center y Search Console también via Environment Variables (VITE_MERCHANT_CENTER_MERCHANT_ID, etc.) que tienen prioridad.
            </p>
          </div>
        </div>
      </div>

      {/* Logout */}
      <div style={{ textAlign: 'right', borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
        <button
          type="button"
          onClick={async () => { await logout(); window.location.reload(); }}
          style={{
            background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444', padding: '10px 20px', borderRadius: 8, cursor: 'pointer',
            fontSize: 12, fontWeight: 600, transition: 'all 0.2s',
          }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
          onMouseOut={e => e.currentTarget.style.background = 'transparent'}
        >
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}
