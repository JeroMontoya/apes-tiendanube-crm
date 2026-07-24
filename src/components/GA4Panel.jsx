import React, { useMemo } from 'react';
import {
  Users, Clock, ArrowDownRight, Target, Globe, Smartphone,
  Search, Share2, Mail, BarChart3, Activity, MousePointerClick,
  Eye, TrendingUp, AlertTriangle, CheckCircle, Lightbulb,
  ShoppingCart, DollarSign, Package
} from 'lucide-react';

// ─── Paleta de colores para gráficos ─────────────────────────────────
const CHART_COLORS = [
  '#4F46E5', '#0EA5E9', '#10B981', 'var(--primary-container)', '#EF4444',
  '#8B5CF6', '#EC4899', '#14B8A6', '#6B7280'
];

// ─── Mapeo de canales a nombres amigables en español ─────────────────
const CHANNEL_MAP = {
  'Organic Search':  'Búsqueda en Google (Gratis)',
  'Paid Search':     'Anuncios en Google (Pagando)',
  'Organic Social':  'Redes Sociales (Gratis)',
  'Paid Social':     'Anuncios en Redes (Pagando)',
  'Direct':          'Entraron Directo (link o favoritos)',
  'Referral':        'Vinieron de otra página web',
  'Email':           'Llegaron por un Email',
  'Display':         'Banners publicitarios',
  'Unassigned':      'Sin clasificar',
};

const CHANNEL_ICONS = {
  'Organic Search': Search,
  'Paid Search':    Target,
  'Organic Social': Share2,
  'Paid Social':    Smartphone,
  'Direct':         Globe,
  'Referral':       Globe,
  'Email':          Mail,
  'Display':        Eye,
  'Unassigned':     BarChart3,
};

// ─── Mapeo de eventos a nombres amigables ────────────────────────────
const EVENT_MAP = {
  'page_view':       'Vieron una página',
  'session_start':   'Iniciaron una visita',
  'scroll':          'Bajaron en la página',
  'click':           'Hicieron clic en algo',
  'first_visit':     'Primera vez que entraron',
  'purchase':        'Compraron algo',
  'add_to_cart':     'Agregaron al carrito',
  'begin_checkout':  'Empezaron a pagar',
  'view_item':       'Vieron un producto',
  'view_item_list':  'Vieron una lista de productos',
};

// ─── Canales orgánicos vs pagos ──────────────────────────────────────
const ORGANIC_CHANNELS = ['Organic Search', 'Organic Social', 'Direct', 'Referral', 'Email'];
const PAID_CHANNELS    = ['Paid Search', 'Paid Social', 'Display'];

