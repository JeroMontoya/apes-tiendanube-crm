import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

export default function MetricTooltip({ text, children, width = 260 }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const timeoutRef = useRef(null);

  const show = useCallback(() => {
    clearTimeout(timeoutRef.current);
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      let top = rect.top - 8;
      let left = rect.left + rect.width / 2;
      // Clamp to viewport
      if (left + width / 2 > window.innerWidth - 12) left = window.innerWidth - 12 - width / 2;
      if (left - width / 2 < 12) left = 12 + width / 2;
      setPos({ top, left });
    }
    setOpen(true);
  }, [width]);

  const hide = useCallback(() => {
    timeoutRef.current = setTimeout(() => setOpen(false), 100);
  }, []);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        style={{ display: 'inline-flex', alignItems: 'center', cursor: 'help', flexShrink: 0 }}
      >
        {children || <Info size={14} color="var(--on-surface-variant)" style={{ opacity: 0.6 }} />}
      </span>
      {open && createPortal(
        <div
          onMouseEnter={() => clearTimeout(timeoutRef.current)}
          onMouseLeave={hide}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            transform: 'translate(-50%, -100%)',
            width,
            zIndex: 9999,
            pointerEvents: 'auto',
            animation: 'metricTooltipIn 0.18s cubic-bezier(0.16,1,0.3,1) forwards',
          }}
        >
          <div style={{
            padding: '12px 16px',
            borderRadius: 12,
            background: 'rgba(24, 24, 27, 0.96)',
            backdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid var(--outline)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px var(--surface-container-low)',
            color: '#E4E4E7',
            fontSize: 12,
            fontWeight: 500,
            lineHeight: 1.6,
            letterSpacing: '0.01em',
          }}>
            {text}
          </div>
          {/* Arrow */}
          <div style={{
            position: 'absolute',
            bottom: -5,
            left: '50%',
            transform: 'translateX(-50%) rotate(45deg)',
            width: 10,
            height: 10,
            background: 'rgba(24, 24, 27, 0.96)',
            borderRight: '1px solid var(--outline)',
            borderBottom: '1px solid var(--outline)',
          }} />
        </div>,
        document.body
      )}
    </>
  );
}
