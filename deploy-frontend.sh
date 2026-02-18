#!/bin/bash
# Deploy Frontend to Lightsail
# Run this on your LOCAL machine (Git Bash on Windows)

set -e

# Configuration
LIGHTSAIL_IP="YOUR_LIGHTSAIL_IP_HERE"
LIGHTSAIL_KEY="lightsail-key.pem"  # Path to your SSH key
LIGHTSAIL_USER="ubuntu"

echo "=== Building Frontend ==="

# Navigate to client directory
cd "$(dirname "$0")/client"

# Build for production (using Lightsail IP as API endpoint)
echo "VITE_API_URL=http://$LIGHTSAIL_IP" > .env.production
npm install
npm run build

echo "✅ Build complete"
echo ""
echo "=== Uploading to Lightsail ==="

# Upload build to Lightsail
scp -i "$LIGHTSAIL_KEY" -r dist/public/* "$LIGHTSAIL_USER@$LIGHTSAIL_IP:/var/www/pelangi/client/dist/public/"

echo "✅ Frontend deployed"
echo ""
echo "Access your app at: http://$LIGHTSAIL_IP"
