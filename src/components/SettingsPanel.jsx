import React, { useState } from 'react';

export default function SettingsPanel({ onConnect, connectionStatus }) {
  const [storeId, setStoreId] = useState('');
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);

  const handleConnect = (e) => {
    e.preventDefault();
    const cleanStoreId = storeId.trim();
    const cleanToken = token.trim();
    if (cleanStoreId && cleanToken) {
      onConnect({ storeId: cleanStoreId, token: cleanToken });
    }
  };

  return (
    <div className="settings-panel">
      <div className="section-header">
        <h2>⚙️ Configuración del CRM</h2>
        <p>Conectá tu TiendaNube para alimentar el motor de remarketing en tiempo real.</p>
      </div>

      <div className="glass-card settings-card">
        <h3 className="flex-between" style={{ marginBottom: '16px' }}>
          <span>🔗 Conexión TiendaNube</span>
          <span className="badge" style={{ background: 'rgba(255,255,255,0.1)' }}>
            API REST v1
          </span>
        </h3>
        
        <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '24px' }}>
          Ingresá tu Store ID y Access Token de TiendaNube. Los datos se descargarán y cruzarán automáticamente con tu base histórica (sin duplicados).
        </p>

        <form onSubmit={handleConnect}>
          <div className="form-group">
            <label>Store ID (ID de Tienda)</label>
            <input 
              type="number" 
              placeholder="Ej: 123456" 
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Access Token (API Key)</label>
            <div className="password-wrapper">
              <input 
                type={showToken ? "text" : "password"} 
                placeholder="Pegá tu token acá..." 
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
              />
              <button 
                type="button" 
                className="password-toggle"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary mt-md" disabled={connectionStatus === 'connecting'}>
            {connectionStatus === 'connecting' ? '⏳ Sincronizando...' : '🔄 Sincronizar Datos'}
          </button>
        </form>

        <div className="connection-status">
          Estado: 
          <span className={`status-dot ${connectionStatus}`}></span>
          <span style={{ textTransform: 'capitalize' }}>
            {connectionStatus === 'disconnected' && 'Desconectado'}
            {connectionStatus === 'connecting' && 'Sincronizando...'}
            {connectionStatus === 'connected' && 'Conectado y Sincronizado'}
          </span>
        </div>

        <div className="tip-box">
          <strong>¿Seguridad del Token?</strong><br/>
          Tu token de acceso se almacena localmente en tu navegador. El CRM se conecta directamente a TiendaNube desde tu computadora sin pasar por servidores intermediarios (Arquitectura Serverless Edge).
        </div>
      </div>
    </div>
  );
}
