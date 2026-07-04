import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus } from 'lucide-react';
import EventDrawer from './EventDrawer';

const CATEGORY_COLORS = {
  CAMPAIGN: { bg: 'rgba(16,185,129,0.15)', border: '#10b981', text: '#10b981' },
  PROMO: { bg: 'rgba(139,92,246,0.15)', border: '#8b5cf6', text: '#8b5cf6' },
  ACTIVITY: { bg: 'rgba(59,130,246,0.15)', border: '#3b82f6', text: '#3b82f6' },
  HOLIDAY: { bg: 'rgba(245,158,11,0.15)', border: '#f59e0b', text: '#f59e0b' },
};

const getDaysInMonth = (year, month) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year, month) => {
  // 0 = Sunday, 1 = Monday, etc. We'll adjust so Monday is 0.
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; 
};

export default function EventCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Mock events state for now. Later this can be tied to Supabase.
  const [events, setEvents] = useState([
    {
      id: '1',
      title: 'Campaña Cyber Lunes',
      category: 'CAMPAIGN',
      startDate: new Date(currentDate.getFullYear(), currentDate.getMonth(), 15).toISOString().split('T')[0],
      endDate: new Date(currentDate.getFullYear(), currentDate.getMonth(), 18).toISOString().split('T')[0],
      description: 'Presupuesto duplicado.'
    },
    {
      id: '2',
      title: 'Lanzamiento Colección',
      category: 'PROMO',
      startDate: new Date(currentDate.getFullYear(), currentDate.getMonth(), 5).toISOString().split('T')[0],
      endDate: new Date(currentDate.getFullYear(), currentDate.getMonth(), 5).toISOString().split('T')[0],
      description: 'A las 10:00 AM'
    }
  ]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  // Create grid cells
  const blanks = [];
  for (let i = 0; i < firstDay; i++) {
    blanks.push(<div key={`blank-${i}`} className="calendar-cell empty"></div>);
  }

  const daysInMonthCells = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = new Date(year, month, d).toISOString().split('T')[0];
    
    // Find events that span across this day
    const dayEvents = events.filter(ev => {
      const eStart = ev.startDate;
      const eEnd = ev.endDate || ev.startDate;
      return dateStr >= eStart && dateStr <= eEnd;
    });

    const isToday = dateStr === new Date().toISOString().split('T')[0];

    daysInMonthCells.push(
      <div 
         key={`day-${d}`} 
         className={`calendar-cell ${isToday ? 'today' : ''}`}
         onClick={() => {
            setSelectedDate(new Date(year, month, d));
            setEditingEvent(null);
            setDrawerOpen(true);
         }}
      >
        <div className="day-number">{d}</div>
        <div className="events-container">
           {dayEvents.map(ev => {
              const colors = CATEGORY_COLORS[ev.category] || CATEGORY_COLORS.ACTIVITY;
              const isStart = ev.startDate === dateStr;
              const isEnd = ev.endDate === dateStr || !ev.endDate;
              
              return (
                 <div 
                    key={ev.id} 
                    className="event-chip"
                    style={{
                       background: colors.bg,
                       borderLeft: `3px solid ${colors.border}`,
                       color: colors.text,
                       marginLeft: isStart ? 0 : -4,
                       marginRight: isEnd ? 0 : -4,
                       borderRadius: `${isStart ? 4 : 0}px ${isEnd ? 4 : 0}px ${isEnd ? 4 : 0}px ${isStart ? 4 : 0}px`
                    }}
                    onClick={(e) => {
                       e.stopPropagation();
                       setEditingEvent(ev);
                       setDrawerOpen(true);
                    }}
                 >
                    {isStart && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</span>}
                 </div>
              );
           })}
        </div>
      </div>
    );
  }

  const totalSlots = [...blanks, ...daysInMonthCells];
  // Add trailing empty slots to complete the grid (up to 6 rows = 42 slots max, or 35)
  const rowsNeeded = Math.ceil(totalSlots.length / 7);
  const trailingBlanksCount = (rowsNeeded * 7) - totalSlots.length;
  for (let i = 0; i < trailingBlanksCount; i++) {
     totalSlots.push(<div key={`blank-end-${i}`} className="calendar-cell empty"></div>);
  }

  const handleSaveEvent = (savedEvent) => {
     if (editingEvent) {
        setEvents(events.map(e => e.id === savedEvent.id ? savedEvent : e));
     } else {
        setEvents([...events, savedEvent]);
     }
  };

  return (
    <div className="glass-card" style={{ padding: 0, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      {/* Header Toolbar */}
      <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: 8 }}>
               <CalendarIcon size={24} className="text-primary" />
               {monthNames[month]} {year}
            </h2>
            <div style={{ display: 'flex', gap: 4 }}>
               <button onClick={prevMonth} className="icon-btn"><ChevronLeft size={18} /></button>
               <button onClick={goToday} style={{ padding: '6px 12px', background: 'var(--surface-container)', border: '1px solid var(--outline-variant)', borderRadius: 6, color: 'var(--on-surface)', fontWeight: 600, cursor: 'pointer' }}>Hoy</button>
               <button onClick={nextMonth} className="icon-btn"><ChevronRight size={18} /></button>
            </div>
         </div>
         <button 
            onClick={() => { setSelectedDate(null); setEditingEvent(null); setDrawerOpen(true); }}
            style={{ padding: '10px 16px', background: 'var(--primary)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
         >
            <Plus size={18} /> Nuevo Evento
         </button>
      </div>

      {/* Calendar Grid */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--surface-container-lowest)' }}>
         {/* Days Header */}
         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border-subtle)' }}>
            {dayNames.map(day => (
               <div key={day} style={{ padding: '12px', textAlign: 'center', fontWeight: 600, fontSize: 12, color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>
                  {day}
               </div>
            ))}
         </div>
         {/* Days Grid */}
         <div className="calendar-grid">
            {totalSlots}
         </div>
      </div>

      <EventDrawer 
         isOpen={drawerOpen} 
         onClose={() => setDrawerOpen(false)} 
         onSave={handleSaveEvent} 
         selectedDate={selectedDate}
         existingEvent={editingEvent}
      />

      <style>{`
        .icon-btn {
           background: var(--surface-container);
           border: 1px solid var(--outline-variant);
           color: var(--on-surface);
           width: 32px; height: 32px;
           border-radius: 6px;
           display: flex; align-items: center; justify-content: center;
           cursor: pointer;
        }
        .icon-btn:hover { background: var(--surface-container-high); }
        .calendar-grid {
           display: grid;
           grid-template-columns: repeat(7, 1fr);
           flex: 1;
           grid-auto-rows: minmax(100px, 1fr);
        }
        .calendar-cell {
           border-right: 1px solid var(--border-subtle);
           border-bottom: 1px solid var(--border-subtle);
           padding: 8px;
           display: flex;
           flex-direction: column;
           gap: 4px;
           cursor: pointer;
           transition: background 0.1s;
           overflow: hidden;
        }
        .calendar-cell:hover {
           background: var(--surface-container);
        }
        .calendar-cell:nth-child(7n) { border-right: none; }
        .calendar-cell.empty {
           background: var(--surface-container-low);
           pointer-events: none;
        }
        .calendar-cell.today .day-number {
           background: var(--primary);
           color: #fff;
           width: 24px; height: 24px;
           border-radius: 50%;
           display: flex; align-items: center; justify-content: center;
        }
        .day-number {
           font-weight: 600;
           font-size: 13px;
           color: var(--on-surface);
           margin-bottom: 4px;
           align-self: flex-end;
           width: 24px; height: 24px;
           display: flex; align-items: center; justify-content: center;
        }
        .events-container {
           display: flex;
           flex-direction: column;
           gap: 4px;
        }
        .event-chip {
           font-size: 11px;
           font-weight: 600;
           padding: 4px 6px;
           min-height: 22px;
           cursor: pointer;
        }
        .event-chip:hover {
           filter: brightness(1.2);
        }
      `}</style>
    </div>
  );
}
