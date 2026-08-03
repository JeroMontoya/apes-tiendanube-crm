import React, { useState, useEffect, useCallback } from 'react';
import {
  Trash2, Copy, Download, History, Star, Clock, Link as LinkIcon,
  Tag, Share2, RefreshCw, ChevronDown, ChevronUp, Check, X, AlertTriangle,
  FileSpreadsheet, Layers, Search, Edit3, Save, Zap, ExternalLink,
  Filter, MoreHorizontal, Plus, PanelRightOpen, PanelRightClose,
} from 'lucide-react';

const INITIAL_FIELDS = {
  utm_source: '',
  utm_medium: '',
  utm_campaign: '',
  utm_term: '',
  utm_content: '',
};

const SUGGESTED = {
  utm_source: [
    'facebook', 'instagram', 'google', 'tiktok', 'twitter', 'linkedin',
    'youtube', 'pinterest', 'email', 'newsletter', 'whatsapp', 'messenger',
    'bing', 'taboola', 'outbrain', 'direct', 'referral', 'shopify',
  ],
  utm_medium: [
    'cpc', 'cpm', 'cpa', 'cpl', 'cpcv', 'social', 'email', 'banner',
    'display', 'native', 'video', 'affiliate', 'referral', 'push',
    'sms', 'organic', 'paid', 'remarketing',
  ],
  utm_campaign: [
    'lanzamiento', 'rebajas', 'black_friday', 'navidad', 'hot_sale',
    'dia_madre', 'dia_padre', 'san_valentin', 'halloween', 'cyber_monday',
    'prime_day', 'back_to_school', 'semana_santa', 'cupon_diez',
    'envio_gratis', 'lead_magnet', 'retargeting', 'welcome',
    'abandono_carro', 'cross_sell', 'upsell', 'fidelizacion',
  ],
  utm_term: [
    'zapatos_mujer', 'vestidos_verano', 'tenis_deporte', 'camisas_hombre',
    'accesorios_moda', 'ofertas_ropa', 'moda_colombia', 'envio_gratis_bogota',
    'descuento_50', 'nueva_coleccion', 'ropa_mujer', 'ropa_hombre',
    'chaquetas_invierno', 'jeans_moda', 'bolsos_tendencia',
  ],
  utm_content: [
    'hero_banner', 'sidebar_cta', 'popup_oferta', 'footer_link',
    'nav_boton', 'landing_a', 'landing_b', 'video_tutorial',
    'testimonial', 'producto_destacado', 'carrusel_top', 'sticky_bar',
    'push_notification', 'sms_oferta', 'email_secuencia_1',
  ],
};

const TEMPLATES = [
  { id: 'social_paid', name: 'Redes Sociales (Pago)', fields: { utm_source: 'facebook', utm_medium: 'cpc' }, description: 'Anuncios pagos en redes sociales' },
  { id: 'social_organic', name: 'Redes Sociales (Orgánico)', fields: { utm_source: 'instagram', utm_medium: 'social' }, description: 'Publicaciones orgánicas en redes sociales' },
  { id: 'email_campaign', name: 'Email Marketing', fields: { utm_source: 'email', utm_medium: 'email' }, description: 'Campañas de email marketing' },
  { id: 'google_search', name: 'Google Ads (Búsqueda)', fields: { utm_source: 'google', utm_medium: 'cpc' }, description: 'Anuncios de búsqueda en Google' },
  { id: 'google_display', name: 'Google Ads (Display)', fields: { utm_source: 'google', utm_medium: 'display' }, description: 'Anuncios display en Google' },
  { id: 'tiktok_paid', name: 'TikTok Ads', fields: { utm_source: 'tiktok', utm_medium: 'cpc' }, description: 'Anuncios pagos en TikTok' },
  { id: 'whatsapp', name: 'WhatsApp', fields: { utm_source: 'whatsapp', utm_medium: 'social' }, description: 'Campañas por WhatsApp' },
  { id: 'affiliate', name: 'Afiliados', fields: { utm_source: 'referral', utm_medium: 'affiliate' }, description: 'Tráfico de afiliados' },
  { id: 'retargeting', name: 'Retargeting', fields: { utm_source: 'facebook', utm_medium: 'remarketing', utm_campaign: 'retargeting' }, description: 'Campañas de retargeting' },
];

