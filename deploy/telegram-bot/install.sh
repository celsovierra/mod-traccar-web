#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Instalando telegram-bot..."

mkdir -p /opt/telegram-bot
cp "$SCRIPT_DIR/server.js" /opt/telegram-bot/server.js
cp "$SCRIPT_DIR/db.js" /opt/telegram-bot/db.js
cp "$SCRIPT_DIR/telegram.js" /opt/telegram-bot/telegram.js
cp "$SCRIPT_DIR/bot-menu.js" /opt/telegram-bot/bot-menu.js
cp "$SCRIPT_DIR/routes.js" /opt/telegram-bot/routes.js
cp "$SCRIPT_DIR/package.json" /opt/telegram-bot/package.json
cp "$SCRIPT_DIR/traccar-event.js" /opt/telegram-bot/traccar-event.js

cd /opt/telegram-bot
npm install --production

cat > /etc/systemd/system/telegram-bot.service << 'EOF'
[Unit]
Description=Telegram Bot para Traccar
After=network.target mysql.service traccar.service

[Service]
Type=simple
WorkingDirectory=/opt/telegram-bot
ExecStart=/usr/bin/node /opt/telegram-bot/server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable telegram-bot
systemctl restart telegram-bot

NGINX_CONF="/etc/nginx/sites-enabled/traccar"
if [ -f "$NGINX_CONF" ]; then
  if ! grep -q "location /api-telegram" "$NGINX_CONF"; then
    sed -i "/location \/ {/i\\
    location /api-telegram/ {\\
        proxy_pass http://127.0.0.1:8095;\\
        proxy_set_header Host \$host;\\
        proxy_set_header X-Real-IP \$remote_addr;\\
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;\\
    }\\
" "$NGINX_CONF"
    nginx -t && systemctl reload nginx
    echo "Rota Nginx /api-telegram/ adicionada."
  fi
fi

echo "telegram-bot instalado."
systemctl status telegram-bot --no-pager | head -3
