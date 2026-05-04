#!/bin/bash
# Deploy public-site (static HTML) to the cloud VM doc-root.
# Run from this directory.

set -euo pipefail

REMOTE=utahengineer-old
REMOTE_DIR=/var/www/utahvalleypinewoodderby/public_html

rsync -av --delete \
  --exclude '.well-known' \
  --exclude 'deploy.sh' \
  ./ "$REMOTE:$REMOTE_DIR/"
