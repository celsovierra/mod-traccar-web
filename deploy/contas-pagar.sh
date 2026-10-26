#!/bin/bash
# Contas a Pagar: API Node na porta 8096 (idempotente)
mkdir -p /opt/contas-pagar-api
cp /root/mod-traccar-web/deploy/api-contas-pagar/server.js /opt/contas-pagar-api/server.js
rm -rf /opt/traccar/web/api-contas-pagar
printf "[Unit]\nDescription=Contas a Pagar API\nAfter=network.target mysql.service\n\n[Service]\nEnvironmentFile=/opt/telegram-bot/.env\nExecStart=/usr/bin/node /opt/contas-pagar-api/server.js\nRestart=always\n\n[Install]\nWantedBy=multi-user.target\n" > /etc/systemd/system/contas-pagar-api.service
systemctl daemon-reload
systemctl enable contas-pagar-api
systemctl restart contas-pagar-api
for S in /etc/nginx/sites-enabled/*; do
  case "$S" in *.bak*) continue;; esac
  if ! grep -q "/api-contas-pagar/" "$S"; then
    sed -i "0,/location \/api-telegram\//s##location /api-contas-pagar/ { proxy_pass http://127.0.0.1:8096; }\n    location /api-telegram/#" "$S"
  fi
done
nginx -t && systemctl reload nginx
