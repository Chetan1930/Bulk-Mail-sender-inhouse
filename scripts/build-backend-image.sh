#!/usr/bin/env bash
# Run on a laptop/desktop with enough RAM, then copy the image to EC2.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export DOCKER_BUILDKIT=1
docker build -t mailflow-backend:latest ./backend
docker save mailflow-backend:latest | gzip > mailflow-backend.tar.gz
ls -lh mailflow-backend.tar.gz
echo
echo "Copy to EC2, then on the server:"
echo "  gunzip -c mailflow-backend.tar.gz | docker load"
echo "  cd ~/MailSender && ./scripts/ec2-safe-up.sh"
