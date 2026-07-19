#!/usr/bin/env bash
# deploy.sh — ship the repo to the VPS and rebuild/restart the app there.
# (Phase 6 of planning/07-VPS-MIGRATION.md)
#
# Run FROM YOUR DEV MACHINE at the repo root:
#   WEB_DEPLOY_HOST=root@<box-ip> bash web/deploy/deploy.sh
#
# Prerequisites on the box: provision.sh has been run and /etc/rightcourtsc/env filled in.
# Builds on the box (needs ~2GB free RAM — CX22-class or better is fine).
set -euo pipefail

HOST="${WEB_DEPLOY_HOST:?Set WEB_DEPLOY_HOST, e.g. WEB_DEPLOY_HOST=root@1.2.3.4}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP_DIR=/opt/rightcourtsc
APP_USER=rightcourtsc

echo "==> rsync repo to $HOST:$APP_DIR"
rsync -az --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '**/node_modules' \
  --exclude 'web/.next' \
  --exclude 'web/data' \
  --exclude '.env' \
  --exclude 'web/.env.local' \
  --exclude '.wrangler' \
  --exclude 'test-results' \
  "$REPO_ROOT/" "$HOST:$APP_DIR/"

echo "==> build + restart on the box"
ssh "$HOST" bash -s <<'REMOTE'
set -euo pipefail
cd /opt/rightcourtsc/web
# .env.local is a symlink to ../.env in the repo, which is deliberately NOT deployed
# (secrets live in the systemd EnvironmentFile). Remove it so Next doesn't load a dangling link.
rm -f .env.local
npm ci
npm run build
chown -R rightcourtsc:rightcourtsc /opt/rightcourtsc
systemctl restart rightcourtsc
sleep 3
systemctl is-active rightcourtsc
curl -sf -o /dev/null -w 'local check: http://127.0.0.1:3000/ -> %{http_code}\n' http://127.0.0.1:3000/
REMOTE

echo "==> done. Run the smoke tests in web/deploy/README.md"
