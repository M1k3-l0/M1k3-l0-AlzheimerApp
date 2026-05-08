import React, { useState, useEffect } from 'react';
import useDebugStore from '../../store/debugStore';

const DebugConsole = () => {
    const [isVisible, setIsVisible] = useState(false);
    const logs = useDebugStore((state) => state.logs);
    const clearLogs = useDebugStore((state) => state.clearLogs);
    const getLogsAsText = useDebugStore((state) => state.getLogsAsText);

    const [filter, setFilter] = useState('all'); // all, info, warn, error
    const [expandedLogId, setExpandedLogId] = useState(null);

    // Secret combo listener (Ctrl + Shift + D)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
                e.preventDefault();
                setIsVisible(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    if (!isVisible) return null;

    const filteredLogs = logs.filter(log => {
        if (filter === 'all') return true;
        return log.level === filter;
    });

    const getLevelColor = (level) => {
        switch(level) {
            case 'error': return '#ef4444'; // red
            case 'warn': return '#f59e0b'; // amber
            case 'success': return '#10b981'; // green
            case 'info':
            default: return '#3b82f6'; // blue
        }
    };

    const handleSendReport = () => {
        const text = getLogsAsText();
        if (!text) {
            alert('Nessun log da esportare.');
            return;
        }
        const encodedText = encodeURIComponent(`Bug Report da CareLink App:\n\n${text}`);
        const action = prompt('Digita "email" per inviare via Mail, "wa" per WhatsApp, o "copia" per copiare negli appunti.', 'copia');
        
        if (action === 'email') {
            window.location.href = `mailto:?subject=Bug Report App&body=${encodedText}`;
        } else if (action === 'wa') {
            window.open(`https://wa.me/?text=${encodedText}`, '_blank');
        } else if (action === 'copia') {
            navigator.clipboard.writeText(`Bug Report da CareLink App:\n\n${text}`)
                .then(() => alert('Log copiati negli appunti!'))
                .catch(() => alert('Errore durante la copia.'));
        }
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '90%',
            maxWidth: '500px',
            height: '60vh',
            maxHeight: '600px',
            backgroundColor: '#1f2937',
            color: '#f3f4f6',
            borderRadius: '12px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            fontFamily: 'monospace'
        }}>
            {/* Header */}
            <div style={{ padding: '12px 16px', backgroundColor: '#111827', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #374151' }}>
                <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🪲 Debug Console
                </div>
                <button 
                    onClick={() => setIsVisible(false)}
                    style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '18px' }}
                >
                    ×
                </button>
            </div>

            {/* Controls */}
            <div style={{ padding: '8px 16px', display: 'flex', gap: '8px', borderBottom: '1px solid #374151', flexWrap: 'wrap' }}>
                <select 
                    value={filter} 
                    onChange={(e) => setFilter(e.target.value)}
                    style={{ backgroundColor: '#374151', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px' }}
                >
                    <option value="all">Tutti ({logs.length})</option>
                    <option value="error">Errori ({logs.filter(l => l.level === 'error').length})</option>
                    <option value="warn">Avvisi ({logs.filter(l => l.level === 'warn').length})</option>
                    <option value="info">Info ({logs.filter(l => l.level === 'info').length})</option>
                </select>

                <button 
                    onClick={clearLogs}
                    style={{ backgroundColor: '#374151', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}
                >
                    Pulisci
                </button>
                <div style={{ flex: 1 }} />
                <button 
                    onClick={handleSendReport}
                    style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 12px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    Invia Report
                </button>
            </div>

            {/* Log List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                {filteredLogs.length === 0 ? (
                    <div style={{ textAlign: 'center', marginTop: '20px', color: '#9ca3af' }}>Nessun log trovato.</div>
                ) : (
                    filteredLogs.map(log => (
                        <div key={log.id} style={{ marginBottom: '8px', backgroundColor: '#374151', borderRadius: '6px', overflow: 'hidden' }}>
                            <div 
                                onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                                style={{ padding: '8px', display: 'flex', cursor: 'pointer', alignItems: 'flex-start', borderLeft: `4px solid ${getLevelColor(log.level)}` }}
                            >
                                <div style={{ minWidth: '60px', fontSize: '10px', color: '#9ca3af', paddingTop: '2px' }}>
                                    {new Date(log.timestamp).toLocaleTimeString()}
                                </div>
                                <div style={{ flex: 1, wordBreak: 'break-word', fontSize: '12px' }}>
                                    <span style={{ color: '#9ca3af', marginRight: '8px' }}>[{log.source}]</span>
                                    {log.message}
                                </div>
                            </div>
                            
                            {/* Expanded Details */}
                            {expandedLogId === log.id && log.details && (
                                <div style={{ padding: '8px', backgroundColor: '#111827', fontSize: '11px', borderTop: '1px solid #4b5563', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                    {JSON.stringify(log.details, null, 2)}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default DebugConsole;
