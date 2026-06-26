import React, { useState } from 'react';
import { exportToCSV, exportForFacebookAds, exportForEmailMarketing } from '../utils/exportCSV.js';

export default function ExportPanel({ clients }) {
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const handleExport = (type, fn) => {
    // Aquí podés conectar un <select> para filtrar por segmento,
    // pero por ahora exportamos toda la base (o podrías pasar clients.filter...)
    fn(clients, `apes_${type}_${new Date().getTime()}.csv`);
    setToastMsg(`✅ Lista exportada con éxito (${clients.length} contactos)`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div className="export-panel">
      <div className="section-header">
        <h2>📤 Centro de Exportación</h2>
        <p>Generá listas optimizadas para tus plataformas publicitarias al instante.</p>
      </div>

      <div className="export-grid">
        <div className="glass-card export-card">
          <div className="export-icon">📊</div>
          <h4>CSV General (Backup)</h4>
          <p>Exporta toda la tabla maestra con todas las columnas para Excel o reportes internos.</p>
          <span className="export-count">{clients.length} contactos</span>
          <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => handleExport('general', exportToCSV)}>
            Descargar CSV
          </button>
        </div>

        <div className="glass-card export-card" style={{ borderTop: '3px solid #1E6FBA' }}>
          <div className="export-icon">📱</div>
          <h4>Facebook Ads (Custom Audiences)</h4>
          <p>Formato exacto requerido por Meta (Email, Phone, fn, ln, ct, country) para maximizar el match rate.</p>
          <span className="export-count">{clients.length} contactos</span>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => handleExport('fb_ads', exportForFacebookAds)}>
            Descargar para FB Ads
          </button>
        </div>

        <div className="glass-card export-card" style={{ borderTop: '3px solid #D4A843' }}>
          <div className="export-icon">📧</div>
          <h4>Klaviyo / Mailchimp</h4>
          <p>Exporta solo correos válidos y segmentos para campañas de email marketing directas.</p>
          <span className="export-count">{clients.filter(c => !c.email.includes('@noinformado.com')).length} contactos válidos</span>
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
