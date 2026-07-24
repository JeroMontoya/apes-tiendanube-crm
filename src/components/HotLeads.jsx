import React, { useState, useEffect, useCallback } from 'react';
import { Zap, Phone, MessageSquare, TrendingUp, AlertTriangle, CheckCircle, Clock, DollarSign, Truck, Ruler, Package, Shield, Heart, ShoppingCart, Filter, RefreshCw } from 'lucide-react';

const API_BASE = '/api';

const OBJECTION_ICONS = {
  PRECIO: DollarSign,
  ENVIO: Truck,
  TALLA: Ruler,
  DISPONIBILIDAD: Package,
  GARANTIA: Shield,
  CONFIANZA: Heart,
  COMPRA_INTENT: ShoppingCart,
  GENERIC: MessageSquare,
};

const OBJECTION_COLORS = {
  PRECIO: '#A08240',
  ENVIO: '#3D5A99',
  TALLA: '#3B8A6E',
  DISPONIBILIDAD: '#6B5BA0',
  GARANTIA: '#994444',
  CONFIANZA: '#4A8FA8',
  COMPRA_INTENT: '#CC3333',
  GENERIC: '#666',
};

const STATUS_LABELS = {
  NEW: { label: 'Nuevo', color: '#CC3333', bg: 'rgba(204,51,51,0.12)' },
  URGENT: { label: 'Urgente', color: '#FF4444', bg: 'rgba(255,68,68,0.12)' },
  CONTACTED: { label: 'Contactado', color: '#A08240', bg: 'rgba(160,130,64,0.12)' },
  CONVERTED: { label: 'Convertido', color: '#3B8A6E', bg: 'rgba(59,138,110,0.12)' },
  CLOSED: { label: 'Cerrado', color: '#666', bg: 'rgba(102,102,102,0.12)' },
};

export default function HotLeads() {
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeads = useCallback(async () => {
    try {
      const url = filter === 'all'
        ? `${API_BASE}/whatsapp/hot-leads`
        : `${API_BASE}/whatsapp/hot-leads?status=${filter}`;
      const r = await fetch(url);
      if (r.ok) {
        const data = await r.json();
        setLeads(data.leads || []);
        setStats(data.stats || null);
      }
    } catch (e) {
      console.error('Failed to fetch hot leads:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(fetchLeads, 30000);
    return () => clearInterval(interval);
  }, [fetchLeads]);

  const handleRefresh = () => { setRefreshing(true); fetchLeads(); };

  const urgentCount = leads.filter(l => l.priority === 1 || l.status === 'URGENT').length;
  const newCount = leads.filter(l => l.status === 'NEW').length;

  return (
    <div style={{ padding: '20px', minHeight: '100vh', background: '#0A0A0A' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ color: '#E8E6E3', fontSize: '20px', fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
            Leads Calientes — WhatsApp
          </h1>
          <p style={{ color: '#8A8F98', fontSize: '12px', margin: '4px 0 0', fontFamily: 'Inter, sans-serif' }}>
            Respuestas de clientes clasificadas por objeciones de compra
          </p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing} style={{ background: 'none', border: '1px solid #333', color: '#8A8F98', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'Inter, sans-serif', fontSize: '12px' }}>
          <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          Actualizar
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <KPICard icon={Zap} label="Urgentes" value={urgentCount} color="#CC3333" />
        <KPICard icon={AlertTriangle} label="Nuevos" value={newCount} color="#A08240" />
        <KPICard icon={TrendingUp} label="Total 30d" value={leads.length} color="#3D5A99" />
        <KPICard icon={CheckCircle} label="Convertidos" value={leads.filter(l => l.status === 'CONVERTED').length} color="#3B8A6E" />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {['all', 'NEW', 'URGENT', 'CONTACTED', 'CONVERTED'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            background: filter === f ? '#3D5A99' : '#111214',
            color: filter === f ? '#fff' : '#8A8F98',
            border: `1px solid ${filter === f ? '#3D5A99' : '#222'}`,
            padding: '6px 14px', borderRadius: '6px', cursor: 'pointer',
            fontFamily: 'Inter, sans-serif', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            {f === 'all' ? 'Todos' : (STATUS_LABELS[f]?.label || f)}
          </button>
        ))}
      </div>

      {/* Leads Table */}
      {loading ? (
        <div style={{ color: '#666', textAlign: 'center', padding: '60px' }}>Cargando leads...</div>
      ) : leads.length === 0 ? (
        <div style={{ color: '#666', textAlign: 'center', padding: '60px', background: '#111214', borderRadius: '8px', border: '1px solid #1A1B1E' }}>
          <Zap size={32} style={{ color: '#333', marginBottom: '12px' }} />
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px' }}>No hay leads calientes aun</p>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#555' }}>Los leads aparecen cuando clientes responden mensajes de WhatsApp</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {leads.map(lead => (
            <LeadCard key={lead.id} lead={lead} onRefresh={fetchLeads} />
          ))}
        </div>
      )}
    </div>
  );
}

