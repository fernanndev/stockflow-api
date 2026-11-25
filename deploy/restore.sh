#!/usr/bin/env bash
# Restores a backup made by backup.sh. THIS REPLACES THE CURRENT DATA.
#   deploy/restore.sh <db_file.dump> [uploads_file.tar.gz]
set -euo pipefail

cd "$(dirname "$0")/.."

DB_FILE="${1:?usage: deploy/restore.sh <db_file.dump> [uploads_file.tar.gz]}"
UPLOADS_FILE="${2:-}"
COMPOSE="docker compose -f docker-compose.prod.yml"

echo "This will REPLACE the database (and the photos, if a file is given) with the backup:"
echo "  $DB_FILE ${UPLOADS_FILE}"
read -r -p "Type YES to continue: " answer
test "$answer" = "YES"

# the API is stopped so nobody writes while the data is replaced
$COMPOSE stop api web

$COMPOSE exec -T postgres psql -U stockflow -d postgres -c "DROP DATABASE IF EXISTS stockflow WITH (FORCE);"
$COMPOSE exec -T postgres psql -U stockflow -d postgres -c "CREATE DATABASE stockflow OWNER stockflow;"
$COMPOSE exec -T postgres pg_restore -U stockflow -d stockflow --no-owner < "$DB_FILE"

if [ -n "$UPLOADS_FILE" ]; then
    $COMPOSE run --rm --no-deps -T api sh -c "rm -rf /app/uploads/* && tar -xzf - -C /app" < "$UPLOADS_FILE"
fi

$COMPOSE start api web
echo "Restore finished."
