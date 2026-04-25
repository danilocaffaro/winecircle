#!/bin/bash
# WineCircle deploy script (Oracle Cloud)
set -e

APP_DIR="/home/ubuntu/projects/winecircle/app"
WEB_DIR="/var/www/winecircle"

echo "→ Building..."
cd "$APP_DIR"
npm run build

echo "→ Deploying to $WEB_DIR..."
sudo rsync -a --delete dist/ "$WEB_DIR/"
sudo chown -R www-data:www-data "$WEB_DIR" 2>/dev/null || true

echo "→ Verifying..."
FILE_COUNT=$(find "$WEB_DIR" -type f | wc -l)
echo "  $FILE_COUNT files deployed"

echo "✅ Done — https://winecircle.melhor.dev"
