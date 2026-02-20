#!/bin/bash
# Nginx Configuration for Lightsail
# Serves frontend + proxies backend APIs
# Supports optional HTTPS via Let's Encrypt (certbot)

set -e

DOMAIN="${1:-}"

echo "=== Configuring Nginx ==="

# Create Nginx config
sudo tee /etc/nginx/sites-available/pelangi > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;
    client_max_body_size 10M;

    # Security headers (defense in depth — also set by helmet.js)
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    # Serve React frontend
    location / {
        root /var/www/pelangi/client/dist/public;
        try_files $uri $uri/ /index.html;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Proxy API requests to Express (port 5000)
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300;
    }

    # Proxy Rainbow MCP requests (port 3002)
    location /api/rainbow/ {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check (no logs)
    location /health {
        proxy_pass http://localhost:5000/health;
        access_log off;
    }

    # File uploads
    location /objects/ {
        proxy_pass http://localhost:5000;
        client_max_body_size 10M;
    }
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/pelangi /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and restart
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

echo "Nginx configured and running (HTTP)"
echo ""
echo "Your app is accessible at: http://$(curl -s ifconfig.me)"

# --- Optional: Enable HTTPS with Let's Encrypt ---
if [ -n "$DOMAIN" ]; then
    echo ""
    echo "=== Setting up HTTPS for $DOMAIN ==="

    # Update server_name from _ to actual domain
    sudo sed -i "s/server_name _;/server_name $DOMAIN;/" /etc/nginx/sites-available/pelangi

    # Install certbot
    sudo apt update -y
    sudo apt install -y certbot python3-certbot-nginx

    # Obtain certificate (auto-configures nginx for HTTPS)
    sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@pelangi.com --redirect

    # Certbot auto-adds SSL config. Add HSTS to the HTTPS server block.
    if ! grep -q "Strict-Transport-Security" /etc/nginx/sites-available/pelangi; then
        sudo sed -i '/listen 443 ssl/a\    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;' /etc/nginx/sites-available/pelangi
    fi

    sudo nginx -t && sudo systemctl reload nginx

    # Verify auto-renewal is configured
    sudo certbot renew --dry-run

    echo ""
    echo "HTTPS configured for $DOMAIN"
    echo "   Certificate auto-renews via certbot timer."
    echo "   Your app is now accessible at: https://$DOMAIN"
else
    echo ""
    echo "To enable HTTPS, re-run with your domain:"
    echo "  bash lightsail-nginx.sh yourdomain.com"
    echo ""
    echo "Prerequisites:"
    echo "  1. A domain name pointing to $(curl -s ifconfig.me)"
    echo "  2. Port 443 open in Lightsail firewall"
fi
