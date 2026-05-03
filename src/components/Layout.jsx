import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import TabBar from './TabBar';
import Header from './Header';
import DebugConsole from './DebugConsole';

const pageTransition = (reduced) => ({
    initial: reduced ? false : { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: reduced ? false : { opacity: 0, x: -20 },
    transition: { 
        duration: reduced ? 0 : 0.35, 
        ease: [0.25, 1, 0.5, 1] // Custom cubic-bezier for a "fluid" feel
    }
});

const Layout = () => {
    const location = useLocation();
    const reduceMotion = useReducedMotion();

    // Sincronizza Caratteri Grandi: classe su html in base al flag in localStorage
    useEffect(() => {
        const isLarge = localStorage.getItem('setting_largeText') === 'true';
        if (isLarge) document.documentElement.classList.add('large-font-mode');
        else document.documentElement.classList.remove('large-font-mode');
    }, []);

    const currentPath = window.location.hash.replace('#', '');
    const isFullPage = currentPath.includes('chat') || 
                       currentPath.includes('profilo') || 
                       ['/', '/chat', '/feed', '/profilo'].includes(currentPath);
    const isChatPage = currentPath.includes('chat');
    const isProfilePage = currentPath.includes('profilo');
    const hideTabBar = currentPath.includes('chat-privata');
    
    const getTitle = (path) => {
        if (path.includes('chat-privata')) return 'Chat';
        if (path.startsWith('/profilo/')) return 'Profilo';
        if (path.startsWith('/feed')) return 'Memoriae';
        if (path.startsWith('/utenti')) return 'Ricerca';
        if (path.startsWith('/impostazioni')) return 'Impostazioni';
        if (path.startsWith('/report-umore')) return 'Report Umore';
        
        if (path === '/' || path === '') return 'Home';
        return 'Memora';
    };

    return (
        <div className={`app-container${isFullPage ? ' full-page' : ''}`}>
            <Header title={getTitle(currentPath)} />
            <main className={`main-content${isFullPage ? ' full-page' : ''}${isChatPage ? ' full-page-fill' : ''}${isProfilePage ? ' page-profilo' : ''}`} style={{ paddingTop: 'var(--header-height)' }}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={location.pathname}
                        {...pageTransition(reduceMotion)}
                        style={{ height: '100%' }}
                    >
                        <Outlet />
                    </motion.div>
                </AnimatePresence>
            </main>
            {!hideTabBar && <TabBar />}
            <DebugConsole />
        </div>
    );
};

export default Layout;
