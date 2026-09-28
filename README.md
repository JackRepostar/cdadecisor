# CdaDecisor

Applicativo per l'approvazione delle richieste di un Consiglio di Amministrazione: proposte,
voto motivato, pareri consultivi dello staff, registro delle delibere, pubblicazione
giornaliera in blocco (dopo le 15:00) e verbali periodici con predisposizione alla firma
elettronica del Presidente.

## Stack

- **Next.js 16** (App Router, Server Actions) + TypeScript + Tailwind CSS 4
- **PostgreSQL locale** (via Homebrew) + **Prisma 6** come ORM
- **Autenticazione passwordless** (magic link) fatta in casa: cookie di sessione firmato con
  [`jose`](https://github.com/panva/jose), nessuna dipendenza esterna
- Allegati salvati su filesystem locale (`storage/uploads/`, fuori da `public/`) e serviti da una
  route protetta
- Email **non inviate davvero** in questa fase: ogni notifica viene registrata nel database e
  loggata in console, consultabile dall'app stessa (vedi sotto)

## Requisiti locali

- Node.js 20+ (già installato)
- PostgreSQL — installato via Homebrew: `brew install postgresql@16`

## Avvio rapido

```bash
# 1. Assicurati che Postgres sia avviato
brew services start postgresql@16

# 2. Installa le dipendenze (solo la prima volta o dopo un pull)
npm install

# 3. Applica le migrazioni al database
npx prisma migrate dev

# 4. Popola il database con i dati demo
npm run db:seed

# 5. Avvia il server di sviluppo
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

## Account demo (dopo `npm run db:seed`)

| Ruolo | Email | Stato |
|---|---|---|
| Amministratore | `admin@azienda.it` | — |
| Presidente (CdA) | `elena.ferraris@azienda.it` | Verificata |
| Consigliere (CdA) | `marco.vitali@azienda.it` | Verificata |
| Consigliere (CdA) | `giulia.romano@azienda.it` | Verificata |
| Consigliere Delegato (CdA) | `davide.conti@azienda.it` | Verificata |
| Consigliere Indipendente (CdA) | `sara.bianchi@azienda.it` | Verificata |
| Consigliere (CdA) | `luca.moretti@azienda.it` | **In attesa di validazione** |
| Staff (consulente esterno) | `paolo.greco@studiolegaleesterno.it` | Attivo |
| Staff (interno) | `anna.deluca@azienda.it` | Attivo |

Non esistono password: nella pagina di login inserisci una di queste email. In sviluppo nessuna
email parte davvero — il link di accesso viene mostrato direttamente a schermo (e loggato nel
terminale del server).

## Pubblicazione giornaliera e verbali periodici

- **Le richieste non sono visibili in tempo reale.** Nascono come bozza e vengono pubblicate
  tutte insieme al Consiglio dopo le 15:00 (ora del server), quando arriva la prima visita
  successiva alla soglia (nessun cron esterno: vedi `src/lib/publish.ts`). Chi crea una
  richiesta vede un avviso con l'orario previsto di pubblicazione.
- **Ogni 30 giorni** (`src/lib/minutes.ts`) viene generato in automatico un verbale con tutte
  le delibere chiuse nel periodo (argomento, votanti, motivazioni, pareri staff, allegati) e
  inviato — cioè registrato, in questa fase di sviluppo — a tutti i membri del CdA. Consultabile
  da "Verbali".
- **Presidente e firma elettronica**: da "Gestione membri" l'Amministratore designa un
  Presidente tra i membri BOARD verificati (uno alla volta). Solo il Presidente vede, nel
  proprio Profilo, la sezione per collegare una firma elettronica e può poi firmare i verbali.
  Nessun provider reale è collegato: è una predisposizione dimostrativa pensata per essere
  sostituita da un vero Qualified Trust Service Provider (firma qualificata) in futuro.
- **PDF ufficiale del verbale**: ogni verbale è scaricabile in PDF (`/verbali/[id]/pdf`,
  generato con `@react-pdf/renderer` in `src/lib/minutes-pdf.tsx`) con intestazione
  societaria, numerazione progressiva, elenco del CdA in carica, ogni delibera con voti e
  motivazioni, ed eventuale nota di firma — pronto per l'inserimento nel registro cartaceo o
  digitale dei verbali aziendali. I dati societari (ragione sociale, sede legale, P.IVA) si
  impostano da "Impostazioni" (solo Amministratore).

## Pronto per il deploy sul server Quitebold

Il backend è già stato portato al limite massimo di predisposizione: **l'unico
passaggio davvero specifico del deploy è scegliere il database** (compilando
`DATABASE_URL` in produzione — probabilmente Supabase). Tutto il resto è già
implementato, non solo predisposto:

- **Invio email reale** già cablato (`src/lib/email-sender.ts`, via l'API HTTP di
  Resend): si attiva da solo non appena `RESEND_API_KEY` è impostata nell'ambiente,
  in tutti e tre i punti che inviano email (login, notifiche richieste, verbali).
  Senza quella chiave l'app resta in modalità "solo log/anteprima", comoda per test.
- **Pubblicazione giornaliera e verbali senza bisogno di traffico**: oltre al
  controllo che scatta ad ogni pagina visitata, l'endpoint `/api/cron/tick`
  (protetto da `CRON_SECRET`) è pensato per essere chiamato da un cron del server,
  così la pubblicazione delle 15:00 e i verbali ogni 30 giorni avvengono puntuali
  anche senza nessun visitatore.
- **`/api/health`**: endpoint di controllo per il reverse proxy/monitoraggio, con
  verifica reale della connessione al database.
- **Allegati** già configurabili su un percorso persistente diverso da quello del
  progetto tramite `STORAGE_DIR` (utile per backup dedicati su un server proprio).
- **`next.config.ts`** già pronto per girare dietro nginx: header per lo streaming,
  origin consentite per i Server Action calcolate automaticamente da `APP_BASE_URL`.
- **Firma elettronica**: i campi (`Member.signatureProvider`/`signatureConnectedAt`,
  `Minutes.signedAt`/`signedByMemberId`) e tutto il flusso applicativo sono pronti;
  resta da sostituire solo la simulazione in `src/app/(app)/profilo/actions.ts` e
  `src/app/(app)/verbali/actions.ts` con un vero provider di firma qualificata
  (InfoCert, Aruba, Namirial…) quando sarà il momento.

**Guida completa al deploy** (server proprio, dominio Quitebold, senza Docker):
[`deploy/README-deploy.md`](deploy/README-deploy.md) — include anche un file
systemd (`deploy/cdadecisor.service`) e una configurazione nginx di esempio
(`deploy/nginx.conf.example`). Tutte le variabili d'ambiente sono documentate in
[`.env.example`](.env.example).

Genera sempre un `SESSION_SECRET` nuovo e casuale per la produzione (quello in
`.env` è solo per lo sviluppo locale).

## Struttura del progetto

```
prisma/schema.prisma        Modello dati (membri, proposte, voti, pareri, allegati, verbali, notifiche)
prisma/seed.ts               Dati demo
src/lib/                     Logica di dominio (auth, sessione, magic link, email, allegati,
                              pubblicazione giornaliera, generazione verbali)
src/app/(auth)/login         Pagina di accesso
src/app/auth/verifica        Verifica del magic link
src/app/(app)/               Area autenticata (layout con navigazione per ruolo)
  richieste/                 Home del CdA, dettaglio, nuova richiesta, anteprima email
  registro/                  Storico delle delibere con filtri
  verbali/                   Verbali periodici, firma del Presidente, anteprima email
  profilo/                   Dati account; per il Presidente, collegamento firma elettronica
  assegnate/                 Richieste assegnate allo staff
  admin/membri/              Gestione membri e designazione del Presidente (solo Amministratore)
src/app/api/allegati/[id]/   Download protetto degli allegati
storage/uploads/             Allegati caricati (non versionato)
```
