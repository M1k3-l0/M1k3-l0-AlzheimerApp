# Pull Request — Giugno 2026

**Branch:** `feature/giugno-2026-aggiornamento`  
**Fork:** [M1k3-l0/AlzheimerApp](https://github.com/M1k3-l0/AlzheimerApp)  
**Target:** [CosmoNetinfo/AlzheimerApp](https://github.com/CosmoNetinfo/AlzheimerApp) → `main`

---

## Aprire la PR verso CosmoNet (Daniele)

> **Aggiornamento 16/06:** le modifiche sono già mergeate nel `main` del fork `M1k3-l0/AlzheimerApp`.  
> Confrontare `feature/...` vs `main` sul fork **non mostra nulla** (branch già integrato).

1. Vai al link compare (precompilato) — **usa `main` del fork, non il feature branch**:
   **https://github.com/CosmoNetinfo/AlzheimerApp/compare/main...M1k3-l0:main?expand=1**

2. Dovresti vedere **3 commit** e **~47 file** modificati → **Create pull request**.

3. Titolo suggerito:
   `Memora: audit sicurezza, pulizia codice e documentazione (Giugno 2026)`

4. Assegna la review a **Daniele Spalletti** / team CosmoNet.

5. Nel corpo della PR, indica a Daniele di leggere per primo:
   **`SICUREZZA_E_RACCOMANDAZIONI.md`**

### Impostazione manuale (Pull Request → New)

| Campo | Valore |
|-------|--------|
| **base repository** | `CosmoNetinfo/AlzheimerApp` |
| **base branch** | `main` |
| **head repository** | `M1k3-l0/AlzheimerApp` |
| **compare branch** | `main` |

---

## Contenuto principale

- Auth/logout hardened (sessione Supabase)
- Privacy pazienti (email/posizione sempre visibili)
- DebugConsole solo dev
- Pulizia codice e asset duplicati
- Changelog in `PROGETTO_RECAP.md`
- Bozza RLS: `sql_updates/security_rls_hardening.sql`

---

## Zip locale (backup)

File: `Memora/Memora-giugno-2026.zip` (senza `node_modules`, `.env`, `.git`)

Dopo estrazione: `npm install && npm run dev`

---

*Generato il 15 Giugno 2026*
