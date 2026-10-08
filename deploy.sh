#!/bin/bash

# Entra na pasta do projeto sempre
cd "$(dirname "$(readlink -f "$0")")" || exit 1
git config --global --add safe.directory "$(pwd)" 2>/dev/null
git reset --hard HEAD 2>/dev/null

echo ">> Puxando atualizacoes do GitHub..."
git pull origin main

if [ -z "$DEPLOY_REEXEC" ]; then
  export DEPLOY_REEXEC=1
  exec "$0" "$@"
fi
set -e


set -e
if ! command -v node >/dev/null 2>&1; then
  echo "   Node.js nao encontrado. Instalando Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
else
  echo "   Node.js ja instalado ($(node --version))."
fi

echo ">> Verificando fuso horario..."
CURRENT_TZ=$(timedatectl show --property=Timezone --value)
if [ "$CURRENT_TZ" != "America/Fortaleza" ]; then
  echo "   Fuso errado ($CURRENT_TZ). Corrigindo para America/Fortaleza..."
  timedatectl set-timezone America/Fortaleza
else
  echo "   Fuso ja esta correto (America/Fortaleza)."
fi

cd "$(dirname "$0")"
PROJECT_DIR="$(pwd)"

echo ">> Puxando atualizacoes do GitHub..."
git checkout -- build/index.html build/sw.js 2>/dev/null || true
git pull origin main

echo ">> Instalando dependencias..."
npm install

echo ">> Gerando build de producao..."
echo ">> Copiando VERSION para public..."
if [ -f ./VERSION ]; then
  cp ./VERSION ./public/VERSION
fi

npm run build

echo ">> Gravando versao atual..."
COMMIT_HASH=$(git rev-parse HEAD)
echo "{\"commit\":\"$COMMIT_HASH\"}" > build/version.json

echo ">> Fazendo backup da pasta web atual..."
if [ -d /opt/traccar/web ]; then
  cp -r /opt/traccar/web /opt/traccar/web_backup_$(date +%Y%m%d_%H%M%S)
fi

