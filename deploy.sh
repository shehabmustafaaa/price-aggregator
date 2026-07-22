#!/usr/bin/env bash
# One-command production update for the aaPanel host.
#
# Process model in production:
#   - web app  -> aaPanel Node Project (restart from the aaPanel UI)
#   - scraper  -> systemd service `asaar-scraper` (restarted here automatically)
#   - aaPanel  -> Nginx reverse-proxy + SSL
#
# Run as root from the project root:  bash deploy.sh
# The gitignored .env files (DB, domain, secrets) are never touched.
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

echo "==> Restarting the scraper daemon"
if systemctl list-unit-files 2>/dev/null | grep -q '^asaar-scraper\.service'; then
  systemctl restart asaar-scraper
  echo "    asaar-scraper restarted"
else
  echo "    (asaar-scraper.service not found — skipped)"
fi

echo
echo "=================================================================="
echo "  Build complete. ONE manual step remains:"
echo "    aaPanel  ->  Node Project  ->  shehabw1  ->  Restart"
echo "  The new web build only goes live after that restart."
echo "=================================================================="
