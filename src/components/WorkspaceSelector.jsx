import React, { useState, useRef, useEffect } from 'react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { ChevronDown, Plus, Check, Building2 } from 'lucide-react';

/**
 * WorkspaceSelector — Premium Glassmorphism workspace switcher
 * 
 * Sits at the top of the sidebar. Shows the active business/brand
 * with icon and name. Click to open dropdown of all workspaces.
 * Includes "Crear Nuevo Negocio" action.
 */
export default function WorkspaceSelector({ collapsed }) {
  const {
    workspaces,
    activeWorkspace,
    switchWorkspace,
    createWorkspace,
  } = useWorkspace();

  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('🏢');
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Icons palette for new workspaces
  const ICONS = ['🏢', '🦍', '💎', '🔥', '⚡', '🚀', '🎯', '👑', '🌐', '🏪'];

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
        setCreating(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Auto-focus input when creating
  useEffect(() => {
    if (creating && inputRef.current) inputRef.current.focus();
  }, [creating]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const result = await createWorkspace(newName.trim(), newIcon);
    if (result.success) {
      switchWorkspace(result.data);
      setNewName('');
      setNewIcon('🏢');
      setCreating(false);
      setOpen(false);
    }
  };

  if (!activeWorkspace) return null;

  // Collapsed sidebar: show only icon
  if (collapsed) {
    return (
      <button
        className="ws-selector ws-selector--collapsed"
        onClick={() => setOpen(!open)}
        title={activeWorkspace.name}
      >
        <span className="ws-selector__icon">{activeWorkspace.icon || '🏢'}</span>
        
        {open && (
          <div className="ws-dropdown ws-dropdown--rail" ref={dropdownRef}>
            {workspaces.map(ws => (
              <button
                key={ws.id}
                className={`ws-dropdown__item ${ws.id === activeWorkspace.id ? 'ws-dropdown__item--active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  switchWorkspace(ws);
                  setOpen(false);
                }}
              >
                <span className="ws-dropdown__item-icon">{ws.icon || '🏢'}</span>
                <span className="ws-dropdown__item-name">{ws.name}</span>
                {ws.id === activeWorkspace.id && <Check size={14} className="ws-dropdown__check" />}
              </button>
            ))}
          </div>
        )}
      </button>
    );
  }

  return (
    <div className="ws-selector-wrapper" ref={dropdownRef}>
      {/* ── Trigger Button ── */}
      <button
        className="ws-selector"
        onClick={() => { setOpen(!open); setCreating(false); }}
      >
        <div className="ws-selector__left">
          <span className="ws-selector__icon">{activeWorkspace.icon || '🏢'}</span>
          <div className="ws-selector__text">
            <span className="ws-selector__name">{activeWorkspace.name}</span>
            <span className="ws-selector__label">Negocio Activo</span>
          </div>
        </div>
        <ChevronDown 
          size={14} 
          className={`ws-selector__chevron ${open ? 'ws-selector__chevron--open' : ''}`} 
        />
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div className="ws-dropdown">
          <div className="ws-dropdown__header">
            <Building2 size={12} />
            <span>Tus Negocios</span>
          </div>

          <div className="ws-dropdown__list">
            {workspaces.map(ws => (
              <button
                key={ws.id}
                className={`ws-dropdown__item ${ws.id === activeWorkspace.id ? 'ws-dropdown__item--active' : ''}`}
                onClick={() => {
                  switchWorkspace(ws);
                  setOpen(false);
                }}
              >
                <span className="ws-dropdown__item-icon">{ws.icon || '🏢'}</span>
                <div className="ws-dropdown__item-info">
                  <span className="ws-dropdown__item-name">{ws.name}</span>
                </div>
                {ws.id === activeWorkspace.id && (
                  <Check size={14} className="ws-dropdown__check" />
                )}
              </button>
            ))}
          </div>

          {/* ── Create New ── */}
          {!creating ? (
            <button
              className="ws-dropdown__create-btn"
              onClick={(e) => { e.stopPropagation(); setCreating(true); }}
            >
              <Plus size={14} />
              <span>Crear Nuevo Negocio</span>
            </button>
          ) : (
            <div className="ws-dropdown__create-form" onClick={(e) => e.stopPropagation()}>
              <div className="ws-dropdown__icon-picker">
                {ICONS.map(icon => (
                  <button
                    key={icon}
                    className={`ws-dropdown__icon-btn ${newIcon === icon ? 'ws-dropdown__icon-btn--active' : ''}`}
                    onClick={() => setNewIcon(icon)}
                  >
                    {icon}
                  </button>
                ))}
              </div>
              <div className="ws-dropdown__input-row">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Nombre del negocio..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
                  className="ws-dropdown__input"
                  maxLength={40}
                />
                <button
                  className="ws-dropdown__confirm-btn"
                  onClick={handleCreate}
                  disabled={!newName.trim()}
                >
                  <Check size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
