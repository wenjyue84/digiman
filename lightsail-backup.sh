#!/bin/bash
# Lightsail Weekly Backup Script
# Creates snapshot and deletes old ones (keeps last 4)

set -e

# Configuration
INSTANCE_NAME="PelangiManager"  # Your Lightsail instance name
REGION="ap-southeast-1"
KEEP_SNAPSHOTS=4  # Keep last 4 weeks (adjust as needed)

# Install AWS CLI if not present
if ! command -v aws &> /dev/null; then
    echo "Installing AWS CLI..."
    sudo apt update
    sudo apt install -y awscli
fi

# Generate snapshot name with timestamp
SNAPSHOT_NAME="pelangi-auto-backup-$(date +%Y%m%d-%H%M%S)"

echo "=== Creating Lightsail Snapshot ==="
echo "Instance: $INSTANCE_NAME"
echo "Snapshot: $SNAPSHOT_NAME"

# Create snapshot
aws lightsail create-instance-snapshot \
    --instance-name "$INSTANCE_NAME" \
    --instance-snapshot-name "$SNAPSHOT_NAME" \
    --region "$REGION"

if [ $? -eq 0 ]; then
    echo "✅ Snapshot created: $SNAPSHOT_NAME"
else
    echo "❌ Snapshot creation failed"
    exit 1
fi

# Wait a bit for snapshot to register
sleep 10

echo ""
echo "=== Cleaning Old Snapshots ==="

# Get all snapshots for this instance, sorted by creation date (newest first)
SNAPSHOTS=$(aws lightsail get-instance-snapshots \
    --region "$REGION" \
    --query "instanceSnapshots[?fromInstanceName=='$INSTANCE_NAME'].name" \
    --output text | tr '\t' '\n' | sort -r)

# Count snapshots
SNAPSHOT_COUNT=$(echo "$SNAPSHOTS" | wc -l)
echo "Total snapshots: $SNAPSHOT_COUNT"

# Delete old snapshots (keep only the newest $KEEP_SNAPSHOTS)
if [ "$SNAPSHOT_COUNT" -gt "$KEEP_SNAPSHOTS" ]; then
    TO_DELETE=$((SNAPSHOT_COUNT - KEEP_SNAPSHOTS))
    echo "Deleting $TO_DELETE old snapshot(s)..."

    # Skip the first $KEEP_SNAPSHOTS, delete the rest
    echo "$SNAPSHOTS" | tail -n +$((KEEP_SNAPSHOTS + 1)) | while read -r OLD_SNAPSHOT; do
        if [ -n "$OLD_SNAPSHOT" ]; then
            echo "  Deleting: $OLD_SNAPSHOT"
            aws lightsail delete-instance-snapshot \
                --instance-snapshot-name "$OLD_SNAPSHOT" \
                --region "$REGION"
        fi
    done

    echo "✅ Cleanup complete"
else
    echo "✅ No cleanup needed (keeping $SNAPSHOT_COUNT snapshots)"
fi

echo ""
echo "=== Current Snapshots ==="
aws lightsail get-instance-snapshots \
    --region "$REGION" \
    --query "instanceSnapshots[?fromInstanceName=='$INSTANCE_NAME'].[name,createdAt,sizeInGb]" \
    --output table

echo ""
echo "=== Backup Complete ==="
echo "Timestamp: $(date)"
