#!/usr/bin/env bash
# Build the all-in-one app image on a machine with enough RAM, then pack it for EC2.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export DOCKER_BUILDKIT=1
echo "Building mailflow-app:latest (frontend + backend + nginx)..."
docker build -t mailflow-app:latest .

OUT="${ROOT}/mailflow-app.tar.gz"
echo "Saving ${OUT} ..."
docker save mailflow-app:latest | gzip > "$OUT"
ls -lh "$OUT"

echo
echo "=== Deploy on EC2 ==="
echo "  scp -i KEY ${OUT} ubuntu@EC2_IP:~/"
echo "  # also sync project files (compose + .env), e.g. rsync without node_modules"
echo "  ssh ... 'gunzip -c ~/mailflow-app.tar.gz | docker load'"
echo "  ssh ... 'cd ~/MailSender && ./scripts/ec2-release-up.sh'"
echo "  Open http://EC2_IP:8080"
