#!/usr/bin/env bash
# Backup of the database and of the photos. Run it from cron every night (see docs/DEPLOY.md).
#   - db_<date>.dump       the whole database (pg_dump, compressed)
#   - uploads_<date>.tar.gz   the product, packaging and logo photos
# Backups older than KEEP_DAYS days are deleted. Copy the folder somewhere else too
# (another computer or a cloud drive): a backup that lives only on the server is not a backup.
set -euo pipefail

cd "$(dirname "$0")/.."

BACKUP_DIR="${BACKUP_DIR:-$HOME/backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date +%Y-%m-%d_%H%M)"
COMPOSE="docker compose -f docker-compose.prod.yml"

mkdir -p "$BACKUP_DIR"

# the files are written with a temporary name and only renamed when everything went well,
# so a failure never leaves an empty file that looks like a good backup
trap 'rm -f "$BACKUP_DIR"/*.partial' EXIT

$COMPOSE exec -T postgres pg_dump -U stockflow -d stockflow --format=custom > "$BACKUP_DIR/db_$STAMP.dump.partial"
$COMPOSE exec -T api tar -czf - -C /app uploads > "$BACKUP_DIR/uploads_$STAMP.tar.gz.partial"

# an empty file means something failed silently
test -s "$BACKUP_DIR/db_$STAMP.dump.partial"
test -s "$BACKUP_DIR/uploads_$STAMP.tar.gz.partial"

mv "$BACKUP_DIR/db_$STAMP.dump.partial" "$BACKUP_DIR/db_$STAMP.dump"
mv "$BACKUP_DIR/uploads_$STAMP.tar.gz.partial" "$BACKUP_DIR/uploads_$STAMP.tar.gz"

find "$BACKUP_DIR" -type f \( -name 'db_*.dump' -o -name 'uploads_*.tar.gz' \) -mtime +"$KEEP_DAYS" -delete

echo "Backup $STAMP done in $BACKUP_DIR"
