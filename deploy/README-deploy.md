# Deploy su un server proprio (dominio Quitebold)

Nessun Docker: l'app gira come un normale processo Node.js tramite `systemd`, con
nginx davanti come reverse proxy/TLS. Il backend è già pronto al massimo: l'unica
cosa da decidere all'atto del deploy è **quale database usare** (vedi punto 3).

## 1. Requisiti sul server

- Node.js 20+ e npm
- nginx (o un altro reverse proxy)
- Un dominio/sottodominio Quitebold puntato all'IP del server (es. `cda.quitebold.com`)
- Un database PostgreSQL raggiungibile (Supabase, o qualunque Postgres gestito/locale)

## 2. Portare il codice sul server

```bash
sudo mkdir -p /var/www/cdadecisor
sudo chown $USER:$USER /var/www/cdadecisor
git clone <url-del-repository> /var/www/cdadecisor
cd /var/www/cdadecisor
npm ci
```

## 3. Scegliere il database (il solo passaggio davvero specifico del deploy)

```bash
sudo mkdir -p /etc/cdadecisor
sudo cp .env.example /etc/cdadecisor/.env
sudo nano /etc/cdadecisor/.env
```

Compila almeno:
- `DATABASE_URL` — la connection string del database scelto. Con **Supabase**: Project
  Settings → Database → Connection string → "URI" (modalità "Transaction" per Prisma).
- `SESSION_SECRET` — genera con `openssl rand -base64 32`.
- `APP_BASE_URL` — es. `https://cda.quitebold.com`.
- `CRON_SECRET` — genera con `openssl rand -base64 32` (serve al passo 6).
- Facoltativi ma consigliati: `RESEND_API_KEY` ed `EMAIL_FROM` per l'invio email reale;
  `STORAGE_DIR` per salvare gli allegati fuori dalla cartella del progetto.

Applica lo schema al database scelto:

```bash
npx prisma migrate deploy
npm run db:seed   # solo la primissima volta, per creare l'account amministratore
```

## 4. Build e avvio come servizio

```bash
npm run build
sudo useradd -r -s /usr/sbin/nologin cdadecisor   # solo la prima volta
sudo chown -R cdadecisor:cdadecisor /var/www/cdadecisor

sudo cp deploy/cdadecisor.service /etc/systemd/system/cdadecisor.service
sudo systemctl daemon-reload
sudo systemctl enable --now cdadecisor
sudo systemctl status cdadecisor
```

## 5. nginx e certificato TLS

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/cdadecisor
sudo ln -s /etc/nginx/sites-available/cdadecisor /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d cda.quitebold.com   # richiede certbot già installato
```

## 6. Cron per pubblicazione giornaliera e verbali periodici

L'app aggiorna comunque lo stato ad ogni visita, ma se può restare per ore senza
traffico conviene un cron esterno che lo garantisca comunque:

```bash
crontab -e
```

Aggiungi:

```
*/15 * * * * curl -fsS -H "Authorization: Bearer IL_TUO_CRON_SECRET" https://cda.quitebold.com/api/cron/tick >/dev/null
```

## 7. Verifica

- `https://cda.quitebold.com/api/health` deve rispondere `{"ok":true,"database":"up"}`.
- Accedi con l'email dell'amministratore creato dal seed e valida/aggiungi i membri reali.

## Aggiornare l'app in seguito

```bash
cd /var/www/cdadecisor
git pull
npm ci
npx prisma migrate deploy
npm run build
sudo systemctl restart cdadecisor
```
