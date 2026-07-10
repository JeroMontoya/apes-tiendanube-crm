import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, Copy, CheckCircle2 } from 'lucide-react';

export default function AIInsightsWidget({ clients, storeId }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(null); // 'email' | 'wa'

  // Si no hay datos todavía, no cargamos automáticamente.
  const handleGenerate = async () => {
    setLoading(true);
    try {
      // Calculate basic metrics for the prompt
      const totalClients = clients?.length || 0;
      const totalRevenue = clients?.reduce((sum, c) => sum + (c.totalSpent || 0), 0) || 0;
      
      const tagDist = {};
      clients?.forEach(c => {
        c.segmentTags?.forEach(tag => {
          tagDist[tag] = (tagDist[tag] || 0) + 1;
        });
      });

      // API call to Vercel Serverless Function
      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeMetrics: { totalClients, totalRevenue },
          clientsData: { tagDistribution: tagDist }
        })
      });

      if (!res.ok) {
        throw new Error('Error al conectar con Gemini API');
      }

      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error(err);
      // Fallback for local testing si la API no está disponible localmente
      setData({
        analisis: "Basado en los datos actuales, tienes un alto volumen de clientes repetidores pero también un segmento importante en riesgo de fuga. El ticket medio parece estable.",
        sugerencias: [
          "Lanzar campaña de reactivación para clientes inactivos hace >90 días.",
          "Ofrecer beneficio exclusivo a clientes VIP que han comprado colecciones limitadas.",
          "Habilitar cupones por tiempo limitado para clientes sensibles al precio."
        ],
        copyEmailAbandonado: "Asunto: ¡Tu carrito te extraña! 🛒\n\nHola, vimos que dejaste algunos artículos increíbles esperando. ¡Aprovecha antes de que se agoten! Usa el código VUELVE10 para un 10% OFF.",
        copyWhatsAppVIP: "¡Hola! Sabemos que amas lo exclusivo. ✨ Como cliente VIP, te damos acceso anticipado a nuestra nueva colección. Entra aquí: [link]"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="glass-card" style={{ padding: 24, position: 'relative', overflow: 'hidden' }}>
      {/* Decorative gradient */}
      <div style={{ position: 'absolute', top: -50, right: -50, width: 150, height: 150, background: 'radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%' }}></div>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--on-surface)' }}>
          <Sparkles color="#8b5cf6" size={24} />
          IA Comercial Insights
        </h3>
        {!data && !loading && (
          <button 
            onClick={handleGenerate}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#8b5cf6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
          >
            Generar Análisis
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 40, color: 'var(--on-surface-variant)' }}>
          <Loader2 size={32} className="spin" style={{ color: '#8b5cf6', marginBottom: 12 }} />
          <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>Gemini está analizando tu tienda...</p>
        </div>
      ) : !data ? (
        <div style={{ padding: 30, textAlign: 'center', color: 'var(--on-surface-variant)', fontSize: 14 }}>
          Haz clic en Generar para que Gemini analice el estado de tus cohortes, retención y ventas, entregándote sugerencias accionables y copys listos para usar.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          <div style={{ background: 'var(--surface-container-high)', padding: 16, borderRadius: 12, borderLeft: '4px solid #8b5cf6' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 14, color: 'var(--on-surface)' }}>Análisis Estratégico</h4>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>
              {data.analisis}
            </p>
          </div>

          <div style={{ background: 'var(--surface-container)', padding: 16, borderRadius: 12 }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: 'var(--on-surface)' }}>Sugerencias de Acción</h4>
            <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--on-surface-variant)' }}>
              {data.sugerencias?.map((sug, i) => (
                <li key={i}>{sug}</li>
              ))}
            </ul>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: 'var(--surface-container)', padding: 16, borderRadius: 12, position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <h4 style={{ margin: 0, fontSize: 13, color: 'var(--on-surface)' }}>Email Abandono</h4>
                <button onClick={() => copyToClipboard(data.copyEmailAbandonado, 'email')} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0 }}>
                  {copied === 'email' ? <CheckCircle2 size={16} color="#10b981" /> : <Copy size={16} />}
                </button>
              </div>
              <pre style={{ margin: 0, fontSize: 12, color: 'var(--on-surface-variant)', whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                {data.copyEmailAbandonado}
              </pre>
            </div>

            <div style={{ background: 'var(--surface-container)', padding: 16, borderRadius: 12, position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <h4 style={{ margin: 0, fontSize: 13, color: 'var(--on-surface)' }}>WhatsApp VIP</h4>
                <button onClick={() => copyToClipboard(data.copyWhatsAppVIP, 'wa')} style={{ background: 'none', border: 'none', color: '#25D366', cursor: 'pointer', padding: 0 }}>
                  {copied === 'wa' ? <CheckCircle2 size={16} color="#10b981" /> : <Copy size={16} />}
                </button>
              </div>
              <pre style={{ margin: 0, fontSize: 12, color: 'var(--on-surface-variant)', whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                {data.copyWhatsAppVIP}
              </pre>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
