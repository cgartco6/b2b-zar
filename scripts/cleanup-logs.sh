#!/bin/bash

# Log Cleanup Script for AfriHost
echo "🧹 Cleaning up logs and temporary files..."

# Rotate application logs
if [ -f "logs/app.log" ]; then
    mv logs/app.log "logs/app_$(date +%Y%m%d).log"
    touch logs/app.log
fi

# Clean up old log files (keep 7 days)
find logs/ -name "*.log" -mtime +7 -delete

# Clean up temporary files
find tmp/ -name "*" -mtime +1 -delete

# Clean up cached files
find public/uploads/cache/ -name "*" -mtime +7 -delete

# Optimize database
mysql -h $DB_HOST -u $DB_USERNAME -p$DB_PASSWORD $DB_NAME -e "OPTIMIZE TABLE users, products, orders, order_items;"

echo "✅ Cleanup completed!"
