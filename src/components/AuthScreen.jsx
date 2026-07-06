import React, { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/* ── AuthScreen ──────────────────────────────────────────────
   Full-screen Login / Register gate for APES CRM.
   Props:
     onAuth(session) – called after successful sign-in/sign-up.
   ────────────────────────────────────────────────────────── */

const MODE_LOGIN = 'login';
const MODE_REGISTER = 'register';

export default function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState(MODE_LOGIN);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isLogin = mode === MODE_LOGIN;

  const toggleMode = useCallback(() => {
    setMode((m) => (m === MODE_LOGIN ? MODE_REGISTER : MODE_LOGIN));
    setError('');
    setInfo('');
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setError('');
      setInfo('');

      if (!email.trim() || !password.trim()) {
        setError('Completa todos los campos.');
        return;
      }

      setLoading(true);

      try {
        if (isLogin) {
          const { data, error: authError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (authError) throw authError;
          onAuth?.(data.session);
        } else {
          const { data, error: authError } = await supabase.auth.signUp({
            email: email.trim(),
            password,
          });
          if (authError) throw authError;

          // Supabase may require email confirmation
          if (data.session) {
            onAuth?.(data.session);
          } else {
            setInfo('Revisa tu correo electrónico para confirmar tu cuenta.');
            setMode(MODE_LOGIN);
          }
        }
      } catch (err) {
        setError(err?.message || 'Error de autenticación. Intenta de nuevo.');
      } finally {
        setLoading(false);
      }
    },
    [email, password, isLogin, onAuth],
  );

  /* ── Inline Styles ─────────────────────────────────────── */

  const styles = {
    wrapper: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: 'var(--space-md)',
      background: 'linear-gradient(135deg, var(--background) 0%, var(--surface-container-low) 50%, var(--surface-container) 100%)',
      position: 'relative',
      overflow: 'hidden',
    },
    /* Decorative floating orbs */
    orbBase: {
      position: 'absolute',
      borderRadius: '50%',
      filter: 'blur(80px)',
      opacity: 0.18,
      pointerEvents: 'none',
    },
    orb1: {
      width: 420,
      height: 420,
      background: 'var(--primary)',
      top: '-10%',
      right: '-8%',
    },
    orb2: {
      width: 320,
      height: 320,
      background: '#709bfe',
      bottom: '-6%',
      left: '-5%',
    },
    orb3: {
      width: 200,
      height: 200,
      background: '#b2c5ff',
      top: '40%',
      left: '60%',
    },

    card: {
      width: '100%',
      maxWidth: 420,
      padding: 'var(--space-2xl) var(--space-xl)',
      position: 'relative',
      zIndex: 1,
      borderRadius: 'var(--radius-lg)',
    },

    brand: {
      textAlign: 'center',
      marginBottom: 'var(--space-xs)',
    },
    brandTitle: {
      fontSize: '1.75rem',
      fontWeight: 800,
      color: 'var(--on-surface)',
      letterSpacing: '-0.5px',
      lineHeight: 1.2,
    },
    tagline: {
      fontSize: '0.8rem',
      color: 'var(--on-surface-variant)',
      textAlign: 'center',
      marginBottom: 'var(--space-lg)',
      fontWeight: 400,
      opacity: 0.75,
    },
    heading: {
      fontSize: '1.15rem',
      fontWeight: 600,
      color: 'var(--on-surface)',
      textAlign: 'center',
      marginBottom: 'var(--space-lg)',
    },

    /* Form */
    fieldGroup: {
      marginBottom: 'var(--space-md)',
    },
    label: {
      display: 'block',
      fontSize: '0.8rem',
      fontWeight: 600,
      color: 'var(--on-surface-variant)',
      marginBottom: 'var(--space-xs)',
      letterSpacing: '0.02em',
    },
    inputWrap: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
    },
    input: {
      width: '100%',
      padding: '10px 14px',
      fontSize: '0.95rem',
      fontFamily: 'inherit',
      color: 'var(--on-surface)',
      background: 'var(--surface-container-low)',
      border: '1.5px solid var(--border-subtle)',
      borderRadius: 'var(--radius-sm)',
      outline: 'none',
      transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
    },
    inputFocus: {
      borderColor: 'var(--primary)',
      boxShadow: 'var(--shadow-glow-primary)',
    },
    eyeBtn: {
      position: 'absolute',
      right: 10,
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontSize: '1rem',
      color: 'var(--on-surface-variant)',
      padding: 4,
      lineHeight: 1,
      display: 'flex',
      alignItems: 'center',
    },

    /* Alerts */
    alertBase: {
      padding: '10px 14px',
      borderRadius: 'var(--radius-sm)',
      fontSize: '0.82rem',
      fontWeight: 500,
      marginBottom: 'var(--space-md)',
      lineHeight: 1.45,
    },
    alertError: {
      background: 'var(--error-container)',
      color: 'var(--on-error-container)',
      border: '1px solid rgba(186,26,26,0.15)',
    },
    alertInfo: {
      background: 'var(--success-container)',
      color: 'var(--on-success-container)',
      border: '1px solid rgba(26,123,69,0.15)',
    },

    /* Button */
    submit: {
      width: '100%',
      padding: '12px',
      fontSize: '0.95rem',
      fontWeight: 700,
      fontFamily: 'inherit',
      color: 'var(--on-primary)',
      background: 'var(--gradient-primary)',
      border: 'none',
      borderRadius: 'var(--radius-sm)',
      cursor: 'pointer',
      transition: 'opacity var(--transition-fast), transform var(--transition-fast)',
      position: 'relative',
      letterSpacing: '0.01em',
    },
    submitDisabled: {
      opacity: 0.7,
      cursor: 'not-allowed',
    },

    /* Spinner */
    spinnerWrap: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },

    /* Toggle */
    toggle: {
      textAlign: 'center',
      marginTop: 'var(--space-lg)',
      fontSize: '0.85rem',
      color: 'var(--on-surface-variant)',
    },
    toggleBtn: {
      background: 'none',
      border: 'none',
      color: 'var(--primary)',
      fontWeight: 700,
      fontFamily: 'inherit',
      fontSize: '0.85rem',
      cursor: 'pointer',
      textDecoration: 'underline',
      textUnderlineOffset: '3px',
      padding: 0,
      transition: 'color var(--transition-fast)',
    },

    /* Footer */
    footer: {
      textAlign: 'center',
      marginTop: 'var(--space-lg)',
      fontSize: '0.72rem',
      color: 'var(--outline)',
      opacity: 0.6,
    },
  };

  /* Spinner keyframes injected once via a style tag */
  const spinnerCSS = `
    @keyframes apes-spin {
      to { transform: rotate(360deg); }
    }
    .apes-auth-input:focus {
      border-color: var(--primary) !important;
      box-shadow: var(--shadow-glow-primary) !important;
    }
    .apes-auth-submit:hover:not(:disabled) {
      opacity: 0.92;
      transform: translateY(-1px);
    }
    .apes-auth-submit:active:not(:disabled) {
      transform: translateY(0);
    }
    .apes-auth-toggle-btn:hover {
      color: var(--primary-container) !important;
    }
  `;

  return (
    <div style={styles.wrapper}>
      {/* Injected keyframes */}
      <style>{spinnerCSS}</style>

      {/* Decorative orbs */}
      <div style={{ ...styles.orbBase, ...styles.orb1 }} />
      <div style={{ ...styles.orbBase, ...styles.orb2 }} />
      <div style={{ ...styles.orbBase, ...styles.orb3 }} />

      {/* Card */}
      <div className="glass-card" style={styles.card}>
        {/* Brand */}
        <div style={styles.brand}>
          <div style={styles.brandTitle}>🦍 APES CRM</div>
        </div>
        <p style={styles.tagline}>Tu centro de comando de marketing omnicanal</p>

        <h2 style={styles.heading}>
          {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
        </h2>

        {/* Error */}
        {error && (
          <div style={{ ...styles.alertBase, ...styles.alertError }} role="alert">
            {error}
          </div>
        )}

        {/* Info */}
        {info && (
          <div style={{ ...styles.alertBase, ...styles.alertInfo }} role="status">
            {info}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div style={styles.fieldGroup}>
            <label style={styles.label} htmlFor="apes-email">
              Correo electrónico
            </label>
            <input
              id="apes-email"
              className="apes-auth-input"
              type="email"
              autoComplete="email"
              placeholder="tu@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              style={styles.input}
            />
          </div>

          {/* Password */}
          <div style={styles.fieldGroup}>
            <label style={styles.label} htmlFor="apes-password">
              Contraseña
            </label>
            <div style={styles.inputWrap}>
              <input
                id="apes-password"
                className="apes-auth-input"
                type={showPassword ? 'text' : 'password'}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                placeholder={isLogin ? '••••••••' : 'Mínimo 6 caracteres'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                style={{ ...styles.input, paddingRight: 40 }}
              />
              <button
                type="button"
                style={styles.eyeBtn}
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="apes-auth-submit"
            disabled={loading}
            style={{
              ...styles.submit,
              ...(loading ? styles.submitDisabled : {}),
            }}
          >
            {loading ? (
              <span style={styles.spinnerWrap}>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{ animation: 'apes-spin 0.8s linear infinite' }}
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray="50 20"
                    strokeLinecap="round"
                  />
                </svg>
                {isLogin ? 'Ingresando…' : 'Registrando…'}
              </span>
            ) : isLogin ? (
              'Ingresar'
            ) : (
              'Crear cuenta'
            )}
          </button>
        </form>

        {/* Toggle */}
        <div style={styles.toggle}>
          {isLogin ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
          <button
            type="button"
            className="apes-auth-toggle-btn"
            style={styles.toggleBtn}
            onClick={toggleMode}
          >
            {isLogin ? 'Crear una' : 'Inicia sesión'}
          </button>
        </div>

        <p style={styles.footer}>© {new Date().getFullYear()} APES Digital · Todos los derechos reservados</p>
      </div>
    </div>
  );
}
