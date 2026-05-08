import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, User, Trash2, Ban, CheckCircle } from 'lucide-react';
import AppIcon from '../components/AppIcon';
import { supabase } from '../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';

const UsersPage = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const currentUser = JSON.parse(localStorage.getItem('alzheimer_user') || '{}');

    useEffect(() => {
        if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
            navigate('/');
            return;
        }
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('name', { ascending: true });
        
        if (!error && data) {
            setUsers(data);
        }
        setLoading(false);
    };

    const updateUserRole = async (userId, newRole) => {
        if (!window.confirm(`Vuoi davvero rendere questo utente ${newRole}?`)) return;
        
        const { error } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', userId);

        if (error) {
            alert("Errore nell'aggiornamento: " + error.message);
        } else {
            fetchUsers();
        }
    };

    const toggleBan = async (userId, currentBanStatus) => {
        const action = currentBanStatus ? "sbloccare" : "bannare";
        if (!window.confirm(`Vuoi davvero ${action} questo utente?`)) return;

        const { error } = await supabase
            .from('profiles')
            .update({ is_banned: !currentBanStatus })
            .eq('id', userId);

        if (error) {
            alert("Errore: " + error.message);
        } else {
            fetchUsers();
        }
    };

    const styles = {
        container: { padding: '20px', backgroundColor: 'var(--color-bg-primary)', minHeight: '100vh', paddingBottom: '100px' },
        title: { fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: 'var(--color-primary-dark)' },
        userCard: { backgroundColor: 'white', borderRadius: '16px', padding: '16px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '12px' },
        avatar: { width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
        userInfo: { flex: 1 },
        userName: { fontWeight: 'bold', fontSize: '16px' },
        userRole: { fontSize: '12px', color: '#666' },
        actions: { display: 'flex', gap: '8px' },
        badge: (role) => ({
            fontSize: '10px',
            padding: '2px 8px',
            borderRadius: '10px',
            backgroundColor: role === 'super_admin' ? '#FECDD3' : (role === 'admin' ? '#FFD700' : (role === 'moderator' ? '#E0F2FE' : '#F3F4F6')),
            color: role === 'super_admin' ? '#E11D48' : (role === 'admin' ? '#000' : (role === 'moderator' ? '#0369A1' : '#666')),
            fontWeight: 'bold',
            marginLeft: '8px'
        })
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Caricamento utenti...</div>;

    return (
        <div style={styles.container}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    <AppIcon name="arrow-left" size={24} color="primary" />
                </button>
                <h1 style={{ ...styles.title, marginBottom: 0 }}>Gestione Utenti</h1>
            </div>

            {users.map(u => (
                <div key={u.id} style={{ ...styles.userCard, opacity: u.is_banned ? 0.6 : 1 }}>
                    <div style={styles.avatar}>
                        {u.photo_url ? <img src={u.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Avatar" /> : <User size={24} color="#999" />}
                    </div>
                    <Link to={`/profilo/${u.id}`} style={{...styles.userInfo, textDecoration: 'none', color: 'inherit'}}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={styles.userName}>{u.name} {u.surname}</span>
                            <span style={styles.badge(u.role)}>{u.role}</span>
                        </div>
                        <div style={styles.userRole}>{u.email}</div>
                    </Link>
                    <div style={styles.actions}>
                        {(u.role !== 'admin' && u.role !== 'super_admin') && (
                            <>
                                <button 
                                    onClick={() => updateUserRole(u.id, u.role === 'moderator' ? 'caregiver' : 'moderator')} 
                                    title={u.role === 'moderator' ? "Rimuovi moderatore" : "Rendi moderatore"}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                                >
                                    {u.role === 'moderator' ? <ShieldAlert size={20} color="#666" /> : <Shield size={20} color="#0369A1" />}
                                </button>
                                <button 
                                    onClick={() => toggleBan(u.id, u.is_banned)} 
                                    title={u.is_banned ? "Sblocca" : "Banna"}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                                >
                                    <Ban size={20} color={u.is_banned ? "#22c55e" : "#ef4444"} />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default UsersPage;
