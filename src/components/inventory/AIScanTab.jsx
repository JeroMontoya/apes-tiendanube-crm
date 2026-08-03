import React, { useState, useRef, useCallback } from 'react';
import {
  ScanLine, Camera, Search, Upload, X, CheckCircle, AlertTriangle,
  Package, RefreshCw, ArrowUpDown, Eye, FileText, Sparkles,
} from 'lucide-react';

const OCR_TAB = 'ocr';
const VISION_TAB = 'vision';

function OCRResultCard({ item, index }) {
  const hasMatch = !!item.matched;
  return (
    <div style={{
      padding: '12px', borderRadius: '10px',
      border: `1px solid ${hasMatch ? '#06B6D430' : 'var(--primary-container)30'}`,
      background: hasMatch ? '#06B6D408' : 'var(--primary-container)08',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--on-surface-variant)' }}>
          #{index + 1}
        </span>
        {hasMatch ? (
          <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#06B6D418', color: '#06B6D4' }}>
            <CheckCircle size={10} style={{ marginRight: '3px', verticalAlign: 'middle' }} />
            Coincidencia
          </span>
        ) : (
          <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'var(--primary-container)18', color: 'var(--primary-container)' }}>
            Sin match
          </span>
        )}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--on-surface)', marginBottom: '4px', fontWeight: 600 }}>
        {item.rawText}
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '11px', color: 'var(--on-surface-variant)' }}>
        {item.quantity && <span>Cant: <b>{item.quantity}</b></span>}
        {item.sku && <span>SKU: <b>{item.sku}</b></span>}
        {item.barcode && <span>Barcode: <b>{item.barcode}</b></span>}
        {item.price && <span>Precio: <b>${item.price}</b></span>}
      </div>
      {hasMatch && (
        <div style={{ marginTop: '6px', fontSize: '11px', color: '#06B6D4' }}>
          → {item.matched.name} ({item.matched.sku})
        </div>
      )}
    </div>
  );
}

