# Clean deploy on aaPanel (Linux)

A reproducible from-scratch setup. Process model: **aaPanel provides the
domain, Nginx reverse-proxy, and SSL only** — the Node web app and the Python
scraper are both run as **systemd services** (`asaar-web`, `asaar-scraper`).
**No pm2, and no aaPanel "Node Project"** (an aaPanel Node Project respawns the
app and fights systemd — do not create one). Project root on the host:
`/www/wwwroot/shehabw1`.

The only things you can't regenerate are the **PostgreSQL database** and the
two **`.env`** files. Back them up first; everything else comes from GitHub.

---

## 0. Back up (never skip)
```bash
# Database → a compressed dump in your home dir
pg_dump "$(grep -oP '(?<=DATABASE_URL=").*(?=")' /www/wwwroot/shehabw1/web/.env)" -Fc -f ~/asaar-db.dump

# The two config files
mkdir -p ~/asaar-env
cp /www/wwwroot/shehabw1/web/.env     ~/asaar-env/web.env
cp /www/wwwroot/shehabw1/scraper/.env ~/asaar-env/scraper.env
```

## 1. Tear down the current processes
```bash
# If migrating from an older pm2-based setup:
pm2 delete all && pm2 save --force 2>/dev/null || true
# Stop any stray processes:
pkill -f next-server; pkill -f 'next start'; pkill -f 'main.py daemon' || true
```
If the site was created as an **aaPanel Node Project**, open aaPanel →
Node Project and **delete that project** (so it stops respawning and can't
fight systemd).

## 2. Remove the old files (DB is separate — untouched)
```bash
cd /www/wwwroot && rm -rf shehabw1
```

## 3. Prerequisites (verify once)
```bash
node -v            # 20+  (aaPanel Node manager or nvm)
python3 --version  # 3.11+
systemctl --version
```
PostgreSQL must be running (it still holds your data from step 0).

## 4. Fresh clone + restore config
```bash
cd /www/wwwroot
git clone https://github.com/shehabmustafaaa/price-aggregator.git shehabw1
cd shehabw1
cp ~/asaar-env/web.env     web/.env
cp ~/asaar-env/scraper.env scraper/.env
# Confirm the domain is set (baked in at build time):
grep NEXT_PUBLIC_SITE_URL web/.env    # NEXT_PUBLIC_SITE_URL=https://shehabw1.space
# Contact page: CONTACT_EMAIL in web/.env receives contact-form mail and is shown
# as the mailto fallback (falls back to SMTP_FROM if unset).
```

## 5. Database — choose ONE
**A) Keep your data (recommended)** — the DB already exists; just apply migrations:
```bash
cd web && npx prisma migrate deploy
```
**B) Start empty** — create a fresh DB, point `web/.env` DATABASE_URL at it, then:
```bash
cd web && npx prisma migrate deploy && npx tsx prisma/seed.ts
npx tsx scripts/make-admin.ts you@example.com "a-strong-password"
```

## 6. Build the web app
```bash
cd /www/wwwroot/shehabw1/web
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
```

## 7. Set up the scraper venv
```bash
cd /www/wwwroot/shehabw1/scraper
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```
> B.TECH (needs a browser) and 2B (blocks the server IP) can't run on the
> server — leave them **disabled** in `/admin/scraper` and run them from your
> home PC (`main.py 2b`) pointing `scraper/.env` `INGEST_URL` at the live domain.

## 8. Install the two systemd services (one-time)

The web unit is versioned in the repo at [`deploy/asaar-web.service`](deploy/asaar-web.service).
Install it, and create the scraper unit:

```bash
# --- Web (Next.js) ---
cp /www/wwwroot/shehabw1/deploy/asaar-web.service /etc/systemd/system/asaar-web.service
# IMPORTANT: verify the www user can run `npm`. If not, edit the ExecStart line
# in the unit to an absolute node path (the file has instructions inline):
sudo -u www bash -lc 'which node && which npm'

# --- Scraper (Python daemon) ---
cat >/etc/systemd/system/asaar-scraper.service <<'UNIT'
[Unit]
Description=Asaar scraper daemon (polls /api/scraper/claim)
After=network.target

[Service]
Type=simple
User=www
Group=www
WorkingDirectory=/www/wwwroot/shehabw1/scraper
ExecStart=/www/wwwroot/shehabw1/scraper/.venv/bin/python main.py daemon --poll 30
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

# --- Enable + start both ---
chown -R www:www /www/wwwroot/shehabw1
systemctl daemon-reload
systemctl enable --now asaar-web asaar-scraper
systemctl status asaar-web --no-pager
systemctl status asaar-scraper --no-pager
```
> Exactly ONE scraper instance may run — systemd guarantees this. Never also
> start the daemon by hand or under pm2.

## 9. aaPanel site (Nginx) — one-time
- Website → shehabw1.space → **Reverse proxy** to `http://127.0.0.1:3000`.
- In the site's Nginx config add: `client_max_body_size 20M;` (large ingest POSTs).
- Enable **SSL** (Let's Encrypt) and Force HTTPS.

## 10. Verify
```bash
systemctl is-active asaar-web asaar-scraper   # both -> active
journalctl -u asaar-web -n 30 --no-pager      # web startup log
```
- Open https://shehabw1.space → the scraper page shows ONE "Save all settings".
- In `/admin/scraper`, uncheck **B.TECH** and **2B**, Save.
- Click **Run now** on Dream2000, then open its run number to see the per-URL audit.

## Updating later (after this clean setup)
```bash
cd /www/wwwroot/shehabw1 && bash deploy.sh
```
`deploy.sh` pulls master, rebuilds, migrates, `chown`s, then **restarts both
`asaar-web` and `asaar-scraper` automatically** — no manual step. Because the
web app is restarted right after the build, the freshly built `.next` (new
build id + chunk hashes) is what gets served; this is what prevents the
**white-page-after-deploy** problem (an old server process serving stale chunk
URLs that now 404).

### Service management cheatsheet
```bash
systemctl restart asaar-web        # restart web only
systemctl restart asaar-scraper    # restart scraper only
journalctl -u asaar-web -f         # tail web logs (e.g. to see /_next 404s)
journalctl -u asaar-scraper -f     # tail scraper logs
```
