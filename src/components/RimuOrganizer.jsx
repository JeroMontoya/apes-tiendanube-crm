import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Activity, 
  Wallet, 
  Clock, 
  BookOpen,
  Plus,
  Trash2,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Calendar,
  CheckCircle2,
  Circle,
  Save,
  Command,
  Flame,
  Search
} from 'lucide-react';
import { useTasks } from '../hooks/useTasks';

const THEME = {
  bgBase: '#090B0F',
  bgSurface: '#11141A',
  bgElevated: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid rgba(255, 255, 255, 0.06)',
  textPrimary: '#E2E8F0',
  textSecondary: '#8B9BB4',
  accentEmerald: '#06B6D4',
  accentPurple: '#8B5CF6',
  accentBlue: '#3B82F6',
  accentRose: '#E11D48',
  glass: {
    background: 'rgba(15, 18, 25, 0.6)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.5)'
  }
};

const STYLES = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 100px)', // adjust for main app padding
    width: '100%',
    backgroundColor: THEME.bgBase,
    color: THEME.textPrimary,
    fontFamily: '"Inter", "Outfit", system-ui, -apple-system, sans-serif',
    overflow: 'hidden',
    borderRadius: '16px',
    border: THEME.border,
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
  },
  topNav: {
    width: '100%',
    ...THEME.glass,
    display: 'flex',
    alignItems: 'center',
    padding: '0 24px',
    zIndex: 10,
    borderBottom: THEME.border,
    overflowX: 'auto',
    minHeight: '64px'
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginRight: '32px',
    fontSize: '18px',
    fontWeight: '700',
    letterSpacing: '-0.5px',
    background: `linear-gradient(135deg, ${THEME.textPrimary}, ${THEME.textSecondary})`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  navItem: (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backgroundColor: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
    color: isActive ? THEME.textPrimary : THEME.textSecondary,
    fontWeight: isActive ? '600' : '500',
    whiteSpace: 'nowrap',
    fontSize: '14px'
  }),
  contentArea: {
    flex: 1,
    height: '100%',
    overflowY: 'auto',
    padding: '40px',
    background: 'radial-gradient(circle at top right, rgba(6, 182, 212, 0.04), transparent 40%), radial-gradient(circle at bottom left, rgba(139, 92, 246, 0.04), transparent 40%)'
  },
  bentoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(12, 1fr)',
    gap: '24px',
    autoRows: 'minmax(180px, auto)'
  },
  card: {
    ...THEME.glass,
    borderRadius: '24px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    fontSize: '16px',
    fontWeight: '600',
    color: THEME.textPrimary
  },
  input: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.2)',
    border: THEME.border,
    borderRadius: '12px',
    padding: '12px 16px',
    color: THEME.textPrimary,
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  button: (color = THEME.accentEmerald) => ({
    backgroundColor: color,
    color: '#000',
    border: 'none',
    borderRadius: '12px',
    padding: '12px 24px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'opacity 0.2s',
  })
};

// --- Subviews ---

