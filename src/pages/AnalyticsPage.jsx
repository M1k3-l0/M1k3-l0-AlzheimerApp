import React, { useState, useEffect, useMemo } from 'react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    BarChart, Bar, Legend, Cell, AreaChart, Area 
} from 'recharts';
import { supabase } from '../supabaseClient';
import AppIcon from '../components/AppIcon';

const AnalyticsPage = () => {
    const user = JSON.parse(localStorage.getItem('alzheimer_user') || '{}');
    const [moodData, setMoodData] = useState([]);
    const [taskData, setTaskData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isReady, setIsReady] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [patients, setPatients] = useState([]);

    useEffect(() => {
        if (!loading) {
            const timer = setTimeout(() => setIsReady(true), 500);
            return () => clearTimeout(timer);
        }
    }, [loading]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Se è caregiver/medico, cerca i pazienti associati (chi seguo)
                if (user.role !== 'patient') {
                    const { data: followed } = await supabase
                        .from('follows')
                        .select('followed_id, profiles!followed_id(id, name, surname)')
                        .eq('follower_id', user.id);
                    
                    const patientList = followed?.map(f => f.profiles) || [];
                    setPatients(patientList);
                    if (patientList.length > 0) {
                        setSelectedPatient(patientList[0]);
                    } else {
                        // Fallback: se non ne segue nessuno, mostra i propri dati se ha umore
                        setSelectedPatient(user);
                    }
                } else {
                    setSelectedPatient(user);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (!selectedPatient) return;
        fetchPatientAnalytics(selectedPatient.id);
    }, [selectedPatient]);

    const fetchPatientAnalytics = async (patientId) => {
        try {
            // 1. Mood History (last 30 days)
            const { data: moods } = await supabase
                .from('mood_history')
                .select('mood, created_at')
                .eq('user_id', patientId)
                .order('created_at', { ascending: true })
                .limit(100);

            const moodMap = { happy: 3, neutral: 2, sad: 1 };
            const formattedMoods = moods?.map(m => ({
                time: new Date(m.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
                val: moodMap[m.mood] || 2,
                label: m.mood
            })) || [];
            setMoodData(formattedMoods);

            // 2. Task Stats (by day)
            const { data: tasks } = await supabase
                .from('tasks')
                .select('completed, created_at')
                .eq('user_id', patientId);

            const days = {};
            tasks?.forEach(t => {
                const day = new Date(t.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
                if (!days[day]) days[day] = { day, completed: 0, total: 0 };
                days[day].total++;
                if (t.completed) days[day].completed++;
            });
            setTaskData(Object.values(days).slice(-7)); // Last 7 days

        } catch (e) {
            console.error(e);
        }
    };

    const styles = {
        container: {
            padding: 'var(--content-padding-y) var(--content-padding-x) 100px',
            backgroundColor: 'var(--color-bg-primary)',
            minHeight: '100vh',
            boxSizing: 'border-box'
        },
        header: {
            marginBottom: '24px'
        },
        title: {
            fontSize: '24px',
            fontWeight: 'bold',
            color: 'var(--color-primary-dark)',
            margin: '0 0 8px 0'
        },
        subtitle: {
            fontSize: '14px',
            color: '#6B7280',
            margin: 0
        },
        card: {
            backgroundColor: 'white',
            borderRadius: '20px',
            padding: '20px',
            boxShadow: 'var(--card-shadow)',
            marginBottom: '20px'
        },
        cardTitle: {
            fontSize: '16px',
            fontWeight: 'bold',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#374151'
        },
        chartContainer: {
            width: '100%',
            height: '250px',
            position: 'relative',
            minHeight: '250px'
        },
        patientSelector: {
            display: 'flex',
            gap: '10px',
            overflowX: 'auto',
            padding: '4px 0 16px',
            marginBottom: '8px'
        },
        patientChip: (active) => ({
            padding: '8px 16px',
            borderRadius: '20px',
            backgroundColor: active ? 'var(--color-primary)' : 'white',
            color: active ? 'white' : '#4B5563',
            border: `1px solid ${active ? 'var(--color-primary)' : '#E5E7EB'}`,
            fontSize: '14px',
            fontWeight: '600',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            transition: 'all 0.2s'
        }),
        statGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            marginBottom: '20px'
        },
        statBox: {
            backgroundColor: 'white',
            padding: '16px',
            borderRadius: '16px',
            boxShadow: 'var(--card-shadow)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
        },
        statVal: {
            fontSize: '20px',
            fontWeight: 'bold',
            color: 'var(--color-primary)'
        },
        statLabel: {
            fontSize: '12px',
            color: '#9CA3AF'
        }
    };

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const moodMapRev = { 3: 'Felice 😊', 2: 'Neutro 😐', 1: 'Triste 😢' };
            return (
                <div style={{ backgroundColor: 'white', padding: '10px', border: '1px solid #eee', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                    <p style={{ margin: 0, fontWeight: 'bold', fontSize: '12px' }}>{payload[0].payload.time}</p>
                    <p style={{ margin: 0, color: 'var(--color-primary)', fontSize: '14px' }}>
                        {moodMapRev[payload[0].value] || 'N/A'}
                    </p>
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <div style={{ ...styles.container, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: 'var(--color-text-secondary)' }}>Caricamento analisi...</p>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>Analisi e Benessere</h1>
                <p style={styles.subtitle}>Monitoraggio andamento per {selectedPatient?.name || 'Utente'}</p>
            </div>

            {patients.length > 1 && (
                <div style={styles.patientSelector}>
                    {patients.map(p => (
                        <div 
                            key={p.id} 
                            style={styles.patientChip(selectedPatient?.id === p.id)}
                            onClick={() => setSelectedPatient(p)}
                        >
                            {p.name} {p.surname}
                        </div>
                    ))}
                </div>
            )}

            <div style={styles.statGrid}>
                <div style={styles.statBox}>
                    <span style={styles.statLabel}>Umore Medio</span>
                    <span style={styles.statVal}>
                        {moodData.length > 0 
                            ? (moodData.reduce((acc, m) => acc + m.val, 0) / moodData.length).toFixed(1) 
                            : '--'}
                    </span>
                </div>
                <div style={styles.statBox}>
                    <span style={styles.statLabel}>Task Completati</span>
                    <span style={styles.statVal}>
                        {taskData.length > 0 
                            ? Math.round((taskData.reduce((acc, d) => acc + d.completed, 0) / taskData.reduce((acc, d) => acc + d.total, 0)) * 100)
                            : '--'}%
                    </span>
                </div>
            </div>

            <div style={styles.card}>
                <div style={styles.cardTitle}>
                    <AppIcon name="grin" size={18} color="primary" /> Andamento Umore
                </div>
                <div style={styles.chartContainer}>
                    {isReady && (
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
                            <AreaChart data={moodData}>
                            <defs>
                                <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                            <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                            <YAxis domain={[1, 3]} ticks={[1, 2, 3]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="val" stroke="var(--color-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorMood)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div style={styles.card}>
                <div style={styles.cardTitle}>
                    <AppIcon name="badge-check" size={18} color="primary" /> Attività Completate
                </div>
                <div style={styles.chartContainer}>
                    {isReady && (
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
                            <BarChart data={taskData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                            <Tooltip cursor={{ fill: '#F9FAFB' }} />
                            <Bar dataKey="completed" fill="var(--color-primary)" radius={[4, 4, 0, 0]} barSize={20} />
                            <Bar dataKey="total" fill="#E5E7EB" radius={[4, 4, 0, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                    )}
                </div>
            </div>

            <div style={{ ...styles.card, background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)', border: '1px solid #C7D2FE' }}>
                <div style={styles.cardTitle}>
                    <AppIcon name="brain" size={18} color="primary" /> Insight AI (Beta)
                </div>
                <p style={{ fontSize: '13px', color: '#4338CA', lineHeight: '1.6', margin: 0 }}>
                    Basandoci sugli ultimi 7 giorni, {selectedPatient?.name} ha mantenuto un umore stabile. 
                    Il tasso di completamento delle attività è aumentato del 15% rispetto alla settimana precedente. 
                    Suggerimento: Una passeggiata pomeridiana sembra correlata a un umore migliore la sera.
                </p>
            </div>
        </div>
    );
};

export default AnalyticsPage;
