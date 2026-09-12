#!/bin/bash
set -e

SERVICE_FILE="/etc/systemd/system/traccar.service"

if grep -q "user.timezone" "$SERVICE_FILE"; then
  echo "Fuso horario ja configurado no servico."
else
  sed -i 's|ExecStart=/opt/traccar/jre/bin/java -jar tracker-server.jar conf/traccar.xml|ExecStart=/opt/traccar/jre/bin/java -Duser.timezone=America/Fortaleza -jar tracker-server.jar conf/traccar.xml|' "$SERVICE_FILE"
  systemctl daemon-reload
  systemctl restart traccar
  echo "Fuso horario America/Fortaleza aplicado e servico reiniciado."
fi

systemctl status traccar --no-pager
