# 🗄️ Configurazione Database Supabase

Ho già installato tutto il necessario nel progetto. Ora tocca a te creare il database!

---

## ⚠️ Se vedi "Failed to fetch" in Registrazione/Login

1. **File `.env`** (nella root del progetto, non `.env.local`): deve contenere **valori veri** copiati da Supabase, non placeholder:
   - `VITE_SUPABASE_URL` = l’URL del progetto (es. `https://abcdefgh.supabase.co`)
   - `VITE_SUPABASE_ANON_KEY` = la chiave **anon public** (lunga, inizia con `eyJ...`)
2. **Supabase Dashboard → Authentication → URL Configuration**:
   - **Site URL**: per sviluppo metti `http://localhost:5173` (o l’URL da cui apri l’app)
   - **Redirect URLs**: aggiungi `http://localhost:5173`, `http://localhost:5173/**` e, in produzione, il tuo dominio (es. `https://alzheimerapp-chi.vercel.app/**`)
3. Riavvia il server dopo aver modificato `.env`: `npm run dev`

---

## Passo 1: Crea il Progetto
1. Vai su **[database.new](https://database.new)** (si apre Supabase).
2. Fai login con **GitHub** (stesso account che usi per il codice).
3. Clicca **"New Project"**.
4. Compila:
   - **Name**: `AlzheimerApp`
   - **Database Password**: Scrivine una qualsiasi (salvala da qualche parte).
   - **Region**: Scegli quello più vicino (es. Frankfurt).
5. Clicca **"Create new project"** e aspetta 1-2 minuti.

## Passo 2: Copia le Chiavi Segrete
Una volta pronto il progetto:
1. Vai nella sezione **"Settings"** (ingranaggio nella sidebar).
2. Clicca su **"API"**.
3. Copia questi due valori:
   - **URL** (sotto "Project URL") → Es. `https://xxxxx.supabase.co`
   - **anon public** (sotto "Project API keys") → Chiave lunga che inizia con `eyJ...`

## Passo 3: Inserisci le Chiavi nel Progetto
1. Nella **root del progetto** crea il file **`.env`** (se non esiste).
2. Incolla le **chiavi vere** (copia-incolla da Supabase, niente placeholder):
```
VITE_SUPABASE_URL=https://TUO_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc... (tutta la chiave "anon public")
```
3. Riavvia il server dopo aver salvato: `npm run dev`.

## Passo 4: Crea le Tabelle
1. In Supabase vai su **SQL Editor**.
2. Apri il file **`sql_updates/setup_tables_complete.sql`** del progetto, copia tutto il contenuto, incollalo nell’editor e clicca **Run**.

Lo script crea (o aggiorna) le tre tabelle usate dall’app:
- **messages** – chat (id, created_at, text, sender_name, sender_id)
- **posts** – feed MemoraBook (id, created_at, author, **author_id**, **author_photo**, text, **image**, likes)
- **comments** – commenti sotto i post (id, post_id, created_at, author_name, author_id, author_photo, text, likes)

Se hai già creato `messages` e `posts` a mano, lo script aggiunge le colonne mancanti a `posts` (author_id, author_photo, image) e crea la tabella `comments`.

## Passo 5: Abilita Auth e trigger profilo (per Registrazione/Login)
1. In Supabase vai su **SQL Editor**.
2. Esegui lo script **`sql_updates/ENABLE_AUTH.sql`** (copia il contenuto e incollalo nell’editor, poi Run). Così alla registrazione viene creato automaticamente il profilo in `profiles`.

## Passo 6: Configura gli URL per l’Auth
1. In Supabase vai su **Authentication** → **URL Configuration**.
2. **Site URL**: imposta `http://localhost:5173` (per sviluppo) o il tuo dominio in produzione.
3. **Redirect URLs**: aggiungi almeno:
   - `http://localhost:5173`
   - `http://localhost:5173/**`
   (In produzione aggiungi anche il dominio Vercel, es. `https://alzheimerapp-chi.vercel.app/**`.)

### Passo 8: Configura lo Storage (Foto Profilo)
Per permettere il caricamento della foto profilo, devi creare un bucket pubblico:

1. In Supabase vai su **SQL Editor**.
2. Esegui lo script **`sql_updates/storage_setup.sql`** (copia il contenuto, incollalo nell’editor e clicca **Run**).
3. Questo creerà il bucket `avatars` e imposterà i permessi pubblici per la lettura e l'upload.

---

## Checklist rapida
| Step | Azione |
|------|--------|
| 1 | Crea progetto Supabase (database.new) |
| 2 | Copia URL e anon key in `.env` |
| 3 | SQL Editor: esegui `setup_tables_complete.sql` |
| 4 | SQL Editor: esegui `ENABLE_AUTH.sql` |
| 5 | SQL Editor: esegui `storage_setup.sql` (Storage Foto) |
| 6 | Authentication → URL Configuration (Site URL + Redirect URLs) |
| 7 | `npm run dev` e prova Registrazione / Login |
| 8 | SQL Editor: esegui `storage_setup.sql` (Storage Foto) |
| 9 | UptimeRobot: configura monitor porta 443 (Keep Alive) |

---

## Passo 9: Mantenere il database attivo (UptimeRobot)
Supabase (piano gratuito) mette in pausa il database dopo 7 giorni di inattività. Per evitarlo, usa **UptimeRobot**:

1. Crea un account su [UptimeRobot.com](https://uptimerobot.com).
2. Clicca su **"+ Add New Monitor"**.
3. **Monitor Type**: Seleziona **"Port"** (Importante: non usare HTTP/s).
4. **Friendly Name**: `Supabase Keep Alive`
5. **IP or Host**: `naqwhpgtawbsdhuogrgp.supabase.co` (senza https://)
6. **Port**: `443`
7. **Monitor Interval**: `5 minutes` (o quello che preferisci).
8. Clicca **"Create Monitor"**.

**Perché porta 443?**
Monitorare l'URL con HTTP/s dà spesso errore **404** o **401** perché Supabase non ha una pagina web nella "root". Monitorando la porta **443**, verifichiamo che il server sia acceso e connesso, il che è sufficiente per tenerlo attivo.

✅ **Fatto!** Ora il tuo database non andrà più in pausa.
