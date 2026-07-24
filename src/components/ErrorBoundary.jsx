import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0A0A0A',
          color: '#e2e4e8',
          padding: '20px',
          fontFamily: 'Inter, sans-serif'
        }}>
          <div style={{ maxWidth: 600, textAlign: 'center' }}>
            <h1 style={{ fontSize: 18, marginBottom: 16, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>Something went wrong</h1>
            <pre style={{ 
              textAlign: 'left', 
              background: '#111214', 
              padding: 16, 
              borderRadius: 6, 
              overflow: 'auto',
              color: '#6b7280',
              fontSize: 12,
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              {this.state.error && this.state.error.toString()}
              {this.state.errorInfo && '\n\n' + this.state.errorInfo.componentStack}
            </pre>
            <button 
              onClick={() => window.location.reload()}
              style={{
                marginTop: 24,
                padding: '12px 24px',
                background: '#3d5a99',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: '0.04em'
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;