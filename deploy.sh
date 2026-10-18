#!/usr/bin/env bash
# One-command production update for the aaPanel host.
#
# Process model in production:
#   - web app  -> aaPanel Node Project "shehabw1" (runs `npm run start -- -p 3000`
#                 as user www, Boot enabled). Restarted from the aaPanel UI —
#                 this script rebuilds but does NOT restart it (see below).
#   - scraper  -> systemd service `asaar-scraper` (restarted here automatically)
#   - aaPanel  -> Nginx reverse-proxy (-> 127.0.0.1:3000) + SSL
#
# Do NOT run a systemd `asaar-web` service alongside the Node Project — they
# race for port 3000 on reboot (one crash-loops on EADDRINUSE). Pick one; prod
# uses the Node Project.
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

# The web app is managed by the aaPanel Node Project, which has no reliable CLI
# restart, so we deliberately do NOT touch it here (and must not start a stray
# systemd asaar-web — it would fight the panel for port 3000). The new .next
# build only goes live after you Restart the Node Project in the panel.

echo "==> Restarting the scraper daemon"
if systemctl cat asaar-scraper.service &>/dev/null; then
  systemctl restart asaar-scraper
  echo "    asaar-scraper restarted"
else
  echo "    (asaar-scraper.service not found — skipped)"
fi

echo
echo "=================================================================="
echo "  Build complete. ONE manual step remains:"
echo "    aaPanel -> Node Project -> shehabw1 -> Restart"
echo "  The new web build serves stale chunk URLs (white page) until you do."
echo "=================================================================="
