import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import TabBar from './TabBar';
import Header from './Header';

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

    const getTitle = (path) => {
        switch (path) {
            case '/': return 'Home';
            case '/chat': return 'Messaggi';
            case '/feed': return 'Memoriae';
            case '/impostazioni': return 'Impostazioni';
            case '/report-umore': return 'Report Umore';
            default: return 'App';
        }
    };

    const isFullPage = location.pathname.includes('/chat/') || 
                       location.pathname.includes('/profilo/') || 
                       ['/chat', '/feed', '/profilo'].includes(location.pathname);
    const isChatPage = location.pathname.includes('/chat');
    const isProfilePage = location.pathname.includes('/profilo');
    const hideTabBar = location.pathname.includes('/chat/') && location.pathname !== '/chat';

    return (
        <div className={`app-container${isFullPage ? ' full-page' : ''}`}>
            <Header title={getTitle(location.pathname)} />
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
        </div>
    );
};

export default Layout;

