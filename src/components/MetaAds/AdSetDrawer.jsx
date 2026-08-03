import React, { useState, useEffect } from 'react';
import { X, Save, Layers, ChevronDown, ChevronUp, AlertCircle, Globe, Calendar, Users, MapPin, Crosshair } from 'lucide-react';

const CollapsibleSection = ({ title, defaultOpen = true, children, icon: Icon }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 16, background: 'var(--surface-container-low)', borderRadius: 12, border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)} 
        style={{ width: '100%', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--on-surface)', fontWeight: 700 }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {Icon && <Icon size={18} className="text-primary" />}
          {title}
        </span>
        {isOpen ? <ChevronUp size={18} color="var(--on-surface-variant)" /> : <ChevronDown size={18} color="var(--on-surface-variant)" />}
      </button>
      {isOpen && <div style={{ padding: '0 16px 16px 16px' }}>{children}</div>}
    </div>
  );
};

const AdSetDrawer = ({ api, isOpen, onClose, adSet, campaignId, onSaved }) => {
  const [name, setName] = useState('');
  const [status, setStatus] = useState('PAUSED');
  
  // Conversion Location
  const [conversionLocation, setConversionLocation] = useState('WEBSITE');
  
  // Performance Goal
  const [performanceGoal, setPerformanceGoal] = useState('REACH');
  const [billingEvent, setBillingEvent] = useState('IMPRESSIONS');
  
  // Dynamic Creative
  const [dynamicCreative, setDynamicCreative] = useState(false);
  
  // Budget & Schedule
  const [budgetType, setBudgetType] = useState('DAILY');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState('');
  
  // Audience
  const [countries, setCountries] = useState('CO');
  const [ageMin, setAgeMin] = useState('18');
  const [ageMax, setAgeMax] = useState('65+');
  const [gender, setGender] = useState('ALL');
  const [languages, setLanguages] = useState('');
  const [interests, setInterests] = useState('');
  
  // Placements
  const [placementType, setPlacementType] = useState('advantage');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (adSet) {
      setName(adSet.name || '');
      setStatus(adSet.status || 'PAUSED');
      setPerformanceGoal(adSet.optimization_goal || 'REACH');
      setBillingEvent(adSet.billing_event || 'IMPRESSIONS');
      
      const budget = adSet.daily_budget ? adSet.daily_budget : adSet.lifetime_budget;
      if (budget) {
        setBudgetType(adSet.daily_budget ? 'DAILY' : 'LIFETIME');
        setBudgetAmount((parseInt(budget) / 100).toString());
      }
      
      if (adSet.targeting && adSet.targeting.geo_locations && adSet.targeting.geo_locations.countries) {
         setCountries(adSet.targeting.geo_locations.countries.join(', '));
      }
    } else {
      setName('');
      setStatus('PAUSED');
      setConversionLocation('WEBSITE');
      setPerformanceGoal('REACH');
      setBillingEvent('IMPRESSIONS');
      setDynamicCreative(false);
      setBudgetType('DAILY');
      setBudgetAmount('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setHasEndDate(false);
      setEndDate('');
      setCountries('CO');
      setAgeMin('18');
      setAgeMax('65+');
      setGender('ALL');
      setLanguages('');
      setInterests('');
      setPlacementType('advantage');
    }
    setError(null);
  }, [adSet, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    try {
      const parsedBudget = budgetAmount ? parseFloat(budgetAmount) : undefined;
      const targeting = {
         geo_locations: {
            countries: countries.split(',').map(c => c.trim().toUpperCase()).filter(Boolean)
         }
      };

      if (adSet) {
        const updates = { name, status, optimization_goal: performanceGoal };
        if (parsedBudget) {
          if (budgetType === 'DAILY') {
            updates.daily_budget = parsedBudget;
            updates.lifetime_budget = null;
          } else {
            updates.lifetime_budget = parsedBudget;
            updates.daily_budget = null;
          }
        }
        const result = await api.updateAdSet(adSet.id, updates);
        if (result.success) {
          onSaved();
          onClose();
        } else {
          setError(result.error);
        }
      } else {
        const payload = {
          name,
          campaignId,
          status,
          optimizationGoal: performanceGoal,
          billingEvent,
          targeting,
          dailyBudget: parsedBudget
        };
        const result = await api.createAdSet(payload);
        if (result.success) {
          onSaved();
          onClose();
        } else {
          setError(result.error);
        }
      }
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.5)' }}>
      <div style={{ width: '560px', background: 'var(--surface)', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '-5px 0 25px rgba(0,0,0,0.2)', animation: 'slideInRight 0.3s ease-out' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-container)' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={20} className="text-primary" />
            {adSet ? 'Editar Conjunto' : 'Nuevo Conjunto de Anuncios'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={20} color="var(--on-surface-variant)" /></button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {error && (
            <div style={{ padding: '12px', background: 'var(--error-container)', color: '#93000a', borderRadius: 8, marginBottom: 16, fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <form id="adset-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            {/* STATUS & NAME (Sticky at top of form) */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: 8, display: 'block' }}>Nombre del Conjunto *</label>
                <input 
                  type="text" required value={name} onChange={e => setName(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--outline-variant)', background: 'var(--surface-container-lowest)', color: 'var(--on-surface)', outline: 'none' }}
                  placeholder="Ej. Público Colombia 18-35"
                />
              </div>
              <div style={{ width: 140 }}>
                 <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: 8, display: 'block' }}>Estado</label>
                 <select value={status} onChange={e => setStatus(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--outline-variant)', background: 'var(--surface-container-lowest)', color: status === 'ACTIVE' ? '#06B6D4' : 'var(--primary-container)', outline: 'none', fontWeight: 600 }}>
                    <option value="ACTIVE">● Activo</option>
                    <option value="PAUSED">● Pausado</option>
                 </select>
              </div>
            </div>

            <CollapsibleSection title="Conversión" icon={Globe}>
               <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: 8, display: 'block' }}>Ubicación de la conversión</label>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                     { id: 'WEBSITE', label: 'Sitio web', desc: 'Genera conversiones en tu sitio web.' },
                     { id: 'APP', label: 'App', desc: 'Impulsa las interacciones en tu app.' },
                     { id: 'MESSENGER', label: 'Apps de mensajería', desc: 'Genera interacción a través de Messenger o WhatsApp.' }
                  ].map(loc => (
                     <label key={loc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                        <input type="radio" name="conversion_loc" value={loc.id} checked={conversionLocation === loc.id} onChange={(e) => setConversionLocation(e.target.value)} />
                        <div>
                           <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--on-surface)' }}>{loc.label}</div>
                           <div style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>{loc.desc}</div>
                        </div>
                     </label>
                  ))}
               </div>

               <div style={{ marginTop: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: 8, display: 'block' }}>Objetivo de rendimiento</label>
                  <select value={performanceGoal} onChange={e => setPerformanceGoal(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--outline-variant)', background: 'var(--surface-container-lowest)', color: 'var(--on-surface)', outline: 'none' }}>
                     <option value="OFFSITE_CONVERSIONS">Maximizar el número de conversiones</option>
                     <option value="VALUE">Maximizar el valor de las conversiones</option>
                     <option value="LINK_CLICKS">Maximizar el número de clics en el enlace</option>
                     <option value="REACH">Maximizar el alcance de los anuncios</option>
                     <option value="IMPRESSIONS">Maximizar el número de impresiones</option>
                  </select>
               </div>
            </CollapsibleSection>

            <CollapsibleSection title="Contenido Dinámico" defaultOpen={false}>
               <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                     <div style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>Proporciona elementos individuales como imágenes y títulos. Meta combinará automáticamente los elementos creativos de formas optimizadas para tus públicos.</div>
                  </div>
                  <div 
                     onClick={() => setDynamicCreative(!dynamicCreative)}
                     style={{ width: 44, height: 24, background: dynamicCreative ? 'var(--primary)' : 'var(--surface-container-high)', borderRadius: 12, position: 'relative', cursor: 'pointer', transition: '0.2s' }}
                  >
                     <div style={{ width: 20, height: 20, background: '#fff', borderRadius: '50%', position: 'absolute', top: 2, left: dynamicCreative ? 22 : 2, transition: '0.2s' }} />
                  </div>
               </div>
            </CollapsibleSection>

            <CollapsibleSection title="Presupuesto y Calendario" icon={Calendar}>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                     <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: 8, display: 'block' }}>Presupuesto</label>
                     <div style={{ display: 'flex', gap: 8 }}>
                        <select value={budgetType} onChange={e => setBudgetType(e.target.value)} style={{ width: 140, padding: '12px', borderRadius: 8, border: '1px solid var(--outline-variant)', background: 'var(--surface-container-lowest)', color: 'var(--on-surface)', outline: 'none' }}>
                           <option value="DAILY">Diario</option>
                           <option value="LIFETIME">Total</option>
                        </select>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--outline-variant)', borderRadius: 8, background: 'var(--surface-container-lowest)', padding: '0 12px' }}>
                           <span style={{ color: 'var(--on-surface-variant)', fontWeight: 600 }}>$</span>
                           <input 
                             type="number" value={budgetAmount} onChange={e => setBudgetAmount(e.target.value)} required
                             style={{ width: '100%', padding: '12px 0', border: 'none', background: 'transparent', color: 'var(--on-surface)', outline: 'none' }}
                             placeholder="Ej. 20000"
                           />
                           <span style={{ color: 'var(--on-surface-variant)', fontSize: 12 }}>COP</span>
                        </div>
                     </div>
                  </div>

                  <div style={{ display: 'flex', gap: 16 }}>
                     <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: 8, display: 'block' }}>Fecha de inicio</label>
                        <input 
                           type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                           style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--outline-variant)', background: 'var(--surface-container-lowest)', color: 'var(--on-surface)', outline: 'none' }}
                        />
                     </div>
                     <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                           <input type="checkbox" checked={hasEndDate} onChange={e => setHasEndDate(e.target.checked)} />
                           Finalización
                        </label>
                        <input 
                           type="date" value={endDate} onChange={e => setEndDate(e.target.value)} disabled={!hasEndDate}
                           style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--outline-variant)', background: hasEndDate ? 'var(--surface-container-lowest)' : 'var(--surface-container)', color: 'var(--on-surface)', outline: 'none', opacity: hasEndDate ? 1 : 0.5 }}
                        />
                     </div>
                  </div>
               </div>
            </CollapsibleSection>

            <CollapsibleSection title="Controles del Público" icon={Users}>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                     <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: 8, display: 'block' }}>Ubicaciones (Códigos de país separados por comas)</label>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--outline-variant)', borderRadius: 8, background: 'var(--surface-container-lowest)', padding: '0 12px' }}>
                        <MapPin size={16} color="var(--on-surface-variant)" />
                        <input 
                           type="text" value={countries} onChange={e => setCountries(e.target.value)}
                           style={{ width: '100%', padding: '12px 0', border: 'none', background: 'transparent', color: 'var(--on-surface)', outline: 'none' }}
                           placeholder="Ej. CO, MX, AR"
                        />
                     </div>
                  </div>

                  <div style={{ display: 'flex', gap: 16 }}>
                     <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: 8, display: 'block' }}>Edad</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                           <select value={ageMin} onChange={e => setAgeMin(e.target.value)} style={{ flex: 1, padding: '12px', borderRadius: 8, border: '1px solid var(--outline-variant)', background: 'var(--surface-container-lowest)', color: 'var(--on-surface)', outline: 'none' }}>
                              {[...Array(48)].map((_, i) => <option key={i+18} value={i+18}>{i+18}</option>)}
                           </select>
                           <span>-</span>
                           <select value={ageMax} onChange={e => setAgeMax(e.target.value)} style={{ flex: 1, padding: '12px', borderRadius: 8, border: '1px solid var(--outline-variant)', background: 'var(--surface-container-lowest)', color: 'var(--on-surface)', outline: 'none' }}>
                              {[...Array(47)].map((_, i) => <option key={i+19} value={i+19}>{i+19}</option>)}
                              <option value="65+">65+</option>
                           </select>
                        </div>
                     </div>
                     <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: 8, display: 'block' }}>Género</label>
                        <select value={gender} onChange={e => setGender(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--outline-variant)', background: 'var(--surface-container-lowest)', color: 'var(--on-surface)', outline: 'none' }}>
                           <option value="ALL">Todos</option>
                           <option value="MEN">Hombres</option>
                           <option value="WOMEN">Mujeres</option>
                        </select>
                     </div>
                  </div>

                  <div>
                     <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: 8, display: 'block' }}>Segmentación Detallada (Intereses)</label>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--outline-variant)', borderRadius: 8, background: 'var(--surface-container-lowest)', padding: '0 12px' }}>
                        <Crosshair size={16} color="var(--on-surface-variant)" />
                        <input 
                           type="text" value={interests} onChange={e => setInterests(e.target.value)}
                           style={{ width: '100%', padding: '12px 0', border: 'none', background: 'transparent', color: 'var(--on-surface)', outline: 'none' }}
                           placeholder="Ej. Fitness, Negocios, Compras"
                        />
                     </div>
                  </div>
               </div>
            </CollapsibleSection>

            <CollapsibleSection title="Ubicaciones (Placements)" defaultOpen={false}>
               <div style={{ display: 'grid', gap: 12 }}>
                  <div 
                     onClick={() => setPlacementType('advantage')}
                     style={{ padding: '16px', borderRadius: 8, border: placementType === 'advantage' ? '2px solid var(--primary)' : '1px solid var(--outline-variant)', background: placementType === 'advantage' ? 'rgba(30,111,186,0.1)' : 'var(--surface-container-lowest)', cursor: 'pointer' }}
                  >
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--on-surface)' }}>Ubicaciones Advantage+</div>
                        <div style={{ background: 'rgba(16,185,129,0.2)', color: '#06B6D4', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>Recomendado</div>
                     </div>
                     <div style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>Maximiza tu presupuesto y ayuda a mostrar tus anuncios a más personas.</div>
                  </div>

                  <div 
                     onClick={() => setPlacementType('manual')}
                     style={{ padding: '16px', borderRadius: 8, border: placementType === 'manual' ? '2px solid var(--primary)' : '1px solid var(--outline-variant)', background: placementType === 'manual' ? 'rgba(30,111,186,0.1)' : 'var(--surface-container-lowest)', cursor: 'pointer' }}
                  >
                     <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--on-surface)', marginBottom: 4 }}>Ubicaciones manuales</div>
                     <div style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>Controla manualmente en qué plataformas y dispositivos aparecen tus anuncios.</div>
                  </div>
               </div>
            </CollapsibleSection>

          </form>
        </div>

        {/* Footer */}
        <div style={{ padding: '20px', borderTop: '1px solid var(--border-subtle)', background: 'var(--surface-container)', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--outline-variant)', background: 'transparent', color: 'var(--on-surface)', fontWeight: 600, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button form="adset-form" type="submit" disabled={saving || !name.trim()} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: 'var(--on-surface)', fontWeight: 600, cursor: saving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            {saving ? 'Guardando...' : (
              <>
                <Save size={16} /> Guardar
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AdSetDrawer;
