import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Sparkles, Send, Bot, User, TrendingUp, BarChart3, Target, DollarSign, Users, ShoppingCart, Globe, Zap, Copy, RefreshCw, Lightbulb, AlertCircle, Loader2 } from 'lucide-react';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

const SYSTEM_PROMPT = `Eres el Asistente IA de TiendaNueve CRM, una plataforma integral de e-commerce, marketing y ventas. Tienes acceso a TODOS los datos del negocio en tiempo real.

Capacidades:
- Analizar campañas de Meta Ads, Google Ads y TikTok Ads
- Revisar tráfico de Google Analytics 4 y SEO de Search Console
- Evaluar productos de Google Merchant Center
- Analizar base de clientes, segmentación y funnel de ventas
- Dar recomendaciones de optimización de campañas
- Sugerir estrategias de pricing, inventario y retención
- Calcular ROAS real, CPA, métricas de conversión

Responde SIEMPRE en español, de forma concisa y accionable. Usa datos reales cuando los tengas. Si no tienes datos de alguna fuente, indica que no está configurada aún.

Cuando el usuario pregunte por métricas, da números exactos. Cuando pida recomendaciones, sé específico con acciones concretas.`;

function buildContextPrompt(data) {
  const { safeClients, safeMeta, safeGoogle, safeTiktok, safeGA4, safeGSC, safeMC } = data;
  
  let context = '=== DATOS ACTUALES DEL NEGOCIO ===\n\n';
  
  // Clients summary
  const totalClients = safeClients.length;
  const wonClients = safeClients.filter(c => c.status === 'won').length;
  const totalRevenue = safeClients.reduce((s, c) => s + (c.totalSpent || 0), 0);
  const avgTicket = totalClients > 0 ? totalRevenue / totalClients : 0;
  const sources = {};
  safeClients.forEach(c => { const s = c.source || 'direct'; sources[s] = (sources[s] || 0) + 1; });
  context += `CLIENTES: ${totalClients} total, ${wonClients} ganados, Revenue: $${totalRevenue.toLocaleString()}, Ticket promedio: $${avgTicket.toFixed(0)}\n`;
  context += `Fuentes: ${Object.entries(sources).map(([k, v]) => `${k}(${v})`).join(', ')}\n\n`;
  
  // Funnel
  const funnel = { lead: 0, contacted: 0, qualified: 0, negotiation: 0, won: 0, lost: 0 };
  safeClients.forEach(c => { if (funnel[c.status] !== undefined) funnel[c.status]++; });
  context += `FUNNEL: Lead(${funnel.lead}) → Contactado(${funnel.contacted}) → Calificado(${funnel.qualified}) → Negociación(${funnel.negotiation}) → Ganado(${funnel.won}) → Perdido(${funnel.lost})\n\n`;
  
  // Meta Ads
  if (safeMeta.length > 0) {
    const totalSpend = safeMeta.reduce((s, c) => s + (c.spend || 0), 0);
    const totalConv = safeMeta.reduce((s, c) => s + (c.results || 0), 0);
    const totalClicks = safeMeta.reduce((s, c) => s + (c.clicks || 0), 0);
    const totalImpr = safeMeta.reduce((s, c) => s + (c.impressions || 0), 0);
    context += `META ADS: ${safeMeta.length} campañas, Inversión: $${totalSpend.toLocaleString()}, Conversiones: ${totalConv}, CTR: ${totalImpr > 0 ? ((totalClicks / totalImpr) * 100).toFixed(2) : 0}%, CPC: $${totalClicks > 0 ? (totalSpend / totalClicks).toFixed(0) : 0}\n`;
    safeMeta.slice(0, 5).forEach(c => { context += `  - ${c.name}: $${c.spend || 0} gasto, ${c.results || 0} conv, ROAS ${c.roas || 0}x\n`; });
    context += '\n';
  }
  
  // Google Ads
  if (safeGoogle.length > 0) {
    const totalCost = safeGoogle.reduce((s, c) => s + (c.cost || 0), 0);
    const totalConv = safeGoogle.reduce((s, c) => s + (c.conversions || 0), 0);
    context += `GOOGLE ADS: ${safeGoogle.length} campañas, Inversión: $${totalCost.toLocaleString()}, Conversiones: ${totalConv}\n`;
    safeGoogle.slice(0, 5).forEach(c => { context += `  - ${c.name}: $${c.cost || 0} gasto, ${c.conversions || 0} conv\n`; });
    context += '\n';
  }
  
  // TikTok
  if (safeTiktok.length > 0) {
    const totalSpend = safeTiktok.reduce((s, c) => s + (c.spend || c.cost || 0), 0);
    const totalConv = safeTiktok.reduce((s, c) => s + (c.conversions || 0), 0);
    context += `TIKTOK ADS: ${safeTiktok.length} campañas, Inversión: $${totalSpend.toLocaleString()}, Conversiones: ${totalConv}\n`;
    safeTiktok.slice(0, 5).forEach(c => { context += `  - ${c.name}: $${c.spend || c.cost || 0} gasto, ${c.conversions || 0} conv\n`; });
    context += '\n';
  }
  
  // GA4
  if (safeGA4.length > 0) {
    const totalSessions = safeGA4.reduce((s, p) => s + (p.sessions || 0), 0);
    const totalUsers = safeGA4.reduce((s, p) => s + (p.users || 0), 0);
    context += `GA4: ${totalSessions} sesiones, ${totalUsers} usuarios\n`;
    safeGA4.slice(0, 5).forEach(p => { context += `  - ${p.page || 'N/A'}: ${p.sessions || 0} sesiones\n`; });
    context += '\n';
  }
  
  // Search Console
  if (safeGSC.length > 0) {
    const totalClicks = safeGSC.reduce((s, q) => s + (q.clicks || 0), 0);
    const totalImpr = safeGSC.reduce((s, q) => s + (q.impressions || 0), 0);
    context += `SEARCH CONSOLE: ${safeGSC.length} queries, ${totalClicks} clics, ${totalImpr} impresiones\n`;
    safeGSC.slice(0, 5).forEach(q => { context += `  - "${q.query}": ${q.clicks} clics, pos ${q.position}\n`; });
    context += '\n';
  }
  
  // Merchant Center
  if (safeMC.length > 0) {
    const totalProducts = safeMC.length;
    const activeProducts = safeMC.filter(p => p.availability === 'in stock').length;
    context += `MERCHANT CENTER: ${totalProducts} productos, ${activeProducts} activos\n`;
    safeMC.slice(0, 5).forEach(p => { context += `  - ${p.title}: $${p.price || 0}, ${p.availability}\n`; });
    context += '\n';
  }
  
  return context;
}

