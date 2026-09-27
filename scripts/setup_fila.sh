#!/bin/bash
set -e

echo ">> [FILA] Verificando Python3..."
if ! command -v python3 >/dev/null 2>&1; then
  echo "   Instalando Python3..."
  apt-get update -qq
  apt-get install -y python3 python3-pip python3-venv
else
  echo "   Python3 ja instalado ($(python3 --version))."
fi

echo ">> [FILA] Verificando pymysql..."
if ! python3 -c "import pymysql" 2>/dev/null; then
  echo "   Instalando pymysql..."
  apt-get install -y python3-pip python3-pymysql 2>/dev/null || (python3 -m ensurepip --upgrade && python3 -m pip install --break-system-packages pymysql)
else
  echo "   pymysql ja instalado."
fi


echo ">> [FILA] Copiando scripts..."
mkdir -p /opt/traccar/scripts
cp "$(dirname "$0")/fila_financeiro.py" /opt/traccar/scripts/fila_financeiro.py
cp "$(dirname "$0")/sql_fila.sql" /opt/traccar/scripts/sql_fila.sql
chmod +x /opt/traccar/scripts/fila_financeiro.py

echo ">> [FILA] Criando tabela tc_fila_financeiro..."
mysql -u traccar_user -p"Traccar@2026#Sec" traccar < /opt/traccar/scripts/sql_fila.sql 2>/dev/null || true

echo ">> [FILA] Registrando cron jobs..."
CRON_LINHAS=$(cat <<CRONEOF
0 7 * * * /usr/bin/python3 /opt/traccar/scripts/fila_financeiro.py povoar >> /var/log/fila_financeiro.log 2>&1
0 0 * * * /usr/bin/python3 /opt/traccar/scripts/fila_financeiro.py limpar >> /var/log/fila_financeiro.log 2>&1
*/5 * * * * /usr/bin/python3 /opt/traccar/scripts/fila_financeiro.py processar >> /var/log/fila_financeiro.log 2>&1
CRONEOF
)

( crontab -l 2>/dev/null | grep -v "fila_financeiro.py" ; echo "$CRON_LINHAS" ) | crontab -
echo "   Cron registrado: povoar 7h, limpar 0h, processar a cada 5min."

echo ">> [FILA] Setup concluido!"

echo ">> [FILA] Verificando Flask..."
if ! python3 -c "import flask" 2>/dev/null; then
  echo "   Instalando Flask..."
  apt-get install -y python3-flask 2>/dev/null || python3 -m pip install --break-system-packages flask
else
  echo "   Flask ja instalado."
fi

echo ">> [FILA] Copiando api_fila.py..."
cp "$(dirname "$0")/api_fila.py" /opt/traccar/scripts/api_fila.py
chmod +x /opt/traccar/scripts/api_fila.py

echo ">> [FILA] Criando servico systemd fila-api..."
cat > /etc/systemd/system/fila-api.service << SERVICEEOF
[Unit]
Description=API Fila Financeiro
After=network.target mysql.service

[Service]
ExecStart=/usr/bin/python3 /opt/traccar/scripts/api_fila.py
Restart=always
User=root

[Install]
WantedBy=multi-user.target
SERVICEEOF
systemctl daemon-reload
systemctl enable fila-api
systemctl restart fila-api
echo "   Servico fila-api instalado e rodando."

echo ">> [FILA] Ajustando nginx..."
python3 "$(dirname "$0")/fix_nginx_fila.py"
nginx -t && systemctl reload nginx
echo "   Rota /api-financeiro/ verificada."

echo ">> [FILA] Setup concluido!"
