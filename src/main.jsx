import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '20px',
          background: 'var(--background, #050507)',
          color: 'var(--on-background, #f8fafc)',
          fontFamily: 'Inter, sans-serif'
        }}>
          <h1 style={{ marginBottom: '16px', letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: '18px', fontWeight: 600 }}>Something went wrong</h1>
          <pre style={{ 
            textAlign: 'left', 
            maxWidth: '800px', 
            overflow: 'auto',
            background: 'var(--surface, #0b0d14)',
            padding: '16px',
            borderRadius: '6px',
            fontSize: '12px',
            whiteSpace: 'pre-wrap',
            border: '1px solid var(--border-subtle)',
            color: 'var(--on-surface-variant, #8B9BB4)'
          }}>
            {this.state.error?.toString()}
            {'\n\n'}
            {this.state.errorInfo?.componentStack}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '24px',
              padding: '12px 24px',
              background: 'var(--primary, #6366f1)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              letterSpacing: '0.04em'
            }}
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
