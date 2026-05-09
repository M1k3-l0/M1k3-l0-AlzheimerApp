import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import AppIcon from '../components/AppIcon';
import AuthHeader from '../components/AuthHeader';
import { supabase } from '../supabaseClient';

const SignupPage = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        surname: '',
        email: '',
        password: '',
        role: 'caregiver', // Default
        patientEmail: '' // Per associazione
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Registrazione su Supabase Auth
            const { data, error: signUpError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        name: formData.name,
                        surname: formData.surname,
                        role: formData.role,
                        patient_email: formData.role === 'caregiver' ? formData.patientEmail : null
                    },
                    emailRedirectTo: window.location.origin + '/#/'
                }
            });

            if (signUpError) throw signUpError;

            if (data.user) {
                // Se è un caregiver e ha inserito una mail paziente, prova l'associazione
                if (formData.role === 'caregiver' && formData.patientEmail) {
                    try {
                        const { data: patient } = await supabase
                            .from('profiles')
                            .select('id')
                            .eq('email', formData.patientEmail)
                            .single();
                        
                        if (patient) {
                            await supabase.from('follows').insert([{
                                follower_id: data.user.id,
                                followed_id: patient.id
                            }]);
                        }
                    } catch (e) {
                        console.warn("Associazione automatica fallita, ma registrazione completata.");
                    }
                }
                alert("Registrazione completata! Controlla la mail per confermare l'account.");
                navigate('/login');
            }

        } catch (err) {
            console.error("Errore registrazione:", err);
            const msg = err?.message || "";
            if (msg === "Failed to fetch" || msg.includes("fetch")) {
                setError(
                    "Impossibile contattare il server. Controlla: 1) file .env con VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY corretti (da Supabase Dashboard > Settings > API); 2) Supabase > Authentication > URL Configuration: aggiungi questa pagina in Redirect URLs (es. http://localhost:5173); 3) connessione internet."
                );
            } else {
                setError(err.message || "Errore durante la registrazione.");
            }
        } finally {
            setLoading(false);
        }
    };

    const styles = {
        container: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '20px',
            backgroundColor: 'var(--color-bg-primary)',
            textAlign: 'center'
        },
        card: {
            backgroundColor: 'white',
            borderRadius: '24px',
            padding: '30px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            border: '1px solid var(--color-border)'
        },
        title: { fontSize: '24px', fontWeight: '800', color: 'var(--color-primary)', marginBottom: '8px' },
        subtitle: { fontSize: '14px', color: '#666', marginBottom: '24px' },
        inputGroup: { marginBottom: '16px', textAlign: 'left' },
        label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#444', marginBottom: '6px', marginLeft: '4px' },
        inputWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
        icon: { position: 'absolute', left: '14px', color: '#999' },
        input: {
            width: '100%',
            padding: '14px 14px 14px 44px',
            borderRadius: '12px',
            border: '1px solid #ddd',
            fontSize: '16px',
            outline: 'none',
            backgroundColor: '#f9f9f9',
            transition: 'border-color 0.2s'
        },
        button: {
            width: '100%',
            padding: '16px',
            backgroundColor: 'var(--color-primary)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: loading ? 'wait' : 'pointer',
            marginTop: '10px',
            opacity: loading ? 0.7 : 1
        }
    };

    return (
        <div className="auth-page" style={styles.container}>
            <div className="auth-card" style={styles.card}>
                <AuthHeader />
                <h1 style={styles.title}>Crea Account</h1>
                <p style={styles.subtitle}>Unisciti alla nostra community</p>

                {error && (
                    <div style={{backgroundColor:'#FFF0F0', color:'#D32F2F', padding:'12px', borderRadius:'8px', fontSize:'13px', marginBottom:'20px', display:'flex', alignItems:'center', gap:'8px'}}>
                        <AlertCircle size={16}/> {error === 'User already registered' ? 'Utente già registrato.' : error}
                    </div>
                )}

                <form onSubmit={handleSignup}>
                    <div style={{display:'flex', gap:'10px'}}>
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Nome</label>
                            <div style={styles.inputWrapper}>
                                <AppIcon name="user" size={18} color="primary" style={styles.icon}/>
                                <input name="name" style={styles.input} placeholder="Mario" required onChange={handleChange} />
                            </div>
                        </div>
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Cognome</label>
                            <div style={styles.inputWrapper}>
                                <AppIcon name="user" size={18} color="primary" style={styles.icon}/>
                                <input name="surname" style={styles.input} placeholder="Rossi" required onChange={handleChange} />
                            </div>
                        </div>
                    </div>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Email</label>
                        <div style={styles.inputWrapper}>
                            <AppIcon name="envelope" size={18} color="primary" style={styles.icon}/>
                            <input name="email" type="email" style={styles.input} placeholder="mario@email.com" required onChange={handleChange} />
                        </div>
                    </div>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Ruolo</label>
                        <div style={styles.inputWrapper}>
                            <AppIcon name="user" size={18} color="primary" style={styles.icon}/>
                            <select name="role" style={styles.input} value={formData.role} onChange={handleChange} required>
                                <option value="caregiver">Familiare / Caregiver</option>
                                <option value="patient">Paziente</option>
                                <option value="healthcare">Operatore Sanitario</option>
                            </select>
                        </div>
                    </div>

                    {formData.role === 'caregiver' && (
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Email del Paziente da assistere</label>
                            <div style={styles.inputWrapper}>
                                <AppIcon name="envelope" size={18} color="primary" style={styles.icon}/>
                                <input 
                                    name="patientEmail" 
                                    type="email" 
                                    style={styles.input} 
                                    placeholder="paziente@email.com" 
                                    onChange={handleChange} 
                                    required 
                                />
                            </div>
                            <p style={{fontSize: '11px', color: '#888', marginTop: '4px', marginLeft: '4px'}}>
                                Inserisci l'email del paziente per associarti subito al suo profilo.
                            </p>
                        </div>
                    )}

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Password</label>
                        <div style={styles.inputWrapper}>
                            <AppIcon name="lock" size={18} color="primary" style={styles.icon}/>
                            <input name="password" type="password" style={styles.input} placeholder="••••••••" required minLength={6} onChange={handleChange} />
                        </div>
                    </div>

                    <button type="submit" style={styles.button} disabled={loading}>
                        {loading ? 'Creazione in corso...' : 'Registrati'}
                    </button>
                </form>

                <div style={{marginTop: '20px', fontSize:'14px', color:'#666'}}>
                    Hai già un account? <Link to="/login" style={{color:'var(--color-primary)', fontWeight:'bold', textDecoration:'none'}}>Accedi</Link>
                </div>
            </div>

            <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '11px', color: '#999', lineHeight: '1.4' }}>
                Memora x Airalzh © 2026<br />
                <strong>Daniele Spalletti</strong> (sviluppatore) e <strong>Michele Mosca</strong> (web designer)<br />
                per <a href="https://www.cosmonet.info" target="_blank" style={{color: '#999', textDecoration: 'underline'}}>cosmonet.info</a>
            </div>
        </div>
    );
};

export default SignupPage;
