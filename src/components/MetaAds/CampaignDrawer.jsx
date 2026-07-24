import React, { useState, useEffect } from 'react';
import { X, Save, Target, ChevronDown, ChevronUp, AlertCircle, Info } from 'lucide-react';

const CollapsibleSection = ({ title, defaultOpen = true, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 16, background: 'var(--surface-container-low)', borderRadius: 12, border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)} 
        style={{ width: '100%', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--on-surface)', fontWeight: 700 }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{title}</span>
        {isOpen ? <ChevronUp size={18} color="var(--on-surface-variant)" /> : <ChevronDown size={18} color="var(--on-surface-variant)" />}
      </button>
      {isOpen && <div style={{ padding: '0 16px 16px 16px' }}>{children}</div>}
    </div>
  );
};

const CampaignDrawer = ({ api, isOpen, onClose, campaign, onSaved }) => {
  const [name, setName] = useState('');
  const [objective, setObjective] = useState('OUTCOME_SALES');
  const [status, setStatus] = useState('PAUSED');
  
  // Special Ad Categories
  const [specialCategories, setSpecialCategories] = useState([]);
  
  // A/B Testing
  const [abTestEnabled, setAbTestEnabled] = useState(false);
  
  // CBO (Advantage+ campaign budget)
  const [cboEnabled, setCboEnabled] = useState(false);
  const [budgetType, setBudgetType] = useState('DAILY'); // DAILY or LIFETIME
  const [budgetAmount, setBudgetAmount] = useState('');
  const [bidStrategy, setBidStrategy] = useState('LOWEST_COST_WITHOUT_CAP');
  const [bidCap, setBidCap] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (campaign) {
      setName(campaign.name || '');
      setObjective(campaign.objective || 'OUTCOME_SALES');
      setStatus(campaign.status || 'PAUSED');
      
      const budget = campaign.daily_budget ? campaign.daily_budget : campaign.lifetime_budget;
      if (budget) {
        setCboEnabled(true);
        setBudgetType(campaign.daily_budget ? 'DAILY' : 'LIFETIME');
        setBudgetAmount((parseInt(budget) / 100).toString());
      } else {
        setCboEnabled(false);
        setBudgetAmount('');
      }
      setSpecialCategories(campaign.special_ad_categories || []);
      
    } else {
      setName('');
      setObjective('OUTCOME_SALES');
      setStatus('PAUSED');
      setSpecialCategories([]);
      setAbTestEnabled(false);
      setCboEnabled(false);
      setBudgetType('DAILY');
      setBudgetAmount('');
      setBidStrategy('LOWEST_COST_WITHOUT_CAP');
      setBidCap('');
    }
    setError(null);
  }, [campaign, isOpen]);

  const toggleCategory = (cat) => {
    setSpecialCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    try {
      const parsedBudget = budgetAmount ? parseFloat(budgetAmount) : undefined;

      if (campaign) {
        const updates = { name, status };
        if (cboEnabled && parsedBudget) {
          if (budgetType === 'DAILY') {
            updates.daily_budget = parsedBudget;
            updates.lifetime_budget = null;
          } else {
            updates.lifetime_budget = parsedBudget;
            updates.daily_budget = null;
          }
        }
        const result = await api.updateCampaign(campaign.id, updates);
        if (result.success) {
          onSaved();
          onClose();
        } else {
          setError(result.error);
        }
      } else {
        const payload = {
          name,
          objective,
          status,
          special_ad_categories: specialCategories
        };
        if (cboEnabled && parsedBudget) {
           payload.dailyBudget = parsedBudget;
        }
        const result = await api.createCampaign(payload);
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
            <Target size={20} className="text-primary" />
            {campaign ? 'Editar Campaña' : 'Nueva Campaña'}
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

          <form id="campaign-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            {/* STATUS & NAME (Sticky at top of form) */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: 8, display: 'block' }}>Nombre de la Campaña *</label>
                <input 
                  type="text" required value={name} onChange={e => setName(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--outline-variant)', background: 'var(--surface-container-lowest)', color: 'var(--on-surface)', outline: 'none' }}
                  placeholder="Ej. Campaña Black Friday"
                />
              </div>
              <div style={{ width: 140 }}>
                 <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: 8, display: 'block' }}>Estado</label>
                 <select value={status} onChange={e => setStatus(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--outline-variant)', background: 'var(--surface-container-lowest)', color: status === 'ACTIVE' ? '#10b981' : 'var(--primary-container)', outline: 'none', fontWeight: 600 }}>
                    <option value="ACTIVE">● Activa</option>
                    <option value="PAUSED">● Pausada</option>
                 </select>
              </div>
            </div>

            <CollapsibleSection title="Categorías de Anuncios Especiales" defaultOpen={!campaign}>
               <p style={{ fontSize: 12, color: 'var(--on-surface-variant)', marginBottom: 12 }}>
                 Debes declarar si tus anuncios están relacionados con crédito, empleo, vivienda, o temas sociales, elecciones o política.
               </p>
               <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                 {['CREDIT', 'EMPLOYMENT', 'HOUSING', 'ISSUES_ELECTIONS_POLITICS'].map(cat => (
                   <button
                     key={cat} type="button"
                     onClick={() => toggleCategory(cat)}
                     style={{
                       padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: '1px solid var(--outline-variant)', cursor: 'pointer',
                       background: specialCategories.includes(cat) ? 'var(--primary)' : 'var(--surface-container)',
                       color: specialCategories.includes(cat) ? '#fff' : 'var(--on-surface)'
                     }}
                   >
                     {cat === 'ISSUES_ELECTIONS_POLITICS' ? 'Temas sociales/Política' : cat}
                   </button>
                 ))}
               </div>
            </CollapsibleSection>

            <CollapsibleSection title="Detalles de la Campaña" defaultOpen={true}>
               {!campaign && (
                 <>
                   <div style={{ marginBottom: 16 }}>
                     <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: 8, display: 'block' }}>Tipo de compra</label>
                     <select disabled style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--outline-variant)', background: 'var(--surface-container-lowest)', color: 'var(--on-surface)', outline: 'none' }}>
                       <option>Subasta</option>
                     </select>
                   </div>
                   
                   <div>
                     <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: 8, display: 'block' }}>Objetivo de la campaña</label>
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {[
                          { val: 'OUTCOME_AWARENESS', label: 'Reconocimiento', desc: 'Aumenta el reconocimiento' },
                          { val: 'OUTCOME_TRAFFIC', label: 'Tráfico', desc: 'Lleva personas a un destino' },
                          { val: 'OUTCOME_ENGAGEMENT', label: 'Interacción', desc: 'Obtén más interacciones' },
                          { val: 'OUTCOME_LEADS', label: 'Clientes Pot.', desc: 'Recopila datos de leads' },
                          { val: 'OUTCOME_APP_PROMOTION', label: 'App', desc: 'Instalaciones de app' },
                          { val: 'OUTCOME_SALES', label: 'Ventas', desc: 'Encuentra compradores' }
                        ].map(obj => (
                          <div 
                            key={obj.val}
                            onClick={() => setObjective(obj.val)}
                            style={{
                              padding: '12px', borderRadius: 8, border: objective === obj.val ? '2px solid var(--primary)' : '1px solid var(--outline-variant)',
                              background: objective === obj.val ? 'rgba(30,111,186,0.1)' : 'var(--surface-container)', cursor: 'pointer'
                            }}
                          >
                             <div style={{ fontWeight: 700, fontSize: 13, color: objective === obj.val ? 'var(--primary)' : 'var(--on-surface)', marginBottom: 4 }}>{obj.label}</div>
                             <div style={{ fontSize: 11, color: 'var(--on-surface-variant)' }}>{obj.desc}</div>
                          </div>
                        ))}
                     </div>
                   </div>
                 </>
               )}
               {campaign && (
                  <div style={{ padding: 12, background: 'var(--surface-container-lowest)', borderRadius: 8, fontSize: 13, color: 'var(--on-surface-variant)' }}>
                     El objetivo de la campaña ({campaign.objective?.replace('OUTCOME_','')}) no se puede cambiar después de su creación.
                  </div>
               )}
            </CollapsibleSection>

            <CollapsibleSection title="Prueba A/B" defaultOpen={false}>
               <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                     <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--on-surface)', marginBottom: 4 }}>Crear prueba A/B</div>
                     <div style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>Prueba diferentes versiones de tus anuncios para determinar cuál funciona mejor. (Configuración visual - Próximamente en API)</div>
                  </div>
                  <div 
                     onClick={() => setAbTestEnabled(!abTestEnabled)}
                     style={{ width: 44, height: 24, background: abTestEnabled ? 'var(--primary)' : 'var(--surface-container-high)', borderRadius: 12, position: 'relative', cursor: 'pointer', transition: '0.2s' }}
                  >
                     <div style={{ width: 20, height: 20, background: '#fff', borderRadius: '50%', position: 'absolute', top: 2, left: abTestEnabled ? 22 : 2, transition: '0.2s' }} />
                  </div>
               </div>
            </CollapsibleSection>

            <CollapsibleSection title="Presupuesto Advantage+ (CBO)" defaultOpen={true}>
               <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                  <div style={{ flex: 1 }}>
                     <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--on-surface)', marginBottom: 4 }}>Presupuesto de la campaña Advantage+</div>
                     <div style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>El presupuesto se distribuirá entre los conjuntos de anuncios para conseguir más resultados.</div>
                  </div>
                  <div 
                     onClick={() => setCboEnabled(!cboEnabled)}
                     style={{ width: 44, height: 24, background: cboEnabled ? 'var(--primary)' : 'var(--surface-container-high)', borderRadius: 12, position: 'relative', cursor: 'pointer', transition: '0.2s' }}
                  >
                     <div style={{ width: 20, height: 20, background: '#fff', borderRadius: '50%', position: 'absolute', top: 2, left: cboEnabled ? 22 : 2, transition: '0.2s' }} />
                  </div>
               </div>

               {cboEnabled && (
                  <div style={{ padding: '16px', background: 'var(--surface-container-lowest)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 16 }}>
                     <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: 8, display: 'block' }}>Presupuesto de la campaña</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                           <select value={budgetType} onChange={e => setBudgetType(e.target.value)} style={{ width: 140, padding: '12px', borderRadius: 8, border: '1px solid var(--outline-variant)', background: 'var(--surface-container)', color: 'var(--on-surface)', outline: 'none' }}>
                              <option value="DAILY">Diario</option>
                              <option value="LIFETIME">Total</option>
                           </select>
                           <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--outline-variant)', borderRadius: 8, background: 'var(--surface-container)', padding: '0 12px' }}>
                              <span style={{ color: 'var(--on-surface-variant)', fontWeight: 600 }}>$</span>
                              <input 
                                type="number" value={budgetAmount} onChange={e => setBudgetAmount(e.target.value)} required={cboEnabled}
                                style={{ width: '100%', padding: '12px 0', border: 'none', background: 'transparent', color: 'var(--on-surface)', outline: 'none' }}
                                placeholder="Ej. 20000"
                              />
                              <span style={{ color: 'var(--on-surface-variant)', fontSize: 12 }}>COP</span>
                           </div>
                        </div>
                     </div>
                     <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: 8, display: 'block' }}>Estrategia de puja de la campaña</label>
                        <select value={bidStrategy} onChange={e => setBidStrategy(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--outline-variant)', background: 'var(--surface-container)', color: 'var(--on-surface)', outline: 'none' }}>
                           <option value="LOWEST_COST_WITHOUT_CAP">Volumen más alto</option>
                           <option value="COST_CAP">Objetivo de coste por resultado</option>
                           <option value="BID_CAP">Límite de puja</option>
                        </select>
                     </div>
                     {['COST_CAP', 'BID_CAP'].includes(bidStrategy) && (
                        <div>
                           <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: 8, display: 'block' }}>Límite / Objetivo</label>
                           <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--outline-variant)', borderRadius: 8, background: 'var(--surface-container)', padding: '0 12px' }}>
                              <span style={{ color: 'var(--on-surface-variant)', fontWeight: 600 }}>$</span>
                              <input 
                                type="number" value={bidCap} onChange={e => setBidCap(e.target.value)} required
                                style={{ width: '100%', padding: '12px 0', border: 'none', background: 'transparent', color: 'var(--on-surface)', outline: 'none' }}
                                placeholder="Ej. 5000"
                              />
                           </div>
                        </div>
                     )}
                  </div>
               )}
            </CollapsibleSection>

          </form>
        </div>

        {/* Footer */}
        <div style={{ padding: '20px', borderTop: '1px solid var(--border-subtle)', background: 'var(--surface-container)', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--outline-variant)', background: 'transparent', color: 'var(--on-surface)', fontWeight: 600, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button form="campaign-form" type="submit" disabled={saving || !name.trim()} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: 'var(--on-surface)', fontWeight: 600, cursor: saving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            {saving ? 'Guardando...' : (
              <>
                <Save size={16} /> Guardar
              </>
            )}
          </button>
        </div>

      </div>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default CampaignDrawer;
