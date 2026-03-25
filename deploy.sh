#!/bin/bash
# WineCircle deploy script
# Usage: ./deploy.sh
set -e

APP_DIR="/root/.opencla/winecircle/app"
WEB_DIR="/var/www/winecircle"

echo "→ Building..."
cd "$APP_DIR"
NODE_ENV=development npm ci --silent 2>/dev/null || true
npm run build

echo "→ Deploying to $WEB_DIR..."
rsync -a --delete dist/ "$WEB_DIR/"
chown -R www-data:www-data "$WEB_DIR"

echo "→ Reloading nginx..."
nginx -t && systemctl reload nginx

echo "✅ Done — https://winecircle.REDACTED_LEGACY_HOST.sslip.io"
