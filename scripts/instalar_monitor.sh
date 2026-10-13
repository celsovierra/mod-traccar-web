#!/bin/bash
# Instala monitor_traccar.sh e cron a cada 1 min (so se nao existir)
SRC=/root/mod-traccar-web/scripts/monitor_traccar.sh
DST=/opt/traccar/scripts/monitor_traccar.sh

if [ ! -f "$DST" ]; then
  cp "$SRC" "$DST"
  chmod +x "$DST"
  echo "monitor instalado"
else
  echo "monitor ja existe"
fi

CRON="* * * * * $DST >/dev/null 2>&1"
if ! crontab -l 2>/dev/null | grep -q "monitor_traccar.sh"; then
  (crontab -l 2>/dev/null; echo "$CRON") | crontab -
  echo "cron adicionado"
else
  echo "cron ja existe"
fi