// ─── Helpers ─────────────────────────────────────────────────────────
function formatDuration(seconds) {
  if (seconds == null || isNaN(seconds)) return '0:00';
  const totalSec = Math.round(Number(seconds));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatNumber(n) {
  if (n == null || isNaN(n)) return '0';
  return Number(n).toLocaleString('es-CO');
}

function formatPercent(n) {
  if (n == null || isNaN(n)) return '0%';
  return `${Number(n).toFixed(1)}%`;
}

function friendlyChannel(raw) {
  return CHANNEL_MAP[raw] || raw;
}

function friendlyEvent(raw) {
  return EVENT_MAP[raw] || raw;
}

// ─── Estilos ─────────────────────────────────────────────────────────
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  header: {
    marginBottom: '4px',
  },
  headerTitle: {
    fontSize: '22px',
    fontWeight: 700,
    color: 'var(--on-surface)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    margin: 0,
  },
  headerSubtitle: {
    fontSize: '14px',
    color: 'var(--on-surface-variant)',
    marginTop: '4px',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  metricCard: {
    padding: '20px',
    borderRadius: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  metricIconWrap: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '4px',
  },
  metricLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--on-surface-variant)',
    margin: 0,
  },
  metricValue: {
    fontSize: '28px',
    fontWeight: 700,
    color: 'var(--on-surface)',
    margin: 0,
    lineHeight: 1.1,
  },
  metricHint: {
    fontSize: '11px',
    color: 'var(--on-surface-variant)',
    margin: 0,
    opacity: 0.8,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: '17px',
    fontWeight: 600,
    color: 'var(--on-surface)',
    margin: '0 0 16px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  sectionSubtitle: {
    fontSize: '13px',
    fontWeight: 400,
    color: 'var(--on-surface-variant)',
    marginLeft: '4px',
  },
  sectionCard: {
    padding: '24px',
    borderRadius: '16px',
  },
  // Acquisition
  acquisitionLayout: {
    display: 'grid',
    gridTemplateColumns: '200px 1fr',
    gap: '28px',
    alignItems: 'start',
  },
  donutContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  donutSvg: {
    width: '180px',
    height: '180px',
  },
  donutCenter: {
    fontSize: '12px',
    fontWeight: 600,
    fill: 'var(--on-surface)',
    textAnchor: 'middle',
    dominantBaseline: 'middle',
  },
  channelList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  channelRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  channelDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  channelIcon: {
    flexShrink: 0,
    color: 'var(--on-surface-variant)',
  },
  channelName: {
    fontSize: '13px',
    color: 'var(--on-surface)',
    flex: 1,
    minWidth: 0,
  },
  channelStats: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--on-surface)',
    whiteSpace: 'nowrap',
  },
  channelPct: {
    fontSize: '12px',
    color: 'var(--on-surface-variant)',
    whiteSpace: 'nowrap',
    minWidth: '42px',
    textAlign: 'right',
  },
  channelBar: {
    height: '6px',
    borderRadius: '3px',
    background: 'var(--surface-container)',
    flex: 1,
    minWidth: '40px',
    overflow: 'hidden',
  },
  channelBarFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.6s ease',
  },
  // Events
  eventRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '10px',
  },
  eventName: {
    fontSize: '13px',
    color: 'var(--on-surface)',
    minWidth: '180px',
    flexShrink: 0,
  },
  eventBarTrack: {
    height: '22px',
    borderRadius: '6px',
    background: 'var(--surface-container)',
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  eventBarFill: {
    height: '100%',
    borderRadius: '6px',
    transition: 'width 0.6s ease',
    display: 'flex',
    alignItems: 'center',
    paddingLeft: '8px',
  },
  eventBarLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--on-surface)',
    whiteSpace: 'nowrap',
  },
  eventCount: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--on-surface)',
    minWidth: '60px',
    textAlign: 'right',
    flexShrink: 0,
  },
  // Organic vs Paid
  ovpGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  ovpCard: {
    padding: '20px',
    borderRadius: '14px',
    border: '1px solid var(--surface-border)',
    textAlign: 'center',
  },
  ovpLabel: {
    fontSize: '13px',
    color: 'var(--on-surface-variant)',
    margin: '0 0 6px 0',
    fontWeight: 500,
  },
  ovpValue: {
    fontSize: '32px',
    fontWeight: 700,
    margin: 0,
    lineHeight: 1.2,
  },
  ovpSub: {
    fontSize: '12px',
    color: 'var(--on-surface-variant)',
    margin: '4px 0 0 0',
  },
  ovpBarContainer: {
    marginTop: '16px',
    height: '12px',
    borderRadius: '6px',
    overflow: 'hidden',
    display: 'flex',
    background: 'var(--surface-container)',
  },
  // Advice
  adviceItem: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    marginBottom: '14px',
  },
  adviceIconWrap: {
    width: '32px',
    height: '32px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  adviceText: {
    fontSize: '14px',
    color: 'var(--on-surface)',
    lineHeight: 1.5,
    margin: 0,
  },
  adviceTitle: {
    fontWeight: 600,
    display: 'block',
    marginBottom: '2px',
  },
  loadingContainer: {
    padding: '48px 24px',
    textAlign: 'center',
    color: 'var(--on-surface-variant)',
    fontSize: '15px',
  },
  responsiveAcquisition: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
};

