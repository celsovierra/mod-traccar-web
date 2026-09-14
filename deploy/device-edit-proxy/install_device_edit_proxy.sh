#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if systemctl list-unit-files | grep -q "device-edit-proxy.service"; then
  echo "device-edit-proxy ja instalado nesta VPS. Pulando instalacao."
  exit 0
fi

echo "Instalando device-edit-proxy..."

mkdir -p /opt/device-edit-proxy
cp "$SCRIPT_DIR/server.js" /opt/device-edit-proxy/server.js
cp "$SCRIPT_DIR/package.json" /opt/device-edit-proxy/package.json

cd /opt/device-edit-proxy
npm install --production

cp "$SCRIPT_DIR/device-edit-proxy.service" /etc/systemd/system/device-edit-proxy.service
systemctl daemon-reload
systemctl enable --now device-edit-proxy

NGINX_CONF="/etc/nginx/sites-enabled/traccar"
if [ -f "$NGINX_CONF" ] && ! grep -q "api-device-edit" "$NGINX_CONF"; then
  sed -i '/location \/ {/i\
    location /api-device-edit/ {\
        proxy_pass http://127.0.0.1:8090/;\
        proxy_set_header Host $host;\
        proxy_set_header X-Real-IP $remote_addr;\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\
    }\
' "$NGINX_CONF"
  nginx -t && systemctl reload nginx
  echo "Rota Nginx /api-device-edit/ adicionada."
else
  echo "Rota Nginx ja existe ou arquivo nao encontrado, pulando."
fi

echo "device-edit-proxy instalado com sucesso."
systemctl status device-edit-proxy --no-pager
