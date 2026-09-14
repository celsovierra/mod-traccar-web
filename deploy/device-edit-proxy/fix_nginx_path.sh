#!/bin/bash
set -e
NGINX_CONF="/etc/nginx/sites-enabled/traccar"

if grep -q "proxy_pass http://127.0.0.1:8090/;" "$NGINX_CONF"; then
  sed -i 's|proxy_pass http://127.0.0.1:8090/;|proxy_pass http://127.0.0.1:8090;|' "$NGINX_CONF"
  nginx -t && systemctl reload nginx
  echo "Corrigido: proxy_pass do device-edit-proxy ajustado (sem barra final)."
else
  echo "Nada a corrigir (ja esta certo ou nao encontrado)."
fi