echo ">> Publicando novo build..."
mkdir -p /opt/traccar/web
rm -rf /opt/traccar/web/*
cp -r build/* /opt/traccar/web/

echo ">> Reiniciando Traccar..."
mysql -u traccar -p"Traccar@2026#Sec" traccar -e "UPDATE DATABASECHANGELOGLOCK SET LOCKED=0, LOCKGRANTED=NULL, LOCKEDBY=NULL WHERE ID=1;" 2>/dev/null || mysql -u traccar_user -p"Traccar@2026#Sec" traccar -e "UPDATE DATABASECHANGELOGLOCK SET LOCKED=0, LOCKGRANTED=NULL, LOCKEDBY=NULL WHERE ID=1;" 2>/dev/null || true
systemctl restart traccar

if true; then
# sempre regrava atualizar
  cat > /usr/local/bin/atualizar << INNEREOF
#!/bin/bash
cd "$PROJECT_DIR" || { echo "Pasta do projeto nao encontrada"; exit 1; }
git fetch origin && git reset --hard origin/main && ./deploy.sh
INNEREOF
  chmod +x /usr/local/bin/atualizar
  echo "   Comando 'atualizar' instalado."
else
  echo "   Comando 'atualizar' ja existia."
fi

echo ">> Verificando servico de gatilho remoto (botao Atualizar Versao)..."

if [ ! -f /usr/local/bin/deploy-trigger-server.py ]; then
  cat > /usr/local/bin/deploy-trigger-server.py << 'PYEOF'
import http.server
import subprocess
import os

TOKEN_FILE = "/opt/traccar/deploy-token.txt"

class Handler(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        subprocess.Popen(["/usr/local/bin/atualizar"], stdout=open("/tmp/deploy-trigger.log", "a"), stderr=subprocess.STDOUT)
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(b'{"status":"started"}')

    def log_message(self, format, *args):
        pass

http.server.HTTPServer(("127.0.0.1", 8091), Handler).serve_forever()
PYEOF
  chmod +x /usr/local/bin/deploy-trigger-server.py
fi

if [ ! -f /etc/systemd/system/deploy-trigger.service ]; then
  cat > /etc/systemd/system/deploy-trigger.service << SERVICEEOF
[Unit]
Description=Deploy Trigger Server for Traccar Mod
After=network.target

[Service]
ExecStart=/usr/bin/python3 /usr/local/bin/deploy-trigger-server.py
Restart=always
User=root

[Install]
WantedBy=multi-user.target
SERVICEEOF
  systemctl daemon-reload
  systemctl enable deploy-trigger
  systemctl restart deploy-trigger
  echo "   Servico de gatilho instalado e rodando."
else
  systemctl restart deploy-trigger
  echo "   Servico de gatilho ja existia (reiniciado)."
fi

echo ">> Verificando rota do botao Atualizar Versao no nginx..."
for NGINX_CONF in $(grep -rln "proxy_pass http://127.0.0.1:8082" /etc/nginx/sites-available/ /etc/nginx/sites-enabled/ 2>/dev/null | sort -u); do
  if ! grep -q "deploy-trigger" "$NGINX_CONF"; then
    echo "   Adicionando rota em $NGINX_CONF..."
    python3 - << PYEOF2
path = "$NGINX_CONF"
with open(path) as f:
    content = f.read()
block = '''
    location /api-deploy-trigger/ {
        proxy_pass http://127.0.0.1:8091/;
        proxy_set_header Host \$host;
    }
'''
if "location /api-deploy-trigger/" not in content:  # python
    content = content.replace("    location / {", block + "\n    location / {", 1)
    with open(path, "w") as f:
        f.write(content)
PYEOF2
  fi
done
nginx -t && systemctl reload nginx
echo "   Rota /api-deploy-trigger/ verificada."

echo ""
echo ">> Token do botao Atualizar Versao (guarde se precisar conferir): $DEPLOY_TOKEN"

echo ">> Verificando configuracoes do traccar.xml..."
if [ -f /opt/traccar/conf/traccar.xml ]; then
  cp /opt/traccar/conf/traccar.xml /opt/traccar/conf/traccar.xml.bak.$(date +%F-%H%M%S)
  python3 - << 'PYTRACCAR'
from pathlib import Path
import re

p = Path("/opt/traccar/conf/traccar.xml")
s = p.read_text()

updates = {
    "geocoder.enable": "true",
    "geocoder.type": "nominatim",
    "geocoder.url": "https://geocode.gpscell.site/reverse",
    "geocoder.format": "%f",
    "geocoder.ignorePositions": "false",
    "geocoder.onRequest": "true",
    "geocoder.processInvalidPositions": "false",
    "geocoder.reuseDistance": "0",
    "web.default.map": "googleHybrid",
    "web.origin": "*",
    "filter.enable": "true",
    "filter.ignoreAttributesErrors": "true",
    "processing.ignoreInvalidAttributes": "true",
    "filter.invalid": "true",
    "filter.zero": "true",
    "web.showUnknownDevices": "false",
    "processing.computedAttributes.deviceAttributes": "true",
    "processing.copyAttributes.enable": "true",
    "processing.copyAttributes": "network,rpm,temperature,fuel,spentFuel,ignition,power,battery,batteryLevel,sat,rssi,stoppedTime,lastMotionChange,lastIdleTime",
    "database.historyDays": "30",
    "web.timeout": "60000",
    "event.overspeed.notRepeat": "true",
    "event.enable": "geofenceEnter,geofenceExit,ignition,alarm",
    "event.geofenceHandler": "true",
    "event.ignitionHandler": "true",
    "event.copyAttributes": "ignition",
}

for key, val in updates.items():
    pattern = rf"<entry key='{re.escape(key)}'>.*?</entry>"
    new_line = f"<entry key='{key}'>{val}</entry>"
    if re.search(pattern, s):
        s = re.sub(pattern, new_line, s)
    else:
        s = s.replace("</properties>", f"    {new_line}\n</properties>")

p.write_text(s)
print("OK traccar.xml")
PYTRACCAR
  mysql -u traccar -p"Traccar@2026#Sec" traccar -e "UPDATE DATABASECHANGELOGLOCK SET LOCKED=0, LOCKGRANTED=NULL, LOCKEDBY=NULL WHERE ID=1;" 2>/dev/null || mysql -u traccar_user -p"Traccar@2026#Sec" traccar -e "UPDATE DATABASECHANGELOGLOCK SET LOCKED=0, LOCKGRANTED=NULL, LOCKEDBY=NULL WHERE ID=1;" 2>/dev/null || true
systemctl restart traccar
  sleep 15
  echo "   traccar.xml atualizado e traccar reiniciado."
else
  echo "   /opt/traccar/conf/traccar.xml nao encontrado, ignorando."
fi
echo ""

if true; then
mkdir -p /opt/traccar/scripts
# sempre recria backup.sh
  cat > /opt/traccar/scripts/backup.sh << 'BKPEOF'
#!/bin/bash
TOKEN="7785313299:AAGqPsRB8Ji4NqGnBKNJunDVqoHphf9NOhc"
CHAT_ID="867241548"
DNS=$(grep -h "server_name" /etc/nginx/sites-enabled/* 2>/dev/null | awk '{print $2}' | tr -d ";|" | grep -v "_" | head -1)
DESCRICAO="${DNS}"
DATA_HORA=$(date '+%d/%m/%Y %H:%M')
BACKUP_FILE="/tmp/backup_traccar.tar.gz"

  DB_USER=$(grep -oP "database.user.>\K[^<]+" "$XML" | head -1 | sed "s/[\x27\x22]//g")
  DB_PASS_ATUAL=$(grep -oP "database.password.>\K[^<]+" "$XML" | head -1 | sed "s/[\x27\x22]//g")
DB_NAME=$(grep -oP "jdbc:mysql://[^/]+/\K[^?]+" /opt/traccar/conf/traccar.xml | head -1)

mysql -u "$DB_USER" -p"$DB_PASS_ATUAL" "$DB_NAME" -e "
DROP TABLE IF EXISTS tc_positions_filtrada;
CREATE TABLE tc_positions_filtrada LIKE tc_positions;
INSERT INTO tc_positions_filtrada
SELECT p.* FROM tc_positions p
INNER JOIN (
  SELECT id, deviceid, fixtime,
         ROW_NUMBER() OVER (PARTITION BY deviceid ORDER BY fixtime DESC) AS rn
  FROM tc_positions
  WHERE fixtime > DATE_SUB(NOW(), INTERVAL 7 DAY)
) t ON t.id = p.id AND t.rn <= 6;
"

mysqldump -u "$DB_USER" -p"$DB_PASS_ATUAL" "$DB_NAME" --ignore-table=$DB_NAME.tc_positions --no-tablespaces --complete-insert --skip-lock-tables > /tmp/backup_base.sql
mysqldump -u "$DB_USER" -p"$DB_PASS_ATUAL" "$DB_NAME" tc_positions_filtrada --no-tablespaces --complete-insert --skip-lock-tables | sed 's/tc_positions_filtrada/tc_positions/g' >> /tmp/backup_base.sql

mkdir -p /opt/traccar/media /opt/traccar/conf
tar -czf "$BACKUP_FILE" \
  -C /tmp backup_base.sql \
  -C /opt/traccar conf \
  -C /opt/traccar media \
  -C /opt/traccar scripts

curl -s -F chat_id="$CHAT_ID" -F caption="Backup $DESCRICAO - $DATA_HORA" -F document=@"$BACKUP_FILE" https://api.telegram.org/bot$TOKEN/sendDocument

mysql -u "$DB_USER" -p"$DB_PASS_ATUAL" "$DB_NAME" -e "DROP TABLE IF EXISTS tc_positions_filtrada;"
rm -f /tmp/backup_base.sql "$BACKUP_FILE"
BKPEOF
  chmod +x /opt/traccar/scripts/backup.sh
  echo "   Script de backup instalado."
else
  echo "   Script de backup ja existia."
fi

echo ">> Verificando cron do backup..."
if ! crontab -l 2>/dev/null | grep -q "0 \*/6 \* \* \* /bin/bash /opt/traccar/scripts/backup.sh"; then
  crontab -l 2>/dev/null | grep -v "traccar/scripts/backup.sh" | crontab -
  (crontab -l 2>/dev/null; echo "0 */6 * * * /bin/bash /opt/traccar/scripts/backup.sh >/dev/null 2>&1") | crontab -
  echo "   Cron instalado (a cada 6 horas)."
