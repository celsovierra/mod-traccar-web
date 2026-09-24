#!/bin/bash

# Entra na pasta do projeto sempre
cd "$(dirname "$(readlink -f "$0")")" || exit 1
git config --global --add safe.directory "$(pwd)" 2>/dev/null
git reset --hard HEAD 2>/dev/null

echo ">> Puxando atualizacoes do GitHub..."
git pull origin main
set -e

echo ">> Verificando Node.js..."
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
systemctl restart traccar

echo ">> Verificando comando global 'atualizar'..."
if [ ! -f /usr/local/bin/atualizar ]; then
  cat > /usr/local/bin/atualizar << INNEREOF
#!/bin/bash
cd "$PROJECT_DIR" || { echo "Pasta do projeto nao encontrada"; exit 1; }
./deploy.sh
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
if "location /api-deploy-trigger/" not in content:
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
    "geocoder.url": "https://nominatim.openstreetmap.org/reverse",
    "geocoder.ignorePositions": "false",
    "geocoder.onRequest": "true",
    "geocoder.processInvalidPositions": "false",
    "geocoder.reuseDistance": "100",
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
  systemctl restart traccar
  sleep 15
  echo "   traccar.xml atualizado e traccar reiniciado."
else
  echo "   /opt/traccar/conf/traccar.xml nao encontrado, ignorando."
fi
echo ""
echo ">> Deploy concluido com sucesso!"





