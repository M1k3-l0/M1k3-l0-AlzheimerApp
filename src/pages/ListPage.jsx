import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import AppIcon from '../components/AppIcon';
import { supabase } from '../supabaseClient';
import { wellnessQuotes, getDayOfYear } from '../data/quotes';
import { addMoodEntry, getMoodHistory, getLatestMood } from '../utils/moodHistory';
import ClinicalDashboard from '../components/ClinicalDashboard';
import MoodTracker from '../components/MoodTracker';

const initialTasks = [
    { id: 1, text: 'Prendere medicine mattina', time: '08:00', completed: false },
    { id: 2, text: 'Riposo', time: '12:00', completed: false },
    { id: 3, text: 'Passeggiata', time: '15:30', completed: false },
    { id: 4, text: 'Bere un bicchiere d\'acqua', time: '10:00', completed: false },
    { id: 5, text: 'Chiudere la porta a chiave', time: '21:00', completed: false },
];

const QUOTE_ICON_COLOR = 'var(--color-primary)';

/** Converte "HH:MM" o "H:MM" in minuti dall'inizio del giorno per ordinare per orario */
function timeToMinutes(timeStr) {
  if (!timeStr || timeStr === '--:--') return Infinity;
  const parts = String(timeStr).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!parts) return Infinity;
  return parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10);
}

