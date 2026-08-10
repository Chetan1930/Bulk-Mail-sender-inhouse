#!/usr/bin/env bash
# Safe bring-up for small EC2: swap → pull → DB/Redis → build backend (or use preloaded image)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
COMPOSE=(docker compose -f docker-compose.backend.yml)

if [[ ! -f .env ]]; then
  echo "Missing .env — run: cp .env.example .env  and edit SEED_ADMIN_* / JWT_SECRET"
  exit 1
fi

# --- 2G swap if none (prevents freeze during npm/docker build) ---
if [[ "$(swapon --show)" == "" ]]; then
  echo "No swap detected — creating 2G /swapfile (needs sudo)..."
  sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  echo "Swap enabled."
else
  echo "Swap already present."
fi

free -h
df -h /

echo "Pulling small base images (postgres/redis)..."
docker pull postgres:16-alpine
docker pull redis:7-alpine

echo "Starting Postgres + Redis only (no build yet)..."
"${COMPOSE[@]}" up -d postgres redis

echo "Waiting for Postgres healthy..."
for i in $(seq 1 40); do
  if "${COMPOSE[@]}" exec -T postgres pg_isready -U postgres -d mailflow >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

if docker image inspect mailflow-backend:latest >/dev/null 2>&1; then
  echo "Found mailflow-backend:latest — starting without rebuild."
  "${COMPOSE[@]}" up -d backend
else
  echo "Building backend image (this needs RAM+swap; may take several minutes)..."
  export DOCKER_BUILDKIT=1
  export NODE_OPTIONS=--max-old-space-size=512
  docker build -t mailflow-backend:latest ./backend
  "${COMPOSE[@]}" up -d backend
fi

echo "Pruning dangling images..."
docker image prune -f

echo "Status:"
"${COMPOSE[@]}" ps
echo
echo "Health (local):"
curl -sS http://127.0.0.1:3001/health || echo "(backend still starting — check: ${COMPOSE[*]} logs -f backend)"