export default function AIChatAgent({ clients, metaInsights, googleAdsData, tiktokData, ga4Insights, gscPerformance, mcProducts, session }) {
  const safeClients = clients || [];
  const safeMeta = metaInsights || [];
  const safeGoogle = googleAdsData || [];
  const safeTiktok = tiktokData || [];
  const safeGA4 = ga4Insights || [];
  const safeGSC = gscPerformance || [];
  const safeMC = mcProducts || [];

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatHistoryRef = useRef([]);

  const COLORS = {
    bg: '#0a0a0f', surface: '#12121a', card: '#1a1a24', border: '#2a2a3a',
    text: '#e4e4e7', muted: '#71717a', primary: '#6366f1', accent: '#22d3ee',
    success: '#10b981', warning: 'var(--primary-container)', danger: '#ef4444',
  };

  useEffect(() => {
    const hasData = safeClients.length || safeMeta.length || safeGA4.length;
    const greeting = hasData
      ? '¡Hola! Soy tu asistente IA con acceso a tus datos en tiempo real.\n\nTengo disponible:\n• ' + safeClients.length + ' clientes\n• ' + (safeMeta.length + safeGoogle.length + safeTiktok.length) + ' campañas activas\n• ' + safeGA4.length + ' páginas de Analytics\n• ' + safeGSC.length + ' queries de SEO\n• ' + safeMC.length + ' productos\n\nPregúntame lo que quieras sobre tu negocio.'
      : '¡Hola! Soy tu asistente IA. Los datos aún se están cargando. Cuando estén disponibles podré analizar tu negocio en profundidad.\n\nMientras tanto, puedo ayudarte con estrategias generales de marketing y e-commerce.';
    
    setMessages([{ id: 1, role: 'assistant', content: greeting, timestamp: new Date() }]);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isProcessing) return;

    const userMsg = { id: Date.now(), role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);

    try {
      if (!import.meta.env.VITE_GEMINI_API_KEY) {
        const localResponse = generateLocalResponse(text, { safeClients, safeMeta, safeGoogle, safeTiktok, safeGA4, safeGSC, safeMC });
        setMessages(prev => [...prev, { id: Date.now(), role: 'assistant', content: localResponse, timestamp: new Date() }]);
        setIsProcessing(false);
        return;
      }

      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const contextData = buildContextPrompt({ safeClients, safeMeta, safeGoogle, safeTiktok, safeGA4, safeGSC, safeMC });
      
      chatHistoryRef.current.push({ role: 'user', parts: [{ text: text }] });
      
      const chat = model.startChat({
        history: [
          { role: 'user', parts: [{ text: SYSTEM_PROMPT + '\n\n' + contextData }] },
          { role: 'model', parts: [{ text: 'Entendido. Tengo acceso a todos los datos del negocio. ¿En qué puedo ayudarte?' }] },
          ...chatHistoryRef.current.slice(-10),
        ],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
      });

      const result = await chat.sendMessage(text);
      const response = result.response.text();
      
      chatHistoryRef.current.push({ role: 'model', parts: [{ text: response }] });
      
      setMessages(prev => [...prev, { id: Date.now(), role: 'assistant', content: response, timestamp: new Date() }]);
    } catch (err) {
      console.error('[AI Chat] Error:', err);
      const localResponse = generateLocalResponse(text, { safeClients, safeMeta, safeGoogle, safeTiktok, safeGA4, safeGSC, safeMC });
      setMessages(prev => [...prev, { id: Date.now(), role: 'assistant', content: localResponse, timestamp: new Date() }]);
    } finally {
      setIsProcessing(false);
    }
  }, [input, isProcessing, safeClients, safeMeta, safeGoogle, safeTiktok, safeGA4, safeGSC, safeMC]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const quickActions = [
    { label: 'Resumen de ventas', icon: DollarSign, query: '¿Cómo van las ventas este mes? Dame un resumen completo con métricas clave.' },
    { label: 'Top campañas', icon: Target, query: '¿Cuáles son las top 5 campañas por rendimiento? Compara Meta, Google y TikTok.' },
    { label: 'Recomendaciones', icon: Lightbulb, query: 'Dame 5 recomendaciones concretas para mejorar el rendimiento de mi negocio este mes.' },
    { label: 'Análisis SEO', icon: Globe, query: '¿Cómo está mi SEO? Analiza mis queries de Search Console y dame acciones.' },
    { label: 'Productos estrella', icon: ShoppingCart, query: '¿Cuáles son mis productos estrella y cuáles necesitan atención? Analiza el Merchant Center.' },
  ];

  const renderMessage = (msg) => {
    const isUser = msg.role === 'user';
    const formatted = formatMessage(msg.content);
    
    return (
      <div key={msg.id} style={{ display: 'flex', gap: 12, flexDirection: isUser ? 'row-reverse' : 'row', marginBottom: 20, animation: 'fadeIn 0.3s' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: isUser ? COLORS.primary : COLORS.card, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid ' + COLORS.border }}>
          {isUser ? <User size={18} color="#fff" /> : <Sparkles size={18} color={COLORS.accent} />}
        </div>
        <div style={{ maxWidth: '80%', padding: '14px 18px', borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px', background: isUser ? COLORS.primary : COLORS.card, color: COLORS.text, fontSize: 14, lineHeight: 1.6, border: '1px solid ' + COLORS.border, position: 'relative' }}>
          <div dangerouslySetInnerHTML={{ __html: formatted }} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }} />
          {!isUser && (
            <button onClick={() => copyToClipboard(msg.content)} style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted, padding: 4 }}>
              <Copy size={14} />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)', background: COLORS.bg, borderRadius: 16, overflow: 'hidden', border: '1px solid ' + COLORS.border }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', background: COLORS.surface, borderBottom: '1px solid ' + COLORS.border, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #6366f1, #22d3ee)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles size={22} color="#fff" />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: COLORS.text }}>Asistente IA</h2>
          <p style={{ margin: 0, fontSize: 11, color: COLORS.muted }}>Conectado a Gemini · Datos en tiempo real</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.success }} />
          <span style={{ fontSize: 11, color: COLORS.success, fontWeight: 600 }}>Online</span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {messages.map(renderMessage)}
        {isProcessing && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: COLORS.card, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid ' + COLORS.border }}>
              <Sparkles size={18} color={COLORS.accent} />
            </div>
            <div style={{ padding: '14px 18px', borderRadius: '4px 16px 16px 16px', background: COLORS.card, border: '1px solid ' + COLORS.border, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Loader2 size={16} color={COLORS.primary} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 13, color: COLORS.muted }}>Analizando datos...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick Actions */}
      <div style={{ padding: '0 20px 12px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {quickActions.map((action, i) => (
          <button key={i} onClick={() => { setInput(action.query); setTimeout(sendMessage, 100); }} disabled={isProcessing}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', color: COLORS.primary, fontSize: 12, fontWeight: 600, cursor: isProcessing ? 'wait' : 'pointer', transition: 'all 0.2s' }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(99,102,241,0.15)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(99,102,241,0.08)'}
          >
            <action.icon size={14} /> {action.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{ padding: '12px 20px', background: COLORS.surface, borderTop: '1px solid ' + COLORS.border, display: 'flex', gap: 12 }}>
        <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} disabled={isProcessing}
          placeholder="Pregunta sobre tu negocio..." style={{ flex: 1, padding: '12px 16px', borderRadius: 12, border: '1px solid ' + COLORS.border, background: COLORS.card, color: COLORS.text, fontSize: 14, outline: 'none' }}
        />
        <button onClick={sendMessage} disabled={!input.trim() || isProcessing}
          style={{ padding: '12px 20px', borderRadius: 12, border: 'none', background: input.trim() && !isProcessing ? COLORS.primary : COLORS.card, color: input.trim() && !isProcessing ? '#fff' : COLORS.muted, cursor: input.trim() && !isProcessing ? 'pointer' : 'not-allowed', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Send size={18} /> Enviar
        </button>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function formatMessage(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#e4e4e7">$1</strong>')
    .replace(/`(.*?)`/g, '<code style="background:rgba(99,102,241,0.15);padding:2px 6px;border-radius:4px;font-size:13px">$1</code>')
    .replace(/\n/g, '<br/>');
}

function generateLocalResponse(text, data) {
  const { safeClients, safeMeta, safeGoogle, safeTiktok, safeGA4, safeGSC, safeMC } = data;
  const lower = text.toLowerCase();

  if (lower.includes('venta') || lower.includes('ingreso') || lower.includes('money') || lower.includes('revenue')) {
    const totalRevenue = safeClients.reduce((s, c) => s + (c.totalSpent || 0), 0);
    const won = safeClients.filter(c => c.status === 'won').length;
    return '**Resumen de Ventas**\n\n• Revenue total: **$' + totalRevenue.toLocaleString() + '**\n• Clientes ganados: **' + won + '**\n• Ticket promedio: **$' + (safeClients.length > 0 ? (totalRevenue / safeClients.length).toFixed(0) : 0) + '**\n\n' + (totalRevenue > 0 ? 'Las ventas van bien. ¿Quieres que analice qué canales están generando más revenue?' : 'Aún no hay ventas registradas. ¿Necesitas ayuda con tu estrategia de adquisición?');
  }

  if (lower.includes('campaña') || lower.includes('publicidad') || lower.includes('ads') || lower.includes('roas')) {
    const allCampaigns = [
      ...safeMeta.map(c => ({ ...c, platform: 'Meta' })),
      ...safeGoogle.map(c => ({ ...c, platform: 'Google', spend: c.cost })),
      ...safeTiktok.map(c => ({ ...c, platform: 'TikTok' })),
    ];
    const totalSpend = allCampaigns.reduce((s, c) => s + (c.spend || 0), 0);
    const totalConv = allCampaigns.reduce((s, c) => s + (c.results || c.conversions || 0), 0);
    const sorted = allCampaigns.sort((a, b) => (b.spend || 0) - (a.spend || 0));
    
    let resp = '**Análisis de Campañas**\n\n• Total campañas: **' + allCampaigns.length + '**\n• Inversión total: **$' + totalSpend.toLocaleString() + '**\n• Conversiones: **' + totalConv + '**\n• CPA promedio: **$' + (totalConv > 0 ? (totalSpend / totalConv).toFixed(0) : 0) + '**\n\n**Top 5 por inversión:**\n';
    sorted.slice(0, 5).forEach((c, i) => { resp += (i + 1) + '. ' + c.platform + ' · ' + c.name + ': **$' + (c.spend || 0).toLocaleString() + '**\n'; });
    return resp;
  }

  if (lower.includes('seo') || lower.includes('search console') || lower.includes('orgánico')) {
    if (safeGSC.length === 0) return '**Search Console** no está configurado aún. Ve a Configuración para conectarlo y podré analizar tu SEO.';
    const totalClicks = safeGSC.reduce((s, q) => s + (q.clicks || 0), 0);
    let resp = '**Análisis SEO**\n\n• Queries indexadas: **' + safeGSC.length + '**\n• Clics totales: **' + totalClicks + '**\n\n**Top queries:**\n';
    safeGSC.slice(0, 5).forEach(q => { resp += '• "' + q.query + '": ' + q.clicks + ' clics, posición ' + q.position + '\n'; });
    return resp;
  }

  if (lower.includes('producto') || lower.includes('inventario') || lower.includes('merchant')) {
    if (safeMC.length === 0) return '**Merchant Center** no está configurado. Conéctalo en Configuración para analizar tus productos.';
    let resp = '**Productos en Merchant Center**\n\n• Total: **' + safeMC.length + '**\n\n**Top productos:**\n';
    safeMC.slice(0, 5).forEach(p => { resp += '• ' + p.title + ': **$' + (p.price || 0) + '** (' + p.availability + ')\n'; });
    return resp;
  }

  if (lower.includes('cliente') || lower.includes('funnel') || lower.includes('lead')) {
    const funnel = { lead: 0, contacted: 0, qualified: 0, won: 0, lost: 0 };
    safeClients.forEach(c => { if (funnel[c.status] !== undefined) funnel[c.status]++; });
    return '**Funnel de Clientes**\n\n• Leads: **' + funnel.lead + '**\n• Contactados: **' + funnel.contacted + '**\n• Calificados: **' + funnel.qualified + '**\n• Ganados: **' + funnel.won + '**\n• Perdidos: **' + funnel.lost + '**\n\nTasa de conversión: **' + (safeClients.length > 0 ? ((funnel.won / safeClients.length) * 100).toFixed(1) : 0) + '%**';
  }

  if (lower.includes('recomend') || lower.includes('consejo') || lower.includes('suger') || lower.includes('ayuda')) {
    let resp = '**Recomendaciones personalizadas**\n\n';
    if (safeMeta.length === 0) resp += '1. **Conecta Meta Ads** para que pueda analizar tu publicidad\n';
    if (safeGSC.length === 0) resp += '2. **Conecta Search Console** para optimizar tu SEO\n';
    if (safeMC.length === 0) resp += '3. **Conecta Merchant Center** para gestionar tu feed de productos\n';
    if (safeClients.length === 0) resp += '4. **Importa clientes** desde TiendaNueve para análisis de segmentación\n';
    if (safeClients.length > 0 && safeClients.filter(c => c.status === 'lost').length > safeClients.filter(c => c.status === 'won').length) resp += '5. **Atención:** Tienes más clientes perdidos que ganados. Revisa tu proceso de ventas.\n';
    if (safeClients.length > 20) resp += '• Considera segmentar tus ' + safeClients.length + ' clientes por frecuencia de compra para campañas de retención.\n';
    return resp || 'Todo se ve bien. ¿Hay algo específico que quieras que analice?';
  }

  return 'Puedo ayudarte con:\n\n• **Ventas** — resumen de revenue y ticket promedio\n• **Campañas** — análisis de Meta, Google y TikTok Ads\n• **SEO** — queries de Search Console\n• **Productos** — análisis de Merchant Center\n• **Clientes** — funnel y segmentación\n• **Recomendaciones** — sugerencias personalizadas\n\n¿Qué te gustaría saber?';
}
