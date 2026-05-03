import React, { useState, useEffect } from 'react';
import { Search, User, ChevronRight } from 'lucide-react';
import AppIcon from '../components/AppIcon';
import { supabase } from '../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';

const FindPeoplePage = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const currentUser = JSON.parse(localStorage.getItem('alzheimer_user') || '{}');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('id, name, surname, email, photo_url, role, last_active')
            .neq('id', currentUser.id) // Non mostrare se stessi
            .order('name', { ascending: true });
        
        if (!error && data) {
            setUsers(data);
        }
        setLoading(false);
    };

    const filteredUsers = users.filter(u => {
        const fullName = `${u.name} ${u.surname}`.toLowerCase();
        return fullName.includes(searchQuery.toLowerCase()) || u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const getRoleLabel = (r) => {
        switch(r) { 
            case 'patient': return 'Paziente'; 
            case 'caregiver': return 'Caregiver'; 
            case 'healthcare': return 'Medico'; 
            default: return 'Utente'; 
        }
    };

    const styles = {
        container: { padding: '20px', backgroundColor: 'var(--color-bg-primary)', minHeight: '100vh', paddingBottom: '100px' },
        header: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' },
        title: { fontSize: '24px', fontWeight: 'bold', color: 'var(--color-primary-dark)', margin: 0 },
        searchContainer: {
            position: 'relative',
            marginBottom: '20px',
        },
        searchInput: {
            width: '100%',
            padding: '12px 16px 12px 44px',
            borderRadius: '12px',
            border: '1px solid #E5E7EB',
            fontSize: '16px',
            outline: 'none',
            boxSizing: 'border-box',
            backgroundColor: 'white',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
        },
        searchIcon: {
            position: 'absolute',
            left: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#9CA3AF',
        },
        userCard: { 
            backgroundColor: 'white', 
            borderRadius: '16px', 
            padding: '12px 16px', 
            marginBottom: '10px', 
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            textDecoration: 'none',
            color: 'inherit'
        },
        avatar: { 
            width: '48px', 
            height: '48px', 
            borderRadius: '50%', 
            backgroundColor: '#eee', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            overflow: 'hidden',
            border: '2px solid white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        },
        userInfo: { flex: 1, minWidth: 0 },
        userName: { fontWeight: 'bold', fontSize: '15px', color: '#111' },
        userRole: { fontSize: '12px', color: '#6B7280' },
        roleBadge: {
            fontSize: '10px',
            padding: '2px 8px',
            borderRadius: '10px',
            backgroundColor: '#F3F4F6',
            color: '#666',
            fontWeight: 'bold',
            marginTop: '2px',
            display: 'inline-block'
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    <AppIcon name="arrow-left" size={24} color="primary" />
                </button>
                <h1 style={styles.title}>Cerca Persone</h1>
            </div>

            <div style={styles.searchContainer}>
                <Search style={styles.searchIcon} size={20} />
                <input 
                    type="text" 
                    placeholder="Cerca per nome, cognome o email..." 
                    style={styles.searchInput}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>Caricamento utenti...</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {filteredUsers.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>Nessun utente trovato</div>
                    ) : (
                        filteredUsers.map(u => (
                            <Link key={u.id} to={`/profilo/${u.id}`} style={styles.userCard}>
                                <div style={styles.avatar}>
                                    {u.photo_url ? <img src={u.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Avatar" /> : <User size={24} color="#999" />}
                                </div>
                                <div style={styles.userInfo}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={styles.userName}>{u.name} {u.surname}</div>
                                        <div style={{ 
                                            width: '8px', 
                                            height: '8px', 
                                            borderRadius: '50%', 
                                            backgroundColor: (u.last_active && (new Date() - new Date(u.last_active)) < 300000) ? '#10B981' : '#EF4444' 
                                        }} />
                                    </div>
                                    <div style={styles.roleBadge}>{getRoleLabel(u.role)}</div>
                                </div>
                                <ChevronRight size={18} color="#D1D5DB" />
                            </Link>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default FindPeoplePage;
