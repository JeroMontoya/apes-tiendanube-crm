import React, { useState, useMemo } from 'react';
import { exportToCSV, exportForFacebookAds, exportForEmailMarketing } from '../utils/exportCSV.js';

export default function ExportPanel({ clients, n8nWebhookUrl }) {
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [selectedTag, setSelectedTag] = useState('all');

  const TAGS = [
    { value: 'all', label: 'Todos los clientes' },
    { value: 'fiel', label: 'Clientes Fieles (4+ compras)' },
    { value: 'repetidor', label: 'Repetidores (2-3 compras)' },
    { value: 'nuevo', label: 'Nuevos (1 compra)' },
    { value: 'sin_compra', label: 'Leads / Sin compras' },
    { value: 'alto_valor', label: 'Alto Valor (>500K)' },
    { value: 'riesgo_churn', label: 'Riesgo de Fuga (>90 días)' },
    { value: 'dormido', label: 'Dormidos (>180 días)' },
    { value: 'sensible_precio', label: 'Caza Descuentos (Sensibles a Precio)' },
    { value: 'vip_coleccion', label: 'Comprador Ed. Limitadas' }
  ];

  const filteredClients = useMemo(() => {
    if (selectedTag === 'all') return clients;
    return clients.filter(c => c.segmentTags?.includes(selectedTag));
  }, [clients, selectedTag]);

  const handleExport = (type, fn) => {
    fn(filteredClients, `apes_${type}_${selectedTag}_${new Date().getTime()}.csv`);
    
    // Disparar Webhook de n8n si está configurado
    if (n8nWebhookUrl) {
      fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'segment_exported',
          segment: selectedTag,
          exportType: type,
          count: filteredClients.length,
          timestamp: new Date().toISOString()
        })
      }).catch(err => console.warn('Error disparando webhook n8n:', err));
    }

    setToastMsg(`✅ Lista exportada con éxito (${filteredClients.length} contactos)`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div className="export-panel">
      <div className="section-header" style={{ marginBottom: 24 }}>
        <h2>📤 Centro de Exportación</h2>
        <p>Generá listas optimizadas para tus plataformas publicitarias al instante.</p>
        
        <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ fontWeight: 600, color: 'var(--on-surface)' }}>Filtrar por Etiqueta:</label>
          <select 
            value={selectedTag}
            onChange={e => setSelectedTag(e.target.value)}
            style={{ 
              padding: '10px 16px', borderRadius: 8, border: '1px solid var(--border-subtle)', 
              background: 'var(--surface-container)', color: 'var(--on-surface)', fontSize: 14,
              minWidth: 250, outline: 'none'
            }}
          >
            {TAGS.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="export-grid">
        <div className="glass-card export-card">
          <div className="export-icon">📊</div>
          <h4>CSV General (Backup)</h4>
          <p>Exporta toda la tabla filtrada con todas las columnas para Excel o reportes internos.</p>
          <span className="export-count">{filteredClients.length} contactos</span>
          <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => handleExport('general', exportToCSV)}>
            Descargar CSV
          </button>
        </div>

        <div className="glass-card export-card" style={{ borderTop: '3px solid #1E6FBA' }}>
          <div className="export-icon">📱</div>
          <h4>Facebook Ads (Custom Audiences)</h4>
          <p>Formato exacto requerido por Meta (Email, Phone, fn, ln, ct, country) para maximizar el match rate.</p>
          <span className="export-count">{filteredClients.length} contactos</span>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => handleExport('fb_ads', exportForFacebookAds)}>
            Descargar para FB Ads
          </button>
        </div>

        <div className="glass-card export-card" style={{ borderTop: '3px solid #D4A843' }}>
          <div className="export-icon">📧</div>
          <h4>Klaviyo / Mailchimp</h4>
          <p>Exporta solo correos válidos de la selección para campañas de email marketing directas.</p>
          <span className="export-count">{filteredClients.filter(c => !c.email?.includes('@noinformado.com')).length} contactos válidos</span>
          <button className="btn btn-gold" style={{ width: '100%' }} onClick={() => handleExport('email', exportForEmailMarketing)}>
            Descargar para Emails
          </button>
        </div>
      </div>

      {showToast && (
        <div className="toast">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
