# 🚀 Deploy Finale su Vercel (con Database)

Il codice è aggiornato su GitHub. Ora dobbiamo configurare Vercel per il database.

## Passo 1: Vai sul tuo progetto Vercel
1. Vai su **[vercel.com](https://vercel.com)** e fai login.
2. Clicca sul progetto **`alzheimer-app`** (o come l'hai chiamato).
3. Clicca su **"Settings"** (in alto).

## Passo 2: Aggiungi le Variabili d'Ambiente
1. Nel menu a sinistra, clicca su **"Environment Variables"**.
2. Aggiungi queste **2 variabili** (una alla volta):

### Seconda Variabile:
- **Key**: `VITE_SUPABASE_ANON_KEY`
- **Value**: `sb_publishable_ygC9dAD655aIEekWG1UOwQ_ywOE75jB`
- Spunta tutte le caselle
- Clicca **"Save"**

### Terza Variabile:
- **Key**: `VITE_SITE_URL`
- **Value**: `https://alzheimerapp-chi.vercel.app`
- Spunta tutte le caselle
- Clicca **"Save"**

## Passo 3: Riavvia il Deploy
1. Vai su **"Deployments"** (nel menu in alto).
2. Clicca sui tre puntini `...` accanto all'ultimo deployment.
3. Clicca **"Redeploy"**.
4. Aspetta 1-2 minuti.

🎉 **Fatto!** Il sito sarà online con Chat e Bacheca funzionanti!

Appena vedi "Ready", clicca su "Visit" e testalo!
