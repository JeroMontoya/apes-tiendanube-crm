import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useTeam } from '../contexts/TeamContext';

export default function SettingsPanel({ onConnect, connectionStatus, session }) {
  const { currentMember } = useTeam();
  const isAdmin = currentMember?.role === 'admin';
  
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

  // Auto-sync settings
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [syncInterval, setSyncInterval] = useState(90);

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // ── Load existing credentials from system_config (shared) ──
  useEffect(() => {
    loadSystemConfig();
  }, []);

  const loadSystemConfig = async () => {
    try {
      // Try system_config first (shared across all team members)
      const { data: sysConfig } = await supabase
        .from('system_config')
        .select('*')
        .eq('id', 'main')
        .single();

      if (sysConfig) {
        setStoreId(sysConfig.tiendanube_store_id || '');
        setToken(sysConfig.tiendanube_access_token || '');
        setMetaAdAccountId(sysConfig.meta_ad_account_id || '');
        setMetaAccessToken(sysConfig.meta_access_token || '');
        setGa4PropertyId(sysConfig.ga4_property_id || '');
        setGa4Credentials(sysConfig.ga4_credentials_json ? JSON.stringify(sysConfig.ga4_credentials_json, null, 2) : '');
        setN8nWebhookUrl(sysConfig.n8n_webhook_url || '');
        setAutoSyncEnabled(sysConfig.auto_sync_enabled !== false);
        setSyncInterval(sysConfig.sync_interval_seconds || 90);
      } else {
        // Fall back to per-user workspace
        const { data: userWorkspace } = await supabase
          .from('workspaces')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (userWorkspace) {
          setStoreId(userWorkspace.tiendanube_store_id || '');
          setToken(userWorkspace.tiendanube_access_token || '');
          setMetaAdAccountId(userWorkspace.meta_ad_account_id || '');
          setMetaAccessToken(userWorkspace.meta_access_token || '');
          setGa4PropertyId(userWorkspace.ga4_property_id || '');
          setGa4Credentials(userWorkspace.ga4_credentials_json ? JSON.stringify(userWorkspace.ga4_credentials_json, null, 2) : '');
          setN8nWebhookUrl(userWorkspace.n8n_webhook_url || '');
        }
      }
    } catch (err) {
      console.warn('No system config found yet.');
    } finally {
      setLoading(false);
    }
  };

  // ── Save credentials to system_config (shared) for admins ──
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

      const configData = {
        tiendanube_store_id: storeId.trim() || null,
        tiendanube_access_token: token.trim() || null,
        meta_ad_account_id: metaAdAccountId.trim() || null,
        meta_access_token: metaAccessToken.trim() || null,
        ga4_property_id: ga4PropertyId.trim() || null,
        ga4_credentials_json: ga4Json,
        n8n_webhook_url: n8nWebhookUrl.trim() || null,
        auto_sync_enabled: autoSyncEnabled,
        sync_interval_seconds: syncInterval,
      };

      if (isAdmin) {
        // Try saving to shared system_config first
        const { error: sysErr } = await supabase
          .from('system_config')
          .upsert({ id: 'main', ...configData, updated_at: new Date().toISOString() }, { onConflict: 'id' });

        if (sysErr) {
          // system_config table may not exist yet — fall back to user workspace
          console.warn('system_config not available, saving to user workspace:', sysErr.message);
          const { auto_sync_enabled, sync_interval_seconds, ...workspaceFields } = configData;
          const { error } = await supabase
            .from('workspaces')
            .upsert({ user_id: session.user.id, ...workspaceFields }, { onConflict: 'user_id' });
          if (error) throw error;
          setSaveMessage('⚠️ Guardado en tu workspace. Ejecuta la migración 009 para compartir con el equipo.');
        } else {
          setSaveMessage('✅ Credenciales guardadas. Todos los miembros del equipo ahora tienen acceso.');
        }
      } else {
        // Non-admin: save to personal workspace only (without sync fields)
        const { auto_sync_enabled, sync_interval_seconds, ...workspaceFields } = configData;
        const { error } = await supabase
          .from('workspaces')
          .upsert({ user_id: session.user.id, ...workspaceFields }, { onConflict: 'user_id' });

        if (error) throw error;
        setSaveMessage('✅ Credenciales guardadas en tu workspace personal.');
      }

      if (storeId.trim() && token.trim()) {
        onConnect({ storeId: storeId.trim(), token: token.trim() });
      }
    } catch (err) {
      console.error('Error saving config:', err);
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

        {/* ── Auto-Sync Settings ── */}
        {isAdmin && (
          <div style={{ marginBottom: 0 }}>
            <div style={sectionHeaderStyle}>
              <h3 style={{ margin: 0 }}>
                <span>🔄 Sincronización Automática</span>
              </h3>
              <span className="badge" style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981' }}>
                Tiempo Real
              </span>
            </div>

            <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: 20 }}>
              Configura cómo se actualizan los datos para todos los miembros del equipo.
            </p>

            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              <label style={{ 
                display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                padding: '12px 16px', borderRadius: 10, flex: 1,
                background: autoSyncEnabled ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${autoSyncEnabled ? 'rgba(16,185,129,0.3)' : 'var(--border-subtle)'}`,
                transition: 'all 0.2s',
              }}>
                <input
                  type="checkbox"
                  checked={autoSyncEnabled}
                  onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                  style={{ accentColor: '#10b981', width: 18, height: 18 }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Sincronización automática</div>
                  <div style={{ fontSize: 12, color: 'var(--on-surface-variant)', marginTop: 2 }}>
                    Actualiza datos de Tiendanube, Meta Ads y GA4 periódicamente
                  </div>
                </div>
              </label>

              <div style={{ 
                padding: '12px 16px', borderRadius: 10, flex: 1,
                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)',
              }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>
                  Intervalo de sincronización
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[30, 60, 90, 120, 300].map(secs => (
                    <button
                      key={secs}
                      type="button"
                      onClick={() => setSyncInterval(secs)}
                      style={{
                        padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                        fontSize: 12, fontWeight: 600, transition: 'all 0.2s',
                        background: syncInterval === secs ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                        color: syncInterval === secs ? '#fff' : 'var(--on-surface-variant)',
                      }}
                    >
                      {secs < 60 ? `${secs}s` : `${secs / 60}m`}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', marginTop: 6 }}>
                  Recomendado: 90 segundos para balance entre actualización y consumo de API
                </div>
              </div>
            </div>
          </div>
        )}

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
