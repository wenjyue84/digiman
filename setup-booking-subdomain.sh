#!/bin/bash
# setup-booking-subdomain.sh
# Run this on the Lightsail instance to add the book.pelangicapsulehostel.com nginx block.
# Usage: ssh ubuntu@18.142.14.142 'bash -s' < setup-booking-subdomain.sh

set -e

DOMAIN="book.pelangicapsulehostel.com"
DIST_PATH="/home/ubuntu/pelangi/dist/public"
API_UPSTREAM="http://localhost:5000"
NGINX_CONF="/etc/nginx/sites-available/${DOMAIN}"

echo "==> Creating nginx config for ${DOMAIN}"

sudo tee "${NGINX_CONF}" > /dev/null <<'NGINX'
server {
    listen 80;
    server_name book.pelangicapsulehostel.com;

    root /home/ubuntu/pelangi/dist/public;
    index index.html;

    # SPA fallback — all non-file requests go to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API calls to Express backend
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
}
NGINX

echo "==> Enabling site"
sudo ln -sf "${NGINX_CONF}" /etc/nginx/sites-enabled/

echo "==> Testing nginx config"
sudo nginx -t

echo "==> Reloading nginx"
sudo systemctl reload nginx

echo ""
echo "✅ Done! book.pelangicapsulehostel.com is now configured."
echo ""
echo "Next steps:"
echo "  1. In Cloudflare: Add A record  book -> 18.142.14.142  (or CNAME -> admin.pelangicapsulehostel.com)"
echo "  2. Enable SSL: sudo certbot --nginx -d book.pelangicapsulehostel.com"
echo "  3. Visit: https://book.pelangicapsulehostel.com/book"
