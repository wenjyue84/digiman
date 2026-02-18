#!/bin/bash
# Nginx Configuration for Lightsail
# Serves frontend + proxies backend APIs

set -e

echo "=== Configuring Nginx ==="

# Create Nginx config
sudo tee /etc/nginx/sites-available/pelangi > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;
    client_max_body_size 10M;

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

echo "✅ Nginx configured and running"
echo ""
echo "Your app is accessible at: http://$(curl -s ifconfig.me)"
echo ""
echo "To enable HTTPS later, run:"
echo "  sudo apt install -y certbot python3-certbot-nginx"
echo "  sudo certbot --nginx -d yourdomain.com"
