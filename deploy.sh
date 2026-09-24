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
echo ">> Deploy concluido com sucesso!"





