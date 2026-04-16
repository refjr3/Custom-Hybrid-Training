import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  componentDidCatch(error, info) {
    console.error('App crashed:', error, info);
  }

  static getDerivedStateFromError(error) {
    return { error: error?.message || String(error) };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ color: 'white', padding: 20, background: '#0D0E10', minHeight: '100vh', fontFamily: '"DM Sans", sans-serif' }}>
          <h2>Something went wrong</h2>
          <pre style={{ color: '#ff3b30', fontSize: 12 }}>{this.state.error}</pre>
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
  </React.StrictMode>
)
