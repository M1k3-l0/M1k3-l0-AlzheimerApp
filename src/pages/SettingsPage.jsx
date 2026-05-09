import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import AppIcon from "../components/AppIcon";
import { supabase } from "../supabaseClient";

const SettingsPage = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("alzheimer_user");
    return saved ? JSON.parse(saved) : { name: "Utente", surname: "", photo: null, id: null };
  });

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  const [notifications, setNotifications] = useState(false);
  const [isDenied, setIsDenied] = useState(false);
  const [isLargeFont, setIsLargeFont] = useState(() => localStorage.getItem("setting_largeText") === "true");
  const [sosNumber, setSosNumber] = useState(() => localStorage.getItem("setting_sosNumber") || "");
  const [isEditingSos, setIsEditingSos] = useState(false);
  const [tempSos, setTempSos] = useState(sosNumber);

  useEffect(() => {
    const checkStatus = async () => {
      let status = "default";
      if (window.OneSignal) {
        status = window.OneSignal.Notifications.permission;
      } else if ("Notification" in window) {
        status = Notification.permission;
      }
      
      setNotifications(status === "granted" || status === true);
      setIsDenied(status === "denied");
    };
    
    // Controlla subito e riprova dopo 1 secondo se OneSignal sta caricando
    checkStatus();
    const timer = setTimeout(checkStatus, 1500);
    return () => clearTimeout(timer);
  }, []);

  const requestNotificationPermission = async () => {
    // Info per IOs
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;

    if (isIOS && !isStandalone) {
      alert("Per attivare le notifiche su iPhone, devi prima aggiungere l'app alla Home: premi il tasto 'Condividi' e seleziona 'Aggiungi alla schermata Home'.");
      return;
    }

    // 1. Prova via OneSignal
    if (window.OneSignal && window.OneSignal.Notifications) {
      try {
        console.log("Richiesta via OneSignal...");
        await window.OneSignal.Notifications.requestPermission();
        const hasPerm = window.OneSignal.Notifications.permission;
        setNotifications(hasPerm);
        if (hasPerm) {
          window.OneSignal.login(user.name + "_" + (user.surname || ""));
          return;
        }
      } catch (e) {
        console.error("Errore OneSignal:", e);
      }
    }

    // 2. Fallback Browser Nativo
    if (!("Notification" in window)) {
      alert("Questo browser non supporta le notifiche.");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotifications(permission === "granted");
      if (permission === "granted") {
        new Notification("Memora", { body: "Notifiche attivate correttamente!" });
      } else if (permission === "denied") {
        alert("Notifiche bloccate. Abilitale nelle impostazioni del sito nel tuo browser.");
      }
    } catch (err) {
      console.error("Errore richiesta permessi:", err);
    }
  };

  useEffect(() => {
    localStorage.setItem("setting_notifications", notifications);
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem("setting_largeText", isLargeFont);
    if (isLargeFont) document.documentElement.classList.add("large-font-mode");
    else document.documentElement.classList.remove("large-font-mode");
  }, [isLargeFont]);

  const handleLogout = () => {
    if (window.confirm("Disconnettere l'account?")) {
      localStorage.removeItem("alzheimer_user");
      window.location.href = "/login";
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target?.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const profileId = user.id || (user.name + (user.surname || ""));
    if (!profileId) return;
    setUploadingPhoto(true);
    try {
      const bucket = "avatars";
      const path = `${profileId}/avatar`;
      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
      const photoUrl = urlData?.publicUrl || null;
      await supabase.from("profiles").upsert([{
        id: profileId,
        name: user.name,
        surname: user.surname,
        role: user.role,
        photo_url: photoUrl
      }]);
      const updated = { ...user, photo: photoUrl };
      setUser(updated);
      localStorage.setItem("alzheimer_user", JSON.stringify(updated));
      window.dispatchEvent(new Event("storage"));
    } catch (err) {
      console.error("Errore upload foto:", err);
      alert('Impossibile caricare la foto. Verifica che il bucket "avatars" esista in Supabase con accesso pubblico.');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const styles = {
    container: { backgroundColor: "var(--color-bg-primary)", minHeight: "100%", padding: "var(--content-padding-x)", paddingBottom: "120px", width: "100%", maxWidth: "100%", minWidth: 0, boxSizing: "border-box", overflowX: "hidden" },
    header: { display: "flex", alignItems: "center", marginBottom: "var(--section-gap)", gap: "12px" },
    backBtn: { padding: "8px", background: "white", borderRadius: "50%", color: "var(--color-primary-dark)", border: "none", boxShadow: "var(--card-shadow)" },
    pageTitle: { fontSize: "24px", fontWeight: "800", color: "var(--color-primary-dark)", margin: 0 },
    profileSection: { backgroundColor: "white", borderRadius: "var(--card-radius)", padding: "var(--content-padding-y)", display: "flex", alignItems: "center", gap: "16px", marginBottom: "var(--section-gap)", border: "1px solid var(--color-border)", boxShadow: "var(--card-shadow)" },
    avatarWrap: { position: "relative", background: "none", border: "none", padding: 0, cursor: "pointer", display: "block", flexShrink: 0 },
    avatar: { width: "60px", height: "60px", borderRadius: "50%", backgroundColor: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", overflow: "hidden" },
    avatarOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.5)", color: "white", fontSize: "10px", padding: "2px", display: "flex", alignItems: "center", justifyContent: "center", gap: "2px", borderBottomLeftRadius: "50%", borderBottomRightRadius: "50%" },
    sectionLabel: { fontSize: "13px", fontWeight: "700", color: "var(--color-primary-dark)", textTransform: "uppercase", margin: "0 0 8px 12px", opacity: 0.7 },
    menuCard: { backgroundColor: "white", borderRadius: "var(--card-radius)", overflow: "hidden", marginBottom: "var(--section-gap)", border: "1px solid var(--color-border)", boxShadow: "var(--card-shadow)", maxWidth: "100%", boxSizing: "border-box" },
    menuItem: { display: "flex", alignItems: "center", padding: "16px", borderBottom: "1px solid var(--color-bg-primary)", cursor: "pointer", justifyContent: "space-between", background: "none", width: "100%", textAlign: "left", border: "none" },
    iconWrapper: (color) => ({ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: color, display: "flex", alignItems: "center", justifyContent: "center", color: "white", marginRight: "12px" }),
    itemLabel: { fontSize: "17px", fontWeight: "600", color: "var(--color-text-primary)" },
    switch: (isOn) => ({ width: "51px", height: "31px", backgroundColor: isOn ? "--color-success" : "#E9E9EA", borderRadius: "16px", position: "relative" }), // Using color variables or defaults
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modal: { backgroundColor: 'white', borderRadius: 'var(--card-radius-lg)', padding: 'var(--content-padding-y)', width: '90%', maxWidth: '400px', boxShadow: 'var(--card-shadow)' },
    primaryBtn: { width: '100%', padding: '16px', backgroundColor: 'var(--color-primary)', color: 'white', borderRadius: '14px', fontSize: '18px', fontWeight: 'bold' }
  };

  return (
    <div style={styles.container} className="last-scroll-block">
      <div style={styles.header}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}><ChevronLeft size={24} /></button>
        <h1 style={styles.pageTitle}>Impostazioni</h1>
      </div>

      <div style={styles.profileSection}>
        <input type="file" ref={fileInputRef} accept="image/*" onChange={handlePhotoChange} hidden />
        <button type="button" style={styles.avatarWrap} onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto} aria-label="Cambia foto profilo">
          <div style={styles.avatar}>
            {user.photo && typeof user.photo === 'string' && user.photo.startsWith('http') ? <img src={user.photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="Profilo" /> : <AppIcon name="user" size={30} color="white" />}
          </div>
          <span style={styles.avatarOverlay}>
            <AppIcon name="camera" size={14} color="white" />
            {uploadingPhoto ? "..." : "Cambia"}
          </span>
        </button>
        <div>
            <h2 style={{ fontSize: "18px", margin: 0, fontWeight: '700', color: 'var(--color-primary-dark)' }}>{user.name} {user.surname}</h2>
            <p style={{ color: "var(--color-primary)", margin: 0, fontSize: "14px", fontWeight: '500' }}>Account Caregiver</p>
          </div>
      </div>

      <h3 style={styles.sectionLabel}>Personalizzazione</h3>
      <div style={styles.menuCard}>
        <button style={styles.menuItem} onClick={requestNotificationPermission}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={styles.iconWrapper("var(--color-primary)")}><AppIcon name={notifications ? 'bell' : 'bell-slash'} size={18} color="white" /></div>
            <div>
              <span style={styles.itemLabel}>Notifiche Push</span>
              <div style={{fontSize: '12px', color: '#888'}}>{notifications ? 'Attivate' : 'Clicca per attivare'}</div>
            </div>
          </div>
          <div style={{...styles.switch(notifications), backgroundColor: notifications ? 'var(--color-success)' : '#ddd'}}><div style={{width: 27, height: 27, background: 'white', borderRadius: '50%', position: 'absolute', top: 2, left: notifications ? 22 : 2, transition: '0.3s'}}/></div>
        </button>

        <button style={{ ...styles.menuItem, borderBottom: "none" }} onClick={() => setIsLargeFont(!isLargeFont)}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={styles.iconWrapper("var(--color-primary-dark)")}><AppIcon name="text" size={18} color="white" /></div>
            <span style={styles.itemLabel}>Caratteri Grandi</span>
          </div>
          <div style={{...styles.switch(isLargeFont), backgroundColor: isLargeFont ? 'var(--color-success)' : '#ddd'}}><div style={{width: 27, height: 27, background: 'white', borderRadius: '50%', position: 'absolute', top: 2, left: isLargeFont ? 22 : 2, transition: '0.3s'}}/></div>
        </button>

        <button style={styles.menuItem} onClick={() => navigate('/guida')}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={styles.iconWrapper("var(--color-primary)")}><AppIcon name="book" size={18} color="white" /></div>
            <span style={styles.itemLabel}>Guida all'Uso</span>
          </div>
          <ChevronRight size={20} color="#ccc" />
        </button>
      </div>

      {isDenied && (
        <div style={{ backgroundColor: '#FFFEEB', border: '1px solid #FFE58F', borderRadius: '16px', padding: '16px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#856404' }}>
            <AppIcon name="shield-exclamation" size={20} color="accent" />
            <span style={{ fontWeight: '700' }}>Notifiche Bloccate</span>
          </div>
          <p style={{ fontSize: '14px', color: '#856404', margin: '0 0 12px 0', lineHeight: '1.4' }}>
            Hai disattivato le notifiche per questa app. Ecco come riattivarle:
          </p>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '12px', fontSize: '13px' }}>
            {/iPad|iPhone|iPod/.test(navigator.userAgent) ? (
              <ol style={{ paddingLeft: '20px', margin: 0 }}>
                <li>Vai nelle <b>Impostazioni</b> del tuo iPhone.</li>
                <li>Tocca <b>Notifiche</b>.</li>
                <li>Trova <b>Memora</b> nell'elenco.</li>
                <li>Attiva l'interruttore <b>Consenti notifiche</b>.</li>
              </ol>
            ) : (
              <ol style={{ paddingLeft: '20px', margin: 0 }}>
                <li>Tocca l'icona del <b>lucchetto</b> accanto all'indirizzo in alto.</li>
                <li>Seleziona <b>Impostazioni sito</b> o <b>Autorizzazioni</b>.</li>
                <li>Trova <b>Notifiche</b> e imposta su <b>Consenti</b>.</li>
                <li>Ricarica questa pagina.</li>
              </ol>
            )}
          </div>
        </div>
      )}

      <h3 style={styles.sectionLabel}>Sicurezza</h3>
      <div style={styles.menuCard}>
        <button style={styles.menuItem} onClick={() => { if(!sosNumber) setIsEditingSos(true); else window.location.href=`tel:${sosNumber}`; }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={styles.iconWrapper("var(--color-accent)")}><AppIcon name="shield-exclamation" size={18} color="white" /></div>
            <div>
              <span style={styles.itemLabel}>Contatto SOS</span>
              <div style={{fontSize: '12px', color: '#888'}}>{sosNumber ? `Chiama: ${sosNumber}` : 'Non impostato'}</div>
            </div>
          </div>
          <ChevronRight size={20} color="#ccc" />
        </button>

        <button style={{ ...styles.menuItem, borderBottom: "none" }} onClick={() => window.location.href="tel:02809767"}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={styles.iconWrapper("var(--color-success)")}><AppIcon name="shield-check" size={18} color="white" /></div>
            <span style={styles.itemLabel}>Pronto Alzheimer</span>
          </div>
          <AppIcon name="phone-call" size={18} color="success" />
        </button>
      </div>

      {isEditingSos && (
          <div style={styles.modalOverlay}>
              <div style={styles.modal}>
                  <h3 style={{ color: 'var(--color-primary-dark)', marginBottom: '8px' }}>Imposta numero SOS</h3>
                  <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>Il numero che potrai chiamare rapidamente in caso di bisogno.</p>
                  <input style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #ddd', fontSize: '18px', marginBottom: '20px' }} type="tel" value={tempSos} onChange={(e)=>setTempSos(e.target.value)} placeholder="Esempio: 333..." />
                  <button style={styles.primaryBtn} onClick={() => { localStorage.setItem("setting_sosNumber", tempSos); setSosNumber(tempSos); setIsEditingSos(false); }}>Salva Numero</button>
                  <button style={{ width: '100%', padding: '14px', background: 'none', color: '#888', marginTop: '8px' }} onClick={() => setIsEditingSos(false)}>Annulla</button>
              </div>
          </div>
      )}

      <button style={{ width: '100%', padding: '18px', background: 'white', color: 'var(--color-error)', borderRadius: '16px', fontWeight: 'bold', border: '1px solid var(--color-error)' }} onClick={handleLogout}>
        Esci dall'Account
      </button>

      <div style={{ textAlign: "center", marginTop: "40px", color: "#888", fontSize: "12px", lineHeight: "1.6" }}>
        Memora x Airalzh &copy; 2026<br />
        <strong>Daniele Spalletti</strong> (sviluppatore) e <strong>Michele Mosca</strong> (web designer)<br />
        per <a href="https://www.cosmonet.info" target="_blank" style={{color: '#888', textDecoration: 'underline'}}>cosmonet.info</a>
      </div>
    </div>
  );
};

export default SettingsPage;
