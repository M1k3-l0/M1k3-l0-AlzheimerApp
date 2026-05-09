import React, { useState, useEffect } from 'react';
import useDebugStore from '../../store/debugStore';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Bug, Activity, Terminal, Shield, RefreshCw, Users, Trash2 } from 'lucide-react';

const DebugConsole = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const logs = useDebugStore((state) => state.logs);
    const clearLogs = useDebugStore((state) => state.clearLogs);
    const getLogsAsText = useDebugStore((state) => state.getLogsAsText);

    const [activeTab, setActiveTab] = useState('logs'); // logs, stats, system
    const [dbStats, setDbStats] = useState({ users: 0, posts: 0, messages: 0 });
    const [loadingStats, setLoadingStats] = useState(false);
    const [filter, setFilter] = useState('all'); // all, info, warn, error
    const [expandedLogId, setExpandedLogId] = useState(null);

    // Check role on mount and storage change
    useEffect(() => {
        const checkRole = () => {
            const userRaw = localStorage.getItem('alzheimer_user');
            if (userRaw) {
                try {
                    const user = JSON.parse(userRaw);
                    setIsSuperAdmin(user.role === 'super_admin');
                } catch (err) {}
            } else {
                setIsSuperAdmin(false);
            }
        };
        checkRole();
        
        // Ascoltiamo eventi custom per aggiornamenti istantanei in-app
        window.addEventListener('storage', checkRole);
        window.addEventListener('user_updated', checkRole);
        return () => {
            window.removeEventListener('storage', checkRole);
            window.removeEventListener('user_updated', checkRole);
        };
    }, []);

    const fetchStats = async () => {
        setLoadingStats(true);
        try {
            const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
            const { count: postCount } = await supabase.from('posts').select('*', { count: 'exact', head: true });
            const { count: msgCount } = await supabase.from('messages').select('*', { count: 'exact', head: true });
            
            setDbStats({
                users: userCount || 0,
                posts: postCount || 0,
                messages: msgCount || 0
            });
        } catch (e) {
            console.error("Error fetching admin stats:", e);
        } finally {
            setLoadingStats(false);
        }
    };

    useEffect(() => {
        if (isVisible && activeTab === 'stats') {
            fetchStats();
        }
    }, [isVisible, activeTab]);

    // Secret combo listener (Ctrl + Shift + D) come alternativa Desktop
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
                e.preventDefault();
                
                // Leggiamo sempre localStorage in tempo reale per evitare stale state
                let currentIsAdmin = false;
                try {
                    const user = JSON.parse(localStorage.getItem('alzheimer_user') || '{}');
                    currentIsAdmin = user.role === 'super_admin';
                } catch(err){}

                if (!currentIsAdmin) {
                    console.warn("Debug Console: Accesso negato.");
                    return;
                }
                
                setIsVisible(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSuperAdmin]);

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

        // Destinatario predefinito
        const adminEmail = "admindany@gmail.com";
        const subject = "CareLink Bug Report";
        
        const action = prompt('Invia report:\n- Digita "email" per Mail\n- "wa" per WhatsApp\n- "copia" per Appunti', 'copia');
        
        if (action === 'email') {
            // Limitiamo la lunghezza del body per evitare che il mailto fallisca su alcuni browser/dispositivi
            const shortText = text.length > 1500 ? text.substring(0, 1500) + "\n\n... (Testo troncato, usa 'Copia' per il log completo)" : text;
            const encodedBody = encodeURIComponent(`Bug Report da CareLink App:\n\n${shortText}`);
            window.location.href = `mailto:${adminEmail}?subject=${encodeURIComponent(subject)}&body=${encodedBody}`;
        } else if (action === 'wa') {
            const shortText = text.length > 800 ? text.substring(0, 800) + "..." : text;
            const encodedText = encodeURIComponent(`Bug Report da CareLink App:\n\n${shortText}`);
            window.open(`https://wa.me/?text=${encodedText}`, '_blank');
        } else if (action === 'copia') {
            navigator.clipboard.writeText(`Bug Report da CareLink App:\n\n${text}`)
                .then(() => alert('Log completi copiati negli appunti!'))
                .catch(() => alert('Errore durante la copia.'));
        }
    };

    // Se l'utente non è super admin, non mostriamo assolutamente nulla
    if (!isSuperAdmin) return null;

    return (
        <>
            {/* Pulsante flottante invisibile/semi-trasparente per Mobile & Desktop */}
            {!isVisible && (
                <button
                    onClick={() => setIsVisible(true)}
                    style={{
                        position: 'fixed',
                        bottom: '90px',
                        left: '10px',
                        width: '46px',
                        height: '46px',
                        borderRadius: '12px',
                        backgroundColor: 'rgba(31, 41, 55, 0.8)',
                        color: '#10b981',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        zIndex: 99998,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(8px)',
                        boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
                        transition: 'all 0.2s ease',
                    }}
                    title="Console Super Admin"
                >
                    <Bug size={24} />
                </button>
            )}

            {/* Debug Console UI */}
            {isVisible && (
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
                <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981' }}>
                    <Shield size={16} /> Admin Control Panel
                </div>
                <button 
                    onClick={() => setIsVisible(false)}
                    style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '18px' }}
                >
                    ×
                </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', backgroundColor: '#111827', borderBottom: '1px solid #374151' }}>
                <button 
                    onClick={() => setActiveTab('logs')}
                    style={{ 
                        flex: 1, padding: '10px', border: 'none', background: activeTab === 'logs' ? '#1f2937' : 'none', 
                        color: activeTab === 'logs' ? '#10b981' : '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', fontWeight: 'bold'
                    }}
                >
                    <Terminal size={14} /> Logs
                </button>
                <button 
                    onClick={() => setActiveTab('stats')}
                    style={{ 
                        flex: 1, padding: '10px', border: 'none', background: activeTab === 'stats' ? '#1f2937' : 'none', 
                        color: activeTab === 'stats' ? '#10b981' : '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', fontWeight: 'bold'
                    }}
                >
                    <Activity size={14} /> Database
                </button>
                <button 
                    onClick={() => setActiveTab('system')}
                    style={{ 
                        flex: 1, padding: '10px', border: 'none', background: activeTab === 'system' ? '#1f2937' : 'none', 
                        color: activeTab === 'system' ? '#10b981' : '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', fontWeight: 'bold'
                    }}
                >
                    <Shield size={14} /> Sistema
                </button>
            </div>

            {activeTab === 'logs' && (
                <>
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
                            style={{ backgroundColor: '#374151', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                            <Trash2 size={14} /> Pulisci
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
                </>
            )}

            {activeTab === 'stats' && (
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, color: '#10b981' }}>Panoramica DB</h3>
                        <button onClick={fetchStats} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer' }}>
                            <RefreshCw size={16} className={loadingStats ? 'animate-spin' : ''} />
                        </button>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div style={{ backgroundColor: '#374151', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{dbStats.users}</div>
                            <div style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase' }}>Utenti</div>
                        </div>
                        <div style={{ backgroundColor: '#374151', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{dbStats.posts}</div>
                            <div style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase' }}>Post</div>
                        </div>
                        <div style={{ backgroundColor: '#374151', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{dbStats.messages}</div>
                            <div style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase' }}>Messaggi</div>
                        </div>
                    </div>

                    <div style={{ marginTop: '20px' }}>
                        <button 
                            onClick={() => { setIsVisible(false); window.location.hash = '#/users'; }}
                            style={{ width: '100%', padding: '12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        >
                            <Users size={18} /> Gestione Utenti
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'system' && (
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                    <h3 style={{ margin: '0 0 15px 0', color: '#10b981' }}>Informazioni Sistema</h3>
                    
                    <div style={{ backgroundColor: '#374151', padding: '10px', borderRadius: '8px', fontSize: '11px', marginBottom: '20px' }}>
                        <div style={{ marginBottom: '5px' }}><span style={{ color: '#9ca3af' }}>User Agent:</span> {navigator.userAgent.substring(0, 50)}...</div>
                        <div style={{ marginBottom: '5px' }}><span style={{ color: '#9ca3af' }}>Versione App:</span> 2.4.0-prod</div>
                        <div style={{ marginBottom: '5px' }}><span style={{ color: '#9ca3af' }}>Storage:</span> {Math.round(JSON.stringify(localStorage).length / 1024)} KB</div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <button 
                            onClick={() => {
                                if (window.confirm("Sei sicuro di voler resettare tutta la cache locale? Verrai disconnesso.")) {
                                    localStorage.clear();
                                    window.location.reload();
                                }
                            }}
                            style={{ width: '100%', padding: '12px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        >
                            <Trash2 size={18} /> Hard Reset App
                        </button>
                        
                        <p style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center', marginTop: '10px' }}>
                            Solo il Super Admin ha accesso a queste funzioni. Usare con cautela.
                        </p>
                    </div>
                </div>
            )}
        </div>
            )}
        </>
    );
};

export default DebugConsole;
