import React, { useState, useEffect, useRef } from 'react';
import { LogOut } from 'lucide-react';
import AppIcon from '../components/AppIcon';
import { supabase } from '../supabaseClient';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { getMoodColor, addMoodEntry } from '../utils/moodHistory';
import { getCurrentPosition, getAddressFromCoords } from '../utils/locationService';

const ProfilePage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const loggedInUser = JSON.parse(localStorage.getItem('alzheimer_user') || 'null');
    const isOwnProfile = !id || (loggedInUser && id === loggedInUser.id);
    const [user, setUser] = useState(isOwnProfile ? loggedInUser : null);
    const [currentMood, setCurrentMood] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activities, setActivities] = useState([]);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [updatingLocation, setUpdatingLocation] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [stats, setStats] = useState({ followers: 0, following: 0 });
    const [isEditingBio, setIsEditingBio] = useState(false);
    const [tempBio, setTempBio] = useState("");
    const [savingBio, setSavingBio] = useState(false);
    const [patientEmail, setPatientEmail] = useState("");
    const [associating, setAssociating] = useState(false);
    const fileInputRef = useRef(null);

    const isPatient = user?.role === 'patient';

    useEffect(() => {
        const fetchUserData = async () => {
            setLoading(true);
            try {
                const profileId = id || loggedInUser?.id;
                
                if (!profileId) {
                    console.error("No profile ID found");
                    setLoading(false);
                    return;
                }

                let { data, error } = await supabase
                    .from('profiles')
                    .select('id, name, surname, current_mood, role, bio, location, email, photo_url, last_active')
                    .eq('id', profileId)
                    .single();

                if (error) {
                    console.error("Supabase Error:", error);
                    // Prova a cercare in modo più permissivo
                    const { data: retryData, error: retryError } = await supabase
                        .from('profiles')
                        .select('id, name, surname, current_mood, role, bio, location, email, photo_url, last_active')
                        .eq('id', profileId)
                        .maybeSingle();
                    
                    if (retryData) {
                        data = retryData;
                    } else {
                        throw error || new Error("Profilo non esistente");
                    }
                }

                if (data) {
                    setCurrentMood(data.current_mood);
                    setUser({
                        ...data,
                        photo: data.photo_url
                    });
                } else if (isOwnProfile && loggedInUser) {
                    // SELF-HEALING: Se è il proprio profilo ma manca nel DB, crealo
                    console.log("Profile missing, creating fallback...");
                    const newProfile = {
                        id: loggedInUser.id,
                        name: loggedInUser.name || 'Utente',
                        surname: loggedInUser.surname || '',
                        role: loggedInUser.role || 'caregiver',
                        photo_url: loggedInUser.photo || null,
                        email: loggedInUser.email || null
                    };
                    await supabase.from('profiles').upsert([newProfile]);
                    setUser({ ...newProfile, photo: newProfile.photo_url });
                }

                fetchFollowStats(profileId);
                fetchActivities(profileId);
                if (!isOwnProfile && loggedInUser?.id) {
                    checkFollowStatus(loggedInUser.id, profileId);
                }
            } catch (e) {
                console.error("Error fetching user data", e);
            } finally {
                setLoading(false);
            }
        };
        fetchUserData();

        const profileId = id || loggedInUser?.id;
        if (profileId) {
            const channel = supabase
                .channel(`profile-status-${profileId}`)
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${profileId}`
                }, (payload) => {
                    setUser(prev => prev ? ({ ...prev, last_active: payload.new.last_active }) : null);
                })
                .subscribe();
            return () => { supabase.removeChannel(channel); };
        }
    }, [id]);

    const fetchActivities = async (profileId) => {
        const { data, error } = await supabase
            .from('activity_log')
            .select('*')
            .eq('user_id', profileId)
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (!error && data) {
            setActivities(data);
        }
    };

    const fetchFollowStats = async (profileId) => {
        const { count: followers } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('followed_id', profileId);
        const { count: following } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profileId);
        setStats({ followers: followers || 0, following: following || 0 });
    };

    const checkFollowStatus = async (followerId, followedId) => {
        const { data } = await supabase.from('follows').select('*').eq('follower_id', followerId).eq('followed_id', followedId).single();
        setIsFollowing(!!data);
    };

    const handleFollowToggle = async () => {
        if (!loggedInUser.id) return;
        const profileId = id || user.id;

        if (isFollowing) {
            const { error } = await supabase.from('follows').delete().eq('follower_id', loggedInUser.id).eq('followed_id', profileId);
            if (!error) {
                setIsFollowing(false);
                setStats(prev => ({ ...prev, followers: prev.followers - 1 }));
            }
        } else {
            const { error } = await supabase.from('follows').insert([{ follower_id: loggedInUser.id, followed_id: profileId }]);
            if (!error) {
                setIsFollowing(true);
                setStats(prev => ({ ...prev, followers: prev.followers + 1 }));
            }
        }
    };

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
            if (user.id) {
                // 1. Aggiorna l'umore nel profilo per visualizzazione immediata
                await supabase.from('profiles').update({ 
                    current_mood: mood 
                }).eq('id', user.id);

                // 2. Registra nello storico per i medici
                await supabase.from('mood_history').insert([{
                    user_id: user.id,
                    mood: mood
                }]);

                // 3. REGISTRO ATTIVITÀ
                await supabase.from('activity_log').insert([{
                    user_id: user.id,
                    action: 'mood_updated',
                    details: `Umore: ${mood}`
                }]);
            }
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

    const handleSaveBio = async () => {
        if (tempBio.length > 300) return;
        setSavingBio(true);
        try {
            const profileId = user.id || (user.name + (user.surname || ''));
            const { error } = await supabase.from('profiles').update({ bio: tempBio }).eq('id', profileId);
            if (error) throw error;
            
            setUser(prev => ({ ...prev, bio: tempBio }));
            const storedUser = JSON.parse(localStorage.getItem('alzheimer_user') || '{}');
            localStorage.setItem('alzheimer_user', JSON.stringify({ ...storedUser, bio: tempBio }));
            setIsEditingBio(false);
        } catch (err) {
            console.error('Errore aggiornamento bio:', err);
            alert('Impossibile aggiornare la bio. Verifica la connessione.');
        } finally {
            setSavingBio(false);
        }
    };

    const handleAssociatePatient = async () => {
        if (!patientEmail.trim() || !loggedInUser?.id) return;
        setAssociating(true);
        try {
            const { data: patient, error: fetchErr } = await supabase
                .from('profiles')
                .select('id, name, surname')
                .eq('email', patientEmail.trim())
                .single();
            
            if (fetchErr || !patient) {
                alert("Paziente non trovato. Verifica l'email.");
                return;
            }

            const { error: followErr } = await supabase
                .from('follows')
                .insert([{ follower_id: loggedInUser.id, followed_id: patient.id }]);
            
            if (followErr) throw followErr;

            alert(`Associazione con ${patient.name} ${patient.surname} completata!`);
            setPatientEmail("");
            fetchFollowStats(loggedInUser.id);
        } catch (err) {
            console.error('Errore associazione:', err);
            alert('Impossibile associare il paziente.');
        } finally {
            setAssociating(false);
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
            case 'super_admin': return 'Super Admin';
            case 'admin': return 'Amministratore';
            case 'moderator': return 'Moderatore';
            default: return 'Utente'; 
        }
    };

    const styles = {
        container: {
            padding: 'var(--content-padding-y) var(--content-padding-x) 100px',
            backgroundColor: 'var(--color-bg-primary)',
            minHeight: '100%',
            boxSizing: 'border-box',
            overflowX: 'hidden',
            paddingTop: '32px', // Spazio extra per staccarsi dall'header fisso
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

    if (loading && !user) return <div style={{ padding: '40px', textAlign: 'center', backgroundColor: 'var(--color-bg-primary)', height: '100vh' }}>Caricamento profilo...</div>;

    if (!user && !loading) return (
        <div style={{ padding: '40px', textAlign: 'center', backgroundColor: 'var(--color-bg-primary)', height: '100vh' }}>
            <div style={{ textAlign: 'center', padding: '100px 20px' }}>
                <h2 style={{ color: 'var(--color-primary-dark)' }}>Utente non trovato</h2>
                <p style={{ color: '#999', fontSize: '12px', marginTop: '20px', fontFamily: 'monospace' }}>
                    ID: {id || loggedInUser?.id}<br/>
                    Status: Il profilo non esiste ancora nel database.<br/>
                    Azione: L'utente deve aver effettuato l'accesso almeno una volta.
                </p>
                <button 
                    onClick={() => navigate('/')} 
                    style={{ marginTop: '30px', background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}
                >
                    Torna alla Home
                </button>

                <div style={{ marginTop: '50px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
                    <p style={{ color: '#666', fontSize: '13px', marginBottom: '15px' }}>Problemi persistenti?</p>
                    <button 
                        onClick={async () => {
                            localStorage.clear();
                            await supabase.auth.signOut();
                            window.location.href = '/#/login';
                            window.location.reload();
                        }} 
                        style={{ 
                            backgroundColor: '#FEE2E2', 
                            color: '#B91C1C', 
                            border: 'none', 
                            padding: '10px 20px', 
                            borderRadius: '12px', 
                            fontWeight: 'bold', 
                            cursor: 'pointer' 
                        }}
                    >
                        🔄 Forza Riconnessione
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div style={styles.container} className="last-scroll-block">
            {/* Minimal Header Card */}
            <div style={styles.headerCard}>
                <div style={styles.avatarContainer}>
                    {isOwnProfile && <input type="file" ref={fileInputRef} accept="image/*" onChange={handlePhotoChange} hidden />}
                    <button 
                        type="button" 
                        style={{...styles.avatarWrap, cursor: isOwnProfile ? 'pointer' : 'default'}} 
                        onClick={() => isOwnProfile && fileInputRef.current?.click()} 
                        disabled={uploadingPhoto || !isOwnProfile} 
                        aria-label={isOwnProfile ? "Cambia foto profilo" : "Foto profilo"}
                    >
                        <div style={styles.avatar}>
                            {user?.photo && typeof user.photo === 'string' && user.photo.startsWith('http') ? <img src={user.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Profile" /> : user?.name?.[0]}
                        </div>
                        {isOwnProfile && (
                            <span style={styles.avatarOverlay}>
                                <AppIcon name="camera" size={24} color="white" />
                                {uploadingPhoto ? '...' : 'Cambia'}
                            </span>
                        )}
                    </button>
                </div>
                <h1 style={styles.name}>
                    {user.name} {user.surname}
                    <span style={{ 
                        display: 'inline-block', 
                        width: '10px', 
                        height: '10px', 
                        borderRadius: '50%', 
                        backgroundColor: (user.last_active && Math.abs(new Date() - new Date(user.last_active)) < 600000) ? '#10B981' : '#EF4444', 
                        marginLeft: '8px',
                        boxShadow: `0 0 5px ${(user.last_active && Math.abs(new Date() - new Date(user.last_active)) < 600000) ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`
                    }} title={user.last_active ? `Ultimo segnale: ${new Date(user.last_active).toLocaleString()}` : 'Mai connesso'} />
                    {currentMood && <span style={styles.moodEmoji}>{getMoodEmoji(currentMood)}</span>}
                </h1>
                <div style={{ color: '#999', fontSize: '10px', marginTop: '-10px', marginBottom: '10px' }}>
                    ID: {user.id?.substring(0,8)}... | Last: {user.last_active ? new Date(user.last_active).toLocaleTimeString() : 'null'}
                </div>
                <div style={{
                    ...styles.roleBadge,
                    ...((user.role === 'admin' || user.role === 'super_admin' || user.role === 'moderator') ? {
                        background: user.role === 'super_admin' ? 'linear-gradient(45deg, #FF4B2B, #FF416C)' : 
                                    (user.role === 'admin' ? 'linear-gradient(45deg, #FFD700, #FFA500)' : '#E0F2FE'),
                        color: user.role === 'super_admin' ? '#FFF' : 
                               (user.role === 'admin' ? '#000' : '#0369A1'),
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: user.role === 'super_admin' ? '0 2px 10px rgba(255, 65, 108, 0.4)' : 
                                   (user.role === 'admin' ? '0 2px 10px rgba(255, 215, 0, 0.4)' : 'none'),
                        border: user.role === 'super_admin' ? '1px solid #FF416C' : 
                                (user.role === 'admin' ? '1px solid #DAA520' : '1px solid #BAE6FD')
                    } : {})
                }}>
                    {(user.role === 'admin' || user.role === 'super_admin') && <AppIcon name="crown" size={16} color={user.role === 'super_admin' ? 'white' : 'black'} />}
                    {user.role === 'moderator' && <AppIcon name="shield-check" size={16} color="#0369A1" />}
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

                {isEditingBio ? (
                    <div style={{ marginTop: '16px', width: '100%', boxSizing: 'border-box', padding: '0 16px' }}>
                        <textarea
                            value={tempBio}
                            onChange={(e) => setTempBio(e.target.value)}
                            maxLength={300}
                            placeholder="Scrivi qualcosa su di te (max 300 caratteri)..."
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '12px',
                                border: '1px solid #E5E7EB',
                                fontSize: '14px',
                                fontFamily: 'inherit',
                                resize: 'vertical',
                                minHeight: '80px',
                                boxSizing: 'border-box',
                                marginBottom: '8px'
                            }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', color: tempBio.length >= 300 ? '#EF4444' : '#9CA3AF' }}>
                                {tempBio.length}/300
                            </span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                    onClick={() => setIsEditingBio(false)} 
                                    style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
                                >
                                    Annulla
                                </button>
                                <button 
                                    onClick={handleSaveBio} 
                                    disabled={savingBio}
                                    style={{ background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '20px', padding: '6px 16px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
                                >
                                    {savingBio ? '...' : 'Salva'}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '12px', width: '100%' }}>
                        {user.bio ? (
                            <>
                                <p style={{ color: '#6B7280', fontSize: '14px', margin: 0, padding: '0 20px', whiteSpace: 'pre-wrap' }}>{user.bio}</p>
                                {isOwnProfile && (
                                    <button 
                                        onClick={() => { setTempBio(user.bio); setIsEditingBio(true); }}
                                        style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '12px', fontWeight: 'bold', marginTop: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                    >
                                        <AppIcon name="pencil" size={12} color="primary" /> Modifica Bio
                                    </button>
                                )}
                            </>
                        ) : (
                            isOwnProfile && (
                                <button 
                                    onClick={() => { setTempBio(""); setIsEditingBio(true); }}
                                    style={{ background: 'none', border: '1px dashed #D1D5DB', borderRadius: '20px', padding: '8px 16px', color: '#6B7280', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                    <AppIcon name="add" size={14} color="#6B7280" /> Aggiungi una bio
                                </button>
                            )
                        )}
                    </div>
                )}

                {/* Statistiche Seguiti */}
                <div style={{ display: 'flex', gap: '24px', marginTop: '16px' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{stats.following}</div>
                        <div style={{ fontSize: '12px', color: '#6B7280' }}>Seguiti</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{stats.followers}</div>
                        <div style={{ fontSize: '12px', color: '#6B7280' }}>Follower</div>
                    </div>
                </div>

                {!isOwnProfile && (
                    <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                        <button 
                            onClick={handleFollowToggle}
                            style={{
                                flex: 1,
                                backgroundColor: isFollowing ? 'white' : 'var(--color-primary)',
                                color: isFollowing ? 'var(--color-primary)' : 'white',
                                border: `2px solid var(--color-primary)`,
                                borderRadius: '25px',
                                padding: '10px 20px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            {isFollowing ? 'Segui già' : 'Segui'}
                        </button>
                        <button 
                            onClick={() => navigate(`/chat-privata/${user.id}`)}
                            style={{
                                backgroundColor: 'var(--color-accent)',
                                color: 'var(--color-primary)',
                                border: 'none',
                                borderRadius: '25px',
                                padding: '10px 20px',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                cursor: 'pointer'
                            }}
                        >
                            <AppIcon name="paper-plane" size={18} color="primary" />
                            Messaggio
                        </button>
                    </div>
                )}
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
                        <span>{user?.location || 'Posizione non impostata'}</span>
                        {isOwnProfile && (
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
                        )}
                    </div>
                </div>
                <div style={{ ...styles.infoRow, borderBottom: 'none' }}>
                    <AppIcon name="calendar-lines" size={20} color="primary" />
                    <span>Iscritto a Gennaio 2026</span>
                </div>
            </div>
            
            {/* Attività Recenti Card */}
            <div style={styles.infoCard}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--color-primary-dark)' }}>Attività Recenti</h3>
                {activities.length === 0 ? (
                    <div style={{ color: '#9CA3AF', fontSize: '13px', textAlign: 'center', padding: '20px' }}>Nessuna attività registrata di recente.</div>
                ) : (
                    activities.map((act, idx) => (
                        <div key={act.id} style={{ ...styles.infoRow, borderBottom: idx === activities.length - 1 ? 'none' : '1px solid #F3F4F6' }}>
                            <div style={{ 
                                width: '32px', 
                                height: '32px', 
                                borderRadius: '50%', 
                                backgroundColor: act.action === 'task_completed' ? '#ECFDF5' : '#F5F3FF', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <AppIcon 
                                    name={act.action === 'task_completed' ? 'badge-check' : act.action === 'mood_updated' ? 'grin' : 'add'} 
                                    size={16} 
                                    color={act.action === 'task_completed' ? 'success' : 'primary'} 
                                />
                            </div>
                            <div style={{ flex: 1, minWidth: 0, marginLeft: '10px' }}>
                                <div style={{ fontSize: '14px', fontWeight: '600', color: '#1F2937' }}>
                                    {act.action === 'task_completed' ? 'Task completato' : 
                                     act.action === 'mood_updated' ? 'Umore aggiornato' : 
                                     act.action === 'task_added' ? 'Nuovo task' : 'Attività'}
                                </div>
                                <div style={{ fontSize: '13px', color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {act.details}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Sezione Associazione per Caregiver (solo se proprio profilo e nessun seguito?) */}
            {isOwnProfile && user.role === 'caregiver' && (
                <div style={styles.infoCard}>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--color-primary-dark)' }}>
                        Associa un Paziente
                    </h3>
                    <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '12px' }}>
                        Inserisci l'email del paziente per monitorare il suo stato e la sua agenda.
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input 
                            type="email"
                            placeholder="email.paziente@esempio.it"
                            value={patientEmail}
                            onChange={(e) => setPatientEmail(e.target.value)}
                            style={{ 
                                flex: 1, 
                                padding: '10px', 
                                borderRadius: '12px', 
                                border: '1px solid #E5E7EB',
                                fontSize: '14px'
                            }}
                        />
                        <button 
                            onClick={handleAssociatePatient}
                            disabled={associating}
                            style={{ 
                                backgroundColor: 'var(--color-primary)', 
                                color: 'white', 
                                border: 'none', 
                                borderRadius: '12px', 
                                padding: '0 16px', 
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                fontSize: '13px'
                            }}
                        >
                            {associating ? '...' : 'Associa'}
                        </button>
                    </div>
                </div>
            )}
            <div style={styles.infoCard}>
                <div style={styles.sectionHeader}>
                    <h3 style={styles.sectionTitle}>Attività Recente</h3>
                    <AppIcon name="history" size={18} color="primary" />
                </div>
                
                {activities.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px', color: '#9CA3AF', fontSize: '14px' }}>
                        Nessuna attività registrata.
                    </div>
                ) : (
                    activities.slice(0, 5).map(act => (
                        <div key={act.id} style={styles.activityItem}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '14px', color: '#374151' }}>{act.activity_type}</div>
                                <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                                    {new Date(act.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Quick Actions Card */}
            <div style={{ ...styles.actionCard, padding: 0, overflow: 'hidden' }}>
                <button 
                    style={{ ...styles.actionBtn, borderRadius: 0, padding: '16px' }} 
                    onClick={() => navigate('/impostazioni')}
                    className="action-row-hover"
                >
                    <AppIcon name="settings" size={20} color="primaryDark" />
                    <span style={{ fontSize: '15px' }}>Impostazioni App</span>
                </button>
                <Link 
                    to={`/report-umore/${user.id}`} 
                    style={{ ...styles.actionBtn, borderRadius: 0, padding: '16px', textDecoration: 'none', borderTop: '1px solid #F3F4F6' }}
                    className="action-row-hover"
                >
                    <AppIcon name="calendar-lines" size={20} color="primaryDark" />
                    <span style={{ fontSize: '15px' }}>Report umore</span>
                </Link>
                {(user.role === 'admin' || user.role === 'super_admin') && (
                    <button 
                        style={{ ...styles.actionBtn, borderRadius: 0, padding: '16px', borderTop: '1px solid #F3F4F6' }} 
                        onClick={() => navigate('/users')}
                        className="action-row-hover"
                    >
                        <AppIcon name="shield-check" size={20} color="primary" />
                        <span style={{ fontSize: '15px' }}>Gestione Utenti</span>
                    </button>
                )}
            </div>

            {/* Logout Button - Solo sul proprio profilo */}
            {isOwnProfile && (
                <button style={styles.logoutBtn} onClick={handleLogout}>
                    <LogOut size={20} />
                    <span>Disconnetti</span>
                </button>
            )}

            <div style={{ textAlign: 'center', marginTop: '30px', color: '#9CA3AF', fontSize: '12px' }}>
                Memora v1.0
            </div>
        </div>
    );
};

export default ProfilePage;
