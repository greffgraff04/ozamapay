#!/bin/bash
if [ -z "$1" ]; then
  echo "Usage: ./restore.sh backups/ozamapay_backup_YYYYMMDD_HHMMSS.sql"
  exit 1
fi

source .env
echo "⚠️  RESTORE: $1"
echo "This will overwrite current data. Continue? (yes/no)"
read confirm
if [ "$confirm" = "yes" ]; then
  psql "$DATABASE_URL" < "$1"
  echo "✅ Restore complete"
else
  echo "Restore cancelled."
fi
