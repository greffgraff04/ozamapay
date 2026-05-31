#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
mkdir -p $BACKUP_DIR

echo "🔄 OZAMAPAY Backup — $DATE"
echo "Exporting database via Neon connection..."

source .env
pg_dump "$DATABASE_URL" \
  --no-owner \
  --no-acl \
  --format=plain \
  --file="$BACKUP_DIR/ozamapay_backup_$DATE.sql"

echo "✅ Backup saved: $BACKUP_DIR/ozamapay_backup_$DATE.sql"
echo "📁 File size: $(du -sh $BACKUP_DIR/ozamapay_backup_$DATE.sql | cut -f1)"
