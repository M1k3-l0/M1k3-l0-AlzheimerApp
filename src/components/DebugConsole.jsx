import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const DebugConsole = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState({
        userId: 'Non loggato',
        lastSignal: 'Nessuno',
        authState: 'In controllo...',
        onlineProfiles: 0
    });

    useEffect(() => {
        const interval = setInterval(() => {
            const user = JSON.parse(localStorage.getItem('alzheimer_user') || '{}');
            const lastActive = localStorage.getItem('last_active_signal');
            
            setStats(prev => ({
                ...prev,
                userId: user.id || 'Nessuno',
                lastSignal: lastActive ? new Date(parseInt(lastActive)).toLocaleTimeString() : 'Mai'
            }));
        }, 2000);

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setStats(prev => ({ ...prev, authState: event }));
        });

        return () => {
            clearInterval(interval);
            subscription.unsubscribe();
        };
    }, []);

    const toggle = () => setIsOpen(!isOpen);

    if (!isOpen) {
        return (
            <div 
                onClick={toggle}
                style={{
                    position: 'fixed',
                    bottom: '80px',
                    right: '20px',
                    width: '40px',
                    height: '40px',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '20px',
                    cursor: 'pointer',
                    zIndex: 9999,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
                }}
            >
                🪲
            </div>
        );
    }

    return (
        <div style={{
            position: 'fixed',
            bottom: '80px',
            right: '20px',
            width: '280px',
            maxHeight: '400px',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            zIndex: 9999,
            padding: '15px',
            fontFamily: 'monospace',
            fontSize: '12px',
            overflowY: 'auto',
            border: '2px solid var(--color-primary)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <strong style={{ color: 'var(--color-primary)' }}>MEMORA DEBUG</strong>
                <button onClick={toggle} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>❌</button>
            </div>
            
            <div style={{ marginBottom: '10px', padding: '8px', backgroundColor: '#f3f4f6', borderRadius: '6px' }}>
                <div><strong>User ID:</strong> {stats.userId.substring(0, 15)}...</div>
                <div><strong>Auth:</strong> {stats.authState}</div>
                <div><strong>Signal:</strong> {stats.lastSignal}</div>
            </div>

            <div style={{ fontSize: '10px' }}>
                <strong>Azioni Rapide:</strong>
                <button 
                    onClick={() => { localStorage.clear(); window.location.reload(); }}
                    style={{ display: 'block', width: '100%', marginTop: '5px', padding: '5px', backgroundColor: '#fee2e2', border: '1px solid #ef4444', borderRadius: '4px', cursor: 'pointer' }}
                >
                    Resetta Tutto (Cache)
                </button>
            </div>
        </div>
    );
};

export default DebugConsole;