const ListPage = () => {
    const user = JSON.parse(localStorage.getItem('alzheimer_user') || '{}');
    const isPatient = user.role === 'patient';
    const isHealthcare = user.role === 'healthcare';
    const reduceMotion = useReducedMotion();
    
    const [tasks, setTasks] = useState([]);
    const [loadingTasks, setLoadingTasks] = useState(true);
    const [newTaskText, setNewTaskText] = useState("");
    const [newTaskTime, setNewTaskTime] = useState("");
    const [showManage, setShowManage] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [currentMood, setCurrentMood] = useState(null);
    const [loadingMood, setLoadingMood] = useState(true);
    const [moodToast, setMoodToast] = useState(null);

    // Frase del giorno: indice = giorno dell'anno (1-365)
    const dailyQuoteData = useMemo(() => {
        const dayOfYear = getDayOfYear();
        const index = Math.min(dayOfYear - 1, wellnessQuotes.length - 1);
        return wellnessQuotes[index];
    }, []);

    // Fetch Tasks from Supabase
    useEffect(() => {
        if (!user.id) return;
        fetchTasks();

        const channel = supabase
            .channel('realtime-tasks')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'tasks',
                filter: `user_id=eq.${user.id}`
            }, () => fetchTasks())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user.id]);

    const fetchTasks = async () => {
        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
        
        if (!error && data) {
            // Se non ci sono task, inizializza con quelli predefiniti la prima volta
            if (data.length === 0) {
                const defaults = initialTasks.map(t => {
                    const newTask = { ...t, user_id: user.id };
                    delete newTask.id;
                    return newTask;
                });
                const { data: inserted } = await supabase.from('tasks').insert(defaults).select();
                if (inserted) setTasks(inserted);
            } else {
                setTasks(data);
            }
        }
        setLoadingTasks(false);
    };

    // Fetch Mood from Supabase
    useEffect(() => {
        const fetchMood = async () => {
            try {
                // Fetch the patient's profile to get the mood. 
                // If current user is patient, we use their ID. 
                // If not, we search for the first patient (demo-logic) or we'd need a multi-user association.
                const profileId = isPatient ? (user.id || (user.name + (user.surname || ''))) : null;
                
                let query = supabase.from('profiles').select('current_mood');
                if (profileId) {
                    query = query.eq('id', profileId);
                } else {
                    // If caregiver, find any patient's mood (simplified for this app structure)
                    query = query.eq('role', 'patient').limit(1);
                }

                const { data, error } = await query.maybeSingle();
                if (error) {
                    console.error("Errore fetch umore:", error);
                } else if (data) {
                    setCurrentMood(data.current_mood);
                }
            } catch (e) {
                console.error("error fetching mood", e);
            } finally {
                setLoadingMood(false);
            }
        };
        fetchMood();
    }, [isPatient, user.id, user.name, user.surname]);

    const handleMoodSelect = async (mood) => {
        setCurrentMood(mood);
        // Salva locale per velocità
        addMoodEntry(mood);
        
        const ora = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        setMoodToast(`Umore delle ${ora} registrato con successo!`);
        try {
            const profileId = user.id;
            if (profileId) {
                // Aggiorna profilo
                await supabase.from('profiles').update({ 
                    current_mood: mood 
                }).eq('id', profileId);

                // Inserisce nello storico
                await supabase.from('mood_history').insert([{
                    user_id: profileId,
                    mood: mood
                }]);

                // REGISTRO ATTIVITÀ
                await supabase.from('activity_log').insert([{
                    user_id: profileId,
                    action: 'mood_updated',
                    details: `Umore: ${mood}`
                }]);
            }
        } catch (e) {
            console.error("Error saving mood", e);
        }
    };

    useEffect(() => {
        if (!moodToast) return;
        const t = setTimeout(() => setMoodToast(null), 3000);
        return () => clearTimeout(t);
    }, [moodToast]);

    useEffect(() => {
        const onMoodSaved = () => setCurrentMood(getLatestMood());
        window.addEventListener('patientMoodSaved', onMoodSaved);
        return () => window.removeEventListener('patientMoodSaved', onMoodSaved);
    }, []);

    useEffect(() => {
        const check = () => {
            let hasPerm = false;
            if (window.OneSignal && window.OneSignal.Notifications) {
                hasPerm = window.OneSignal.Notifications.permission === true;
            } else if (window.Notification) {
                hasPerm = window.Notification.permission === 'granted';
            }
            setNotificationsEnabled(hasPerm);
        };
        check();
    }, []);

    const toggleTask = async (id) => {
        const task = tasks.find(t => t.id === id);
        if (!task) return;
        
        const newStatus = !task.completed;
        setTasks(tasks.map(t => t.id === id ? { ...t, completed: newStatus } : t));
        
        const { error } = await supabase.from('tasks').update({ completed: newStatus }).eq('id', id);
        
        if (!error) {
            // REGISTRO ATTIVITÀ
            await supabase.from('activity_log').insert([{
                user_id: user.id,
                action: newStatus ? 'task_completed' : 'task_uncompleted',
                details: task.text
            }]);
        }
    };

    const addTask = async () => {
        if (!newTaskText.trim()) return;
        const time = newTaskTime || new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        
        const { data, error } = await supabase.from('tasks').insert([{
            user_id: user.id,
            text: newTaskText,
            time: time,
            completed: false
        }]).select();

        if (!error && data) {
            setTasks([data[0], ...tasks]);
            setNewTaskText("");
            setNewTaskTime("");
            setShowManage(false);

            // REGISTRO ATTIVITÀ
            await supabase.from('activity_log').insert([{
                user_id: user.id,
                action: 'task_added',
                details: newTaskText
            }]);
        }
    };

    const deleteTask = async (id) => {
        if (window.confirm("Vuoi cancellare questa attività?")) {
            setTasks(tasks.filter(t => t.id !== id));
            await supabase.from('tasks').delete().eq('id', id);
        }
    };

    const styles = {
        container: {
            padding: 'var(--content-padding-y) var(--content-padding-x)',
            width: '100%',
            maxWidth: '100%',
            minWidth: 0,
            boxSizing: 'border-box',
            overflowX: 'hidden',
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 'var(--section-gap)',
        },
        greeting: {
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#1A1A1A',
        },
        agendaCard: {
            background: 'var(--color-primary)',
            borderRadius: 'var(--card-radius-lg)',
            padding: 'var(--content-padding-y) 20px',
            color: 'white',
            marginBottom: 'var(--section-gap)',
            boxShadow: 'var(--card-shadow-outer)',
        },
        agendaDateRow: {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '15px',
            fontWeight: '600',
            opacity: 0.95,
            marginBottom: '16px',
            paddingBottom: '12px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.25)',
        },
        cardTitle: {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '20px',
            fontWeight: 'bold',
            marginBottom: '20px',
        },
        taskItem: {
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            borderRadius: 'var(--card-radius)',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            cursor: 'pointer',
        },
        taskLeft: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minWidth: 0,
            flex: 1,
        },
        taskIcon: {
            backgroundColor: 'rgba(255, 255, 255, 0.25)',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        },
        taskText: {
            fontWeight: '600',
            fontSize: '16px',
            wordBreak: 'break-word',
            minWidth: 0,
            color: 'white',
        },
        completedText: {
            textDecoration: 'line-through',
            opacity: 0.7,
        },
        taskTime: {
            fontSize: '14px',
            opacity: 0.95,
            fontWeight: '600',
            color: 'var(--color-primary-dark)',
        },
        manageBtn: {
            backgroundColor: 'white',
            color: 'var(--color-primary-dark)',
            padding: '12px 20px',
            borderRadius: '12px',
            fontWeight: 'bold',
            fontSize: '15px',
            marginTop: '10px',
            width: 'fit-content',
            cursor: 'pointer',
            boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
        },
        secondaryCards: {
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr)',
            gap: 'var(--section-gap)',
            marginBottom: 'var(--section-gap)',
        },
        whiteCard: {
            backgroundColor: 'white',
            borderRadius: 'var(--card-radius-lg)',
            padding: 'var(--content-padding-y)',
            boxShadow: 'var(--card-shadow)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
        },
        quoteCard: {
            backgroundColor: 'rgba(234, 172, 139, 0.25)',
            borderRadius: 'var(--card-radius-lg)',
            padding: 'var(--content-padding-y)',
            border: '1px solid rgba(234, 172, 139, 0.5)',
            boxShadow: 'var(--card-shadow-outer)',
            position: 'relative',
            overflow: 'hidden',
            minWidth: 0,
            maxWidth: '100%',
        },
        quoteRow: {
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            position: 'relative',
            zIndex: 1,
            minWidth: 0,
        },
        quoteIconWrap: {
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            marginTop: '2px',
        },
        quoteText: {
            color: 'var(--color-primary)',
            fontSize: '16px',
            fontStyle: 'italic',
            lineHeight: '1.6',
            margin: 0,
            flex: 1,
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
        },
        quoteLabel: {
            color: 'var(--color-primary)',
            fontWeight: 'bold',
            fontSize: '14px',
            marginBottom: '8px',
            display: 'block',
        },
        inputArea: {
            backgroundColor: 'white',
            padding: 'var(--content-padding-y)',
            borderRadius: 'var(--card-radius)',
            boxShadow: 'var(--card-shadow-outer)',
            marginTop: 'var(--section-gap)',
            marginBottom: 'var(--section-gap)',
            maxWidth: '100%',
            boxSizing: 'border-box',
        },
        input: {
            width: '100%',
            maxWidth: '100%',
            padding: '12px',
            borderRadius: '10px',
            border: '1px solid #E5E7EB',
            marginBottom: '10px',
            fontSize: '16px',
            boxSizing: 'border-box',
        }
    };

    return (
        <div style={styles.container}>
            {/* Header: solo saluto (impostazioni solo nell'header globale) */}
            <div style={styles.header}>
                <div style={styles.greeting}>Ciao, {user.name || 'lol'}!</div>
            </div>

            {/* Notification Alert: mobile in alto; desktop ridimensionata sotto Stato paziente (via CSS) */}
            {!notificationsEnabled && (
                <div className="home-notification-mobile" style={{ margin: '0 0 20px 0', padding: '16px', backgroundColor: '#FFF4E5', border: '1px solid #FFE58F', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <AppIcon name="bell-slash" size={24} color="accent" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 'bold', color: '#856404', fontSize: '15px' }}>Avvisi Disattivati</div>
                    </div>
                </div>
            )}

            {/* Operatore sanitario: solo ClinicalDashboard (niente Pillola, niente Agenda) */}
            {isHealthcare && (
                <div className="last-scroll-block">
                    <ClinicalDashboard />
                </div>
            )}

            {/* Paziente / Caregiver: unico blocco; desktop: sx Agenda, dx Stato+Pillola (stessa altezza) */}
            {!isHealthcare && (
            <div className="home-content-block">
            {/* Colonna sx desktop / primo mobile: Agenda di Oggi */}
            <div className="home-block-item home-agenda">
            <div style={styles.agendaCard}>
                <div style={styles.agendaDateRow}>
                    <AppIcon name="calendar-lines" size={20} color="primaryDark" />
                    <span>{new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                </div>
                <div style={styles.cardTitle}>
                    <AppIcon name="badge-check" size={24} color="primary" />
                    <span>Agenda di Oggi</span>
                </div>

                <AnimatePresence mode="popLayout">
                {[...tasks]
                  .filter(t => !t.completed || showManage)
                  .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time))
                  .map((task, i) => (
                    <motion.div 
                        key={task.id} 
                        layout={!reduceMotion}
                        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reduceMotion ? false : { opacity: 0, scale: 0.95 }}
                        transition={{ duration: reduceMotion ? 0 : 0.2, delay: reduceMotion ? 0 : i * 0.03 }}
                        className="agenda-item-row"
                        style={styles.taskItem}
                        onClick={() => toggleTask(task.id)}
                    >
                        <div className="agenda-item-left" style={styles.taskLeft}>
                            <div className="plus-icon-container" style={styles.taskIcon}>
                                {task.completed ? <AppIcon name="badge-check" size={18} color="primary" /> : <AppIcon name="add" size={18} color="primary" />}
                            </div>
                            <span style={{
                                ...styles.taskText,
                                ...(task.completed ? styles.completedText : {})
                            }}>
                                {task.text}
                            </span>
                        </div>
                        <div style={styles.taskTime}>{task.time || '--:--'}</div>
                        {showManage && (
                            <Trash2 
                                size={18} 
                                color="#fff" 
                                style={{ marginLeft: '10px' }} 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    deleteTask(task.id);
                                }} 
                            />
                        )}
                    </motion.div>
                ))}
                </AnimatePresence>

                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
                    <div 
                        style={styles.manageBtn} 
                        onClick={() => setShowManage(!showManage)}
                    >
                        {showManage ? "Salva Modifiche" : "Gestisci Attività"}
                    </div>
                </div>
            </div>

            {/* Add Task Area */}
            <AnimatePresence>
            {showManage && (
                <motion.div
                    initial={reduceMotion ? false : { opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? false : { opacity: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.2 }}
                    style={styles.inputArea}
                >
                    <h4 style={{ margin: '0 0 10px 0' }}>Nuova Attività</h4>
                    <input
                        style={styles.input}
                        value={newTaskText}
                        onChange={(e) => setNewTaskText(e.target.value)}
                        placeholder="Cosa devi fare?"
                    />
                    <input
                        type="time"
                        style={styles.input}
                        value={newTaskTime}
                        onChange={(e) => setNewTaskTime(e.target.value)}
                    />
                    <button 
                        style={{ ...styles.manageBtn, backgroundColor: 'var(--color-primary)', color: 'white', width: '100%', marginTop: '10px' }}
                        onClick={addTask}
                    >
                        Aggiungi
                    </button>
                </motion.div>
            )}
            </AnimatePresence>
            </div>

            {/* Colonna dx desktop: Stato + Pillola in un blocco che ha la stessa altezza dell'Agenda */}
            <div className="home-right-column">
                <div className="home-block-item home-stato-paziente">
                    <motion.div
                        style={{
                            backgroundColor: 'transparent',
                            borderRadius: 'var(--card-radius-lg)',
                            padding: 0,
                            width: '100%',
                            pointerEvents: 'auto',
                            position: 'relative',
                            zIndex: 10,
                        }}
                        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: reduceMotion ? 0 : 0.3, delay: reduceMotion ? 0 : 0.1 }}
                    >
                        <MoodTracker
                            userRole={user.role}
                            mood={currentMood}
                            setMood={handleMoodSelect}
                            moodToast={moodToast}
                            reduceMotion={!!reduceMotion}
                        />
                    </motion.div>
                </div>
                {!notificationsEnabled && (
                    <div className="home-notification-desktop">
                        <AppIcon name="bell-slash" size={18} color="accent" />
                        <span>Avvisi Disattivati</span>
                    </div>
                )}
                <div className="home-block-item home-pillola last-scroll-block">
                    <motion.div 
                        className="quote-card-responsive"
                        style={styles.quoteCard}
                        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: reduceMotion ? 0 : 0.3, delay: reduceMotion ? 0 : 0.15 }}
                    >
                        <span style={styles.quoteLabel}>Pillola di Benessere</span>
                        <div style={styles.quoteRow}>
                            {dailyQuoteData && (
                                <span style={styles.quoteIconWrap} aria-hidden>
                                    <AppIcon name="shoe-prints" size={24} color={QUOTE_ICON_COLOR} />
                                </span>
                            )}
                            <p className="quote-text-responsive" style={styles.quoteText}>
                                "{dailyQuoteData?.text ?? ''}"
                            </p>
                        </div>
                    </motion.div>
                </div>
            </div>
            </div>
            )}
        </div>
    );
};

export default ListPage;