const FIELD_LABELS = {
  utm_source: 'Fuente (source)',
  utm_medium: 'Medio (medium)',
  utm_campaign: 'Campaña (campaign)',
  utm_term: 'Término (term)',
  utm_content: 'Contenido (content)',
};

const FIELD_PLACEHOLDERS = {
  utm_source: 'ej. facebook, google, email',
  utm_medium: 'ej. cpc, email, social',
  utm_campaign: 'ej. lanzamiento, rebajas',
  utm_term: 'ej. zapatos_mujer, descuento',
  utm_content: 'ej. hero_banner, cta_sidebar',
};

const COLORS = {
  bg: '#0f172a',
  surface: '#1e293b',
  surfaceAlt: '#1a2332',
  border: '#334155',
  borderLight: '#1e293b',
  text: '#e2e8f0',
  textDim: '#8B9BB4',
  textMuted: '#64748b',
  textDark: '#475569',
  primary: '#818cf8',
  primaryDark: '#4f46e5',
  primaryBg: '#312e81',
  success: '#22d3ee',
  successBg: '#065f46',
  successBorder: '#047857',
  successText: '#a7f3d0',
  errorBg: '#7f1d1d',
  errorText: '#fca5a5',
  errorBorder: '#b91c1c',
  star: '#fbbf24',
  code: '#a5b4fc',
};

const TABS = [
  { id: 'builder', label: 'Constructor', icon: Tag },
  { id: 'bulk', label: 'Generación Masiva', icon: Layers },
  { id: 'history', label: 'Historial', icon: History },
];

const st = {
  container: { background: COLORS.bg, color: COLORS.text, minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' },
  inner: { maxWidth: 1400, margin: '0 auto', padding: 24 },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  headerTitle: { display: 'flex', alignItems: 'center', gap: 12 },
  title: { fontSize: 24, fontWeight: 700, color: '#f1f5f9' },
  subtitle: { fontSize: 14, color: COLORS.textMuted, marginTop: 2 },
  badge: { background: COLORS.surface, color: COLORS.primary, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, border: `1px solid ${COLORS.primaryBg}` },
  badgeMuted: { ...this?.badge, color: COLORS.textMuted },
  tabsRow: { display: 'flex', gap: 4, marginBottom: 20, borderBottom: `1px solid ${COLORS.border}` },
  tab: (active) => ({
    display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', border: 'none',
    background: active ? COLORS.surface : 'transparent', color: active ? '#f1f5f9' : COLORS.textMuted,
    fontSize: 13, fontWeight: 500, cursor: 'pointer', borderRadius: '8px 8px 0 0',
    borderBottom: active ? `2px solid ${COLORS.primary}` : '2px solid transparent',
    transition: 'all 0.15s',
  }),
  grid2: { display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 20 },
  card: { background: COLORS.surface, borderRadius: 12, border: `1px solid ${COLORS.border}`, overflow: 'hidden' },
  cardHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: `1px solid ${COLORS.border}`, background: COLORS.surfaceAlt },
  cardTitle: { fontSize: 13, fontWeight: 600, color: COLORS.textDim, textTransform: 'uppercase', letterSpacing: '0.05em' },
  cardBody: { padding: 18 },
  fieldGroup: { marginBottom: 16 },
  label: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: COLORS.textDim, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' },
  input: { width: '100%', padding: '9px 12px', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' },
  chip: (selected) => ({
    display: 'inline-flex', alignItems: 'center', padding: '3px 10px', margin: '2px 3px', fontSize: 11, fontWeight: 500,
    background: selected ? COLORS.primaryBg : COLORS.bg, color: selected ? COLORS.code : COLORS.textMuted,
    border: `1px solid ${selected ? COLORS.primaryDark : COLORS.borderLight}`, borderRadius: 6, cursor: 'pointer',
    transition: 'all 0.12s',
  }),
  previewBox: { background: COLORS.bg, borderRadius: 8, border: `1px solid ${COLORS.border}`, padding: 12, marginTop: 12, wordBreak: 'break-all', fontSize: 13, fontFamily: "'Fira Code', 'JetBrains Mono', monospace", lineHeight: 1.6, maxHeight: 200, overflow: 'auto' },
  paramLine: { display: 'flex', gap: 8, alignItems: 'baseline', padding: '2px 0' },
  btnPrimary: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: COLORS.primaryDark, color: 'var(--on-surface)', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s' },
  btnSecondary: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: COLORS.surface, color: COLORS.textDim, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s' },
  btnIcon: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, background: 'transparent', border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.textMuted, cursor: 'pointer', transition: 'all 0.15s' },
  toast: { position: 'fixed', bottom: 24, right: 24, display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', background: COLORS.successBg, color: COLORS.successText, border: `1px solid ${COLORS.successBorder}`, borderRadius: 10, fontSize: 13, fontWeight: 500, zIndex: 9999, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' },
  toastError: { background: COLORS.errorBg, color: COLORS.errorText, border: `1px solid ${COLORS.errorBorder}` },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '10px 12px', color: COLORS.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: `1px solid ${COLORS.border}` },
  td: { padding: '10px 12px', borderBottom: `1px solid ${COLORS.borderLight}`, color: '#cbd5e1', fontSize: 12, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', color: COLORS.textDark, gap: 12 },
  historyItem: { padding: '12px 16px', borderBottom: `1px solid ${COLORS.borderLight}`, cursor: 'pointer', transition: 'background 0.12s' },
  favBtn: (active) => ({ background: 'none', border: 'none', cursor: 'pointer', color: active ? COLORS.star : COLORS.textDark, padding: 2 }),
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: COLORS.surface, borderRadius: 12, border: `1px solid ${COLORS.border}`, width: '90%', maxWidth: 520, maxHeight: '80vh', overflow: 'auto', padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: 600, color: '#f1f5f9', marginBottom: 16 },
  btnRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  tagChip: { display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, textTransform: 'uppercase' },
  statNumber: { fontSize: 22, fontWeight: 700, color: COLORS.primary },
  statLabel: { fontSize: 11, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' },
};

