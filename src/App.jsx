import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ListPage from './pages/ListPage';
import ChatPage from './pages/ChatPage';
import FeedPage from './pages/FeedPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import ReportUmorePage from './pages/ReportUmorePage';
import UsersPage from './pages/UsersPage';

function App() {
    const [isAuthenticated, setIsAuthenticated] = React.useState(!!localStorage.getItem('alzheimer_user'));
    const [showSafePrompt, setShowSafePrompt] = React.useState(false);
    const [promptDismissed, setPromptDismissed] = React.useState(() => localStorage.getItem('safe_prompt_dismissed') === 'true');

    // Rimosso controllo invasivo all'avvio
    React.useEffect(() => {
        // Logica spostata dentro le singole pagine come avviso non bloccante
    }, []);

    // Ascolta cambiamenti al localStorage (es. login/logout)
    React.useEffect(() => {
        const checkAuth = () => {
            setIsAuthenticated(!!localStorage.getItem('alzheimer_user'));
        };
        window.addEventListener('storage', checkAuth);
        return () => window.removeEventListener('storage', checkAuth);
    }, []);

    return (
        <HashRouter>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />

                <Route path="/" element={isAuthenticated ? <Layout /> : <Navigate to="/login" replace />}>
                    <Route index element={<ListPage />} />
                    <Route path="chat" element={<ChatPage />} />
                    <Route path="feed" element={<FeedPage />} />
                    <Route path="profilo" element={<ProfilePage />} />
                    <Route path="impostazioni" element={<SettingsPage />} />
                    <Route path="report-umore" element={<ReportUmorePage />} />
                    <Route path="users" element={<UsersPage />} />
                </Route>
            </Routes>
        </HashRouter>
    );
}

export default App;
