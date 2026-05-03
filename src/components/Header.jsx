import { Link } from 'react-router-dom';
import AppIcon from './AppIcon';
import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { supabase } from '../supabaseClient';

const Header = ({ title }) => {
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('alzheimer_user') || '{}'));
    const [hasUnreadPrivate, setHasUnreadPrivate] = useState(false);

    // Listen for profile updates and unread messages
    useEffect(() => {
        if (!user.id) return;

        const checkUnread = async () => {
            const { count } = await supabase
                .from('private_messages')
                .select('*', { count: 'exact', head: true })
                .eq('receiver_id', user.id)
                .eq('is_read', false);
            setHasUnreadPrivate(count > 0);
        };

        checkUnread();

        const channel = supabase
            .channel('header-private-notifications')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'private_messages',
                filter: `receiver_id=eq.${user.id}`
            }, () => {
                checkUnread();
            })
            .subscribe();

        const handleStorageChange = () => {
            const newUser = JSON.parse(localStorage.getItem('alzheimer_user') || '{}');
            setUser(newUser);
        };

        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            supabase.removeChannel(channel);
        };
    }, [user.id]);

    const styles = {
        header: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: 'var(--header-height)',
            backgroundColor: 'var(--color-bg-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid var(--color-border)',
            zIndex: 100,
            padding: '0 16px',
        },
        title: {
            fontSize: '1.25rem',
            color: 'var(--color-primary-dark)',
            fontWeight: '700',
            letterSpacing: '-0.02em',
        },
        profileBtn: {
            position: 'absolute',
            left: '24px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none'
        },
        avatar: {
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: '600',
            overflow: 'hidden',
            fontSize: '1rem',
            boxShadow: 'var(--shadow-sm)',
        },
        avatarImg: {
            width: '100%',
            height: '100%',
            objectFit: 'cover'
        },
        settingsBtn: {
            position: 'absolute',
            right: '16px',
            background: 'none',
            border: 'none',
            color: 'var(--color-primary)',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '10px',
        }
    };

    return (
        <header className="app-header" style={styles.header}>
            <Link to="/profilo" className="app-header-profile" style={styles.profileBtn}>
                <div style={styles.avatar}>
                    {user.photo && typeof user.photo === 'string' && user.photo.startsWith('http') ? (
                        <img src={user.photo} style={styles.avatarImg} alt="Profilo" />
                    ) : (
                        user.name?.[0] || <AppIcon name="user" size={20} />
                    )}
                </div>
            </Link>
            <h1 style={styles.title}>{title}</h1>
            <Link to="/cerca-persone" style={{ ...styles.settingsBtn, right: '96px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="app-header-search">
                <Search size={24} />
            </Link>
            <Link to="/messaggi" style={{ ...styles.settingsBtn, right: '56px' }} className="app-header-messages">
                <div style={{ position: 'relative', display: 'flex' }}>
                    <AppIcon name="envelope" size={24} />
                    {hasUnreadPrivate && (
                        <div style={{
                            position: 'absolute',
                            top: '-2px',
                            right: '-2px',
                            width: '10px',
                            height: '10px',
                            backgroundColor: '#EF4444',
                            borderRadius: '50%',
                            border: '2px solid white'
                        }} />
                    )}
                </div>
            </Link>
            <Link to="/impostazioni" className="app-header-settings" style={styles.settingsBtn}>
                <AppIcon name="settings" size={24} />
            </Link>
        </header>
    );
};

export default Header;
