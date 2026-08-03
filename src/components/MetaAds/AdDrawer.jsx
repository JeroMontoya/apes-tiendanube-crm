import React, { useState, useEffect } from 'react';
import { X, Save, Image as ImageIcon, ChevronDown, ChevronUp, AlertCircle, Link, Eye, BarChart2, Users, Camera, MousePointer, Info } from 'lucide-react';

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

const AdDrawer = ({ api, isOpen, onClose, ad, adSetId, onSaved }) => {
  const [name, setName] = useState('');
  const [status, setStatus] = useState('PAUSED');
  
  // Identity
  const [pageId, setPageId] = useState('');
  const [instagramId, setInstagramId] = useState('');
  
  // Setup
  const [setupType, setSetupType] = useState('CREATE'); // CREATE or EXISTING_POST
  const [existingPostId, setExistingPostId] = useState('');
  const [format, setFormat] = useState('SINGLE');
  
  // Creative
  const [imageUrl, setImageUrl] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [callToAction, setCallToAction] = useState('LEARN_MORE');
  
  // Destination
  const [linkUrl, setLinkUrl] = useState('');
  const [displayLink, setDisplayLink] = useState('');
  
  // Tracking
  const [pixelId, setPixelId] = useState('');
  const [conversionEvent, setConversionEvent] = useState('Purchase');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (ad) {
      setName(ad.name || '');
      setStatus(ad.status || 'PAUSED');
      
      // Load creative if available (read-only mapping for display)
      if (ad.creative) {
         setHeadline(ad.creative.title || '');
         setBodyText(ad.creative.body || '');
         setImageUrl(ad.creative.image_url || ad.creative.thumbnail_url || '');
         // Assuming object_story_spec is nested, handled conceptually here.
         // Link URL and Page ID would normally be extracted from ad.creative.object_story_spec
      }
    } else {
      setName('');
      setStatus('PAUSED');
      setPageId('');
      setInstagramId('');
      setSetupType('CREATE');
      setExistingPostId('');
      setFormat('SINGLE');
      setImageUrl('');
      setBodyText('');
      setHeadline('');
      setDescription('');
      setCallToAction('LEARN_MORE');
      setLinkUrl('');
      setDisplayLink('');
      setPixelId('');
      setConversionEvent('Purchase');
    }
    setError(null);
  }, [ad, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    try {
      if (ad) {
        // Edit mode (mostly just name and status for ads usually)
        const result = await api.updateAd(ad.id, { name, status });
        if (result.success) {
          onSaved();
          onClose();
        } else {
          setError(result.error);
        }
      } else {
        // Create mode
        if (setupType === 'CREATE') {
          // 1. Upload image to get hash
          const uploadRes = await api.uploadImageFromUrl(imageUrl);
          if (!uploadRes.success) throw new Error(uploadRes.error || 'Failed to upload image');
          const imageHash = uploadRes.hash;

          // 2. Create creative
          const creativeRes = await api.createAdCreative({
            name: `${name} - Creative`,
            pageId,
            imageHash,
            headline,
            bodyText,
            linkUrl
          });
          
          if (!creativeRes.success) throw new Error(creativeRes.error || 'Failed to create ad creative');
          const creativeId = creativeRes.data.id || creativeRes.data.creative_id;

          // 3. Create Ad
          const adRes = await api.createAd({
            name,
            adsetId: adSetId,
            creativeId,
            status
          });

          if (adRes.success) {
            onSaved();
            onClose();
          } else {
            setError(adRes.error);
          }
        } else {
           throw new Error("Usar publicación existente no está implementado en la API aún.");
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
            <ImageIcon size={20} className="text-primary" />
            {ad ? 'Editar Anuncio' : 'Nuevo Anuncio'}
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

          {ad && (
             <div style={{ padding: '12px', background: 'rgba(30,111,186,0.1)', color: 'var(--primary)', borderRadius: 8, marginBottom: 16, fontSize: 13, display: 'flex', gap: 8, alignItems: 'center', border: '1px solid var(--outline-variant)' }}>
                <Info size={16} /> Para editar el contenido multimedia o texto de un anuncio existente, debes crear uno nuevo o duplicar el actual (Limitación de API).
             </div>
          )}

          <form id="ad-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            {/* STATUS & NAME (Sticky at top of form) */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: 8, display: 'block' }}>Nombre del Anuncio *</label>
                <input 
                  type="text" required value={name} onChange={e => setName(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--outline-variant)', background: 'var(--surface-container-lowest)', color: 'var(--on-surface)', outline: 'none' }}
                  placeholder="Ej. Anuncio Imagen 1"
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

            <CollapsibleSection title="Identidad" icon={Users} defaultOpen={!ad}>
               <p style={{ fontSize: 12, color: 'var(--on-surface-variant)', marginBottom: 12 }}>
                 Selecciona la página de Facebook que representará tu negocio en los anuncios.
               </p>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 16, opacity: ad ? 0.6 : 1, pointerEvents: ad ? 'none' : 'auto' }}>
                  <div>
                     <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: 8, display: 'block' }}>Página de Facebook *</label>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--outline-variant)', borderRadius: 8, background: 'var(--surface-container-lowest)', padding: '0 12px' }}>
                        <Users size={16} color="#1877F2" />
                        <input 
                           type="text" value={pageId} onChange={e => setPageId(e.target.value)} required={!ad}
                           style={{ width: '100%', padding: '12px 0', border: 'none', background: 'transparent', color: 'var(--on-surface)', outline: 'none' }}
                           placeholder="ID de la Página"
                        />
                     </div>
                  </div>
                  <div>
                     <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: 8, display: 'block' }}>Cuenta de Instagram</label>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--outline-variant)', borderRadius: 8, background: 'var(--surface-container-lowest)', padding: '0 12px' }}>
                        <Camera size={16} color="#E1306C" />
                        <input 
                           type="text" value={instagramId} onChange={e => setInstagramId(e.target.value)}
                           style={{ width: '100%', padding: '12px 0', border: 'none', background: 'transparent', color: 'var(--on-surface)', outline: 'none' }}
                           placeholder="ID de Cuenta Instagram (Opcional)"
                        />
                     </div>
                  </div>
               </div>
            </CollapsibleSection>

            <CollapsibleSection title="Configuración del Anuncio" defaultOpen={!ad}>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 16, opacity: ad ? 0.6 : 1, pointerEvents: ad ? 'none' : 'auto' }}>
                  <div style={{ display: 'flex', gap: 16 }}>
                     <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                        <input type="radio" name="setup_type" value="CREATE" checked={setupType === 'CREATE'} onChange={(e) => setSetupType(e.target.value)} />
                        Crear anuncio
                     </label>
                     <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                        <input type="radio" name="setup_type" value="EXISTING_POST" checked={setupType === 'EXISTING_POST'} onChange={(e) => setSetupType(e.target.value)} />
                        Usar publicación existente
                     </label>
                  </div>

                  {setupType === 'EXISTING_POST' ? (
                     <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: 8, display: 'block' }}>ID de la Publicación</label>
                        <input 
                           type="text" value={existingPostId} onChange={e => setExistingPostId(e.target.value)}
                           style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--outline-variant)', background: 'var(--surface-container-lowest)', color: 'var(--on-surface)', outline: 'none' }}
                           placeholder="Ingresa el ID del post"
                        />
                     </div>
                  ) : (
                     <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: 8, display: 'block' }}>Formato</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                           {[
                              { id: 'SINGLE', label: 'Una sola imagen o video', desc: 'Un anuncio con una imagen o video.', active: true },
                              { id: 'CAROUSEL', label: 'Secuencia / Carousel', desc: '2 o más imágenes o videos desplazables.', active: false },
                              { id: 'COLLECTION', label: 'Colección', desc: 'Un grupo de artículos que se abre en una experiencia a pantalla completa.', active: false }
                           ].map(fmt => (
                              <div 
                                 key={fmt.id} 
                                 onClick={() => fmt.active && setFormat(fmt.id)}
                                 style={{ 
                                    padding: '12px', borderRadius: 8, border: format === fmt.id ? '2px solid var(--primary)' : '1px solid var(--outline-variant)', 
                                    background: format === fmt.id ? 'rgba(30,111,186,0.1)' : 'var(--surface-container)', 
                                    cursor: fmt.active ? 'pointer' : 'not-allowed', opacity: fmt.active ? 1 : 0.6,
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                 }}
                              >
                                 <div>
                                    <div style={{ fontWeight: 700, fontSize: 13, color: format === fmt.id ? 'var(--primary)' : 'var(--on-surface)' }}>{fmt.label}</div>
                                    <div style={{ fontSize: 11, color: 'var(--on-surface-variant)' }}>{fmt.desc}</div>
                                 </div>
                                 {!fmt.active && (
                                    <div style={{ background: 'var(--surface-container-highest)', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700 }}>Próximamente</div>
                                 )}
                              </div>
                           ))}
                        </div>
                     </div>
                  )}
               </div>
            </CollapsibleSection>

            {setupType === 'CREATE' && (
               <CollapsibleSection title="Contenido del Anuncio" defaultOpen={!ad}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, opacity: ad ? 0.6 : 1, pointerEvents: ad ? 'none' : 'auto' }}>
                     
                     <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: 8, display: 'block' }}>URL de la Imagen *</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--outline-variant)', borderRadius: 8, background: 'var(--surface-container-lowest)', padding: '0 12px' }}>
                           <ImageIcon size={16} color="var(--on-surface-variant)" />
                           <input 
                              type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} required={!ad}
                              style={{ width: '100%', padding: '12px 0', border: 'none', background: 'transparent', color: 'var(--on-surface)', outline: 'none' }}
                              placeholder="https://ejemplo.com/imagen.jpg"
                           />
                        </div>
                        {imageUrl && (
                           <div style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden', height: 120, background: 'var(--surface-container-highest)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                              <img src={imageUrl} alt="Preview" style={{ height: '100%', objectFit: 'contain' }} onError={(e) => {e.target.style.display = 'none'}} />
                           </div>
                        )}
                     </div>

                     <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: 8, display: 'block' }}>Texto principal *</label>
                        <textarea 
                           value={bodyText} onChange={e => setBodyText(e.target.value)} required={!ad}
                           style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--outline-variant)', background: 'var(--surface-container-lowest)', color: 'var(--on-surface)', outline: 'none', minHeight: 80, resize: 'vertical' }}
                           placeholder="Escribe el texto que aparecerá arriba del anuncio..."
                        />
                     </div>

                     <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: 8, display: 'block' }}>Título *</label>
                        <input 
                           type="text" value={headline} onChange={e => setHeadline(e.target.value)} required={!ad}
                           style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--outline-variant)', background: 'var(--surface-container-lowest)', color: 'var(--on-surface)', outline: 'none' }}
                           placeholder="Escribe un título corto y llamativo"
                        />
                     </div>

                     <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: 8, display: 'block' }}>Descripción (Opcional)</label>
                        <input 
                           type="text" value={description} onChange={e => setDescription(e.target.value)}
                           style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--outline-variant)', background: 'var(--surface-container-lowest)', color: 'var(--on-surface)', outline: 'none' }}
                           placeholder="Aparece debajo del título en algunas ubicaciones"
                        />
                     </div>

                     <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: 8, display: 'block' }}>Llamada a la acción (CTA)</label>
                        <select value={callToAction} onChange={e => setCallToAction(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--outline-variant)', background: 'var(--surface-container-lowest)', color: 'var(--on-surface)', outline: 'none' }}>
                           <option value="LEARN_MORE">Más información</option>
                           <option value="SHOP_NOW">Comprar</option>
                           <option value="SIGN_UP">Registrarte</option>
                           <option value="SUBSCRIBE">Suscribirse</option>
                           <option value="CONTACT_US">Contactar</option>
                           <option value="DOWNLOAD">Descargar</option>
                           <option value="GET_OFFER">Obtener oferta</option>
                           <option value="BOOK_TRAVEL">Reservar</option>
                           <option value="APPLY_NOW">Solicitar ahora</option>
                           <option value="NO_BUTTON">Sin botón</option>
                        </select>
                     </div>

                  </div>
               </CollapsibleSection>
            )}

            <CollapsibleSection title="Destino" icon={Link} defaultOpen={!ad}>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 16, opacity: ad ? 0.6 : 1, pointerEvents: ad ? 'none' : 'auto' }}>
                  <div>
                     <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: 8, display: 'block' }}>URL del sitio web *</label>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--outline-variant)', borderRadius: 8, background: 'var(--surface-container-lowest)', padding: '0 12px' }}>
                        <Globe size={16} color="var(--on-surface-variant)" />
                        <input 
                           type="url" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} required={!ad && setupType === 'CREATE'}
                           style={{ width: '100%', padding: '12px 0', border: 'none', background: 'transparent', color: 'var(--on-surface)', outline: 'none' }}
                           placeholder="https://tusitio.com"
                        />
                     </div>
                  </div>
                  <div>
                     <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: 8, display: 'block' }}>Enlace visible (Opcional)</label>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--outline-variant)', borderRadius: 8, background: 'var(--surface-container-lowest)', padding: '0 12px' }}>
                        <Eye size={16} color="var(--on-surface-variant)" />
                        <input 
                           type="text" value={displayLink} onChange={e => setDisplayLink(e.target.value)}
                           style={{ width: '100%', padding: '12px 0', border: 'none', background: 'transparent', color: 'var(--on-surface)', outline: 'none' }}
                           placeholder="tusitio.com"
                        />
                     </div>
                  </div>
               </div>
            </CollapsibleSection>

            <CollapsibleSection title="Seguimiento" icon={BarChart2} defaultOpen={!ad}>
               <p style={{ fontSize: 12, color: 'var(--on-surface-variant)', marginBottom: 12 }}>
                 El píxel de Meta te permite medir la efectividad de tus anuncios rastreando las acciones en tu sitio web.
               </p>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 16, opacity: ad ? 0.6 : 1, pointerEvents: ad ? 'none' : 'auto' }}>
                  <div>
                     <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: 8, display: 'block' }}>Píxel de Meta</label>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--outline-variant)', borderRadius: 8, background: 'var(--surface-container-lowest)', padding: '0 12px' }}>
                        <MousePointer size={16} color="var(--on-surface-variant)" />
                        <input 
                           type="text" value={pixelId} onChange={e => setPixelId(e.target.value)}
                           style={{ width: '100%', padding: '12px 0', border: 'none', background: 'transparent', color: 'var(--on-surface)', outline: 'none' }}
                           placeholder="ID del Píxel (Opcional)"
                        />
                     </div>
                  </div>
                  <div>
                     <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: 8, display: 'block' }}>Evento de conversión</label>
                     <select value={conversionEvent} onChange={e => setConversionEvent(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--outline-variant)', background: 'var(--surface-container-lowest)', color: 'var(--on-surface)', outline: 'none' }}>
                        <option value="Purchase">Compra (Purchase)</option>
                        <option value="AddToCart">Añadir al carrito (AddToCart)</option>
                        <option value="Lead">Cliente potencial (Lead)</option>
                        <option value="CompleteRegistration">Registro completado</option>
                        <option value="ViewContent">Ver contenido</option>
                        <option value="InitiateCheckout">Iniciar pago</option>
                        <option value="Search">Búsqueda</option>
                     </select>
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
          <button form="ad-form" type="submit" disabled={saving || !name.trim()} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: 'var(--on-surface)', fontWeight: 600, cursor: saving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
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

export default AdDrawer;
