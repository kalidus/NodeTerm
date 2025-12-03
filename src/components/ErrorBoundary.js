import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary capturó un error:', error);
    console.error('Error info:', errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '20px', 
          margin: '20px', 
          border: '2px solid #f44336', 
          borderRadius: '8px',
          backgroundColor: '#ffebee',
          color: '#c62828'
        }}>
          <h2>⚠️ Error en la aplicación</h2>
          <p><strong>Error:</strong> {this.state.error?.toString()}</p>
          <details style={{ marginTop: '10px' }}>
            <summary>Detalles del error</summary>
            <pre style={{ 
              marginTop: '10px', 
              padding: '10px', 
              backgroundColor: '#f5f5f5', 
              borderRadius: '4px',
              overflow: 'auto',
              maxHeight: '300px'
            }}>
              {this.state.errorInfo?.componentStack}
            </pre>
          </details>
          <button 
            onClick={() => {
              this.setState({ hasError: false, error: null, errorInfo: null });
              window.location.reload();
            }}
            style={{
              marginTop: '10px',
              padding: '10px 20px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Recargar aplicación
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

