#!/usr/bin/env bash
# One-command deploy for the Linux host (aaPanel).
# Usage (from the project root, e.g. /www/wwwroot/shehabw1):
#   bash deploy.sh
#
# Pulls the latest code from GitHub, installs deps, applies DB migrations,
# rebuilds the web app, and restarts it. The two .env files are gitignored,
# so your host config (DB, domain, secrets) is never touched.
set -euo pipefail

# Run from the directory this script lives in (the project root).
cd "$(dirname "$0")"

echo "==> Pulling latest code from GitHub"
git fetch origin
git reset --hard origin/master

echo "==> Building web app"
cd web
npm install
npx prisma generate
npx prisma migrate deploy
npm run build

echo "==> Restarting app"
# Restart however the app is managed. Adjust the name if yours differs.
if command -v pm2 >/dev/null 2>&1; then
  pm2 restart all
else
  echo "pm2 not found — restart the web app manually."
fi

echo "==> Done. Site updated."
