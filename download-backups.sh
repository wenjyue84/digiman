#!/bin/bash
# Download backups from Lightsail to your local machine
# Run this on your LOCAL machine (Git Bash on Windows)

set -e

# Configuration
LIGHTSAIL_IP="YOUR_LIGHTSAIL_IP_HERE"
LIGHTSAIL_KEY="lightsail-key.pem"
LIGHTSAIL_USER="ubuntu"
LOCAL_BACKUP_DIR="./backups"

echo "=== Downloading Backups from Lightsail ==="

# Create local backup directory
mkdir -p "$LOCAL_BACKUP_DIR"

# Download all backups
scp -i "$LIGHTSAIL_KEY" \
    "$LIGHTSAIL_USER@$LIGHTSAIL_IP:/var/backups/pelangi/*" \
    "$LOCAL_BACKUP_DIR/"

echo "✅ Backups downloaded to: $LOCAL_BACKUP_DIR"
echo ""
echo "Backup files:"
ls -lh "$LOCAL_BACKUP_DIR"

echo ""
echo "💡 Tip: Store these in Google Drive, Dropbox, or external drive"
