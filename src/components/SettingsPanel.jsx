import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function SettingsPanel({ onConnect, connectionStatus, session }) {
  const [storeId, setStoreId] = useState('');
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);

  // Meta Ads
  const [metaAdAccountId, setMetaAdAccountId] = useState('');
  const [metaAccessToken, setMetaAccessToken] = useState('');
  const [showMetaToken, setShowMetaToken] = useState(false);

  // Google Analytics 4
  const [ga4PropertyId, setGa4PropertyId] = useState('');
  const [ga4Credentials, setGa4Credentials] = useState('');

  // n8n
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // ── Load existing credentials from Supabase on mount ──
  useEffect(() => {
    loadWorkspace();
  }, []);

  const loadWorkspace = async () => {
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (data) {
        setStoreId(data.tiendanube_store_id || '');
        setToken(data.tiendanube_access_token || '');
        setMetaAdAccountId(data.meta_ad_account_id || '');
        setMetaAccessToken(data.meta_access_token || '');
        setGa4PropertyId(data.ga4_property_id || '');
        setGa4Credentials(data.ga4_credentials_json ? JSON.stringify(data.ga4_credentials_json, null, 2) : '');
        setN8nWebhookUrl(data.n8n_webhook_url || '');
      }
    } catch (err) {
      console.warn('No workspace found yet, user will create one on save.');
    } finally {
      setLoading(false);
    }
  };

  // ── Save all credentials to Supabase ──
  const handleSaveAll = async () => {
    setSaving(true);
    setSaveMessage('');

    try {
      let ga4Json = null;
      if (ga4Credentials.trim()) {
        try {
          ga4Json = JSON.parse(ga4Credentials);
        } catch {
          setSaveMessage('❌ El JSON de Google Analytics no es válido.');
          setSaving(false);
          return;
        }
      }

      const workspaceData = {
        user_id: session.user.id,
        tiendanube_store_id: storeId.trim() || null,
        tiendanube_access_token: token.trim() || null,
        meta_ad_account_id: metaAdAccountId.trim() || null,
        meta_access_token: metaAccessToken.trim() || null,
        ga4_property_id: ga4PropertyId.trim() || null,
        ga4_credentials_json: ga4Json,
        n8n_webhook_url: n8nWebhookUrl.trim() || null,
      };

      const { error } = await supabase
        .from('workspaces')
        .upsert(workspaceData, { onConflict: 'user_id' });

      if (error) throw error;

      setSaveMessage('✅ Credenciales guardadas de forma segura en Supabase.');

      // If TiendaNube credentials exist, trigger sync
      if (storeId.trim() && token.trim()) {
        onConnect({ storeId: storeId.trim(), token: token.trim() });
      }
    } catch (err) {
      console.error('Error saving workspace:', err);
      setSaveMessage(`❌ Error al guardar: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleConnect = (e) => {
    e.preventDefault();
    handleSaveAll();
  };

  if (loading) {
    return (
      <div className="settings-panel">
        <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: 'var(--on-surface-variant)' }}>Cargando configuración...</p>
        </div>
      </div>
    );
  }

  const sectionStyle = {
    marginBottom: 32,
    paddingBottom: 32,
    borderBottom: '1px solid var(--border-subtle)',
  };

  const sectionHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  };

  const statusDotStyle = (connected) => ({
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: connected ? 'var(--success)' : 'var(--on-surface-variant)',
    display: 'inline-block',
    marginRight: 6,
  });

  return (
    <div className="settings-panel">
      <div className="section-header">
        <h2>⚙️ Configuración del CRM</h2>
        <p>Conecta tus plataformas de marketing para alimentar el motor de remarketing omnicanal.</p>
      </div>

      <form onSubmit={handleConnect}>
        {/* ── TiendaNube Section ── */}
        <div className="glass-card settings-card">
          <div style={sectionStyle}>
            <div style={sectionHeaderStyle}>
              <h3 style={{ margin: 0 }}>
                <span>🛒 TiendaNube</span>
              </h3>
              <span className="badge" style={{ background: 'rgba(255,255,255,0.1)' }}>
                API REST v1
              </span>
            </div>

            <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: 20 }}>
              Tu tienda de e-commerce. Los clientes y pedidos se descargarán automáticamente.
            </p>

            <div className="form-group">
              <label>Store ID (ID de Tienda)</label>
              <input 
                type="number" 
                placeholder="Ej: 5048163" 
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Access Token</label>
              <div className="password-wrapper">
                <input 
                  type={showToken ? "text" : "password"} 
                  placeholder="Pegá tu token acá..." 
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
                <button type="button" className="password-toggle" onClick={() => setShowToken(!showToken)}>
                  {showToken ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>

            <div className="connection-status">
              Estado: 
              <span className={`status-dot ${connectionStatus}`}></span>
              <span style={{ textTransform: 'capitalize' }}>
                {connectionStatus === 'disconnected' && 'Desconectado'}
                {connectionStatus === 'connecting' && 'Sincronizando...'}
                {connectionStatus === 'connected' && 'Conectado y Sincronizado'}
              </span>
            </div>
          </div>

          {/* ── Meta Ads Section ── */}
          <div style={sectionStyle}>
            <div style={sectionHeaderStyle}>
              <h3 style={{ margin: 0 }}>
                <span>📘 Meta Ads (Facebook / Instagram)</span>
              </h3>
              <span className="badge" style={{ background: 'rgba(24,119,242,0.2)', color: '#1877F2' }}>
                Graph API v19.0
              </span>
            </div>

            <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: 20 }}>
              Conecta tu cuenta de Meta Business para ver el gasto, CPA y ROAS de tus campañas.
            </p>

            <div className="form-group">
              <label>Ad Account ID</label>
              <input 
                type="text" 
                placeholder="Ej: act_123456789" 
                value={metaAdAccountId}
                onChange={(e) => setMetaAdAccountId(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>System User Access Token</label>
              <div className="password-wrapper">
                <input 
                  type={showMetaToken ? "text" : "password"} 
                  placeholder="Pegá tu token de Meta Business acá..." 
                  value={metaAccessToken}
                  onChange={(e) => setMetaAccessToken(e.target.value)}
                />
                <button type="button" className="password-toggle" onClick={() => setShowMetaToken(!showMetaToken)}>
                  {showMetaToken ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>

            <div className="tip-box" style={{ background: 'rgba(24,119,242,0.05)', borderColor: 'rgba(24,119,242,0.2)' }}>
              <strong>¿Cómo obtengo el token de Meta?</strong><br/>
              1. Ve a <a href="https://business.facebook.com/settings/system-users" target="_blank" rel="noopener noreferrer" style={{ color: '#1877F2' }}>Meta Business → System Users</a><br/>
              2. Crea un System User con permiaje "ads_read"<br/>
              3. Genera un token y pégalo acá.
            </div>
          </div>

          {/* ── Google Analytics 4 Section ── */}
          <div style={{ marginBottom: 0 }}>
            <div style={sectionHeaderStyle}>
              <h3 style={{ margin: 0 }}>
                <span>📊 Google Analytics 4</span>
              </h3>
              <span className="badge" style={{ background: 'rgba(66,133,244,0.2)', color: '#4285F4' }}>
                Data API v1beta
              </span>
            </div>

            <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: 20 }}>
              Conecta tu GA4 para cruzar datos de tráfico web con ventas reales.
            </p>

            <div className="form-group">
              <label>GA4 Property ID</label>
              <input 
                type="text" 
                placeholder="Ej: 123456789" 
                value={ga4PropertyId}
                onChange={(e) => setGa4PropertyId(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Service Account JSON</label>
              <textarea 
                placeholder='Pega aquí el contenido del archivo JSON de la cuenta de servicio de Google Cloud...'
                value={ga4Credentials}
                onChange={(e) => setGa4Credentials(e.target.value)}
                rows={6}
                style={{
                  width: '100%',
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  resize: 'vertical',
                  background: 'var(--surface-container)',
                  color: 'var(--on-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 8,
                  padding: '12px 14px',
                }}
              />
            </div>

            <div className="tip-box" style={{ background: 'rgba(66,133,244,0.05)', borderColor: 'rgba(66,133,244,0.2)' }}>
              <strong>¿Cómo obtengo la Service Account?</strong><br/>
              1. Ve a <a href="https://console.cloud.google.com/iam-admin/serviceaccounts" target="_blank" rel="noopener noreferrer" style={{ color: '#4285F4' }}>Google Cloud → Service Accounts</a><br/>
              2. Crea una cuenta de servicio y genera una clave JSON<br/>
              3. Agrega el email de la cuenta como "Viewer" en GA4 → Admin → Property Access Management
            </div>
          </div>

          {/* ── n8n Webhook Section ── */}
          <div style={sectionStyle}>
            <div style={sectionHeaderStyle}>
              <h3 style={{ margin: 0 }}>
                <span>⚡ Automatizaciones n8n</span>
              </h3>
              <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
                Webhooks
              </span>
            </div>

            <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: 20 }}>
              Conecta APES CRM con tus flujos de n8n para disparar secuencias de Email, Slack y más.
            </p>

            <div className="form-group">
              <label>URL del Webhook (Catch Hook)</label>
              <input 
                type="url" 
                placeholder="Ej: https://n8n.tu-dominio.com/webhook/..." 
                value={n8nWebhookUrl}
                onChange={(e) => setN8nWebhookUrl(e.target.value)}
              />
            </div>
            <div className="tip-box" style={{ background: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
              <strong>¿Cómo funciona?</strong><br/>
              Pega aquí el Catch Webhook de n8n. Cuando exportes un segmento o cambies el estado de un ticket PQR, APES CRM enviará un POST a esta URL con los datos (payload).
            </div>
          </div>

        </div>

        {/* ── Save Button ── */}
        <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={saving}
            style={{ minWidth: 220 }}
          >
            {saving ? '⏳ Guardando...' : '💾 Guardar y Sincronizar'}
          </button>

          {saveMessage && (
            <span style={{ 
              fontSize: '0.85rem', 
              color: saveMessage.startsWith('✅') ? 'var(--success)' : 'var(--error)',
              animation: 'fadeIn 0.3s ease'
            }}>
              {saveMessage}
            </span>
          )}
        </div>
      </form>

      {/* ── Security Note ── */}
      <div className="glass-card" style={{ marginTop: 24, padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>🔒</span>
          <div>
            <strong style={{ fontSize: '0.9rem' }}>Seguridad de nivel empresarial</strong>
            <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', margin: '4px 0 0' }}>
              Tus credenciales se almacenan cifradas en Supabase con Row Level Security (RLS). 
              Solo tú puedes acceder a tus datos. Ningún token se almacena en tu navegador.
            </p>
          </div>
        </div>
      </div>

      {/* ── Logout Button ── */}
      <div style={{ marginTop: 20, textAlign: 'right' }}>
        <button 
          type="button"
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.reload();
          }}
          style={{
            background: 'transparent',
            border: '1px solid var(--border-subtle)',
            color: 'var(--on-surface-variant)',
            padding: '8px 16px',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: '0.85rem',
          }}
        >
          🚪 Cerrar Sesión
        </button>
      </div>
    </div>
  );
}
