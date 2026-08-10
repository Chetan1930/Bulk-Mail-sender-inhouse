#!/bin/sh
set -e

echo "Waiting for database..."
i=0
until npx prisma db push --skip-generate; do
  i=$((i + 1))
  if [ "$i" -ge 30 ]; then
    echo "Database not ready after 60s — exiting"
    exit 1
  fi
  echo "Retry $i/30..."
  sleep 2
done

if [ "${SEED_ON_START:-false}" = "true" ]; then
  echo "Seeding database..."
  node dist/seed.js
fi

echo "Starting server..."
exec "$@"
