import React, { useMemo, useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import AppIcon from '../components/AppIcon';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { getMoodHistory, getMoodColor } from '../utils/moodHistory';
import { supabase } from '../supabaseClient';

const MOOD_LABELS = { happy: 'Felice', neutral: 'Neutro', sad: 'Triste' };

function aggregateByDay(history) {
  const byDay = {};
  history.forEach(({ mood, timestamp }) => {
    const d = new Date(timestamp);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!byDay[key]) byDay[key] = { happy: 0, neutral: 0, sad: 0 };
    byDay[key][mood]++;
  });
  return byDay;
}

function prevalentMood(counts) {
  if (!counts) return null;
  const { happy, neutral, sad } = counts;
  if (happy >= neutral && happy >= sad) return 'happy';
  if (sad >= neutral && sad >= happy) return 'sad';
  return 'neutral';
}

export default function ReportUmorePage() {
  const { userId } = useParams();
  const [tab, setTab] = useState('giornaliero');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const loggedInUser = JSON.parse(localStorage.getItem('alzheimer_user') || '{}');

  useEffect(() => {
    if (!loading) {
        const timer = setTimeout(() => setIsReady(true), 500);
        return () => clearTimeout(timer);
    }
  }, [loading]);

  useEffect(() => {
    const fetchHistory = async () => {
        setLoading(true);
        const targetId = userId || loggedInUser.id;
        if (!targetId) {
            setHistory(getMoodHistory());
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('mood_history')
                .select('*')
                .eq('user_id', targetId)
                .order('created_at', { ascending: false });
            
            if (!error && data) {
                setHistory(data.map(item => ({
                    mood: item.mood,
                    timestamp: new Date(item.created_at).getTime()
                })));
            } else {
                setHistory(getMoodHistory());
            }
        } catch (e) {
            console.error("Error fetching mood history", e);
            setHistory(getMoodHistory());
        } finally {
            setLoading(false);
        }
    };

    fetchHistory();
    
    window.addEventListener('patientMoodSaved', fetchHistory);
    return () => window.removeEventListener('patientMoodSaved', fetchHistory);
  }, [userId, loggedInUser.id]);

  const lastEntry = history[0] || null;
  const lastDate = lastEntry ? new Date(lastEntry.timestamp) : null;

  const monthlyData = useMemo(() => {
    const byDay = aggregateByDay(history);
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const bars = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const mood = prevalentMood(byDay[key]);
      bars.push({
        day: String(d),
        felice: (byDay[key]?.happy || 0),
        neutro: (byDay[key]?.neutral || 0),
        triste: (byDay[key]?.sad || 0),
        mood,
        color: mood ? getMoodColor(mood) : '#E5E7EB',
      });
    }
    return bars;
  }, [history]);

  const annualData = useMemo(() => {
    const byMonth = {};
    history.forEach(({ mood, timestamp }) => {
      const d = new Date(timestamp);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!byMonth[key]) byMonth[key] = { happy: 0, neutral: 0, sad: 0 };
      byMonth[key][mood]++;
    });
    const now = new Date();
    const points = [];
    for (let m = 11; m >= 0; m--) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const counts = byMonth[key] || { happy: 0, neutral: 0, sad: 0 };
      const total = counts.happy + counts.neutral + counts.sad;
      const score = total === 0 ? null : (counts.happy * 2 + counts.neutral - counts.sad * 2) / total;
      points.push({
        month: d.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' }),
        benessere: score !== null ? Math.round(score * 50 + 50) : null,
        registrazioni: total,
      });
    }
    return points;
  }, [history]);

  const styles = {
    container: { padding: 'var(--content-padding-x)', paddingBottom: '100px' },
    header: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' },
    backBtn: { padding: '8px', background: 'white', borderRadius: '50%', border: '1px solid var(--color-border)', color: 'var(--color-primary-dark)', textDecoration: 'none', display: 'flex' },
    title: { fontSize: '22px', fontWeight: '800', color: 'var(--color-primary-dark)', margin: 0 },
    tabs: { display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' },
    tab: (active) => ({
      padding: '10px 18px', borderRadius: 'var(--card-radius)', border: 'none', fontSize: '14px', fontWeight: '600',
      cursor: 'pointer', background: active ? 'var(--color-primary)' : 'white', color: active ? 'white' : 'var(--color-text-primary)',
      boxShadow: 'var(--card-shadow)',
    }),
    card: { backgroundColor: 'white', borderRadius: 'var(--card-radius)', padding: 'var(--content-padding-y)', marginBottom: '20px', boxShadow: 'var(--card-shadow)' },
    empty: { textAlign: 'center', color: 'var(--color-text-secondary)', padding: '32px 16px', fontSize: '15px' },
    dayGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', marginTop: '12px' },
    dayCell: (color) => ({ aspectRatio: '1', borderRadius: '8px', backgroundColor: color, maxWidth: '44px' }),
  };

  if (loading) {
    return (
      <div style={{ ...styles.container, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>Caricamento report...</p>
      </div>
    );
  }

  return (
    <div style={styles.container} className="last-scroll-block">
      <header style={styles.header}>
        <Link to="/" style={styles.backBtn} aria-label="Indietro"><ChevronLeft size={24} /></Link>
        <h1 style={styles.title}>Report Umore</h1>
      </header>

      <div style={styles.tabs}>
        {['giornaliero', 'mensile', 'annuale'].map((t) => (
          <button key={t} style={styles.tab(tab === t)} onClick={() => setTab(t)}>
            {t === 'giornaliero' ? 'Giornaliero' : t === 'mensile' ? 'Mensile' : 'Annuale'}
          </button>
        ))}
      </div>

      {tab === 'giornaliero' && (
        <div style={styles.card}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-primary-dark)', marginBottom: '12px' }}>Ultimo umore registrato</h2>
          {lastEntry ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {lastEntry.mood === 'happy' && <AppIcon name="grin" size={32} color={getMoodColor('happy')} />}
                {lastEntry.mood === 'neutral' && <AppIcon name="face-expressionless" size={32} color={getMoodColor('neutral')} />}
                {lastEntry.mood === 'sad' && <AppIcon name="sad" size={32} color={getMoodColor('sad')} />}
                <span style={{ fontWeight: '600', fontSize: '18px' }}>{MOOD_LABELS[lastEntry.mood]}</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-secondary)', fontSize: '15px' }}>
                <AppIcon name="calendar-lines" size={18} color="primary" />
                {lastDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })} alle {lastDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ) : (
            <p style={styles.empty}>Nessuna registrazione. Seleziona un umore dalla home per iniziare.</p>
          )}
        </div>
      )}

      {tab === 'mensile' && (
        <div style={styles.card}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-primary-dark)', marginBottom: '12px' }}>Umore per giorno (questo mese)</h2>
          {monthlyData.some((d) => d.mood) ? (
            <>
              <div style={styles.dayGrid}>
                {monthlyData.map((d, i) => (
                  <div key={i} title={`Giorno ${d.day}: ${d.mood ? MOOD_LABELS[d.mood] : 'Nessun dato'}`} style={styles.dayCell(d.color)} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: '16px', marginTop: '16px', fontSize: '13px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: getMoodColor('happy') }} /> Felice</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: getMoodColor('neutral') }} /> Neutro</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: getMoodColor('sad') }} /> Triste</span>
              </div>
              <div style={{ marginTop: '20px', height: 220, position: 'relative' }}>
                {isReady && (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
                    <BarChart data={monthlyData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip formatter={(value) => [value, 'registrazioni']} labelFormatter={(l) => `Giorno ${l}`} />
                      <Bar dataKey="felice" fill={getMoodColor('happy')} name="Felice" radius={[4, 4, 0, 0]} stackId="a" />
                      <Bar dataKey="neutro" fill={getMoodColor('neutral')} name="Neutro" radius={[4, 4, 0, 0]} stackId="a" />
                      <Bar dataKey="triste" fill={getMoodColor('sad')} name="Triste" radius={[4, 4, 0, 0]} stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </>
          ) : (
            <p style={styles.empty}>Nessun dato per questo mese. Registra l'umore dalla home.</p>
          )}
        </div>
      )}

      {tab === 'annuale' && (
        <div style={styles.card}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-primary-dark)', marginBottom: '12px' }}>Andamento del benessere (ultimi 12 mesi)</h2>
          {annualData.some((d) => d.benessere != null) ? (
            <div style={{ height: 260, position: 'relative' }}>
              {isReady && (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
                  <LineChart data={annualData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => [value != null ? `${value}%` : '—', 'Benessere']} />
                    <Line type="monotone" dataKey="benessere" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 4 }} name="Benessere" connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          ) : (
            <p style={styles.empty}>Non ci sono ancora abbastanza dati per il grafico annuale.</p>
          )}
        </div>
      )}
    </div>
  );
}