// ─── Donut Chart SVG ─────────────────────────────────────────────────
function DonutChart({ segments, totalSessions }) {
  const radius = 70;
  const cx = 90;
  const cy = 90;
  const strokeWidth = 28;
  const circumference = 2 * Math.PI * radius;

  let accumulated = 0;
  const arcs = segments.map((seg, i) => {
    const pct = totalSessions > 0 ? seg.sessions / totalSessions : 0;
    const dashLen = pct * circumference;
    const dashGap = circumference - dashLen;
    const offset = -accumulated * circumference + circumference * 0.25;
    accumulated += pct;

    return (
      <circle
        key={i}
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke={CHART_COLORS[i % CHART_COLORS.length]}
        strokeWidth={strokeWidth}
        strokeDasharray={`${dashLen} ${dashGap}`}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dasharray 0.6s ease, stroke-dashoffset 0.6s ease' }}
      />
    );
  });

  return (
    <svg viewBox="0 0 180 180" style={styles.donutSvg}>
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke="var(--surface-container)" strokeWidth={strokeWidth} />
      {arcs}
      <text x={cx} y={cy - 8} style={{ ...styles.donutCenter, fontSize: '18px' }}>
        {formatNumber(totalSessions)}
      </text>
      <text x={cx} y={cy + 10} style={{ ...styles.donutCenter, fontSize: '11px', fontWeight: 400, fill: 'var(--on-surface-variant)' }}>
        visitas
      </text>
    </svg>
  );
}

// ─── Metric Card ─────────────────────────────────────────────────────
function MetricCard({ icon: Icon, label, value, hint, iconBg, iconColor }) {
  return (
    <div className="glass-card" style={styles.metricCard}>
      <div style={{ ...styles.metricIconWrap, background: iconBg || 'var(--surface-container)' }}>
        <Icon size={20} color={iconColor || 'var(--primary)'} />
      </div>
      <p style={styles.metricLabel}>{label}</p>
      <p style={styles.metricValue}>{value}</p>
      {hint && <p style={styles.metricHint}>{hint}</p>}
    </div>
  );
}

// ─── Expert Advice Generator ─────────────────────────────────────────
function generateAdvice(global, acquisition) {
  const advice = [];
  const bounceRate = Number(global?.bounceRate) || 0;
  const sessions = Number(global?.sessions) || 0;
  const avgDuration = Number(global?.averageSessionDuration) || 0;

  // Aggregate organic vs paid
  let organicSessions = 0;
  let paidSessions = 0;
  (acquisition || []).forEach(ch => {
    const s = Number(ch.sessions) || 0;
    if (ORGANIC_CHANNELS.includes(ch.channel)) organicSessions += s;
    if (PAID_CHANNELS.includes(ch.channel)) paidSessions += s;
  });
  const totalAcq = organicSessions + paidSessions || 1;
  const paidPct = (paidSessions / totalAcq) * 100;
  const organicPct = (organicSessions / totalAcq) * 100;

  // Bounce rate analysis
  if (bounceRate > 70) {
    advice.push({
      type: 'warning',
      title: 'Tu tasa de rebote es alta',
      text: `El ${formatPercent(bounceRate)} de las personas se va sin hacer nada. Revisá que tu página cargue rápido, que el diseño sea atractivo y que el contenido sea relevante para lo que la gente busca.`,
    });
  } else if (bounceRate < 40) {
    advice.push({
      type: 'success',
      title: '¡Excelente tasa de rebote!',
      text: `Solo el ${formatPercent(bounceRate)} se va sin interactuar. Tu contenido está enganchando bien a los visitantes. ¡Seguí así!`,
    });
  }

  // Organic traffic analysis
  if (organicPct < 30 && sessions > 0) {
    advice.push({
      type: 'tip',
      title: 'Podrías mejorar tu tráfico orgánico',
      text: `Solo el ${organicPct.toFixed(0)}% de tus visitas vienen gratis (Google, redes). Invertí en SEO: mejorá los títulos de tus productos, agregá descripciones detalladas y publicá contenido útil para tus clientes.`,
    });
  }

  // Paid dependency
  if (paidPct > 60 && sessions > 0) {
    advice.push({
      type: 'warning',
      title: 'Dependés mucho de la publicidad paga',
      text: `El ${paidPct.toFixed(0)}% de tus visitas vienen de anuncios pagos. Si dejás de pagar, tu tráfico caería drásticamente. Trabajá en posicionamiento orgánico para tener un flujo estable y gratuito.`,
    });
  } else if (paidPct > 0 && paidPct <= 30) {
    advice.push({
      type: 'success',
      title: 'Buen balance de tráfico',
      text: `Tenés un buen equilibrio entre visitas gratuitas y pagas. Tu negocio no depende excesivamente de la publicidad.`,
    });
  }

  // Session duration
  if (avgDuration < 30 && sessions > 0) {
    advice.push({
      type: 'warning',
      title: 'Las visitas son muy cortas',
      text: 'La gente pasa menos de 30 segundos en tu página. Agregá contenido más atractivo: fotos de calidad, videos de productos, y descripciones que resuelvan las dudas de tus clientes.',
    });
  }

  // Limit to 3 most relevant
  return advice.slice(0, 3);
}

