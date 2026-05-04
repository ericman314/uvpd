#!/bin/bash
# Deploy cloud-api to the production VM and bounce the forever process.
# Run from this directory.

set -euo pipefail

REMOTE=utahengineer-old
REMOTE_DIR=nodejs/utahvalleypinewoodderby

# Sync code (not configs, not runtime data, not node_modules).
rsync -av \
  --exclude 'node_modules' \
  --exclude 'config.js' \
  --exclude 'config.example.js' \
  --exclude 'cars/' \
  --exclude 'checkin/' \
  --exclude 'videos/' \
  --exclude 'tmp/' \
  --exclude 'deploy.sh' \
  ./ "$REMOTE:$REMOTE_DIR/"

ssh "$REMOTE" "cd $REMOTE_DIR && npm install --omit=dev && forever restart uvpd.js || forever start uvpd.js"
