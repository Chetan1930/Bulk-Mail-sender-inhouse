#!/bin/sh
set -e

echo "Applying database schema..."
until npx prisma db push --skip-generate 2>/dev/null; do
  echo "Waiting for database..."
  sleep 2
done

npx prisma generate

if [ "${SEED_ON_START:-false}" = "true" ]; then
  echo "Seeding database..."
  node dist/seed.js
fi

echo "Starting server..."
exec "$@"