export default function UTMBuilder() {
  const [fields, setFields] = useState({ ...INITIAL_FIELDS });
  const [baseUrl, setBaseUrl] = useState('https://tiendanueve.com');
  const [activeTab, setActiveTab] = useState('builder');
  const [urlList, setUrlList] = useState([]);
  const [history, setHistory] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState({});
  const [toast, setToast] = useState(null);
  const [focusedField, setFocusedField] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [bulkResult, setBulkResult] = useState([]);
  const [bulkTab, setBulkTab] = useState('list');
  const [historySearch, setHistorySearch] = useState('');
  const [showPreview, setShowPreview] = useState(true);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    try {
      const h = localStorage.getItem('utm_history');
      if (h) setHistory(JSON.parse(h));
      const u = localStorage.getItem('utm_url_list');
      if (u) setUrlList(JSON.parse(u));
    } catch {}
  }, []);

  useEffect(() => { localStorage.setItem('utm_history', JSON.stringify(history)); }, [history]);
  useEffect(() => { localStorage.setItem('utm_url_list', JSON.stringify(urlList)); }, [urlList]);

  const updateField = (key, value) => setFields(prev => ({ ...prev, [key]: value }));

  const buildUrl = useCallback((overrides = {}) => {
    const merged = { ...fields, ...overrides };
    const params = Object.entries(merged)
      .filter(([, v]) => v.trim())
      .map(([k, v]) => `${k}=${encodeURIComponent(v.trim())}`);
    return params.length ? `${baseUrl}?${params.join('&')}` : baseUrl;
  }, [fields, baseUrl]);

  const builtUrl = buildUrl();

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copiado al portapapeles');
    } catch {
      showToast('Error al copiar', 'error');
    }
  };

  const saveUrl = () => {
    const entry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      url: builtUrl,
      fields: { ...fields },
      baseUrl,
      favorite: false,
    };
    setUrlList(prev => [entry, ...prev]);
    setHistory(prev => [{ ...entry, url: builtUrl }, ...prev.slice(0, 200)]);
    showToast('URL guardada en historial');
  };

  const deleteUrlEntry = (id) => {
    setUrlList(prev => prev.filter(e => e.id !== id));
    showToast('Entrada eliminada');
  };

  const toggleFavorite = (id) => {
    setUrlList(prev => prev.map(e => e.id === id ? { ...e, favorite: !e.favorite } : e));
  };

  const loadFromHistory = (entry) => {
    setFields(entry.fields || { ...INITIAL_FIELDS });
    if (entry.baseUrl) setBaseUrl(entry.baseUrl);
    setActiveTab('builder');
    showToast('Cargado desde historial');
  };

  const loadTemplate = (tpl) => {
    setFields({ ...INITIAL_FIELDS, ...tpl.fields });
    setSelectedTemplate(tpl.id);
    setShowTemplateModal(false);
    showToast(`Plantilla "${tpl.name}" cargada`);
  };

  const toggleSuggestions = (key) => {
    setShowSuggestions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const clearFields = () => {
    setFields({ ...INITIAL_FIELDS });
    setSelectedTemplate(null);
    showToast('Campos limpiados');
  };

  const generateBulk = () => {
    const lines = bulkInput.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) {
      showToast('Ingresa al menos una URL o término', 'error');
      return;
    }
    const results = lines.map((line, idx) => {
      const isUrl = line.startsWith('http://') || line.startsWith('https://');
      const useUrl = isUrl ? line : baseUrl.replace(/\/+$/, '') + '/' + encodeURIComponent(line);
      const params = Object.entries(fields)
        .filter(([, v]) => v.trim())
        .map(([k, v]) => `${k}=${encodeURIComponent(v.trim())}`);
      const fullUrl = params.length ? `${useUrl}?${params.join('&')}` : useUrl;
      return { index: idx + 1, original: line, url: fullUrl };
    });
    setBulkResult(results);
    setBulkTab('results');
    showToast(`${results.length} URLs generadas correctamente`);
  };

  const exportCSV = () => {
    const headers = ['URL Completa', 'URL Base', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    const rows = urlList.map(e => [
      e.url, e.baseUrl,
      e.fields?.utm_source || '',
      e.fields?.utm_medium || '',
      e.fields?.utm_campaign || '',
      e.fields?.utm_term || '',
      e.fields?.utm_content || '',
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `utm_urls_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    showToast('CSV exportado exitosamente');
  };

  const clearHistory = () => {
    setHistory([]);
    setUrlList([]);
    showToast('Historial completamente limpiado');
  };

  const filteredHistory = history.filter(e => {
    if (!historySearch) return true;
    const query = historySearch.toLowerCase();
    return e.url.toLowerCase().includes(query) ||
      Object.values(e.fields || {}).some(v => v.toLowerCase().includes(query));
  });

  const favorites = urlList.filter(e => e.favorite);
  const recentUrls = urlList.slice(0, 5);

  const paramCount = Object.values(fields).filter(v => v.trim()).length;
  const bulkCount = bulkInput.split('\n').filter(l => l.trim()).length;

  const renderField = (key) => {
    const value = fields[key] || '';
    const suggestions = SUGGESTED[key] || [];
    const isShowing = showSuggestions[key];
    const isFocused = focusedField === key;
    return (
      <div style={st.fieldGroup} key={key}>
        <div style={st.label}>
          <Tag size={12} />
          {FIELD_LABELS[key]}
          {suggestions.length > 0 && (
            <button
              onClick={() => toggleSuggestions(key)}
              style={{
                ...st.btnIcon, width: 20, height: 20, border: 'none',
                color: isShowing ? COLORS.primary : COLORS.textDark, fontSize: 10, marginLeft: 'auto',
              }}
            >
              {isShowing ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}
        </div>
        <input
          style={{ ...st.input, borderColor: isFocused ? COLORS.primary : COLORS.border }}
          placeholder={FIELD_PLACEHOLDERS[key]}
          value={value}
          onChange={e => updateField(key, e.target.value)}
          onFocus={() => setFocusedField(key)}
          onBlur={() => setFocusedField('')}
        />
        {isShowing && suggestions.length > 0 && (
          <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap' }}>
            {suggestions.map(s => (
              <span
                key={s}
                style={st.chip(value === s)}
                onClick={() => updateField(key, value === s ? '' : s)}
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderPreview = () => {
    if (!showPreview) return null;
    const params = Object.entries(fields).filter(([, v]) => v.trim());
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ ...st.label, marginBottom: 0 }}>
            <LinkIcon size={12} />
            Vista Previa
          </div>
          <span style={st.badge}>{paramCount} parámetros</span>
        </div>
        <div style={st.previewBox}>
          <div style={{ color: COLORS.textMuted, fontSize: 11, marginBottom: 6 }}>URL Completa:</div>
          <div style={{ color: COLORS.code, lineHeight: 1.5, fontSize: 12 }}>{builtUrl}</div>
          {params.length > 0 && (
            <>
              <div style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 10, marginBottom: 4 }}>Parámetros:</div>
              {params.map(([k, v]) => (
                <div key={k} style={st.paramLine}>
                  <span style={{ color: COLORS.primary }}>{k}</span>
                  <span style={{ color: COLORS.textDark }}>=</span>
                  <span style={{ color: COLORS.success }}>{encodeURIComponent(v.trim())}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    );
  };

  const renderTemplateModal = () => (
    <div style={st.modalOverlay} onClick={() => setShowTemplateModal(false)}>
      <div style={st.modal} onClick={e => e.stopPropagation()}>
        <div style={st.modalTitle}>Plantillas de UTM</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {TEMPLATES.map(tpl => (
            <div
              key={tpl.id}
              onClick={() => loadTemplate(tpl)}
              style={{
                ...st.historyItem, borderRadius: 8,
                border: selectedTemplate === tpl.id ? `1px solid ${COLORS.primaryDark}` : `1px solid ${COLORS.borderLight}`,
                background: selectedTemplate === tpl.id ? COLORS.surfaceAlt : 'transparent', marginBottom: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={14} color={COLORS.primary} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{tpl.name}</div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted }}>{tpl.description}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button
          style={{ ...st.btnSecondary, marginTop: 16, width: '100%', justifyContent: 'center' }}
          onClick={() => setShowTemplateModal(false)}
        >
          <X size={14} /> Cerrar
        </button>
      </div>
    </div>
  );

  const renderBuilderTab = () => (
    <div style={st.grid2}>
      <div>
        <div style={st.card}>
          <div style={st.cardHeader}>
            <div style={st.cardTitle}>Parámetros UTM</div>
            <div style={st.btnRow}>
              <button onClick={() => setShowTemplateModal(true)} style={st.btnSecondary}>
                <Zap size={14} /> Plantillas
              </button>
              <button onClick={clearFields} style={st.btnSecondary}>
                <RefreshCw size={14} /> Limpiar
              </button>
            </div>
          </div>
          <div style={st.cardBody}>
            <div style={st.fieldGroup}>
              <div style={st.label}>
                <LinkIcon size={12} />
                URL Base
              </div>
              <input
                style={{ ...st.input, borderColor: focusedField === 'baseUrl' ? COLORS.primary : COLORS.border }}
                placeholder="https://tiendanueve.com"
                value={baseUrl}
                onChange={e => setBaseUrl(e.target.value)}
                onFocus={() => setFocusedField('baseUrl')}
                onBlur={() => setFocusedField('')}
              />
            </div>
            {renderField('utm_source')}
            {renderField('utm_medium')}
            {renderField('utm_campaign')}
            {renderField('utm_term')}
            {renderField('utm_content')}
          </div>
        </div>
      </div>
      <div>
        <div style={st.card}>
          <div style={st.cardHeader}>
            <div style={st.cardTitle}>URL Generada</div>
            <button
              onClick={() => setShowPreview(!showPreview)}
              style={st.btnIcon}
            >
              {showPreview ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
            </button>
          </div>
          <div style={st.cardBody}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button onClick={() => copyToClipboard(builtUrl)} style={st.btnPrimary}>
                <Copy size={14} /> Copiar URL
              </button>
              <button onClick={saveUrl} style={st.btnSecondary}>
                <Save size={14} /> Guardar
              </button>
            </div>
            {renderPreview()}
            {recentUrls.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ ...st.label, marginBottom: 8 }}>
                  <Clock size={12} /> Últimas guardadas
                </div>
                {recentUrls.map(e => (
                  <div
                    key={e.id}
                    style={{ ...st.historyItem, borderRadius: 6, padding: '8px 12px', marginBottom: 4 }}
                    onClick={() => loadFromHistory(e)}
                  >
                    <div style={{ fontSize: 12, color: COLORS.code, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.url}
                    </div>
                    <div style={{ fontSize: 10, color: COLORS.textDark }}>
                      {new Date(e.timestamp).toLocaleString('es-CO')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderBulkTab = () => (
    <div style={st.card}>
      <div style={st.cardHeader}>
        <div style={st.cardTitle}>Generación Masiva</div>
        <button
          onClick={() => setBulkTab(bulkTab === 'list' ? 'results' : 'list')}
          style={st.btnSecondary}
        >
          {bulkTab === 'list' ? <Layers size={14} /> : <Edit3 size={14} />}
          {bulkTab === 'list' ? 'Resultados' : 'Editor'}
        </button>
      </div>
      <div style={st.cardBody}>
        {bulkTab === 'list' ? (
          <div>
            <div style={st.label}>
              <Edit3 size={12} />
              URLs o términos (uno por línea)
            </div>
            <textarea
              style={{
                ...st.input, minHeight: 160, resize: 'vertical',
                fontFamily: "'Fira Code', 'JetBrains Mono', monospace", fontSize: 12,
              }}
              placeholder={`https://tiendanueve.com/producto-1\nhttps://tiendanueve.com/producto-2\nlanzamiento-zapatos\nblack-friday-oferta`}
              value={bulkInput}
              onChange={e => setBulkInput(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={generateBulk} style={st.btnPrimary}>
                <Zap size={14} /> Generar {bulkCount} {bulkCount === 1 ? 'URL' : 'URLs'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ ...st.label, marginBottom: 0 }}>
                <Layers size={12} />
                Resultados ({bulkResult.length})
              </div>
              {bulkResult.length > 0 && (
                <button onClick={() => copyToClipboard(bulkResult.map(r => r.url).join('\n'))} style={st.btnIcon}>
                  <Copy size={14} />
                </button>
              )}
            </div>
            {bulkResult.length === 0 ? (
              <div style={st.emptyState}>
                <FileSpreadsheet size={32} />
                <div>No hay resultados aún. Ingresa URLs y presiona "Generar".</div>
              </div>
            ) : (
              <div style={{ maxHeight: 400, overflow: 'auto' }}>
                <table style={st.table}>
                  <thead>
                    <tr>
                      <th style={st.th}>#</th>
                      <th style={st.th}>Original</th>
                      <th style={st.th}>URL Generada</th>
                      <th style={st.th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkResult.map(r => (
                      <tr key={r.index}>
                        <td style={st.td}>{r.index}</td>
                        <td style={st.td}>{r.original}</td>
                        <td style={{ ...st.td, maxWidth: 300, fontFamily: "'Fira Code', monospace", fontSize: 11 }}>
                          {r.url}
                        </td>
                        <td style={st.td}>
                          <button onClick={() => copyToClipboard(r.url)} style={st.btnIcon}>
                            <Copy size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderHistoryTab = () => (
    <div style={st.card}>
      <div style={st.cardHeader}>
        <div style={st.cardTitle}>Historial ({history.length})</div>
        <div style={st.btnRow}>
          <button onClick={exportCSV} style={st.btnSecondary}>
            <Download size={14} /> Exportar CSV
          </button>
          <button onClick={clearHistory} style={st.btnSecondary}>
            <Trash2 size={14} /> Limpiar Todo
          </button>
        </div>
      </div>
      <div style={st.cardBody}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: COLORS.textDark }} />
            <input
              style={{ ...st.input, paddingLeft: 30 }}
              placeholder="Buscar en historial..."
              value={historySearch}
              onChange={e => setHistorySearch(e.target.value)}
            />
          </div>
          <button onClick={() => setHistorySearch('')} style={st.btnIcon}>
            <X size={14} />
          </button>
        </div>
        {favorites.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ ...st.label, marginBottom: 8 }}>
              <Star size={12} color={COLORS.star} /> Favoritos ({favorites.length})
            </div>
            {favorites.slice(0, 3).map(e => (
              <div key={e.id} onClick={() => loadFromHistory(e)} style={{ ...st.historyItem, borderRadius: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 12, color: COLORS.code, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.url}
                  </div>
                  <button onClick={(ev) => { ev.stopPropagation(); toggleFavorite(e.id); }} style={st.favBtn(true)}>
                    <Star size={12} />
                  </button>
                </div>
                <div style={{ fontSize: 10, color: COLORS.textDark, marginTop: 2 }}>
                  {new Date(e.timestamp).toLocaleString('es-CO')}
                </div>
              </div>
            ))}
          </div>
        )}
        {filteredHistory.length === 0 ? (
          <div style={st.emptyState}>
            <History size={40} />
            <div style={{ fontSize: 14 }}>No hay entradas en el historial</div>
            <div style={{ fontSize: 12, color: COLORS.textDark }}>
              Guarda URLs desde el constructor para verlas aquí.
            </div>
          </div>
        ) : (
          <div style={{ maxHeight: 500, overflow: 'auto' }}>
            {filteredHistory.map(e => (
              <div
                key={e.id}
                style={st.historyItem}
                onClick={() => loadFromHistory(e)}
                onMouseEnter={ev => ev.currentTarget.style.background = COLORS.surfaceAlt}
                onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: COLORS.code, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.url}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                      {Object.entries(e.fields || {}).filter(([, v]) => v).map(([k, v]) => (
                        <span key={k} style={{ ...st.tagChip, background: 'rgba(129,140,248,0.1)', color: COLORS.code, border: '1px solid rgba(129,140,248,0.2)' }}>
                          {k.split('_')[1] || k}: {v}
                        </span>
                      ))}
                    </div>
                    <div style={{ fontSize: 10, color: COLORS.textDark, marginTop: 4 }}>
                      <Clock size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                      {new Date(e.timestamp).toLocaleString('es-CO')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button onClick={(ev) => { ev.stopPropagation(); toggleFavorite(e.id); }} style={st.favBtn(e.favorite)}>
                      <Star size={12} />
                    </button>
                    <button onClick={(ev) => { ev.stopPropagation(); copyToClipboard(e.url); }} style={st.btnIcon}>
                      <Copy size={12} />
                    </button>
                    <button onClick={(ev) => { ev.stopPropagation(); deleteUrlEntry(e.id); }} style={st.btnIcon}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={st.container}>
      {showTemplateModal && renderTemplateModal()}
      <div style={st.inner}>
        <div style={st.header}>
          <div>
            <div style={st.headerTitle}>
              <Share2 size={22} color={COLORS.primary} />
              <div>
                <div style={st.title}>Constructor UTM</div>
                <div style={st.subtitle}>
                  Genera y gestiona URLs con parámetros UTM para tus campañas de marketing
                </div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={st.badge}>{urlList.length} guardadas</span>
            {history.length > 0 && (
              <span style={{ ...st.badge, color: COLORS.textMuted }}>{history.length} en historial</span>
            )}
            {paramCount > 0 && (
              <span style={{ ...st.badge, color: COLORS.success }}>{paramCount} parámetros activos</span>
            )}
          </div>
        </div>
        <div style={st.tabsRow}>
          {TABS.map(t => (
            <button
              key={t.id}
              style={st.tab(activeTab === t.id)}
              onClick={() => setActiveTab(t.id)}
            >
              <t.icon size={14} />
              {t.label}
              {t.id === 'history' && history.length > 0 && (
                <span style={{ background: COLORS.primaryDark, color: 'var(--on-surface)', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, marginLeft: 4 }}>
                  {history.length > 99 ? '99+' : history.length}
                </span>
              )}
            </button>
          ))}
        </div>
        {activeTab === 'builder' && renderBuilderTab()}
        {activeTab === 'bulk' && renderBulkTab()}
        {activeTab === 'history' && renderHistoryTab()}
      </div>
      {toast && (
        <div style={{ ...st.toast, ...(toast.type === 'error' ? st.toastError : {}) }}>
          {toast.type === 'error' ? <AlertTriangle size={16} /> : <Check size={16} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
