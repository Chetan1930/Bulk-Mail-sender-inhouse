#!/usr/bin/env bash
# Build the single MailFlow app image locally, then start the full stack.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env. Review FRONTEND_URL and APP_PORT, then run this command again."
  exit 0
fi

docker compose -f docker-compose.release.yml up -d --build --remove-orphans

echo
echo "MailFlow is starting at http://localhost:${APP_PORT:-8080}"
echo "Health: http://localhost:${APP_PORT:-8080}/health"
echo "Logs:   docker compose -f docker-compose.release.yml logs -f app"
