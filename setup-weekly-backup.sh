#!/bin/bash
# Setup Weekly Automated Backups
# Run this once on your Lightsail instance

set -e

echo "=== Setting Up Weekly Automated Backups ==="
echo ""

# Install AWS CLI
echo "Installing AWS CLI..."
sudo apt update
sudo apt install -y awscli

# Configure AWS credentials
echo ""
echo "=== AWS Credentials Required ==="
echo "You need an IAM user with Lightsail permissions."
echo ""
echo "Steps to create IAM user:"
echo "1. Go to AWS Console → IAM → Users → Create user"
echo "2. Name: lightsail-backup-user"
echo "3. Attach policy: AmazonLightsailFullAccess"
echo "4. Create access key → CLI"
echo "5. Copy Access Key ID and Secret Access Key"
echo ""
read -p "Press Enter when ready to configure AWS CLI..."

# Run AWS configure
aws configure

# Test AWS CLI
echo ""
echo "Testing AWS CLI..."
aws lightsail get-instances --region ap-southeast-1 --query "instances[*].name" --output text

if [ $? -ne 0 ]; then
    echo "❌ AWS CLI test failed. Please check your credentials."
    exit 1
fi

echo "✅ AWS CLI configured successfully"
echo ""

# Copy backup script to system location
echo "Installing backup script..."
sudo cp lightsail-backup.sh /usr/local/bin/lightsail-backup
sudo chmod +x /usr/local/bin/lightsail-backup

# Test backup script
echo ""
echo "Testing backup script..."
read -p "Create a test snapshot now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    sudo /usr/local/bin/lightsail-backup
fi

# Setup cron job (every Sunday at 2 AM)
echo ""
echo "Setting up cron job (weekly, Sunday 2 AM)..."

# Create cron job
CRON_JOB="0 2 * * 0 /usr/local/bin/lightsail-backup >> /var/log/lightsail-backup.log 2>&1"

# Add to crontab if not already present
(crontab -l 2>/dev/null | grep -v lightsail-backup; echo "$CRON_JOB") | crontab -

echo "✅ Cron job added"
echo ""

# Create log file
sudo touch /var/log/lightsail-backup.log
sudo chown ubuntu:ubuntu /var/log/lightsail-backup.log

# Show cron schedule
echo "=== Cron Schedule ==="
crontab -l | grep lightsail-backup

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Backup schedule: Every Sunday at 2:00 AM"
echo "Retention: Keep last 4 snapshots (1 month)"
echo "Cost: ~$2/snapshot = $8/month for 4 snapshots"
echo ""
echo "Useful commands:"
echo "  View logs:           tail -f /var/log/lightsail-backup.log"
echo "  Manual backup:       sudo /usr/local/bin/lightsail-backup"
echo "  List cron jobs:      crontab -l"
echo "  Edit cron schedule:  crontab -e"
echo ""
echo "To change backup schedule:"
echo "  crontab -e"
echo "  Modify: 0 2 * * 0  (minute hour day month weekday)"
echo "  Examples:"
echo "    Daily 3 AM:     0 3 * * *"
echo "    Every 3 days:   0 2 */3 * *"
echo "    Twice a week:   0 2 * * 0,3  (Sunday & Wednesday)"
