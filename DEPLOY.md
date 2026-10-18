# Clean deploy on aaPanel (Linux)

A reproducible from-scratch setup. Process model: **aaPanel provides the
domain, Nginx reverse-proxy, and SSL only** — the Node web app and the Python
web app runs as an **aaPanel Node Project** and the scraper as a **systemd
service** (`asaar-scraper`). **No pm2.** Run exactly ONE web manager: do NOT
also install a systemd `asaar-web` unit — the Node Project and a systemd unit
race for port 3000 on reboot and one crash-loops on `EADDRINUSE`. Project root
on the host:
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

## 8a. Web app — aaPanel Node Project (one-time)

aaPanel → **Node Project** → Add, with:
- **Path**: `/www/wwwroot/shehabw1/web`
- **Run opt**: Custom command → `npm run start -- -p 3000`
- **Port**: `3000`  ·  **User**: `www`  ·  **Pkg Manager**: `npm` (not pnpm — repo uses npm)
- **Node**: v22  ·  **Boot**: ✅ "Follow the system to start the service"

Then **Start**. Verify with `ss -ltnp | grep :3000` (one node listener) — the panel's
Stopped/Running label has proven unreliable, so trust `ss`/`curl`, not the label.

> Do NOT also create a systemd `asaar-web` unit. If one exists from an earlier setup, remove it:
> `systemctl disable --now asaar-web; rm -f /etc/systemd/system/asaar-web.service; systemctl daemon-reload`
> Otherwise both grab port 3000 on reboot and one crash-loops (`EADDRINUSE`).

## 8b. Scraper — systemd service (one-time)

```bash
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

# --- Enable + start the scraper ---
chown -R www:www /www/wwwroot/shehabw1
systemctl daemon-reload
systemctl enable --now asaar-scraper
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
ss -ltnp | grep :3000                         # web: one node listener (panel-managed)
systemctl is-active asaar-scraper             # scraper -> active
curl -I https://shehabw1.space/en             # 200
```
- Open https://shehabw1.space → the scraper page shows ONE "Save all settings".
- In `/admin/scraper`, uncheck **B.TECH** and **2B**, Save.
- Click **Run now** on Dream2000, then open its run number to see the per-URL audit.

## Updating later (after this clean setup)
```bash
cd /www/wwwroot/shehabw1 && bash deploy.sh
```
`deploy.sh` pulls master, rebuilds, migrates, `chown`s, and restarts the
scraper automatically. It does **not** restart the web app (the Node Project
has no reliable CLI restart) — after it finishes, **Restart the Node Project in
the aaPanel UI** so the freshly built `.next` (new build id + chunk hashes) is
served. Skipping that leaves the old process serving stale chunk URLs → a
**white page** until you restart.

### Service management cheatsheet
```bash
# Web (aaPanel Node Project): Start/Stop/Restart from the panel. Check it with:
ss -ltnp | grep :3000              # the node process serving the site
# Scraper (systemd):
systemctl restart asaar-scraper    # restart scraper
journalctl -u asaar-scraper -f     # tail scraper logs
```
