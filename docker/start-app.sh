#!/bin/sh
set -e
cd /app

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

echo "Seeding database..."
node dist/seed.js

echo "Starting API on :3001..."
node dist/index.js &
API_PID=$!

# Fail fast if Node dies during boot
sleep 1
if ! kill -0 "$API_PID" 2>/dev/null; then
  echo "API failed to start"
  exit 1
fi

echo "Starting nginx on :80..."
exec nginx -g 'daemon off;'