function VisionResultCard({ data, onApply }) {
  if (!data) return null;
  const v = data.vision;
  return (
    <div style={{
      padding: '16px', borderRadius: '12px',
      border: '1px solid #6366f130', background: '#6366f108',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <Sparkles size={16} color="#6366f1" />
        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--on-surface)' }}>
          Producto Identificado
        </span>
        {v.confidence && (
          <span style={{
            fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px',
            background: v.confidence > 0.7 ? '#06B6D418' : 'var(--primary-container)18',
            color: v.confidence > 0.7 ? '#06B6D41' : 'var(--primary-container)',
          }}>
            {Math.round(v.confidence * 100)}% confianza
          </span>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {[
          ['Nombre', v.name],
          ['Categoría', v.category],
          ['Color', v.color],
          ['Talla', v.size],
          ['Estado', v.condition],
          ['Marca', v.brand],
        ].filter(([, val]) => val).map(([label, value]) => (
          <div key={label}>
            <div style={{ fontSize: '10px', color: 'var(--on-surface-variant)', marginBottom: '2px' }}>{label}</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--on-surface)' }}>{value}</div>
          </div>
        ))}
      </div>
      {v.codes?.length > 0 && (
        <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--on-surface-variant)' }}>
          Códigos: {v.codes.join(', ')}
        </div>
      )}
      {data.hasMatch && (
        <div style={{
          marginTop: '12px', padding: '10px', borderRadius: '8px',
          background: '#06B6D410', border: '1px solid #06B6D430',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#06B6D4', marginBottom: '4px' }}>
            Producto encontrado en catálogo
          </div>
          <div style={{ fontSize: '12px', color: 'var(--on-surface)' }}>
            {data.matchedProduct.name} — {data.matchedProduct.sku}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--on-surface-variant)', marginTop: '2px' }}>
            Score: {Math.round(data.matchedProduct.matchScore * 100)}%
          </div>
        </div>
      )}
      {v.notes && (
        <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--on-surface-variant)', fontStyle: 'italic' }}>
          {v.notes}
        </div>
      )}
    </div>
  );
}

export default function AIScanTab({ onAdjust, products }) {
  const [activeTab, setActiveTab] = useState(OCR_TAB);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [visionResult, setVisionResult] = useState(null);
  const [error, setError] = useState(null);
  const [visionPrompt, setVisionPrompt] = useState('');
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('La imagen no puede superar 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result;
      setImage(base64);
      setImagePreview(base64);
      setOcrResult(null);
      setVisionResult(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleOCR = useCallback(async () => {
    if (!image) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/inventory/ai-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOcrResult(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [image]);

  const handleVision = useCallback(async () => {
    if (!image) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/inventory/ai-vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, prompt: visionPrompt || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setVisionResult(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [image, visionPrompt]);

  const clearImage = () => {
    setImage(null);
    setImagePreview(null);
    setOcrResult(null);
    setVisionResult(null);
    setError(null);
  };

  const tabBtnStyle = (active) => ({
    padding: '8px 16px', borderRadius: '8px', border: 'none',
    background: active ? '#6366f1' : 'transparent',
    color: active ? '#fff' : 'var(--on-surface-variant)',
    fontSize: '13px', fontWeight: active ? 700 : 500,
    cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', gap: '6px',
  });

  const dropZoneStyle = {
    border: '2px dashed var(--border-subtle)',
    borderRadius: '12px',
    padding: '40px 20px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
    background: imagePreview ? 'transparent' : 'var(--surface-container-low, rgba(255,255,255,0.02))',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button onClick={() => setActiveTab(OCR_TAB)} style={tabBtnStyle(activeTab === OCR_TAB)}>
          <FileText size={14} /> OCR Remito
        </button>
        <button onClick={() => setActiveTab(VISION_TAB)} style={tabBtnStyle(activeTab === VISION_TAB)}>
          <Eye size={14} /> Visión Producto
        </button>
      </div>

      {!imagePreview ? (
        <div
          style={dropZoneStyle}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#6366f1'; }}
          onDragLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.style.borderColor = 'var(--border-subtle)';
            const file = e.dataTransfer.files?.[0];
            if (file) {
              const input = fileInputRef.current;
              const dt = new DataTransfer();
              dt.items.add(file);
              input.files = dt.files;
              input.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }}
        >
          <Upload size={36} color="var(--on-surface-variant)" style={{ opacity: 0.3, marginBottom: '12px' }} />
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--on-surface)', marginBottom: '6px' }}>
            Subí una imagen del remito o producto
          </div>
          <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>
            Arrastrá un archivo o hacé click para seleccionar
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px' }}>
            <button
              onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }}
              style={{
                padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-subtle)',
                background: 'var(--surface)', color: 'var(--on-surface)', fontSize: '12px',
                fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <Camera size={14} /> Cámara
            </button>
          </div>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <img
            src={imagePreview}
            alt="Preview"
            style={{
              width: '100%', maxHeight: '300px', objectFit: 'contain',
              borderRadius: '12px', border: '1px solid var(--border-subtle)',
            }}
          />
          <button
            onClick={clearImage}
            style={{
              position: 'absolute', top: '8px', right: '8px',
              width: '28px', height: '28px', borderRadius: '50%',
              background: 'rgba(0,0,0,0.6)', border: 'none',
              color: 'var(--on-surface)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {activeTab === VISION_TAB && imagePreview && (
        <div>
          <input
            style={{
              width: '100%', height: '38px', borderRadius: '8px',
              border: '1px solid var(--border-subtle)', background: 'var(--surface)',
              color: 'var(--on-surface)', padding: '0 12px', fontSize: '13px',
              fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
            }}
            value={visionPrompt}
            onChange={(e) => setVisionPrompt(e.target.value)}
            placeholder="Prompt personalizado (opcional)...ej: Identificá la talla y color exacto"
          />
        </div>
      )}

      {imagePreview && (
        <button
          onClick={activeTab === OCR_TAB ? handleOCR : handleVision}
          disabled={loading}
          style={{
            width: '100%', padding: '12px', borderRadius: '10px',
            border: 'none', background: loading ? '#6366f180' : '#6366f1',
            color: 'var(--on-surface)', fontSize: '14px', fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}
        >
          {loading ? (
            <>
              <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
              Procesando con IA...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              {activeTab === OCR_TAB ? 'Escanear Remito' : 'Analizar Producto'}
            </>
          )}
        </button>
      )}

      {error && (
        <div style={{
          padding: '12px', borderRadius: '10px',
          background: '#E11D4810', border: '1px solid #E11D4830',
          fontSize: '13px', color: '#E11D48',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {ocrResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--on-surface)' }}>
              Resultados OCR
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>
              {ocrResult.matchedCount}/{ocrResult.itemCount} coincidencias
            </span>
          </div>
          {ocrResult.items.length === 0 ? (
            <div style={{
              padding: '20px', textAlign: 'center',
              color: 'var(--on-surface-variant)', fontSize: '13px',
            }}>
              No se detectaron artículos en la imagen.
              {ocrResult.rawText && (
                <pre style={{
                  marginTop: '10px', textAlign: 'left', fontSize: '11px',
                  background: 'var(--surface)', padding: '10px', borderRadius: '8px',
                  maxHeight: '150px', overflow: 'auto', whiteSpace: 'pre-wrap',
                  color: 'var(--on-surface)',
                }}>
                  {ocrResult.rawText}
                </pre>
              )}
            </div>
          ) : (
            ocrResult.items.map((item, i) => (
              <OCRResultCard key={i} item={item} index={i} />
            ))
          )}
        </div>
      )}

      {visionResult && <VisionResultCard data={visionResult} />}

      {!imagePreview && !ocrResult && !visionResult && (
        <div style={{
          padding: '30px', textAlign: 'center',
          color: 'var(--on-surface-variant)',
        }}>
          <ScanLine size={40} style={{ opacity: 0.2, marginBottom: '10px' }} />
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
            {activeTab === OCR_TAB
              ? 'Escanear remitos para cargar stock automáticamente'
              : 'Reconocer productos desde fotos'}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.7 }}>
            Subí o capturá una imagen para comenzar
          </p>
        </div>
      )}
    </div>
  );
}
