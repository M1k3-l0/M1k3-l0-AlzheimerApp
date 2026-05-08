import React from 'react';
import useDebugStore from '../../store/debugStore';

class GlobalErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Log to global store
        useDebugStore.getState().addLog({
            level: 'error',
            source: 'ReactErrorBoundary',
            message: error.toString(),
            details: errorInfo
        });
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100vh',
                    width: '100vw',
                    backgroundColor: 'var(--color-bg-primary, #ffffff)',
                    color: 'var(--color-text-primary, #111827)',
                    padding: '20px',
                    textAlign: 'center',
                    boxSizing: 'border-box'
                }}>
                    <div style={{
                        maxWidth: '400px',
                        background: 'var(--color-bg-secondary, #f3f4f6)',
                        padding: '30px',
                        borderRadius: '16px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                    }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>💥</div>
                        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
                            Oops! Qualcosa è andato storto.
                        </h1>
                        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary, #4b5563)', marginBottom: '24px' }}>
                            Abbiamo riscontrato un errore imprevisto. I nostri sviluppatori sono stati (quasi) avvisati.
                        </p>
                        <button 
                            onClick={this.handleRetry}
                            style={{
                                backgroundColor: 'var(--color-primary, #3b82f6)',
                                color: '#ffffff',
                                border: 'none',
                                padding: '12px 24px',
                                borderRadius: '8px',
                                fontSize: '16px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                width: '100%',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-dark, #2563eb)'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary, #3b82f6)'}
                        >
                            Riprova
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default GlobalErrorBoundary;
