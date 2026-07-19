#!/usr/bin/env bash
# provision.sh — one-time VPS setup for rightcourtsc.com (Phase 6 of planning/07-VPS-MIGRATION.md)
#
# Run ON THE BOX as root on a fresh Ubuntu 24.04 (or 22.04) server:
#   scp -r web/deploy root@<box-ip>:/tmp/deploy
#   ssh root@<box-ip> bash /tmp/deploy/provision.sh
#
# Idempotent: safe to re-run. Does NOT fill in secrets — edit /etc/rightcourtsc/env afterwards
# (see web/ENV.md for what each variable is).
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_USER=rightcourtsc
APP_DIR=/opt/rightcourtsc
DATA_DIR=/var/lib/rightcourtsc
ENV_DIR=/etc/rightcourtsc

echo "==> apt basics"
apt-get update -y
apt-get install -y curl ca-certificates gnupg rsync ufw

echo "==> Node.js 22 LTS (NodeSource)"
if ! command -v node >/dev/null || [[ "$(node -v)" != v22.* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
node -v; npm -v

echo "==> Caddy (official repo)"
if ! command -v caddy >/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key \
    | gpg --dearmor -o /etc/apt/keyrings/caddy-stable-archive-keyring.gpg
  curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt \
    -o /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y
  apt-get install -y caddy
fi

echo "==> app user + directories"
id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --shell /usr/sbin/nologin "$APP_USER"
mkdir -p "$APP_DIR" "$DATA_DIR" "$ENV_DIR"
chown -R "$APP_USER:$APP_USER" "$APP_DIR" "$DATA_DIR"

echo "==> env file (fill in the secrets after this script)"
if [[ ! -f "$ENV_DIR/env" ]]; then
  install -m 0600 -o root -g root /dev/stdin "$ENV_DIR/env" <<'EOF'
# See web/ENV.md in the repo for what each variable is.
OPENROUTER_API_KEY=replace-me
GOOGLE_DRIVE_API_KEY=replace-me
GALLERY_FOLDER_ID=replace-me
DATABASE_PATH=/var/lib/rightcourtsc/drills.db
EOF
  echo "    created $ENV_DIR/env — EDIT IT before starting the service"
else
  echo "    $ENV_DIR/env already exists, leaving it alone"
fi

echo "==> Caddy config"
install -m 0644 "$DEPLOY_DIR/Caddyfile" /etc/caddy/Caddyfile
systemctl enable caddy
systemctl reload caddy || systemctl restart caddy

echo "==> systemd unit"
install -m 0644 "$DEPLOY_DIR/rightcourtsc.service" /etc/systemd/system/rightcourtsc.service
systemctl daemon-reload
systemctl enable rightcourtsc   # not started yet — no code on the box until deploy.sh runs

echo "==> firewall"
ufw allow OpenSSH
ufw allow 'Caddy'   # 80 + 443
ufw --force enable

cat <<'DONE'

Provisioning complete. Next steps:
  1. Edit /etc/rightcourtsc/env with the real secrets (web/ENV.md documents each one;
     GOOGLE_DRIVE_API_KEY + GALLERY_FOLDER_ID are currently Cloudflare Worker secrets).
  2. Point DNS: A/AAAA for rightcourtsc.com (and www) at this box — do this BEFORE expecting
     Caddy to issue TLS.
  3. From your dev machine, run:  WEB_DEPLOY_HOST=root@<box-ip> bash web/deploy/deploy.sh
  4. Smoke tests are listed in web/deploy/README.md — the live /api/generate check is the
     one that could NOT be verified from the dev machine (OpenRouter region block).
DONE
