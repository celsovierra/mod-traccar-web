#!/bin/bash
set -e
NGINX_CONF="/etc/nginx/sites-enabled/traccar"

if [ -f "$NGINX_CONF" ] && ! grep -q "api-relay-status" "$NGINX_CONF"; then
  sed -i '/location \/ {/i\
    location /api-relay-status/ {\
        proxy_pass http://127.0.0.1:8090;\
        proxy_set_header Host $host;\
        proxy_set_header X-Real-IP $remote_addr;\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\
    }\
' "$NGINX_CONF"
  nginx -t && systemctl reload nginx
  echo "Rota Nginx /api-relay-status/ adicionada."
else
  echo "Rota Nginx ja existe ou arquivo nao encontrado, pulando."
fi
