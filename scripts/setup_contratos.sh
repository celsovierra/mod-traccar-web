#!/bin/bash
set -e

echo ">> [CONTRATOS] Verificando Python3..."
if ! command -v python3 >/dev/null 2>&1; then
  apt-get update -qq
  apt-get install -y python3 python3-pip
fi

echo ">> [CONTRATOS] Verificando Flask..."
if ! python3 -c "import flask" 2>/dev/null; then
  apt-get install -y python3-flask 2>/dev/null || python3 -m pip install --break-system-packages flask
fi

echo ">> [CONTRATOS] Copiando API..."
mkdir -p /opt/traccar/scripts
cp "$(dirname "$0")/api_contratos.py" /opt/traccar/scripts/api_contratos.py
chmod +x /opt/traccar/scripts/api_contratos.py

echo ">> [CONTRATOS] Criando tabelas..."
mysql -u traccar_user -p"Traccar@2026#Sec" traccar < "$(dirname "$0")/sql_contratos.sql" 2>/dev/null || true

echo ">> [CONTRATOS] Criando servico systemd..."
cat > /etc/systemd/system/contratos-api.service << SERVICEEOF
[Unit]
Description=API Contratos
After=network.target mysql.service

[Service]
ExecStart=/usr/bin/python3 /opt/traccar/scripts/api_contratos.py
Restart=always
User=root

[Install]
WantedBy=multi-user.target
SERVICEEOF
systemctl daemon-reload
systemctl enable contratos-api
systemctl restart contratos-api
echo "   Servico contratos-api instalado e rodando."

echo ">> [CONTRATOS] Ajustando nginx..."
python3 "$(dirname "$0")/fix_nginx_contratos.py"
nginx -t && systemctl reload nginx
echo "   Rota /api-contratos/ verificada."

echo ">> [CONTRATOS] Setup concluido!"
