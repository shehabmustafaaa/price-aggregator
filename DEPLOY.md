# Clean deploy on aaPanel (Linux)

A reproducible from-scratch setup. Process model: **aaPanel provides the
domain, Nginx reverse-proxy, and SSL only** — the Node app and the Python
scraper are both run under **pm2** (not an aaPanel "Node Project", which
conflicts with pm2). Project root on the host: `/www/wwwroot/shehabw1`.

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
pm2 delete all && pm2 save --force
pkill -f next-server; pkill -f 'next start'; pkill -f 'main.py daemon' || true
```
If the site was created as an **aaPanel Node Project**, open aaPanel →
Node Project and **delete that project** (so it stops respawning).

## 2. Remove the old files (DB is separate — untouched)
```bash
cd /www/wwwroot && rm -rf shehabw1
```

## 3. Prerequisites (verify once)
```bash
node -v          # 20+  (aaPanel Node manager or nvm)
npm i -g pm2     # process manager
python3 --version# 3.11+
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

## 6. Build + run the web app under pm2
```bash
cd /www/wwwroot/shehabw1/web
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 start npm --name web -- run start     # serves on port 3000
```

## 7. Run the scraper under pm2
```bash
cd /www/wwwroot/shehabw1/scraper
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
pm2 start ".venv/bin/python main.py daemon --poll 30" --name scraper-daemon
pm2 save
```
> B.TECH (needs a browser) and 2B (blocks the server IP) can't run on the
> server — leave them **disabled** in `/admin/scraper` and run them from your
> home PC (`main.py 2b`) pointing `scraper/.env` `INGEST_URL` at the live domain.

## 8. aaPanel site (Nginx) — one-time
- Website → shehabw1.space → **Reverse proxy** to `http://127.0.0.1:3000`.
- In the site's Nginx config add: `client_max_body_size 20M;` (large ingest POSTs).
- Enable **SSL** (Let's Encrypt) and Force HTTPS.

## 9. Verify
```bash
pm2 list                 # web + scraper-daemon both "online"
```
- Open https://shehabw1.space → the scraper page shows ONE "Save all settings".
- In `/admin/scraper`, uncheck **B.TECH** and **2B**, Save.
- Click **Run now** on Dream2000, then open its run number to see the per-URL audit.

## Updating later (after this clean setup)
```bash
cd /www/wwwroot/shehabw1 && git reset --hard origin/master && bash deploy.sh
```
`deploy.sh` rebuilds and runs `pm2 restart all`, which now restarts **both**
`web` and `scraper-daemon`.