function KPICard({ icon: Icon, label, value, color }) {
  return (
    <div style={{ background: '#111214', border: '1px solid #1A1B1E', borderRadius: '8px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <div style={{ color: '#E8E6E3', fontSize: '22px', fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>{value}</div>
        <div style={{ color: '#666', fontSize: '11px', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      </div>
    </div>
  );
}

function LeadCard({ lead, onRefresh }) {
  const [updating, setUpdating] = useState(false);
  const Icon = OBJECTION_ICONS[lead.objection_type] || MessageSquare;
  const color = OBJECTION_COLORS[lead.objection_type] || '#666';
  const statusInfo = STATUS_LABELS[lead.status] || STATUS_LABELS.NEW;

  const handleStatus = async (newStatus) => {
    setUpdating(true);
    try {
      await fetch(`${API_BASE}/whatsapp/hot-leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      onRefresh();
    } catch (e) { console.error(e); }
    setUpdating(false);
  };

  const timeAgo = getTimeAgo(lead.created_at);

  return (
    <div style={{
      background: '#111214', border: `1px solid ${lead.priority === 1 ? '#CC333333' : '#1A1B1E'}`,
      borderRadius: '8px', padding: '16px', display: 'flex', alignItems: 'flex-start', gap: '14px',
      borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={18} style={{ color }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
          <div>
            <span style={{ color: '#E8E6E3', fontSize: '13px', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
              {lead.objection_type}
            </span>
            <span style={{ color: '#555', fontSize: '11px', fontFamily: 'Inter, sans-serif', marginLeft: '8px' }}>
              {timeAgo}
            </span>
          </div>
          <span style={{ background: statusInfo.bg, color: statusInfo.color, padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontFamily: 'Inter, sans-serif', fontWeight: 600, textTransform: 'uppercase' }}>
            {statusInfo.label}
          </span>
        </div>

        <p style={{ color: '#8A8F98', fontSize: '12px', fontFamily: 'Inter, sans-serif', margin: '0 0 8px', lineHeight: 1.4 }}>
          "{lead.message_text}"
        </p>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: '#555', fontSize: '11px', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Phone size={11} /> {lead.phone}
          </span>
          {lead.product_context && (
            <span style={{ color: '#555', fontSize: '11px', fontFamily: 'Inter, sans-serif' }}>
              Producto: {lead.product_context}
            </span>
          )}
          {lead.cart_total > 0 && (
            <span style={{ color: '#A08240', fontSize: '11px', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
              ${lead.cart_total.toLocaleString('es-CO')}
            </span>
          )}
          {lead.related_order_id && (
            <span style={{ color: '#3D5A99', fontSize: '11px', fontFamily: 'Inter, sans-serif' }}>
              #ORD-{lead.related_order_id}
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
        {lead.status === 'NEW' || lead.status === 'URGENT' ? (
          <button onClick={() => handleStatus('CONTACTED')} disabled={updating} style={{ background: '#A0824020', color: '#A08240', border: '1px solid #A0824033', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
            Contactar
          </button>
        ) : null}
        {lead.status === 'CONTACTED' ? (
          <button onClick={() => handleStatus('CONVERTED')} disabled={updating} style={{ background: '#3B8A6E20', color: '#3B8A6E', border: '1px solid #3B8A6E33', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
            Convertido
          </button>
        ) : null}
        {lead.status !== 'CLOSED' && lead.status !== 'CONVERTED' ? (
          <button onClick={() => handleStatus('CLOSED')} disabled={updating} style={{ background: '#33333320', color: '#666', border: '1px solid #333', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontFamily: 'Inter, sans-serif' }}>
            Cerrar
          </button>
        ) : null}
      </div>
    </div>
  );
}

function getTimeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return mins + 'm';
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + 'h';
  return Math.floor(hours / 24) + 'd';
}