// ─── Componente Principal ────────────────────────────────────────────
export default function GA4Panel({ ga4Insights }) {
  // ── Sin datos: mostrar estado de configuración ──
  if (!ga4Insights || !ga4Insights.global) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center', padding: '48px 24px' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 20,
          background: 'rgba(245, 158, 11, 0.1)', display: 'flex',
          alignItems: 'center', justifyContent: 'center'
        }}>
          <BarChart3 size={32} color="var(--primary-container)" />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--on-surface)', margin: 0 }}>Google Analytics 4</h2>
        <div style={{
          maxWidth: 500, textAlign: 'center', padding: '20px 24px', borderRadius: 14,
          background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.15)'
        }}>
          <p style={{ fontSize: 14, color: 'var(--on-surface)', margin: '0 0 12px', fontWeight: 600 }}>
            Google Analytics no está configurado
          </p>
          <p style={{ fontSize: 13, color: 'var(--on-surface-variant)', margin: '0 0 16px', lineHeight: 1.6 }}>
            Para ver datos reales de tráfico, ventas y comportamiento de usuarios en tu tienda, necesitás configurar GA4.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left', fontSize: 13, color: 'var(--on-surface-variant)' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ background: 'rgba(245,158,11,0.2)', color: 'var(--primary-container)', borderRadius: 6, padding: '2px 8px', fontWeight: 700, flexShrink: 0 }}>1</span>
              <span>Andá a <strong>Ajustes</strong> → sección <strong>Google Analytics 4</strong></span>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ background: 'rgba(245,158,11,0.2)', color: 'var(--primary-container)', borderRadius: 6, padding: '2px 8px', fontWeight: 700, flexShrink: 0 }}>2</span>
              <span>Ingresá tu <strong>Property ID</strong> (GA4 → Administrador → Detalles del Stream)</span>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ background: 'rgba(245,158,11,0.2)', color: 'var(--primary-container)', borderRadius: 6, padding: '2px 8px', fontWeight: 700, flexShrink: 0 }}>3</span>
              <span>Marcá "Reutilizar credenciales de Merchant Center" si usás el mismo Service Account</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { global, acquisition = [], events = [], ecommerce } = ga4Insights;

  // ── Cálculos memoizados ──
  const totalSessions = useMemo(() => {
    return acquisition.reduce((sum, ch) => sum + (Number(ch.sessions) || 0), 0);
  }, [acquisition]);

  const sortedAcquisition = useMemo(() => {
    return [...acquisition].sort((a, b) => (Number(b.sessions) || 0) - (Number(a.sessions) || 0));
  }, [acquisition]);

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => (Number(b.eventCount) || 0) - (Number(a.eventCount) || 0));
  }, [events]);

  const maxEventCount = useMemo(() => {
    return sortedEvents.length > 0 ? Number(sortedEvents[0].eventCount) || 1 : 1;
  }, [sortedEvents]);

  const { organicSessions, paidSessions } = useMemo(() => {
    let organic = 0;
    let paid = 0;
    acquisition.forEach(ch => {
      const s = Number(ch.sessions) || 0;
      if (ORGANIC_CHANNELS.includes(ch.channel)) organic += s;
      if (PAID_CHANNELS.includes(ch.channel)) paid += s;
    });
    return { organicSessions: organic, paidSessions: paid };
  }, [acquisition]);

  const totalClassified = organicSessions + paidSessions || 1;
  const organicPct = (organicSessions / totalClassified) * 100;
  const paidPct = (paidSessions / totalClassified) * 100;

  const advice = useMemo(() => {
    return generateAdvice(global, acquisition);
  }, [global, acquisition]);

  // ── Render ──
  return (
    <div style={styles.container}>

      {/* ═══════ HEADER ═══════ */}
      <div style={styles.header}>
        <h2 style={styles.headerTitle}>
          <BarChart3 size={24} color="var(--primary)" />
          Google Analytics
        </h2>
        <p style={styles.headerSubtitle}>
          Así se comportan las personas que visitan tu tienda online
        </p>
      </div>

      {/* ═══════ METRIC CARDS ═══════ */}
      <div style={styles.metricsGrid}>
        <MetricCard
          icon={Users}
          label="Visitantes Activos"
          value={formatNumber(global.activeUsers)}
          hint="Personas que entraron recientemente"
          iconBg="rgba(79, 70, 229, 0.12)"
          iconColor="#4F46E5"
        />
        <MetricCard
          icon={Eye}
          label="Visitas Totales"
          value={formatNumber(global.sessions)}
          hint="Cantidad de veces que entraron"
          iconBg="rgba(14, 165, 233, 0.12)"
          iconColor="#0EA5E9"
        />
        <MetricCard
          icon={ArrowDownRight}
          label="Tasa de Rebote"
          value={formatPercent(global.bounceRate)}
          hint="% de personas que se van sin hacer nada"
          iconBg={Number(global.bounceRate) > 70 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)'}
          iconColor={Number(global.bounceRate) > 70 ? '#EF4444' : '#10B981'}
        />
        <MetricCard
          icon={Clock}
          label="Tiempo Promedio de Sesión"
          value={formatDuration(global.averageSessionDuration)}
          hint="Cuánto tiempo se quedan en tu tienda"
          iconBg="rgba(245, 158, 11, 0.12)"
          iconColor="var(--primary-container)"
        />
      </div>

      {/* ═══════ ACQUISITION / DE DÓNDE VIENE LA GENTE ═══════ */}
      {sortedAcquisition.length > 0 && (
        <div className="glass-card" style={styles.sectionCard}>
          <h3 style={styles.sectionTitle}>
            <Globe size={18} color="var(--primary)" />
            ¿De dónde viene la gente?
            <span style={styles.sectionSubtitle}>— Canales de adquisición</span>
          </h3>

          <div style={styles.responsiveAcquisition}>
            {/* Donut + Lista */}
            <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              {/* Donut Chart */}
              <div style={styles.donutContainer}>
                <DonutChart segments={sortedAcquisition} totalSessions={totalSessions} />
              </div>

              {/* Channel List */}
              <div style={{ ...styles.channelList, flex: 1, minWidth: '280px' }}>
                {sortedAcquisition.map((ch, i) => {
                  const sessions = Number(ch.sessions) || 0;
                  const pct = totalSessions > 0 ? (sessions / totalSessions) * 100 : 0;
                  const ChannelIcon = CHANNEL_ICONS[ch.channel] || Globe;
                  const color = CHART_COLORS[i % CHART_COLORS.length];

                  return (
                    <div key={ch.channel} style={styles.channelRow}>
                      <div style={{ ...styles.channelDot, background: color }} />
                      <ChannelIcon size={15} style={styles.channelIcon} />
                      <span style={styles.channelName}>{friendlyChannel(ch.channel)}</span>
                      <div style={styles.channelBar}>
                        <div style={{ ...styles.channelBarFill, width: `${pct}%`, background: color }} />
                      </div>
                      <span style={styles.channelStats}>{formatNumber(sessions)}</span>
                      <span style={styles.channelPct}>{pct.toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ ORGÁNICO vs PAGO ═══════ */}
      {(organicSessions > 0 || paidSessions > 0) && (
        <div className="glass-card" style={styles.sectionCard}>
          <h3 style={styles.sectionTitle}>
            <TrendingUp size={18} color="var(--primary)" />
            Tráfico Gratuito vs Pago
            <span style={styles.sectionSubtitle}>— ¿Cuánto dependés de la publicidad?</span>
          </h3>

          <div style={styles.ovpGrid}>
            <div style={{ ...styles.ovpCard, borderColor: '#10B981' }}>
              <p style={styles.ovpLabel}>
                <CheckCircle size={14} style={{ verticalAlign: 'middle', marginRight: '4px', color: '#10B981' }} />
                Tráfico Gratuito (Orgánico)
              </p>
              <p style={{ ...styles.ovpValue, color: '#10B981' }}>
                {organicPct.toFixed(0)}%
              </p>
              <p style={styles.ovpSub}>{formatNumber(organicSessions)} visitas gratis</p>
            </div>
            <div style={{ ...styles.ovpCard, borderColor: '#EF4444' }}>
              <p style={styles.ovpLabel}>
                <Target size={14} style={{ verticalAlign: 'middle', marginRight: '4px', color: '#EF4444' }} />
                Tráfico Pago (Publicidad)
              </p>
              <p style={{ ...styles.ovpValue, color: '#EF4444' }}>
                {paidPct.toFixed(0)}%
              </p>
              <p style={styles.ovpSub}>{formatNumber(paidSessions)} visitas pagas</p>
            </div>
          </div>

          {/* Barra visual proporcional */}
          <div style={styles.ovpBarContainer}>
            <div
              style={{
                width: `${organicPct}%`,
                background: 'linear-gradient(90deg, #10B981, #34D399)',
                transition: 'width 0.6s ease',
                borderRadius: organicPct >= 100 ? '6px' : '6px 0 0 6px',
              }}
            />
            <div
              style={{
                width: `${paidPct}%`,
                background: 'linear-gradient(90deg, #F87171, #EF4444)',
                transition: 'width 0.6s ease',
                borderRadius: paidPct >= 100 ? '6px' : '0 6px 6px 0',
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
            <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 600 }}>Gratis</span>
            <span style={{ fontSize: '11px', color: '#EF4444', fontWeight: 600 }}>Pago</span>
          </div>
        </div>
      )}

      {/* ═══════ EVENTS / QUÉ HACEN EN TU PÁGINA ═══════ */}
      {sortedEvents.length > 0 && (
        <div className="glass-card" style={styles.sectionCard}>
          <h3 style={styles.sectionTitle}>
            <MousePointerClick size={18} color="var(--primary)" />
            ¿Qué hacen en tu página?
            <span style={styles.sectionSubtitle}>— Acciones de los visitantes</span>
          </h3>

          <div>
            {sortedEvents.map((evt, i) => {
              const count = Number(evt.eventCount) || 0;
              const pct = (count / maxEventCount) * 100;
              const color = CHART_COLORS[i % CHART_COLORS.length];

              return (
                <div key={evt.eventName} style={styles.eventRow}>
                  <span style={styles.eventName}>{friendlyEvent(evt.eventName)}</span>
                  <div style={styles.eventBarTrack}>
                    <div
                      style={{
                        ...styles.eventBarFill,
                        width: `${Math.max(pct, 3)}%`,
                        background: `linear-gradient(90deg, ${color}, ${color}dd)`,
                      }}
                    >
                      {pct > 15 && (
                        <span style={styles.eventBarLabel}>{formatNumber(count)}</span>
                      )}
                    </div>
                  </div>
                  <span style={styles.eventCount}>{formatNumber(count)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════ E-COMMERCE ═══════ */}
      {ecommerce && ecommerce.totalRevenue > 0 && (
        <div className="glass-card" style={styles.sectionCard}>
          <h3 style={styles.sectionTitle}>
            <ShoppingCart size={18} color="var(--primary-container)" />
            Ventas y E-commerce
            <span style={styles.sectionSubtitle}>— Datos reales de GA4</span>
          </h3>

          <div style={styles.metricsGrid}>
            <MetricCard
              icon={DollarSign}
              label="Ingresos Totales"
              value={`$${formatNumber(Math.round(ecommerce.totalRevenue))}`}
              hint="Revenue bruto del período"
              iconBg="rgba(245, 158, 11, 0.12)"
              iconColor="var(--primary-container)"
            />
            <MetricCard
              icon={ShoppingCart}
              label="Compras Totales"
              value={formatNumber(ecommerce.totalPurchases)}
              hint="Transacciones completadas"
              iconBg="rgba(16, 185, 129, 0.12)"
              iconColor="#10B981"
            />
            <MetricCard
              icon={TrendingUp}
              label="Ticket Promedio"
              value={`$${formatNumber(Math.round(ecommerce.averageOrderValue))}`}
              hint="Cuánto gasta cada cliente en promedio"
              iconBg="rgba(79, 70, 229, 0.12)"
              iconColor="#4F46E5"
            />
          </div>

          {/* Top Products */}
          {ecommerce.topProducts && ecommerce.topProducts.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--on-surface)', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Package size={16} color="var(--primary-container)" />
                Productos Más Vendidos
              </h4>
              {ecommerce.topProducts.slice(0, 8).map((prod, i) => {
                const maxRev = ecommerce.topProducts[0]?.revenue || 1;
                const pct = (prod.revenue / maxRev) * 100;
                return (
                  <div key={i} style={styles.eventRow}>
                    <span style={{ ...styles.eventName, minWidth: 200 }}>
                      {prod.name || 'Sin nombre'}
                    </span>
                    <div style={styles.eventBarTrack}>
                      <div
                        style={{
                          ...styles.eventBarFill,
                          width: `${Math.max(pct, 3)}%`,
                          background: `linear-gradient(90deg, var(--primary-container), var(--primary-container)dd)`,
                        }}
                      />
                    </div>
                    <span style={styles.eventCount}>${formatNumber(Math.round(prod.revenue))}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════ EXPERT ADVICE ═══════ */}
      {advice.length > 0 && (
        <div className="glass-card" style={styles.sectionCard}>
          <h3 style={styles.sectionTitle}>
            <Lightbulb size={18} color="var(--primary-container)" />
            Consejos para tu tienda
            <span style={styles.sectionSubtitle}>— Basados en tus datos reales</span>
          </h3>

          {advice.map((item, i) => {
            let IconComp = Lightbulb;
            let bgColor = 'rgba(245, 158, 11, 0.12)';
            let fgColor = 'var(--primary-container)';

            if (item.type === 'warning') {
              IconComp = AlertTriangle;
              bgColor = 'rgba(239, 68, 68, 0.12)';
              fgColor = '#EF4444';
            } else if (item.type === 'success') {
              IconComp = CheckCircle;
              bgColor = 'rgba(16, 185, 129, 0.12)';
              fgColor = '#10B981';
            }

            return (
              <div key={i} style={styles.adviceItem}>
                <div style={{ ...styles.adviceIconWrap, background: bgColor }}>
                  <IconComp size={16} color={fgColor} />
                </div>
                <p style={styles.adviceText}>
                  <span style={{ ...styles.adviceTitle, color: fgColor }}>{item.title}</span>
                  {item.text}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
