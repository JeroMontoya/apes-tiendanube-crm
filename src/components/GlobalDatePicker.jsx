import React, { useState } from 'react';
import { Calendar } from 'lucide-react';

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

export default function GlobalDatePicker({ dateRange, setDateRange }) {
  const showCustom = dateRange.preset === 'custom';
  
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
    <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '24px', padding: '16px 24px', borderRadius: 'var(--radius-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '16px' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Calendar size={16} color="var(--primary)" />
        </div>
        <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--on-surface)' }}>Visión General</span>
      </div>

      {PRESETS.map(preset => {
        const isActive = dateRange.preset === preset.id;
        return (
          <button
            key={preset.id}
            onClick={() => handlePresetClick(preset.id, preset.metaPreset)}
            style={{
              padding: '6px 16px',
              borderRadius: '9999px',
              border: isActive ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
              background: isActive ? 'var(--primary)' : 'var(--surface-container-low)',
              color: isActive ? '#ffffff' : 'var(--on-surface-variant)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: isActive ? '700' : '500',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: isActive ? '0 4px 12px rgba(45, 139, 78, 0.2)' : 'none',
            }}
            onMouseEnter={e => {
              if (!isActive) {
                e.currentTarget.style.background = 'var(--surface-container-high)';
                e.currentTarget.style.color = 'var(--on-surface)';
              } else {
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={e => {
              if (!isActive) {
                e.currentTarget.style.background = 'var(--surface-container-low)';
                e.currentTarget.style.color = 'var(--on-surface-variant)';
              } else {
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            {preset.label}
          </button>
        );
      })}

      {showCustom && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface-container-low)', padding: '4px 16px', borderRadius: '9999px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--on-surface-variant)' }}>Desde</span>
            <input 
              type="date" 
              value={dateRange.startDate}
              onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--on-surface)', outline: 'none', fontSize: '13px', fontFamily: 'inherit', fontWeight: '500' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface-container-low)', padding: '4px 16px', borderRadius: '9999px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--on-surface-variant)' }}>Hasta</span>
            <input 
              type="date" 
              value={dateRange.endDate}
              onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--on-surface)', outline: 'none', fontSize: '13px', fontFamily: 'inherit', fontWeight: '500' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
