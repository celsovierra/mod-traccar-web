#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Instalando/atualizando device-edit-proxy..."

mkdir -p /opt/device-edit-proxy
cp "$SCRIPT_DIR/server.js" /opt/device-edit-proxy/server.js
cp "$SCRIPT_DIR/package.json" /opt/device-edit-proxy/package.json

cd /opt/device-edit-proxy
npm install --production

if [ -f "$SCRIPT_DIR/device-edit-proxy.service" ]; then
  cp "$SCRIPT_DIR/device-edit-proxy.service" /etc/systemd/system/device-edit-proxy.service
  systemctl daemon-reload
  systemctl enable device-edit-proxy
  systemctl restart device-edit-proxy
  echo "Servico device-edit-proxy reiniciado."
fi

NGINX_CONF="/etc/nginx/sites-enabled/traccar"
if [ -f "$NGINX_CONF" ]; then
  NGINX_CHANGED=0
  add_route() {
    local route="$1"
    if ! grep -q "location $route" "$NGINX_CONF"; then
      sed -i "/location \/ {/i\\
    location $route {\\
        proxy_pass http://127.0.0.1:8090;\\
        proxy_set_header Host \$host;\\
        proxy_set_header X-Real-IP \$remote_addr;\\
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;\\
    }\\
" "$NGINX_CONF"
      echo "Rota Nginx $route adicionada."
      NGINX_CHANGED=1
    else
      echo "Rota Nginx $route ja existe."
    fi
  }
  add_route "/api-device-edit/"
  add_route "/api-device-geofence/"
  add_route "/api-anchor/"
  add_route "/api-relay-status/"
  if [ "$NGINX_CHANGED" = "1" ]; then
    nginx -t && systemctl reload nginx
    echo "Nginx recarregado."
  fi
fi

echo "device-edit-proxy instalado/atualizado com sucesso."