import React, { useState } from 'react';
import { Calendar, ChevronDown, CalendarRange, Sparkles } from 'lucide-react';

const PRESETS = [
  { id: 'today', label: 'Hoy', metaPreset: 'today' },
  { id: 'yesterday', label: 'Ayer', metaPreset: 'yesterday' },
  { id: '7d', label: '7D', metaPreset: 'last_7d' },
  { id: '30d', label: '30D', metaPreset: 'last_30d' },
  { id: 'this_month', label: 'Este Mes', metaPreset: 'this_month' },
  { id: 'last_month', label: 'Mes Ant.', metaPreset: 'last_month' },
  { id: 'this_year', label: 'Este Año', metaPreset: 'this_year' },
  { id: 'maximum', label: 'Máximo', metaPreset: 'maximum' },
  { id: 'custom', label: 'Custom', metaPreset: 'custom' }
];

// Helper to calculate GMT-5 dates (YYYY-MM-DD)
export function calculateDates(preset) {
  // Create a formatter that enforces GMT-5
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const getGMT5Date = (date) => formatter.format(date);

  const today = new Date();
  
  let start = new Date(today);
  let end = new Date(today);

  switch(preset) {
    case 'today':
      break;
    case 'yesterday':
      start.setDate(start.getDate() - 1);
      end = new Date(start);
      break;
    case '7d':
    case 'last_7d':
      start.setDate(start.getDate() - 6);
      break;
    case '30d':
    case 'last_30d':
      start.setDate(start.getDate() - 29);
      break;
    case 'this_month':
      start.setDate(1);
      break;
    case 'last_month':
      start.setMonth(start.getMonth() - 1);
      start.setDate(1);
      end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
      break;
    case 'this_year':
      start.setMonth(0, 1);
      break;
    case 'maximum':
      start = new Date('2020-01-01');
      break;
    default:
      // Fallback: últimos 30 días
      start.setDate(start.getDate() - 29);
      break;
  }

  return { start: getGMT5Date(start), end: getGMT5Date(end) };
}

const formatNice = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function GlobalDatePicker({ dateRange, setDateRange }) {
  const showCustom = dateRange.preset === 'custom';
  const [hovered, setHovered] = useState(null);
  const activePreset = PRESETS.find(p => p.id === dateRange.preset);

  const handlePresetClick = (presetId, metaPreset) => {
    if (presetId === 'custom') {
      setDateRange({ ...dateRange, preset: 'custom', metaPreset: 'custom' });
    } else {
      // Calculate start and end dates based on preset in GMT-5
      const { start, end } = calculateDates(presetId);
      setDateRange({ preset: presetId, metaPreset, startDate: start, endDate: end });
    }
  };

  const handleCustomDateChange = (type, value) => {
    setDateRange(prev => ({ ...prev, [type]: value }));
  };

  return (
    <div className="period-banner">
      <div className="period-banner-glow" />
      <div className="period-banner-inner">
        {/* Brand / range summary */}
        <div className="period-brand">
          <div className="period-brand-icon">
            <Calendar size={16} />
            <span className="period-brand-spark"><Sparkles size={9} /></span>
          </div>
          <div className="period-brand-text">
            <span className="period-brand-title">
              {activePreset ? activePreset.label : 'Rango personalizado'}
            </span>
            <span className="period-brand-range">
              <CalendarRange size={11} />
              {formatNice(dateRange.startDate)} — {formatNice(dateRange.endDate)}
            </span>
          </div>
        </div>

        {/* Preset pills */}
        <div className="period-pills" role="tablist" aria-label="Periodo de análisis">
          {PRESETS.map(preset => {
            const isActive = dateRange.preset === preset.id;
            return (
              <button
                key={preset.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => handlePresetClick(preset.id, preset.metaPreset)}
                onMouseEnter={() => setHovered(preset.id)}
                onMouseLeave={() => setHovered(null)}
                className={`period-pill${isActive ? ' active' : ''}`}
                style={{ '--hovered': hovered === preset.id ? '1' : '0' }}
              >
                {isActive && <span className="period-pill-dot" />}
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Custom range */}
        {showCustom && (
          <div className="period-custom">
            <div className="period-custom-field">
              <span>Desde</span>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
              />
            </div>
            <div className="period-custom-arrow"><ChevronDown size={14} /></div>
            <div className="period-custom-field">
              <span>Hasta</span>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
