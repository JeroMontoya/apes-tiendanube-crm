import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus } from 'lucide-react';
import EventDrawer from './EventDrawer';

const CATEGORY_COLORS = {
  CAMPAIGN: { bg: 'rgba(16,185,129,0.15)', border: '#06B6D4', text: '#06B6D4' },
  PROMO: { bg: 'rgba(139,92,246,0.15)', border: '#8b5cf6', text: '#8b5cf6' },
  ACTIVITY: { bg: 'rgba(99, 102, 241,0.15)', border: '#6366f1', text: '#6366f1' },
  HOLIDAY: { bg: 'rgba(6, 182, 212,0.15)', border: 'var(--primary-container)', text: 'var(--primary-container)' },
};

const getDaysInMonth = (year, month) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year, month) => {
  // 0 = Sunday, 1 = Monday, etc. We'll adjust so Monday is 0.
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; 
};

// Generador dinámico de Fechas Comerciales Importantes en Colombia
const getColombianEvents = (year) => {
  // Helpers para encontrar días específicos (ej: segundo domingo de mayo)
  const getNthDayOfMonth = (year, month, dayOfWeek, n) => {
    let date = new Date(year, month, 1);
    let count = 0;
    while (date.getMonth() === month) {
      if (date.getDay() === dayOfWeek) {
        count++;
        if (count === n) return date;
      }
      date.setDate(date.getDate() + 1);
    }
    return date;
  };

  const getLastDayOfMonth = (year, month, dayOfWeek) => {
    let date = new Date(year, month + 1, 0); // Último día del mes
    while (date.getMonth() === month) {
      if (date.getDay() === dayOfWeek) return date;
      date.setDate(date.getDate() - 1);
    }
    return date;
  };

  // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  const diaDeLaMadre = getNthDayOfMonth(year, 4, 0, 2); // Mayo = 4
  const diaDelPadre = getNthDayOfMonth(year, 5, 0, 3); // Junio = 5
  const amorYAmistad = getNthDayOfMonth(year, 8, 6, 3); // Septiembre = 8
  const diaDelNino = getLastDayOfMonth(year, 3, 6); // Abril = 3
  const blackFriday = getNthDayOfMonth(year, 10, 5, 4); // Noviembre = 10 (4to o último viernes)
  
  // Si el 4to viernes no es el último, revisamos. Para simplificar, Black Friday suele ser el día después de Thanksgiving (4to Jueves).
  const thanksgiving = getNthDayOfMonth(year, 10, 4, 4);
  const realBlackFriday = new Date(thanksgiving);
  realBlackFriday.setDate(realBlackFriday.getDate() + 1);
  
  const cyberMonday = new Date(realBlackFriday);
  cyberMonday.setDate(cyberMonday.getDate() + 3);

  const formatDate = (date) => date.toISOString().split('T')[0];

  return [
    { id: `co-mujer-${year}`, title: 'Día de la Mujer', category: 'HOLIDAY', startDate: `${year}-03-08`, endDate: `${year}-03-08`, description: 'Temporada alta. Ideal para campañas enfocadas en mujeres.' },
    { id: `co-nino-${year}`, title: 'Día de la Niñez', category: 'HOLIDAY', startDate: formatDate(diaDelNino), endDate: formatDate(diaDelNino), description: 'Último sábado de abril.' },
    { id: `co-madre-${year}`, title: 'Día de la Madre', category: 'HOLIDAY', startDate: formatDate(diaDeLaMadre), endDate: formatDate(diaDeLaMadre), description: 'Segundo domingo de mayo. Segunda fecha comercial más importante del año.' },
    { id: `co-padre-${year}`, title: 'Día del Padre', category: 'HOLIDAY', startDate: formatDate(diaDelPadre), endDate: formatDate(diaDelPadre), description: 'Tercer domingo de junio.' },
    { id: `co-amor-${year}`, title: 'Amor y Amistad', category: 'HOLIDAY', startDate: formatDate(amorYAmistad), endDate: formatDate(amorYAmistad), description: 'Tercer sábado de septiembre. Gran volumen de regalos.' },
    { id: `co-halloween-${year}`, title: 'Halloween', category: 'HOLIDAY', startDate: `${year}-10-31`, endDate: `${year}-10-31`, description: 'Temporada de disfraces y dulces.' },
    { id: `co-bf-${year}`, title: 'Black Friday', category: 'CAMPAIGN', startDate: formatDate(realBlackFriday), endDate: formatDate(realBlackFriday), description: 'El evento global de descuentos más importante.' },
    { id: `co-cm-${year}`, title: 'Cyber Lunes', category: 'CAMPAIGN', startDate: formatDate(cyberMonday), endDate: formatDate(cyberMonday), description: 'Día de descuentos enfocado 100% online.' },
    { id: `co-navidad-${year}`, title: 'Navidad', category: 'HOLIDAY', startDate: `${year}-12-24`, endDate: `${year}-12-25`, description: 'Pico máximo de ventas del año. Las campañas deben iniciar desde Noviembre.' },
    { id: `co-primas1-${year}`, title: 'Temporada de Primas (Mitad de año)', category: 'PROMO', startDate: `${year}-06-15`, endDate: `${year}-06-30`, description: 'Pago de primas legales en Colombia. Mayor poder adquisitivo.' },
    { id: `co-primas2-${year}`, title: 'Temporada de Primas (Fin de año)', category: 'PROMO', startDate: `${year}-12-01`, endDate: `${year}-12-20`, description: 'Pago de primas navideñas.' },
  ];
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

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Combine custom events with Colombian dates dynamically
  const allEvents = React.useMemo(() => {
    return [...events, ...getColombianEvents(year), ...getColombianEvents(year - 1), ...getColombianEvents(year + 1)];
  }, [events, year]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);

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

  const getEventsForDate = (day) => {
    const dStr = new Date(year, month, day, 12, 0, 0).toISOString().split('T')[0];
    return allEvents.filter(ev => dStr >= ev.startDate && dStr <= ev.endDate);
  };

  const daysInMonthCells = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = new Date(year, month, d).toISOString().split('T')[0];
    
    // Find events that span across this day
    const dayEvents = getEventsForDate(d);

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
            style={{ padding: '10px 16px', background: 'var(--primary)', border: 'none', borderRadius: 8, color: 'var(--on-surface)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
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
