#!/bin/bash
echo ">> Verificando tabela tc_events (para o bot)..."
mysql traccar -e "CREATE TABLE IF NOT EXISTS tc_events (id INT AUTO_INCREMENT PRIMARY KEY, type VARCHAR(128) NOT NULL, eventTime DATETIME(3) NOT NULL, deviceId INT, positionId INT, geofenceId INT, attributes VARCHAR(4000) NOT NULL, INDEX idx_events_deviceId (deviceId), INDEX idx_events_eventTime (eventTime));" 2>/dev/null || true
if mysql traccar -e "SHOW COLUMNS FROM tc_events LIKE 'serverTime';" | grep -q "serverTime"; then mysql traccar -e "ALTER TABLE tc_events DROP COLUMN serverTime;" 2>/dev/null || true; fi
echo ">> Corrigindo rota do Nginx para o bot..."
sed -i 's|location /api-telegram/ { proxy_pass http://127.0.0.1:8095/; }|location /api-telegram/ { proxy_pass http://127.0.0.1:8095; }|' /etc/nginx/sites-enabled/gpscell.site /etc/nginx/sites-enabled/$DOMINIO 2>/dev/null || true
systemctl restart nginx
if [ ! -f /opt/telegram-bot/.env ]; then
  echo ">> Criando .env do Telegram Bot..."
  printf "TELEGRAM_BOT_TOKEN=7785313299:AAGqPsRB8Ji4NqGnBKNJunDVqoHphf9NOhc\nDB_HOST=localhost\nDB_USER=traccar_user\nDB_PASS=Traccar@2026#Sec\nDB_NAME=traccar\n" > /opt/telegram-bot/.env
fi