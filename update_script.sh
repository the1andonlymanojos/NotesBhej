#!/usr/bin/env bash
set -euo pipefail

# Next's standalone server does not load .env.local itself. Export it so PM2
# receives API_SERVER_BASE_URL (the Kubernetes NodePort) at runtime.
set -a
source .env.local
set +a

git pull
npm run build
pm2 delete notesbhej || true
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/
pm2 start .next/standalone/server.js --name notesbhej
