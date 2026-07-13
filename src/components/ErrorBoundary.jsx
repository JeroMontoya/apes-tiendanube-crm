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
          background: '#0f172a',
          color: 'white',
          padding: '20px',
          fontFamily: 'Inter, sans-serif'
        }}>
          <div style={{ maxWidth: 600, textAlign: 'center' }}>
            <h1 style={{ fontSize: 24, marginBottom: 16 }}>Something went wrong</h1>
            <pre style={{ 
              textAlign: 'left', 
              background: '#1e293b', 
              padding: 16, 
              borderRadius: 8, 
              overflow: 'auto',
              color: '#e2e8f0',
              fontSize: 12
            }}>
              {this.state.error && this.state.error.toString()}
              {this.state.errorInfo && '\n\n' + this.state.errorInfo.componentStack}
            </pre>
            <button 
              onClick={() => window.location.reload()}
              style={{
                marginTop: 24,
                padding: '12px 24px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer'
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