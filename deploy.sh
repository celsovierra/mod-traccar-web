#!/bin/bash
set -e

echo ">> Verificando fuso horario..."
CURRENT_TZ=$(timedatectl show --property=Timezone --value)
if [ "$CURRENT_TZ" != "America/Fortaleza" ]; then
  echo "   Fuso errado ($CURRENT_TZ). Corrigindo para America/Fortaleza..."
  timedatectl set-timezone America/Fortaleza
else
  echo "   Fuso ja esta correto (America/Fortaleza)."
fi

cd /root/mod-traccar-web

echo ">> Puxando atualizacoes do GitHub..."
git pull origin main

echo ">> Instalando dependencias..."
npm install

echo ">> Gerando build de producao..."
npm run build

echo ">> Fazendo backup da pasta web atual..."
cp -r /opt/traccar/web /opt/traccar/web_backup_$(date +%Y%m%d_%H%M%S)

echo ">> Publicando novo build..."
rm -rf /opt/traccar/web/*
cp -r build/* /opt/traccar/web/

echo ">> Reiniciando Traccar..."
systemctl restart traccar

echo ">> Deploy concluido com sucesso!"