const DashboardView = ({ tasks }) => {
  const [habits] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('bd_habitos') || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });
  const [finances] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('bd_finanzas'));
      if (parsed && typeof parsed === 'object' && typeof parsed.balance === 'number') {
        return { balance: parsed.balance, transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [] };
      }
      return { balance: 0, transactions: [] };
    } catch { return { balance: 0, transactions: [] }; }
  });
  const [routine] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('bd_rutina') || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });
  const [completedToday] = useState(() => {
    try {
      const todayKey = new Date().toISOString().split('T')[0];
      const parsed = JSON.parse(localStorage.getItem('bd_rutina_history') || '{}');
      return (parsed && parsed[todayKey]) ? parsed[todayKey] : [];
    } catch { return []; }
  });

  const todayHabits = habits.filter(h => h.active).slice(0, 4);
  const topTasks = (tasks || []).filter(t => t.status === 'todo').slice(0, 3);

  // Monthly finance KPIs
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthTxs = (finances.transactions || []).filter(tx => {
    const d = new Date(tx.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const monthIncome = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthExpense = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  // Routine progress
  const routineTotal = routine.length;
  const routineCompleted = routine.filter(r => completedToday.includes(r.id)).length;
  const routinePct = routineTotal > 0 ? Math.round((routineCompleted / routineTotal) * 100) : 0;

  return (
    <div>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '800', margin: '0 0 4px 0' }}>Centro de Mando</h1>
        <p style={{ color: THEME.textSecondary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={16} />
          {now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '20px' }}>

        {/* Top Tasks - Main widget */}
        <div style={{ ...STYLES.card, gridColumn: 'span 7', gridRow: 'span 2' }}>
          <div style={STYLES.cardHeader}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckSquare size={18} color={THEME.accentPurple} /> Tareas Pendientes
            </span>
            <span style={{ fontSize: '12px', color: THEME.textSecondary }}>{(tasks || []).filter(t => t.status === 'todo').length} pendientes</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
            {topTasks.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: THEME.textSecondary, fontSize: '14px' }}>
                ✅ Todo completado. ¡Excelente!
              </div>
            ) : (
              topTasks.map(task => (
                <div key={task.id} style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.02)', border: THEME.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Circle size={16} color={THEME.textSecondary} />
                    <span style={{ fontSize: '14px' }}>{task.title}</span>
                  </div>
                  <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', backgroundColor: 'rgba(168,85,247,0.1)', color: THEME.accentPurple }}>
                    {task.priority || 'medium'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Finance KPIs */}
        <div style={{ ...STYLES.card, gridColumn: 'span 5', background: 'linear-gradient(135deg, rgba(16,185,129,0.08), transparent)' }}>
          <div style={STYLES.cardHeader}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wallet size={18} color={THEME.accentEmerald} /> Finanzas del Mes
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', color: THEME.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ingresos</div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: THEME.accentEmerald }}>+${monthIncome.toLocaleString('en-US', { minimumFractionDigits: 0 })}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: THEME.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gastos</div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: THEME.accentRose }}>-${monthExpense.toLocaleString('en-US', { minimumFractionDigits: 0 })}</div>
            </div>
          </div>
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '11px', color: THEME.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Balance Total</div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: (finances.balance || 0) >= 0 ? THEME.accentEmerald : THEME.accentRose }}>
              ${(finances.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Routine Progress */}
        <div style={{ ...STYLES.card, gridColumn: 'span 5', background: 'linear-gradient(135deg, rgba(168,85,247,0.08), transparent)' }}>
          <div style={STYLES.cardHeader}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color={THEME.accentPurple} /> Rutina Hoy
            </span>
            <span style={{ fontSize: '14px', fontWeight: '700', color: routinePct === 100 ? THEME.accentEmerald : THEME.accentPurple }}>{routinePct}%</span>
          </div>
          <div style={{ width: '100%', height: '8px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.05)', overflow: 'hidden', marginBottom: '12px' }}>
            <div style={{ width: `${routinePct}%`, height: '100%', borderRadius: '4px', background: `linear-gradient(90deg, ${THEME.accentPurple}, #c084fc)`, transition: 'width 0.5s' }} />
          </div>
          <div style={{ fontSize: '13px', color: THEME.textSecondary }}>
            {routineCompleted} de {routineTotal} bloques completados
          </div>
          <div style={{ fontSize: '16px', fontWeight: '600', marginTop: '4px', color: routinePct === 100 ? THEME.accentEmerald : routinePct > 50 ? THEME.accentPurple : THEME.accentRose }}>
            {routinePct === 100 ? '🔥 Día Perfecto' : routinePct > 50 ? '⚡ En Camino' : '🎯 Enfócate'}
          </div>
        </div>

        {/* Hábitos Widget */}
        <div style={{ ...STYLES.card, gridColumn: 'span 12' }}>
          <div style={STYLES.cardHeader}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} color={THEME.accentBlue} /> Hábitos Activos
            </span>
            <span style={{ fontSize: '12px', color: THEME.textSecondary }}>{habits.length} hábitos</span>
          </div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {todayHabits.length === 0 ? (
              <div style={{ color: THEME.textSecondary, fontSize: '14px' }}>No hay hábitos configurados. Ve a la pestaña de Hábitos para crear uno.</div>
            ) : (
              todayHabits.map((h, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', backgroundColor: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: THEME.accentBlue }} />
                  <span style={{ fontSize: '13px', fontWeight: '500' }}>{h.name}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const TasksView = ({ tasks, addTask, updateTaskStatus, deleteTask }) => {
  const [newTask, setNewTask] = useState('');
  const [priority, setPriority] = useState('medium');

  const handleAdd = (e) => {
    e.preventDefault();
    if (newTask.trim()) {
      addTask(newTask, 'todo', priority);
      setNewTask('');
    }
  };

  const columns = [
    { id: 'todo', title: 'Backlog', icon: Circle, color: THEME.accentRose, bg: 'rgba(244,63,94,0.05)' },
    { id: 'in_progress', title: 'En Foco', icon: Clock, color: THEME.accentBlue, bg: 'rgba(59,130,246,0.05)' },
    { id: 'done', title: 'Completado', icon: CheckCircle2, color: THEME.accentEmerald, bg: 'rgba(16,185,129,0.05)' }
  ];

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header>
        <h2 style={{ fontSize: '28px', margin: '0 0 4px 0' }}>Matriz de Tareas</h2>
        <p style={{ color: THEME.textSecondary, margin: 0, fontSize: '14px' }}>
          Gestión ágil Onyx. Organiza tu trabajo por prioridad.
        </p>
      </header>

      {/* Control Panel */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
        <div style={{ ...STYLES.card, flex: 1, padding: '16px 24px' }}>
          <form onSubmit={handleAdd} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <input 
              type="text" 
              placeholder="Nueva tarea..." 
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              style={{ ...STYLES.input, flex: 1 }}
            />
            <select value={priority} onChange={(e) => setPriority(e.target.value)} style={{ ...STYLES.input, width: '120px', appearance: 'none', cursor: 'pointer' }}>
              <option value="low">Baja ⚪</option>
              <option value="medium">Media 🔵</option>
              <option value="high">Alta 🔴</option>
            </select>
            <button type="submit" style={{ ...STYLES.button(THEME.accentPurple), color: '#000', fontWeight: '700' }}>
              <Plus size={16} /> Crear
            </button>
          </form>
        </div>

        {/* Mini progress */}
        <div style={{ ...STYLES.card, width: '300px', padding: '16px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
            <span style={{ color: THEME.textSecondary }}>Progreso global</span>
            <span style={{ fontWeight: '700', color: progressPct === 100 ? THEME.accentEmerald : THEME.accentPurple }}>{progressPct}%</span>
          </div>
          <div style={{ width: '100%', height: '6px', borderRadius: '3px', backgroundColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
             <div style={{ width: `${progressPct}%`, height: '100%', background: `linear-gradient(90deg, ${THEME.accentPurple}, #c084fc)`, transition: 'width 0.5s' }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', flex: 1, overflowX: 'auto', paddingBottom: '16px' }}>
        {columns.map(col => {
          const colTasks = tasks.filter(t => t.status === col.id);
          return (
            <div key={col.id} style={{ ...STYLES.card, flex: 1, minWidth: '320px', backgroundColor: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', borderTop: `3px solid ${col.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <col.icon size={20} color={col.color} />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>{col.title}</h3>
                <span style={{ marginLeft: 'auto', backgroundColor: col.bg, color: col.color, padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700' }}>
                  {colTasks.length}
                </span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
                {colTasks.length === 0 ? (
                  <div style={{ color: THEME.textSecondary, textAlign: 'center', padding: '32px 0', fontSize: '13px', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                    Sin tareas
                  </div>
                ) : (
                  colTasks.map(task => (
                    <div key={task.id} style={{ padding: '16px', backgroundColor: 'rgba(255,255,255,0.02)', border: THEME.border, borderRadius: '12px', transition: 'transform 0.2s, background-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '2px 8px', borderRadius: '4px', 
                          backgroundColor: task.priority === 'high' ? 'rgba(244,63,94,0.1)' : task.priority === 'medium' ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.05)',
                          color: task.priority === 'high' ? THEME.accentRose : task.priority === 'medium' ? THEME.accentBlue : THEME.textSecondary, fontWeight: '700'
                        }}>
                          {task.priority || 'medium'}
                        </span>
                        <button onClick={() => deleteTask(task.id)} style={{ background: 'none', border: 'none', color: THEME.textSecondary, cursor: 'pointer', padding: '2px', opacity: 0.5, transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0.5}>
                          <Trash2 size={14} color={THEME.accentRose} />
                        </button>
                      </div>
                      
                      <div style={{ fontSize: '15px', lineHeight: '1.5', marginBottom: '16px', fontWeight: '500', color: col.id === 'done' ? THEME.textSecondary : THEME.textPrimary, textDecoration: col.id === 'done' ? 'line-through' : 'none' }}>
                        {task.title}
                      </div>

                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                        {col.id !== 'todo' && (
                          <button onClick={() => updateTaskStatus(task.id, col.id === 'done' ? 'in_progress' : 'todo')} style={{ ...STYLES.button('transparent'), padding: '6px 12px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.1)', color: THEME.textSecondary }}>
                            <ArrowRight size={14} style={{ transform: 'rotate(180deg)' }} /> Atrás
                          </button>
                        )}
                        {col.id !== 'done' && (
                          <button onClick={() => updateTaskStatus(task.id, col.id === 'todo' ? 'in_progress' : 'done')} style={{ ...STYLES.button(col.id === 'todo' ? THEME.accentBlue : THEME.accentEmerald), padding: '6px 12px', fontSize: '12px', color: '#000', fontWeight: '600' }}>
                            Avanzar <ArrowRight size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const HabitsView = () => {
  const [habits, setHabits] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('bd_habitos') || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [newHabit, setNewHabit] = useState('');

  const saveHabits = (h) => {
    setHabits(h);
    localStorage.setItem('bd_habitos', JSON.stringify(h));
  };

  const addHabit = (e) => {
    e.preventDefault();
    if(newHabit.trim()) {
      saveHabits([...habits, { id: Date.now(), name: newHabit, active: true, streak: 0, history: {} }]);
      setNewHabit('');
    }
  };

  const toggleDay = (habitId, dateStr) => {
    const updated = habits.map(h => {
      if(h.id === habitId) {
        const hst = { ...h.history };
        if (hst[dateStr]) {
          delete hst[dateStr];
        } else {
          hst[dateStr] = true;
        }
        
        // Recalculate streak
        let currentStreak = 0;
        let d = new Date();
        while (true) {
          const ds = d.toISOString().split('T')[0];
          if (hst[ds]) {
            currentStreak++;
            d.setDate(d.getDate() - 1);
          } else if (currentStreak === 0 && ds === new Date().toISOString().split('T')[0]) {
             // allow today to be missed without breaking streak if checking yesterday
             d.setDate(d.getDate() - 1);
          } else {
            break;
          }
        }
        
        return { ...h, history: hst, streak: currentStreak };
      }
      return h;
    });
    saveHabits(updated);
  };

  const deleteHabit = (id) => saveHabits(habits.filter(h => h.id !== id));

  // Generate last 14 days array for heatmap
  const last14Days = Array.from({length: 14}, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return d.toISOString().split('T')[0];
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const todayCompleted = habits.filter(h => h.history && h.history[todayStr]).length;
  const progressPct = habits.length > 0 ? Math.round((todayCompleted / habits.length) * 100) : 0;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header>
        <h2 style={{ fontSize: '28px', margin: '0 0 4px 0' }}>Matriz de Hábitos</h2>
        <p style={{ color: THEME.textSecondary, margin: 0, fontSize: '14px' }}>
          Construye disciplina. Rompe la inercia.
        </p>
      </header>

      {/* KPI Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        <div style={{ ...STYLES.card, background: 'linear-gradient(135deg, rgba(59,130,246,0.1), transparent)' }}>
          <div style={{ color: THEME.textSecondary, fontSize: '12px', textTransform: 'uppercase', marginBottom: '8px' }}>Progreso de Hoy</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <div style={{ fontSize: '32px', fontWeight: '800', color: progressPct === 100 ? THEME.accentEmerald : THEME.accentBlue }}>{progressPct}%</div>
            <div style={{ color: THEME.textSecondary, fontSize: '14px' }}>{todayCompleted} / {habits.length} completados</div>
          </div>
          <div style={{ width: '100%', height: '4px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '12px' }}>
            <div style={{ width: `${progressPct}%`, height: '100%', backgroundColor: progressPct === 100 ? THEME.accentEmerald : THEME.accentBlue, borderRadius: '2px', transition: 'width 0.5s' }} />
          </div>
        </div>
        
        <div style={{ ...STYLES.card, gridColumn: 'span 2' }}>
           <form onSubmit={addHabit} style={{ display: 'flex', gap: '12px', height: '100%', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Instalar Nuevo Hábito</div>
              <input type="text" placeholder="Ej. Meditar 10 mins..." value={newHabit} onChange={(e) => setNewHabit(e.target.value)} style={{ ...STYLES.input, width: '100%' }} />
            </div>
            <button type="submit" style={{ ...STYLES.button(THEME.accentBlue), color: '#000', fontWeight: '700', alignSelf: 'flex-end' }}>
              <Plus size={16} /> Agregar
            </button>
          </form>
        </div>
      </div>

      <div style={STYLES.card}>
        {habits.length === 0 ? (
          <div style={{ textAlign: 'center', color: THEME.textSecondary, padding: '40px' }}>
            No tienes hábitos configurados. Agrega uno arriba para comenzar.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header row for days */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px', paddingRight: '48px', marginBottom: '-8px' }}>
              {last14Days.map((d, i) => {
                const isToday = d === todayStr;
                return (
                  <div key={d} style={{ width: '24px', textAlign: 'center', fontSize: '10px', color: isToday ? THEME.accentBlue : THEME.textSecondary, fontWeight: isToday ? '700' : '400' }}>
                    {new Date(d).getDate()}
                  </div>
                );
              })}
            </div>

            {/* Habits List */}
            {habits.map(habit => (
              <div key={habit.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '250px' }}>
                  <button onClick={() => deleteHabit(habit.id)} style={{ background: 'none', border: 'none', color: THEME.textSecondary, cursor: 'pointer', opacity: 0.5, transition: 'opacity 0.2s' }} onMouseEnter={e=>e.currentTarget.style.opacity=1} onMouseLeave={e=>e.currentTarget.style.opacity=0.5}>
                    <Trash2 size={16} color={THEME.accentRose} />
                  </button>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '600' }}>{habit.name}</div>
                    <div style={{ fontSize: '12px', color: THEME.textSecondary, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Flame size={12} color={habit.streak > 0 ? THEME.accentOrange || '#f97316' : THEME.textSecondary} />
                      {habit.streak} racha
                    </div>
                  </div>
                </div>

                {/* 14-Day Heatmap */}
                <div style={{ display: 'flex', gap: '4px', flex: 1, justifyContent: 'flex-end' }}>
                  {last14Days.map(dStr => {
                    const isCompleted = habit.history && habit.history[dStr];
                    const isToday = dStr === todayStr;
                    return (
                      <button 
                        key={dStr}
                        onClick={() => toggleDay(habit.id, dStr)}
                        title={dStr}
                        style={{ 
                          width: '24px', 
                          height: '24px', 
                          borderRadius: '6px', 
                          border: isToday && !isCompleted ? `1px dashed ${THEME.accentBlue}` : 'none',
                          cursor: 'pointer',
                          backgroundColor: isCompleted ? THEME.accentBlue : 'rgba(255,255,255,0.04)',
                          transition: 'all 0.2s',
                          opacity: isCompleted ? 1 : 0.6
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const FINANCE_CATEGORIES = [
  { id: 'operaciones', label: 'Operaciones', color: '#3b82f6' },
  { id: 'marketing', label: 'Marketing', color: '#a855f7' },
  { id: 'equipo', label: 'Equipo', color: '#f59e0b' },
  { id: 'herramientas', label: 'Herramientas', color: '#06b6d4' },
  { id: 'personal', label: 'Personal', color: '#8B5CF6' },
  { id: 'otro', label: 'Otro', color: '#6b7280' },
];

const FinancesView = () => {
  const [finances, setFinances] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('bd_finanzas'));
      if (parsed && typeof parsed === 'object' && typeof parsed.balance === 'number') {
        return { balance: parsed.balance, transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [] };
      }
      return { balance: 0, transactions: [] };
    } catch {
      return { balance: 0, transactions: [] };
    }
  });
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [type, setType] = useState('income');
  const [category, setCategory] = useState('operaciones');
  const [filter, setFilter] = useState('all');

  const saveFinances = (f) => {
    setFinances(f);
    localStorage.setItem('bd_finanzas', JSON.stringify(f));
  };

  const addTx = (e) => {
    e.preventDefault();
    if (amount && desc) {
      const val = parseFloat(amount);
      const isIncome = type === 'income';
      const newTx = { id: Date.now(), desc, amount: val, type, category, date: new Date().toISOString() };
      const newBalance = isIncome ? finances.balance + val : finances.balance - val;
      saveFinances({ balance: newBalance, transactions: [newTx, ...finances.transactions] });
      setAmount('');
      setDesc('');
    }
  };

  const deleteTx = (txId) => {
    const tx = finances.transactions.find(t => t.id === txId);
    if (!tx) return;
    const adjustment = tx.type === 'income' ? -tx.amount : tx.amount;
    saveFinances({
      balance: finances.balance + adjustment,
      transactions: finances.transactions.filter(t => t.id !== txId),
    });
  };

  // Monthly KPIs
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthTxs = finances.transactions.filter(tx => {
    const d = new Date(tx.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const monthIncome = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthExpense = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const monthNet = monthIncome - monthExpense;

  // Category breakdown (expenses only, current month)
  const expenseByCategory = {};
  monthTxs.filter(t => t.type === 'expense').forEach(tx => {
    const cat = tx.category || 'otro';
    expenseByCategory[cat] = (expenseByCategory[cat] || 0) + tx.amount;
  });
  const maxCatExpense = Math.max(1, ...Object.values(expenseByCategory));

  // Filtered transactions
  const filteredTxs = filter === 'all' ? finances.transactions : finances.transactions.filter(t => t.type === (filter === 'income' ? 'income' : 'expense'));

  const filterTabs = [
    { id: 'all', label: 'Todo' },
    { id: 'income', label: 'Ingresos' },
    { id: 'expense', label: 'Gastos' },
  ];

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header>
        <h2 style={{ fontSize: '28px', margin: '0 0 4px 0' }}>Centro de Control Financiero</h2>
        <p style={{ color: THEME.textSecondary, margin: 0, fontSize: '14px' }}>
          {now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })} — Resumen en tiempo real
        </p>
      </header>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div style={{ ...STYLES.card, background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.02))' }}>
          <div style={{ color: THEME.textSecondary, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Balance Total</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: finances.balance >= 0 ? THEME.accentEmerald : THEME.accentRose }}>
            ${(finances.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div style={{ ...STYLES.card, background: 'linear-gradient(135deg, rgba(16,185,129,0.08), transparent)' }}>
          <div style={{ color: THEME.textSecondary, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Ingresos Mes</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: THEME.accentEmerald }}>
            +${monthIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div style={{ ...STYLES.card, background: 'linear-gradient(135deg, rgba(244,63,94,0.08), transparent)' }}>
          <div style={{ color: THEME.textSecondary, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Gastos Mes</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: THEME.accentRose }}>
            -${monthExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div style={{ ...STYLES.card, background: 'linear-gradient(135deg, rgba(168,85,247,0.08), transparent)' }}>
          <div style={{ color: THEME.textSecondary, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Neto Mes</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: monthNet >= 0 ? THEME.accentEmerald : THEME.accentRose }}>
            {monthNet >= 0 ? '+' : ''}${monthNet.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '24px' }}>
        {/* Left column: Form + Categories */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={STYLES.card}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '16px' }}>Nueva Transacción</h3>
            <form onSubmit={addTx} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={() => setType('income')}
                  style={{ ...STYLES.button(type === 'income' ? THEME.accentEmerald : 'rgba(255,255,255,0.05)'), flex: 1, color: type === 'income' ? '#000' : THEME.textPrimary, fontSize: '13px' }}>
                  <TrendingUp size={14} /> Ingreso
                </button>
                <button type="button" onClick={() => setType('expense')}
                  style={{ ...STYLES.button(type === 'expense' ? THEME.accentRose : 'rgba(255,255,255,0.05)'), flex: 1, color: type === 'expense' ? '#000' : THEME.textPrimary, fontSize: '13px' }}>
                  <TrendingDown size={14} /> Gasto
                </button>
              </div>
              <input type="number" placeholder="Monto ($)" value={amount} onChange={e => setAmount(e.target.value)} style={STYLES.input} step="0.01" />
              <input type="text" placeholder="Descripción" value={desc} onChange={e => setDesc(e.target.value)} style={STYLES.input} />
              <select value={category} onChange={e => setCategory(e.target.value)}
                style={{ ...STYLES.input, cursor: 'pointer', appearance: 'none' }}>
                {FINANCE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <button type="submit" style={{ ...STYLES.button(THEME.accentEmerald), color: '#000', fontWeight: '700' }}>Registrar</button>
            </form>
          </div>

          {/* Category Breakdown */}
          <div style={STYLES.card}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '16px' }}>Gastos por Categoría</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {Object.keys(expenseByCategory).length === 0 ? (
                <div style={{ color: THEME.textSecondary, fontSize: '14px' }}>Sin gastos este mes.</div>
              ) : (
                FINANCE_CATEGORIES.filter(c => expenseByCategory[c.id]).map(cat => {
                  const val = expenseByCategory[cat.id];
                  const pct = Math.round((val / maxCatExpense) * 100);
                  return (
                    <div key={cat.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                        <span style={{ color: THEME.textPrimary }}>{cat.label}</span>
                        <span style={{ color: THEME.textSecondary }}>${val.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', borderRadius: '4px', backgroundColor: cat.color, transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right column: Transaction History */}
        <div style={STYLES.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '16px' }}>Historial</h3>
            <div style={{ display: 'flex', gap: '4px' }}>
              {filterTabs.map(ft => (
                <button key={ft.id} onClick={() => setFilter(ft.id)}
                  style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600',
                    backgroundColor: filter === ft.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                    color: filter === ft.id ? THEME.textPrimary : THEME.textSecondary,
                    transition: 'all 0.2s' }}>
                  {ft.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '520px' }}>
            {filteredTxs.length === 0 ? (
              <div style={{ color: THEME.textSecondary, padding: '24px', textAlign: 'center' }}>No hay transacciones.</div>
            ) : (
              filteredTxs.map(tx => {
                const catInfo = FINANCE_CATEGORIES.find(c => c.id === (tx.category || 'otro')) || FINANCE_CATEGORIES[5];
                return (
                  <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', transition: 'background-color 0.2s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: tx.type === 'income' ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: tx.type === 'income' ? THEME.accentEmerald : THEME.accentRose }}>
                        {tx.type === 'income' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                      </div>
                      <div>
                        <div style={{ fontWeight: '500', fontSize: '14px' }}>{tx.desc}</div>
                        <div style={{ fontSize: '11px', color: THEME.textSecondary, display: 'flex', gap: '8px', marginTop: '2px' }}>
                          <span>{new Date(tx.date).toLocaleDateString('es-ES')}</span>
                          <span style={{ color: catInfo.color }}>● {catInfo.label}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ fontWeight: '700', fontSize: '14px', color: tx.type === 'income' ? THEME.accentEmerald : THEME.accentRose }}>
                        {tx.type === 'income' ? '+' : '-'}${(tx.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                      <button onClick={() => deleteTx(tx.id)} style={{ background: 'none', border: 'none', color: THEME.textSecondary, cursor: 'pointer', padding: '4px', opacity: 0.5, transition: 'opacity 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0.5}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const RoutineView = () => {
  const [routine, setRoutine] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('bd_rutina') || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });
  const [completedToday, setCompletedToday] = useState(() => {
    try {
      const todayKey = new Date().toISOString().split('T')[0];
      const parsed = JSON.parse(localStorage.getItem('bd_rutina_history') || '{}');
      return (parsed && parsed[todayKey]) ? parsed[todayKey] : [];
    } catch { return []; }
  });
  const [time, setTime] = useState('');
  const [act, setAct] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const todayKey = new Date().toISOString().split('T')[0];

  const saveRoutine = (r) => {
    const sorted = [...r].sort((a, b) => a.time.localeCompare(b.time));
    setRoutine(sorted);
    localStorage.setItem('bd_rutina', JSON.stringify(sorted));
  };

  const saveCompleted = (ids) => {
    setCompletedToday(ids);
    try {
      const history = JSON.parse(localStorage.getItem('bd_rutina_history') || '{}');
      history[todayKey] = ids;
      localStorage.setItem('bd_rutina_history', JSON.stringify(history));
    } catch { /* ignore */ }
  };

  const toggleComplete = (id) => {
    if (completedToday.includes(id)) {
      saveCompleted(completedToday.filter(cid => cid !== id));
    } else {
      saveCompleted([...completedToday, id]);
    }
  };

  const addEvent = (e) => {
    e.preventDefault();
    if (time && act) {
      saveRoutine([...routine, { id: Date.now(), time, activity: act }]);
      setTime('');
      setAct('');
    }
  };

  const delEvent = (id) => saveRoutine(routine.filter(r => r.id !== id));

  // Progress
  const totalBlocks = routine.length;
  const completedCount = routine.filter(r => completedToday.includes(r.id)).length;
  const progressPct = totalBlocks > 0 ? Math.round((completedCount / totalBlocks) * 100) : 0;

  // Current time string for comparison (HH:MM)
  const nowStr = `${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}`;

  // Find active block (current or next upcoming)
  let activeBlockId = null;
  for (let i = 0; i < routine.length; i++) {
    const blockTime = routine[i].time;
    const nextTime = routine[i + 1]?.time;
    if (blockTime <= nowStr && (!nextTime || nextTime > nowStr)) {
      activeBlockId = routine[i].id;
      break;
    }
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <header style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '28px', margin: '0 0 4px 0' }}>Motor de Enfoque Diario</h2>
        <p style={{ color: THEME.textSecondary, margin: 0, fontSize: '14px' }}>
          Time Blocking — {currentTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} en tu zona horaria
        </p>
      </header>

      {/* Progress Bar */}
      <div style={{ ...STYLES.card, marginBottom: '24px', background: 'linear-gradient(135deg, rgba(168,85,247,0.08), transparent)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '14px', color: THEME.textSecondary, marginBottom: '4px' }}>Progreso del Día</div>
            <div style={{ fontSize: '32px', fontWeight: '800' }}>
              {progressPct}%
              <span style={{ fontSize: '14px', fontWeight: '400', color: THEME.textSecondary, marginLeft: '12px' }}>
                {completedCount} de {totalBlocks} bloques
              </span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: THEME.textSecondary, marginBottom: '4px' }}>Estado</div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: progressPct === 100 ? THEME.accentEmerald : progressPct > 50 ? THEME.accentPurple : THEME.accentRose }}>
              {progressPct === 100 ? '🔥 Día Perfecto' : progressPct > 50 ? '⚡ En Camino' : '🎯 Enfócate'}
            </div>
          </div>
        </div>
        <div style={{ width: '100%', height: '10px', borderRadius: '5px', backgroundColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
          <div style={{
            width: `${progressPct}%`,
            height: '100%',
            borderRadius: '5px',
            background: progressPct === 100 ? `linear-gradient(90deg, ${THEME.accentEmerald}, #22d3ee)` : `linear-gradient(90deg, ${THEME.accentPurple}, #c084fc)`,
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>

      {/* Add Block Form */}
      <div style={{ ...STYLES.card, marginBottom: '24px' }}>
        <form onSubmit={addEvent} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ ...STYLES.input, width: '140px' }} required />
          <input type="text" placeholder="Nombre del bloque..." value={act} onChange={e => setAct(e.target.value)} style={{ ...STYLES.input, flex: 1 }} required />
          <button type="submit" style={{ ...STYLES.button(THEME.accentPurple), color: '#000', fontWeight: '700', whiteSpace: 'nowrap' }}>
            <Plus size={16} /> Bloquear
          </button>
        </form>
      </div>

      {/* Timeline */}
      <div style={STYLES.card}>
        {routine.length === 0 ? (
          <div style={{ color: THEME.textSecondary, textAlign: 'center', padding: '40px' }}>
            No hay bloques de tiempo configurados. Comienza bloqueando tu primera hora arriba.
          </div>
        ) : (
          <div style={{ position: 'relative', paddingLeft: '32px' }}>
            {/* Vertical line */}
            <div style={{ position: 'absolute', left: '11px', top: '8px', bottom: '8px', width: '2px', backgroundColor: 'rgba(255,255,255,0.06)' }} />

            {routine.map((item, i) => {
              const isCompleted = completedToday.includes(item.id);
              const isActive = item.id === activeBlockId && !isCompleted;
              const isPast = item.time < nowStr && !isActive;

              return (
                <div key={item.id} style={{ position: 'relative', marginBottom: i === routine.length - 1 ? 0 : '8px' }}>
                  {/* Timeline dot */}
                  <div style={{
                    position: 'absolute', left: '-27px', top: '18px', width: '14px', height: '14px', borderRadius: '50%',
                    backgroundColor: isCompleted ? THEME.accentEmerald : isActive ? THEME.accentPurple : 'rgba(255,255,255,0.1)',
                    border: isActive ? `3px solid rgba(168,85,247,0.3)` : 'none',
                    boxShadow: isActive ? `0 0 12px rgba(168,85,247,0.5)` : isCompleted ? `0 0 8px rgba(16,185,129,0.3)` : 'none',
                    transition: 'all 0.3s ease',
                    zIndex: 2
                  }} />

                  <div
                    onClick={() => toggleComplete(item.id)}
                    style={{
                      backgroundColor: isActive ? 'rgba(168,85,247,0.08)' : isCompleted ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)',
                      padding: '16px 20px',
                      borderRadius: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      border: isActive ? '1px solid rgba(168,85,247,0.2)' : '1px solid transparent',
                      transition: 'all 0.2s ease',
                      opacity: isPast && !isCompleted ? 0.5 : 1,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{
                        width: '24px', height: '24px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: isCompleted ? THEME.accentEmerald : 'rgba(255,255,255,0.05)',
                        color: isCompleted ? '#000' : THEME.textSecondary,
                        transition: 'all 0.2s'
                      }}>
                        {isCompleted ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                      </div>
                      <div>
                        <div style={{
                          color: isActive ? THEME.accentPurple : THEME.textSecondary,
                          fontWeight: '700', marginBottom: '2px', fontSize: '13px',
                          fontFeatureSettings: '"tnum"'
                        }}>
                          {item.time}
                          {isActive && <span style={{ marginLeft: '8px', fontSize: '11px', color: THEME.accentPurple, fontWeight: '500' }}>● AHORA</span>}
                        </div>
                        <div style={{
                          fontSize: '15px',
                          fontWeight: '500',
                          textDecoration: isCompleted ? 'line-through' : 'none',
                          color: isCompleted ? THEME.textSecondary : THEME.textPrimary,
                          opacity: isCompleted ? 0.7 : 1,
                        }}>
                          {item.activity}
                        </div>
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); delEvent(item.id); }}
                      style={{ background: 'none', border: 'none', color: THEME.textSecondary, cursor: 'pointer', padding: '4px', opacity: 0.4, transition: 'opacity 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0.4}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const NotesView = () => {
  const [notes, setNotes] = useState(() => {
    try {
      const saved = localStorage.getItem('bd_notas_v2');
      if (saved) return JSON.parse(saved);
      // Migrate old note if exists
      const oldNote = localStorage.getItem('bd_notas');
      if (oldNote) return [{ id: 1, title: 'Nota Migrada', content: oldNote, updatedAt: Date.now() }];
      return [{ id: 1, title: 'Mi primera nota', content: '...', updatedAt: Date.now() }];
    } catch {
      return [{ id: 1, title: 'Mi primera nota', content: '...', updatedAt: Date.now() }];
    }
  });
  
  const [activeNoteId, setActiveNoteId] = useState(notes[0]?.id || null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const activeNote = notes.find(n => n.id === activeNoteId);

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('bd_notas_v2', JSON.stringify(notes));
      setSaving(true);
      setTimeout(() => setSaving(false), 1000);
    }, 1000);
    return () => clearTimeout(timer);
  }, [notes]);

  const addNote = () => {
    const newNote = { id: Date.now(), title: 'Nueva Nota', content: '', updatedAt: Date.now() };
    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
  };

  const updateNote = (id, updates) => {
    setNotes(notes.map(n => n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n));
  };

  const deleteNote = (id) => {
    const filtered = notes.filter(n => n.id !== id);
    setNotes(filtered);
    if (activeNoteId === id) setActiveNoteId(filtered[0]?.id || null);
  };

  const filteredNotes = notes.filter(n => n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ height: '100%', display: 'flex', gap: '24px' }}>
      
      {/* Sidebar */}
      <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '24px', margin: 0 }}>Onyx Notes</h2>
          <button onClick={addNote} style={{ ...STYLES.button('transparent'), padding: '6px', color: THEME.textPrimary }}>
            <Plus size={18} />
          </button>
        </div>
        
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: THEME.textSecondary }} />
          <input 
            type="text" 
            placeholder="Buscar notas..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...STYLES.input, width: '100%', paddingLeft: '36px' }}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
          {filteredNotes.map(n => (
            <div 
              key={n.id}
              onClick={() => setActiveNoteId(n.id)}
              style={{
                padding: '16px',
                borderRadius: '12px',
                backgroundColor: activeNoteId === n.id ? 'rgba(168,85,247,0.1)' : 'rgba(255,255,255,0.02)',
                border: activeNoteId === n.id ? `1px solid ${THEME.accentPurple}` : THEME.border,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {n.title || 'Sin título'}
              </div>
              <div style={{ fontSize: '12px', color: THEME.textSecondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {n.content || '...'}
              </div>
            </div>
          ))}
          {filteredNotes.length === 0 && <div style={{ color: THEME.textSecondary, fontSize: '13px', textAlign: 'center', marginTop: '24px' }}>No hay notas.</div>}
        </div>
      </div>

      {/* Editor */}
      <div style={{ ...STYLES.card, flex: 1, display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.01)' }}>
        {activeNote ? (
          <>
            <div style={{ padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <input 
                type="text"
                value={activeNote.title}
                onChange={e => updateNote(activeNote.id, { title: e.target.value })}
                placeholder="Título de la nota..."
                style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '24px', fontWeight: '700', outline: 'none', flex: 1 }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ color: THEME.textSecondary, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {saving ? <><Save size={12} /> Guardando...</> : <><CheckCircle2 size={12} /> Guardado</>}
                </div>
                <button onClick={() => deleteNote(activeNote.id)} style={{ background: 'none', border: 'none', color: THEME.accentRose, cursor: 'pointer', padding: '4px', opacity: 0.7 }} title="Eliminar nota">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <textarea 
              value={activeNote.content}
              onChange={(e) => updateNote(activeNote.id, { content: e.target.value })}
              placeholder="Comienza a escribir en modo Zen..."
              style={{ 
                width: '100%', 
                flex: 1,
                backgroundColor: 'transparent', 
                border: 'none', 
                color: THEME.textPrimary, 
                padding: '32px', 
                fontSize: '16px', 
                lineHeight: '1.6', 
                resize: 'none', 
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: THEME.textSecondary }}>
            Selecciona o crea una nota para comenzar.
          </div>
        )}
      </div>
    </div>
  );
};

export default function RimuOrganizer({ session }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { tasks, addTask, updateTaskStatus, deleteTask } = useTasks(session?.user?.id);

  const navItems = [
    { id: 'dashboard', label: 'Centro de Mando', icon: LayoutDashboard },
    { id: 'tareas', label: 'Tareas', icon: CheckSquare },
    { id: 'habitos', label: 'Hábitos', icon: Activity },
    { id: 'finanzas', label: 'Finanzas', icon: Wallet },
    { id: 'rutina', label: 'Rutina', icon: Clock },
    { id: 'notas', label: 'Notas', icon: BookOpen },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardView tasks={tasks || []} />;
      case 'tareas': return <TasksView tasks={tasks || []} addTask={addTask} updateTaskStatus={updateTaskStatus} deleteTask={deleteTask} />;
      case 'habitos': return <HabitsView />;
      case 'finanzas': return <FinancesView />;
      case 'rutina': return <RoutineView />;
      case 'notas': return <NotesView />;
      default: return <DashboardView tasks={tasks || []} />;
    }
  };

  return (
    <div style={STYLES.container}>
      <header style={STYLES.topNav}>
        <div style={STYLES.logo}>
          <Command size={20} color={THEME.accentEmerald} />
          Onyx OS
        </div>
        
        <nav style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <div 
                key={item.id} 
                onClick={() => setActiveTab(item.id)}
                style={STYLES.navItem(isActive)}
              >
                <Icon size={16} color={isActive ? THEME.accentEmerald : THEME.textSecondary} />
                {item.label}
              </div>
            );
          })}
        </nav>
      </header>

      <main style={STYLES.contentArea}>
        {renderContent()}
      </main>
    </div>
  );
}
