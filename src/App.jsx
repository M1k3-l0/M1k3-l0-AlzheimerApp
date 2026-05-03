import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';
import ListPage from './pages/ListPage';
import ChatPage from './pages/ChatPage';
import FeedPage from './pages/FeedPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import ReportUmorePage from './pages/ReportUmorePage';
import UsersPage from './pages/UsersPage';
import MessagesListPage from './pages/MessagesListPage';
import PrivateChatPage from './pages/PrivateChatPage';
import FindPeoplePage from './pages/FindPeoplePage';

function App() {
    const [isAuthenticated, setIsAuthenticated] = React.useState(!!localStorage.getItem('alzheimer_user'));
    const [loading, setLoading] = React.useState(true);
    const location = useLocation();

    // Listener ufficiale per l'autenticazione
    React.useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log("Evento Auth:", event);
            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                setIsAuthenticated(true);
            } else if (event === 'SIGNED_OUT') {
                setIsAuthenticated(false);
            }
        });
        return () => subscription.unsubscribe();
    }, []);

    // Segnale di attività ONLINE
    React.useEffect(() => {
        let interval;
        if (isAuthenticated) {
            const updateActivity = async () => {
                const { data: { session } } = await supabase.auth.getSession();
                const userId = session?.user?.id;
                
                if (userId) {
                    const { data, error } = await supabase.from('profiles').update({ 
                        last_active: new Date().toISOString() 
                    }).eq('id', userId).select();
                    
                    if (error) {
                        console.error("❌ Errore Database Segnale:", error);
                    } else {
                        console.log("🟢 Risultato Segnale:", data);
                    }
                }
            };
            updateActivity();
            interval = setInterval(updateActivity, 30000);
        }
        return () => clearInterval(interval);
    }, [isAuthenticated]);

    // Sincronizzazione profilo e controllo BAN
    React.useEffect(() => {
        const syncProfile = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const userId = session?.user?.id;

                if (!userId) {
                    setLoading(false);
                    return;
                }

                // Recupera dati freschi usando l'ID ufficiale della sessione
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single();

                if (error || !profile) {
                    console.log("Profilo non trovato nel DB, provo a crearlo con ID sessione:", userId);
                    const { data: { user } } = await supabase.auth.getUser();
                    
                    const newProfile = {
                        id: userId,
                        name: user?.user_metadata?.name || 'Utente',
                        surname: user?.user_metadata?.surname || '',
                        role: user?.user_metadata?.role || 'caregiver',
                        email: user?.email || userId,
                        photo_url: user?.user_metadata?.photo_url || null
                    };

                    const { data: created, error: createError } = await supabase
                        .from('profiles')
                        .upsert([newProfile])
                        .select()
                        .single();
                    
                    if (createError) {
                        console.error("Errore creazione forzata profilo:", createError);
                    } else {
                        console.log("Profilo creato/aggiornato con successo via Session!");
                    }
                    setLoading(false);
                    return;
                }

                    // 2. Aggiornamento dati se cambiati (es. ruolo)
                    const updatedUser = {
                        ...localUser,
                        name: profile.name,
                        surname: profile.surname,
                        role: profile.role,
                        photo: profile.photo_url
                    };

                    if (JSON.stringify(localUser) !== JSON.stringify(updatedUser)) {
                        console.log("Profilo aggiornato dall'admin, sincronizzo...");
                        localStorage.setItem('alzheimer_user', JSON.stringify(updatedUser));
                        // Non forziamo il refresh dello stato per evitare loop, 
                        // ma i componenti leggeranno i nuovi dati al prossimo render
                    }
                } catch (e) {
                console.error("Errore critico durante il sync:", e);
            } finally {
                setLoading(false);
            }
        };

        syncProfile();
    }, [isAuthenticated, location.pathname]); // Controlla a ogni cambio pagina o login

    // Ascolta cambiamenti al localStorage (es. login/logout)
    React.useEffect(() => {
        const checkAuth = () => {
            setIsAuthenticated(!!localStorage.getItem('alzheimer_user'));
        };
        window.addEventListener('storage', checkAuth);
        return () => window.removeEventListener('storage', checkAuth);
    }, []);

    if (loading && isAuthenticated) {
        return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-bg-primary)' }}>Caricamento sessione...</div>;
    }

    return (
        <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />

                <Route path="/" element={isAuthenticated ? <Layout /> : <Navigate to="/login" replace />}>
                    <Route index element={<ListPage />} />
                    <Route path="chat" element={<ChatPage />} />
                    <Route path="feed" element={<FeedPage />} />
                    <Route path="profilo" element={<ProfilePage />} />
                    <Route path="profilo/:id" element={<ProfilePage />} />
                    <Route path="messaggi" element={<MessagesListPage />} />
                    <Route path="chat-privata/:receiverId" element={<PrivateChatPage />} />
                    <Route path="cerca-persone" element={<FindPeoplePage />} />
                    <Route path="impostazioni" element={<SettingsPage />} />
                    <Route path="report-umore" element={<ReportUmorePage />} />
                    <Route path="users" element={<UsersPage />} />
                </Route>

                {/* Fallback per rotte inesistenti o redirect email (es. /confirm) */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </AnimatePresence>
    );
}

const AppWrapper = () => (
    <HashRouter>
        <App />
    </HashRouter>
);

export default AppWrapper;
