#!/bin/bash

# Database Backup Script for AfriHost
BACKUP_DIR="/home/username/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/db_backup_$DATE.sql.gz"

echo "💾 Starting database backup..."

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
mysqldump -h $DB_HOST -u $DB_USERNAME -p$DB_PASSWORD $DB_NAME | gzip > $BACKUP_FILE

if [ $? -eq 0 ]; then
    echo "✅ Database backup created: $BACKUP_FILE"
    
    # Keep only last 7 backups
    ls -tp $BACKUP_DIR/db_backup_*.sql.gz | tail -n +8 | xargs -I {} rm -- {}
    
    # Log backup size
    BACKUP_SIZE=$(du -h $BACKUP_FILE | cut -f1)
    echo "📦 Backup size: $BACKUP_SIZE"
else
    echo "❌ Database backup failed!"
    exit 1
fi

# Optional: Upload to cloud storage
# echo "☁️  Uploading to cloud storage..."
# rclone copy $BACKUP_FILE remote:backups/

echo "🎉 Backup process completed!"
