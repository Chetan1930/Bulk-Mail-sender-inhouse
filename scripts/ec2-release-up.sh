#!/usr/bin/env bash
# Start full stack from pre-loaded mailflow-app:latest (no docker build on server).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
COMPOSE=(docker compose -f docker-compose.release.yml)

if [[ ! -f .env ]]; then
  echo "Missing .env — run: cp .env.example .env  and set JWT_SECRET + SEED_ADMIN_* + FRONTEND_URL"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a
APP_PORT="${APP_PORT:-8080}"

if ! docker image inspect mailflow-app:latest >/dev/null 2>&1; then
  echo "Image mailflow-app:latest not found."
  echo "On your laptop: ./scripts/build-release.sh"
  echo "On this server:  gunzip -c ~/mailflow-app.tar.gz | docker load"
  exit 1
fi

# Light swap helps postgres/redis under memory pressure
if [[ "$(swapon --show)" == "" ]]; then
  echo "Creating 2G swap..."
  sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

free -h
df -h /

echo "Pulling postgres/redis Alpine images..."
docker pull postgres:16-alpine
docker pull redis:7-alpine

echo "Starting stack (no build)..."
"${COMPOSE[@]}" up -d

echo "Waiting for /health ..."
ok=0
for i in $(seq 1 60); do
  if curl -sf "http://127.0.0.1:${APP_PORT:-8080}/health" >/dev/null; then
    ok=1
    break
  fi
  sleep 2
done

"${COMPOSE[@]}" ps
echo
if [[ "$ok" -eq 1 ]]; then
  curl -sS "http://127.0.0.1:${APP_PORT:-8080}/health"
  echo
  echo "UI:  http://SERVER_IP:${APP_PORT:-8080}"
  echo "Login with SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD from .env"
else
  echo "Health not ready yet — check logs:"
  echo "  ${COMPOSE[*]} logs -f app"
  exit 1
fi
