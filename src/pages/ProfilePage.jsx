import React, { useState, useEffect, useRef } from 'react';
import { LogOut } from 'lucide-react';
import AppIcon from '../components/AppIcon';
import { supabase } from '../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import { getMoodColor, addMoodEntry } from '../utils/moodHistory';
import { getCurrentPosition, getAddressFromCoords } from '../utils/locationService';

const ProfilePage = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('alzheimer_user') || '{}'));
    const [currentMood, setCurrentMood] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [updatingLocation, setUpdatingLocation] = useState(false);
    const fileInputRef = useRef(null);

    const isPatient = user.role === 'patient';

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                let emailFromAuth = user.email || null;
                if (!emailFromAuth) {
                    const { data: authData } = await supabase.auth.getUser();
                    emailFromAuth = authData?.user?.email ?? null;
                    if (emailFromAuth) {
                        const updated = { ...user, email: emailFromAuth };
                        setUser(updated);
                        localStorage.setItem('alzheimer_user', JSON.stringify(updated));
                    }
                }

                const profileId = user.id || (user.name + (user.surname || ''));
                const { data, error } = await supabase
                    .from('profiles')
                    .select('current_mood, role, bio, location, email, photo_url')
                    .eq('id', profileId)
                    .single();

                if (!error && data) {
                    setCurrentMood(data.current_mood);
                    setUser(prev => ({
                        ...prev,
                        ...data,
                        email: data.email ?? prev.email ?? emailFromAuth,
                        photo: data.photo_url ?? prev.photo
                    }));
                }
            } catch (e) {
                console.error("Error fetching user data", e);
            } finally {
                setLoading(false);
            }
        };
        fetchUserData();
    }, [user.id, user.name, user.surname]);

    const handleLogout = () => {
        if (window.confirm("Sei sicuro di voler uscire?")) {
            localStorage.removeItem('alzheimer_user');
            window.location.href = '/login';
        }
    };

    const handlePhotoChange = async (e) => {
        const file = e.target?.files?.[0];
        if (!file || !file.type.startsWith('image/')) return;
        const profileId = user.id || (user.name + (user.surname || ''));
        if (!profileId) return;
        setUploadingPhoto(true);
        try {
            const bucket = 'avatars';
            const path = `${profileId}/avatar`;
            const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
            if (uploadError) throw uploadError;
            const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
            const photoUrl = urlData?.publicUrl || null;
            await supabase.from('profiles').upsert([{
                id: profileId,
                name: user.name,
                surname: user.surname,
                role: user.role,
                photo_url: photoUrl
            }]);
            const updated = { ...user, photo: photoUrl };
            setUser(updated);
            localStorage.setItem('alzheimer_user', JSON.stringify(updated));
            window.dispatchEvent(new Event('storage'));
        } catch (err) {
            console.error('Errore upload foto:', err);
            alert('Impossibile caricare la foto. Verifica che il bucket "avatars" esista in Supabase con accesso pubblico.');
        } finally {
            setUploadingPhoto(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleMoodSelect = async (mood) => {
        if (!isPatient) return;
        setCurrentMood(mood);
        addMoodEntry(mood);
        try {
            const profileId = user.id || (user.name + (user.surname || ''));
            await supabase.from('profiles').upsert([{ 
                id: profileId, 
                current_mood: mood,
                name: user.name,
                surname: user.surname,
                role: user.role
            }]);
        } catch (e) {
            console.error("Error saving mood", e);
        }
    };

    const handleUpdateLocation = async () => {
        setUpdatingLocation(true);
        try {
            const { latitude, longitude } = await getCurrentPosition();
            const address = await getAddressFromCoords(latitude, longitude);
            
            const profileId = user.id || (user.name + (user.surname || ''));
            const { error } = await supabase.from('profiles').upsert([{ 
                id: profileId, 
                location: address,
                name: user.name,
                surname: user.surname,
                role: user.role
            }]);

            if (error) throw error;

            setUser(prev => ({ ...prev, location: address }));
            const storedUser = JSON.parse(localStorage.getItem('alzheimer_user') || '{}');
            localStorage.setItem('alzheimer_user', JSON.stringify({ ...storedUser, location: address }));
            alert('Posizione aggiornata con successo!');
        } catch (err) {
            console.error('Errore durante l\'aggiornamento della posizione:', err);
            alert('Impossibile aggiornare la posizione. Assicurati di aver concesso i permessi.');
        } finally {
            setUpdatingLocation(false);
        }
    };

    const getMoodIcon = (mood) => {
        const color = getMoodColor(mood);
        const iconMap = { happy: 'grin', neutral: 'face-expressionless', sad: 'sad' };
        const name = iconMap[mood];
        return name ? <AppIcon name={name} size={20} color={color} /> : null;
    };

    const getMoodEmoji = (mood) => {
        switch (mood) {
            case 'happy': return '😊';
            case 'neutral': return '😐';
            case 'sad': return '😢';
            default: return '';
        }
    };

    const getRoleLabel = (r) => {
        switch(r) { 
            case 'patient': return 'Paziente'; 
            case 'caregiver': return 'Caregiver'; 
            case 'healthcare': return 'Medico'; 
            case 'admin': return 'Amministratore';
            case 'moderator': return 'Moderatore';
            default: return 'Utente'; 
        }
    };

    const styles = {
        container: {
            width: '100%',
            maxWidth: '100%',
            minWidth: 0,
            padding: '16px var(--content-padding-x)',
            backgroundColor: 'var(--color-bg-primary)',
            minHeight: '100%',
            boxSizing: 'border-box',
            overflowX: 'hidden',
        },
        headerCard: {
            backgroundColor: 'white',
            borderRadius: 'var(--card-radius-lg)',
            padding: 'var(--content-padding-y)',
            boxShadow: 'var(--card-shadow)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            marginBottom: 'var(--section-gap)',
            maxWidth: '100%',
            boxSizing: 'border-box',
        },
        avatarContainer: {
            position: 'relative',
            marginBottom: '16px',
        },
        avatarWrap: {
            position: 'relative',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            display: 'block',
        },
        avatarOverlay: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'rgba(0,0,0,0.5)',
            color: 'white',
            fontSize: '11px',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            borderBottomLeftRadius: '50%',
            borderBottomRightRadius: '50%',
        },
        avatar: {
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '36px',
            fontWeight: 'bold',
            overflow: 'hidden',
            border: `4px solid ${getMoodColor(currentMood)}`,
            boxShadow: `0 4px 15px ${getMoodColor(currentMood)}40`,
            transition: 'all 0.3s ease',
        },
        moodBadge: {
            position: 'absolute',
            bottom: '0',
            right: '0',
            backgroundColor: 'white',
            borderRadius: '50%',
            padding: '6px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        },
        name: {
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#1A1A1A',
            marginBottom: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            justifyContent: 'center',
            flexWrap: 'wrap',
            wordBreak: 'break-word',
        },
        moodEmoji: {
            fontSize: '28px',
            lineHeight: 1,
        },
        roleBadge: {
            backgroundColor: 'var(--color-accent)',
            color: 'var(--color-primary)',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: '600',
            marginBottom: '12px',
        },
        moodIconContainer: {
            display: 'flex',
            gap: '12px',
            marginTop: '12px',
            justifyContent: 'center',
        },
        moodBtn: (mood) => ({
            width: '48px',
            height: '48px',
            borderRadius: 'var(--card-radius)',
            backgroundColor: currentMood === mood ? 'var(--color-accent)' : '#F3F4F6',
            border: currentMood === mood ? `2px solid ${getMoodColor(mood)}` : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            transform: currentMood === mood ? 'scale(1.25)' : 'scale(1)',
            padding: 0,
            font: 'inherit',
        }),
        infoCard: {
            backgroundColor: 'white',
            borderRadius: 'var(--card-radius-lg)',
            padding: 'var(--content-padding-y)',
            boxShadow: 'var(--card-shadow)',
            marginBottom: 'var(--section-gap)',
            maxWidth: '100%',
            boxSizing: 'border-box',
        },
        infoRow: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 0',
            borderBottom: '1px solid #F3F4F6',
            color: '#4B5563',
            fontSize: '15px',
        },
        actionCard: {
            backgroundColor: 'white',
            borderRadius: 'var(--card-radius)',
            padding: '12px 16px',
            boxShadow: 'var(--card-shadow)',
            marginBottom: 'var(--section-gap)',
            maxWidth: '100%',
            boxSizing: 'border-box',
        },
        actionBtn: {
            width: '100%',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            color: '#1F2937',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            borderRadius: '12px',
            transition: 'background-color 0.2s',
        },
        logoutBtn: {
            width: '100%',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: 'none',
            color: '#EF4444',
            fontSize: '16px',
            fontWeight: 'bold',
            borderRadius: '20px',
            cursor: 'pointer',
            marginTop: '10px',
        }
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Caricamento...</div>;

    return (
        <div style={styles.container} className="last-scroll-block">
            {/* Minimal Header Card */}
            <div style={styles.headerCard}>
                <div style={styles.avatarContainer}>
                    <input type="file" ref={fileInputRef} accept="image/*" onChange={handlePhotoChange} hidden />
                    <button type="button" style={styles.avatarWrap} onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto} aria-label="Cambia foto profilo">
                        <div style={styles.avatar}>
                            {user.photo && typeof user.photo === 'string' && user.photo.startsWith('http') ? <img src={user.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Profile" /> : user.name?.[0]}
                        </div>
                        <span style={styles.avatarOverlay}>
                            <AppIcon name="camera" size={24} color="white" />
                            {uploadingPhoto ? '...' : 'Cambia'}
                        </span>
                    </button>
                </div>
                <h1 style={styles.name}>
                    {user.name} {user.surname}
                    {currentMood && <span style={styles.moodEmoji}>{getMoodEmoji(currentMood)}</span>}
                </h1>
                <div style={{
                    ...styles.roleBadge,
                    ...(user.role === 'admin' ? {
                        background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                        color: '#000',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 10px rgba(255, 215, 0, 0.4)',
                        border: '1px solid #DAA520'
                    } : {})
                }}>
                    {user.role === 'admin' && <AppIcon name="crown" size={16} color="black" />}
                    {getRoleLabel(user.role)}
                </div>

                {isPatient && (
                    <div style={styles.moodIconContainer}>
                        <button type="button" style={styles.moodBtn('happy')} onClick={() => handleMoodSelect('happy')} aria-label="Felice">
                            <AppIcon name="grin" size={24} color={currentMood === 'happy' ? getMoodColor('happy') : '#9CA3AF'} />
                        </button>
                        <button type="button" style={styles.moodBtn('neutral')} onClick={() => handleMoodSelect('neutral')} aria-label="Neutro">
                            <AppIcon name="face-expressionless" size={24} color={currentMood === 'neutral' ? getMoodColor('neutral') : '#9CA3AF'} />
                        </button>
                        <button type="button" style={styles.moodBtn('sad')} onClick={() => handleMoodSelect('sad')} aria-label="Triste">
                            <AppIcon name="sad" size={24} color={currentMood === 'sad' ? getMoodColor('sad') : '#9CA3AF'} />
                        </button>
                    </div>
                )}

                {user.bio && <p style={{ color: '#6B7280', fontSize: '14px', margin: '12px 0 0 0' }}>{user.bio}</p>}
            </div>

            {/* Account Details Card */}
            <div style={styles.infoCard}>
                <div style={styles.infoRow}>
                    <AppIcon name="envelope" size={20} color="primary" />
                    <span>{user.email || 'Email non disponibile'}</span>
                </div>
                <div style={styles.infoRow}>
                    <AppIcon name="shield-check" size={20} color="primary" />
                    <span>Ruolo: <strong>{getRoleLabel(user.role)}</strong></span>
                </div>
                <div style={styles.infoRow}>
                    <AppIcon name="map-marker" size={20} color="primary" />
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{user.location || 'Posizione non impostata'}</span>
                        <button 
                            onClick={handleUpdateLocation} 
                            disabled={updatingLocation}
                            style={{ 
                                background: 'var(--color-accent)', 
                                border: 'none', 
                                borderRadius: '8px', 
                                padding: '4px 8px', 
                                fontSize: '11px', 
                                fontWeight: 'bold', 
                                cursor: 'pointer',
                                color: 'var(--color-primary)'
                            }}
                        >
                            {updatingLocation ? '...' : 'Aggiorna'}
                        </button>
                    </div>
                </div>
                <div style={{ ...styles.infoRow, borderBottom: 'none' }}>
                    <AppIcon name="calendar-lines" size={20} color="primary" />
                    <span>Iscritto a Gennaio 2026</span>
                </div>
            </div>

            {/* Quick Actions Card */}
            <div style={styles.actionCard}>
                <button style={styles.actionBtn} onClick={() => navigate('/impostazioni')}>
                    <AppIcon name="settings" size={18} color="primaryDark" />
                    <span>Impostazioni App</span>
                </button>
                <Link to="/report-umore" style={{ ...styles.actionBtn, textDecoration: 'none', borderTop: '1px solid var(--color-border)' }}>
                    <AppIcon name="calendar-lines" size={18} color="primaryDark" />
                    <span>Report umore</span>
                </Link>
                {user.role === 'admin' && (
                    <button style={{ ...styles.actionBtn, borderTop: '1px solid var(--color-border)' }} onClick={() => navigate('/users')}>
                        <AppIcon name="shield-check" size={18} color="primary" />
                        <span>Gestione Utenti</span>
                    </button>
                )}
            </div>

            {/* Logout Button */}
            <button style={styles.logoutBtn} onClick={handleLogout}>
                <LogOut size={20} />
                <span>Disconnetti</span>
            </button>

            <div style={{ textAlign: 'center', marginTop: '30px', color: '#9CA3AF', fontSize: '12px' }}>
                Memora v1.0
            </div>
        </div>
    );
};

export default ProfilePage;
