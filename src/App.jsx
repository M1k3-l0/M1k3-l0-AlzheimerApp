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

    React.useEffect(() => {
        if (isAuthenticated) {
            const updateActivity = async () => {
                const user = JSON.parse(localStorage.getItem('alzheimer_user') || '{}');
                if (user.id) {
                    await supabase.from('profiles').update({ last_active: new Date().toISOString() }).eq('id', user.id);
                }
            };
            updateActivity();
            const interval = setInterval(updateActivity, 60000);
            return () => clearInterval(interval);
        }
    }, [isAuthenticated]);
    const [loading, setLoading] = React.useState(true);
    const location = useLocation();

    // Sincronizzazione profilo e controllo BAN
    React.useEffect(() => {
        const syncProfile = async () => {
            const savedUser = localStorage.getItem('alzheimer_user');
            if (!savedUser) {
                setLoading(false);
                return;
            }

            try {
                const localUser = JSON.parse(savedUser);
                if (!localUser.id) {
                    setLoading(false);
                    return;
                }

                // Recupera dati freschi da Supabase
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', localUser.id)
                    .single();

                if (error) {
                    console.error("Errore sync profilo:", error);
                } else if (profile) {
                    // 1. Controllo BAN
                    if (profile.is_banned) {
                        alert("Il tuo account è stato sospeso. Contatta l'assistenza.");
                        localStorage.removeItem('alzheimer_user');
                        await supabase.auth.signOut();
                        setIsAuthenticated(false);
                        window.location.href = '/#/login';
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
