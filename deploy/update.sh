#!/usr/bin/env bash
# Updates the server to the newest code (or to a given version) in one command:
#   ./deploy/update.sh            -> the latest code of the main branch
#   ./deploy/update.sh v1.3.0     -> exactly that version (a git tag)
# It always makes a backup first. The database is updated by itself when the API starts.
set -euo pipefail

cd "$(dirname "$0")/.."

./deploy/backup.sh

git fetch --tags origin

if [ -n "${1:-}" ]; then
    git checkout "$1"
else
    git checkout main
    git pull --ff-only origin main
fi

docker compose -f docker-compose.prod.yml up -d --build

# old images pile up on the disk after many updates
docker image prune -f > /dev/null

echo
docker compose -f docker-compose.prod.yml ps
echo "Updated to: $(git describe --tags --always)"