else
  echo "   Cron ja existia."
fi





echo ">> Garantindo senha padrao do MySQL..."
XML="/opt/traccar/conf/traccar.xml"
if [ -f "$XML" ]; then
  DB_USER=$(grep -oP "database.user.>\K[^<]+" "$XML" | head -1 | sed "s/[\x27\x22]//g")
  DB_PASS_ATUAL=$(grep -oP "database.password.>\K[^<]+" "$XML" | head -1 | sed "s/[\x27\x22]//g")
  DB_PASS_NOVA="Traccar@2026#Sec"
  if ! sudo mysql -e "SELECT user FROM mysql.user WHERE user='$DB_USER'" 2>/dev/null | grep -q "$DB_USER"; then
    sudo mysql -e "CREATE USER '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS_NOVA'; GRANT ALL PRIVILEGES ON *.* TO '$DB_USER'@'localhost' WITH GRANT OPTION; FLUSH PRIVILEGES;"
    echo "   Usuario $DB_USER criado."
  fi
  if [ "$DB_PASS_ATUAL" != "$DB_PASS_NOVA" ]; then
    sudo mysql -e "ALTER USER '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS_NOVA'; FLUSH PRIVILEGES;"
    sed -i "s|<entry key='database.password'>.*</entry>|<entry key='database.password'>$DB_PASS_NOVA</entry>|" "$XML"
    echo "   Senha MySQL padronizada."
  else
    echo "   Senha MySQL ja esta padrao."
  fi
