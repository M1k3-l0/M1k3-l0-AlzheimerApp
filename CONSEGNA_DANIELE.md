# Consegna aggiornamento Memora — per Daniele (CosmoNet)

**Data:** 16 Giugno 2026  
**Da:** Michele Mosca  
**Progetto:** Memora / AlzheimerApp

---

## Perché la Pull Request su GitHub non funziona

Il repository **M1k3-l0/AlzheimerApp** non è registrato come *fork* ufficiale di **CosmoNetinfo/AlzheimerApp** su GitHub (sono due repo indipendenti).

Per questo, quando si prova a confrontare i branch, GitHub mostra:

> *"There isn't anything to compare"*

Non è un errore nel codice: GitHub non riesce a collegare le due storie git per aprire una PR cross-repo automatica.

---

## Cosa contiene l'aggiornamento

- Audit sicurezza **client** (auth sessione, logout, debug solo dev)
- Privacy pazienti (email/posizione non nascondibili)
- Pulizia codice e asset duplicati
- Documento **`SICUREZZA_E_RACCOMANDAZIONI.md`** ← **leggere per primo**
- Bozza SQL RLS: `sql_updates/security_rls_hardening.sql`
- Changelog in `PROGETTO_RECAP.md`

**Diff rispetto a CosmoNet `main`:** ~47 file, ~2300 righe aggiunte.

---

## Opzione A — ZIP (più semplice)

Michele invia il file:

`Memora-giugno-2026.zip`

Dopo estrazione:

```bash
cd AlzheimerApp-main
npm install
cp .env.example .env   # se serve, con le chiavi Supabase
npm run dev
```

---

## Opzione B — Clone repo Michele e merge manuale

```bash
git clone https://github.com/M1k3-l0/AlzheimerApp.git memora-mike
cd memora-mike
git checkout main
npm install && npm run dev
```

Poi integrare in CosmoNetinfo/AlzheimerApp con merge/cherry-pick o copia file.

Commit di riferimento sul fork Michele:

- `46079c8` — audit sicurezza, pulizia, documentazione
- `a0ac0b2` — istruzioni PR

Base comune con CosmoNet `main`: `4cbef5c`

---

## Opzione C — Patch git (per chi usa terminale)

File patch generato da Michele (se presente nella consegna):

`memora-giugno-2026.patch`

```bash
cd AlzheimerApp   # clone CosmoNetinfo/AlzheimerApp
git checkout main
git pull
git apply --check ../memora-giugno-2026.patch
git apply ../memora-giugno-2026.patch
git status
npm install && npm run build
```

---

## Opzione D — Accesso diretto (consigliata per il futuro)

Daniele aggiunge **M1k3-l0** come collaboratore su **CosmoNetinfo/AlzheimerApp**, oppure Michele fa un **fork ufficiale** da GitHub (Fork button) e poi apre PR normalmente.

---

## Priorità backend (Daniele)

Vedi **`SICUREZZA_E_RACCOMANDAZIONI.md`** — in sintesi:

1. Applicare RLS su Supabase (`sql_updates/security_rls_hardening.sql`)
2. Bloccare scelta ruolo medico in signup
3. Verificare che `exec_sql` non sia pubblico con anon key

---

## Contatti

- Michele Mosca — UI/frontend  
- Daniele Spalletti — backend / Supabase  
- CosmoNet: info@cosmonet.info
