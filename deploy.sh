#!/usr/bin/env bash
# One-command production update for the aaPanel host.
#
# Process model in production:
#   - web app  -> systemd service `asaar-web`     (restarted here automatically)
#   - scraper  -> systemd service `asaar-scraper` (restarted here automatically)
#   - aaPanel  -> Nginx reverse-proxy + SSL only
#
# Run as root from the project root:  bash deploy.sh
# The gitignored .env files (DB, domain, secrets) are never touched.
#
# First-time setup of the web service (once): see deploy/asaar-web.service and
# DEPLOY.md. Until that unit is installed, this script falls back to reminding
# you to restart the web app manually.
set -euo pipefail
cd "$(dirname "$0")"

echo "==> Pulling latest code from GitHub"
git fetch origin
git reset --hard origin/master

echo "==> Rebuilding the web app"
cd web
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
cd ..

echo "==> Fixing ownership so the web (www) user can read the new build"
chown -R www:www .

# Restart the web app FIRST so the freshly built .next (new build id + chunk
# hashes) is what gets served. Skipping this leaves the old server process
# serving stale chunk URLs that now 404 -> white page until a restart.
echo "==> Restarting the web app"
if systemctl cat asaar-web.service &>/dev/null; then
  systemctl restart asaar-web
  echo "    asaar-web restarted"
  WEB_RESTARTED=1
else
  echo "    (asaar-web.service not found — skipped)"
  WEB_RESTARTED=0
fi

echo "==> Restarting the scraper daemon"
if systemctl cat asaar-scraper.service &>/dev/null; then
  systemctl restart asaar-scraper
  echo "    asaar-scraper restarted"
else
  echo "    (asaar-scraper.service not found — skipped)"
fi

echo
echo "=================================================================="
if [ "$WEB_RESTARTED" = "1" ]; then
  echo "  Deploy complete. The new web build is live (asaar-web restarted)."
else
  echo "  Build complete, but asaar-web.service is NOT installed yet."
  echo "  Install it once (see DEPLOY.md), or until then restart the web"
  echo "  app manually NOW so the new build goes live and avoids a white"
  echo "  page from stale chunk URLs."
fi
echo "=================================================================="