fi

echo ">> Configurando sistema de fila financeira..."
if [ -f ./scripts/setup_fila.sh ]; then
  bash ./scripts/setup_fila.sh
else
  echo "   scripts/setup_fila.sh nao encontrado, ignorando."
fi

echo ">> Configurando sistema de contratos..."
if [ -f ./scripts/setup_contratos.sh ]; then
  bash ./scripts/setup_contratos.sh
else
  echo "   scripts/setup_contratos.sh nao encontrado, ignorando."
fi



echo ">> Configurando device-edit-proxy..."
if [ -f ./deploy/deploy_all.sh ]; then
  bash ./deploy/deploy_all.sh
else
  echo "   deploy/deploy_all.sh nao encontrado, ignorando."
fi

echo ">> Configurando client_max_body_size no nginx..."
if [ -f ./scripts/fix_nginx_body_size.py ]; then
  python3 ./scripts/fix_nginx_body_size.py
  nginx -t && systemctl reload nginx
else
  echo "   fix_nginx_body_size.py nao encontrado."
fi

echo ">> Limpando configs de login invalidas..."
mysql -u traccar_user -p'Traccar@2026#Sec' traccar -e "DELETE FROM login_config WHERE config LIKE '%""error""%';" 2>/dev/null || true

echo ">> Removendo notificacoes duplicadas no Traccar..."
mysql -u traccar_user -p'Traccar@2026#Sec' traccar -e "DELETE n1 FROM tc_notifications n1 INNER JOIN tc_notifications n2 WHERE n1.id > n2.id AND n1.type = n2.type;" 2>/dev/null || true

echo ">> Vinculando notificacao 171 (ignicao ligada) aos mesmos devices da 161..."
mysql -u traccar_user -p'Traccar@2026#Sec' traccar -e "INSERT IGNORE INTO tc_device_notification (deviceid, notificationid) SELECT dn.deviceid, n171.id FROM tc_device_notification dn JOIN tc_notifications n161 ON n161.id = dn.notificationid AND n161.type = 'ignitionOff' JOIN tc_notifications n171 ON n171.type = 'ignitionOn' WHERE dn.notificationid = n161.id;" 2>/dev/null || true

echo ">> Aplicando icone padrao moto_vermlha nos devices sem customIcon..."
mysql -u traccar_user -p'Traccar@2026#Sec' traccar -e "UPDATE tc_devices SET attributes = JSON_SET(attributes, '\$.customIcon', 'moto_vermlha') WHERE attributes IS NULL OR JSON_EXTRACT(attributes, '\$.customIcon') IS NULL OR JSON_EXTRACT(attributes, '\$.customIcon') = 'default';" 2>/dev/null || true

echo ">> Configurando forward de eventos do Traccar para o bot..."
if grep -q 'event.forward.url' /opt/traccar/conf/traccar.xml; then
  sed -i "s|<entry key='event.forward.url'>.*</entry>|<entry key='event.forward.url'>http://127.0.0.1:8095/api-telegram/traccar-event</entry>|" /opt/traccar/conf/traccar.xml
else
  sed -i "/<\/properties>/i \    <entry key='event.forward.enable'>true</entry>\n    <entry key='event.forward.url'>http://127.0.0.1:8095/api-telegram/traccar-event</entry>\n    <entry key='event.forward.type'>json</entry>\n    <entry key='event.forward.header'>Content-Type: application/json</entry>" /opt/traccar/conf/traccar.xml
fi
mysql -u traccar -p"Traccar@2026#Sec" traccar -e "UPDATE DATABASECHANGELOGLOCK SET LOCKED=0, LOCKGRANTED=NULL, LOCKEDBY=NULL WHERE ID=1;" 2>/dev/null || mysql -u traccar_user -p"Traccar@2026#Sec" traccar -e "UPDATE DATABASECHANGELOGLOCK SET LOCKED=0, LOCKGRANTED=NULL, LOCKEDBY=NULL WHERE ID=1;" 2>/dev/null || true
systemctl restart traccar
echo ">> Instalando telegram-bot..."
if [ -f ./deploy/telegram-bot/install.sh ]; then
  bash ./deploy/telegram-bot/install.sh
else
  echo "   deploy/telegram-bot/install.sh nao encontrado."
fi
