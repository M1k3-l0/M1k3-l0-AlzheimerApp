import React from 'react';
import { useNavigate } from 'react-router-dom';
import AppIcon from '../components/AppIcon';
import { BookOpen, User, Shield, Stethoscope, Heart } from 'lucide-react';

const GuidePage = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('alzheimer_user') || '{}');

    const styles = {
        container: {
            padding: '20px var(--content-padding-x) 100px',
            backgroundColor: 'var(--color-bg-primary)',
            minHeight: '100vh',
            boxSizing: 'border-box'
        },
        section: {
            backgroundColor: 'white',
            borderRadius: '24px',
            padding: '24px',
            marginBottom: '20px',
            boxShadow: 'var(--card-shadow)',
            border: '1px solid var(--color-border)'
        },
        header: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '24px',
            color: 'var(--color-primary-dark)'
        },
        title: {
            fontSize: '24px',
            fontWeight: '800',
            margin: 0
        },
        roleTitle: {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '18px',
            fontWeight: '700',
            marginBottom: '12px',
            color: 'var(--color-primary)'
        },
        text: {
            fontSize: '15px',
            lineHeight: '1.6',
            color: '#4B5563',
            marginBottom: '16px'
        },
        featureList: {
            listStyle: 'none',
            padding: 0,
            margin: 0
        },
        featureItem: {
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            marginBottom: '12px',
            fontSize: '14px'
        },
        iconBox: {
            backgroundColor: 'var(--color-bg-primary)',
            padding: '6px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
        }
    };

    return (
        <div style={styles.container} className="last-scroll-block">
            <div style={styles.header}>
                <BookOpen size={28} />
                <h1 style={styles.title}>Guida all'Utilizzo</h1>
            </div>

            {/* Sezione Generale */}
            <div style={styles.section}>
                <p style={styles.text}>
                    Benvenuto su <strong>Memora</strong>. Questa applicazione è progettata per supportare pazienti affetti da Alzheimer, i loro familiari e gli operatori sanitari in un percorso di cura condiviso e sereno.
                </p>
            </div>

            {/* Guida per Paziente */}
            <div style={styles.section}>
                <div style={styles.roleTitle}>
                    <Heart size={20} />
                    <span>Per il Paziente</span>
                </div>
                <ul style={styles.featureList}>
                    <li style={styles.featureItem}>
                        <div style={styles.iconBox}><AppIcon name="calendar-lines" size={16} color="primary" /></div>
                        <div><strong>Agenda:</strong> Consulta i tuoi impegni quotidiani e segna come completate le attività o l'assunzione di farmaci.</div>
                    </li>
                    <li style={styles.featureItem}>
                        <div style={styles.iconBox}><AppIcon name="grin" size={16} color="primary" /></div>
                        <div><strong>Umore:</strong> Condividi come ti senti selezionando l'emoji che meglio rappresenta il tuo stato d'animo.</div>
                    </li>
                    <li style={styles.featureItem}>
                        <div style={styles.iconBox}><AppIcon name="shoe-prints" size={16} color="primary" /></div>
                        <div><strong>Pillole di Benessere:</strong> Leggi ogni giorno un nuovo consiglio o una frase ispirazionale.</div>
                    </li>
                </ul>
            </div>

            {/* Guida per Caregiver */}
            <div style={styles.section}>
                <div style={styles.roleTitle}>
                    <User size={20} />
                    <span>Per il Caregiver (Familiare)</span>
                </div>
                <ul style={styles.featureList}>
                    <li style={styles.featureItem}>
                        <div style={styles.iconBox}><Shield size={16} color="primary" /></div>
                        <div><strong>Monitoraggio:</strong> Controlla in tempo reale lo stato del tuo caro, l'umore e il completamento dei task.</div>
                    </li>
                    <li style={styles.featureItem}>
                        <div style={styles.iconBox}><AppIcon name="paper-plane" size={16} color="primary" /></div>
                        <div><strong>Comunicazione:</strong> Resta in contatto con il paziente e con i medici tramite la chat privata.</div>
                    </li>
                    <li style={styles.featureItem}>
                        <div style={styles.iconBox}><AppIcon name="add" size={16} color="primary" /></div>
                        <div><strong>Gestione Task:</strong> Aggiungi o modifica le attività nell'agenda del paziente per aiutarlo a ricordare le scadenze importanti.</div>
                    </li>
                </ul>
            </div>

            {/* Guida per Medico */}
            <div style={styles.section}>
                <div style={styles.roleTitle}>
                    <Stethoscope size={20} />
                    <span>Per l'Operatore Sanitario</span>
                </div>
                <ul style={styles.featureList}>
                    <li style={styles.featureItem}>
                        <div style={styles.iconBox}><AppIcon name="chart-line" size={16} color="primary" /></div>
                        <div><strong>Dashboard Clinica:</strong> Analizza i trend del benessere e ricevi avvisi se l'umore del paziente è basso per più giorni consecutivi.</div>
                    </li>
                    <li style={styles.featureItem}>
                        <div style={styles.iconBox}><AppIcon name="pencil" size={16} color="primary" /></div>
                        <div><strong>Note Cliniche:</strong> Inserisci osservazioni mediche che saranno utili per lo storico del paziente.</div>
                    </li>
                </ul>
            </div>

            <div style={{ textAlign: 'center', padding: '20px' }}>
                <button 
                    onClick={() => navigate(-1)}
                    style={{ 
                        backgroundColor: 'var(--color-primary)', 
                        color: 'white', 
                        border: 'none', 
                        padding: '12px 24px', 
                        borderRadius: '12px', 
                        fontWeight: 'bold',
                        cursor: 'pointer'
                    }}
                >
                    Ho capito, torna indietro
                </button>
            </div>
        </div>
    );
};

export default GuidePage;
