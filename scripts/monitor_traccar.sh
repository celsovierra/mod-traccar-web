#!/bin/bash
# Monitor Traccar: reinicia se cair ou travar no changelog lock
LOG=/var/log/monitor_traccar.log
DB_USER="traccar"
DB_PASS="Traccar@2026#Sec"
DB_NAME="traccar"

status=$(systemctl is-active traccar)
if [ "$status" != "active" ]; then
  echo "$(date) - traccar $status - reiniciando" >> $LOG
  systemctl restart traccar
  exit 0
fi

if journalctl -u traccar --since "2 minutes ago" --no-pager | grep -q "Waiting for changelog lock"; then
  echo "$(date) - travado no changelog lock - limpando" >> $LOG
  mysql -u $DB_USER -p"$DB_PASS" $DB_NAME -e "UPDATE DATABASECHANGELOGLOCK SET LOCKED=0, LOCKGRANTED=NULL, LOCKEDBY=NULL WHERE ID=1;" 2>/dev/null
  systemctl restart traccar
fi

# Disco cheio (>90%) - limpa logs antigos
USO=$(df / | tail -1 | awk '{print $5}' | tr -d '%')
if [ "$USO" -gt 90 ]; then
  echo "$(date) - disco $USO% - limpando logs" >> $LOG
  find /opt/traccar/logs -name "*.log.*" -mtime +3 -delete 2>/dev/null
  find /var/log -name "*.gz" -mtime +7 -delete 2>/dev/null
  journalctl --vacuum-time=3d >/dev/null 2>&1
fi

# MySQL
if ! systemctl is-active --quiet mysql; then
  echo "$(date) - mysql caiu - reiniciando" >> $LOG
  systemctl restart mysql
fi

# Nginx
if ! systemctl is-active --quiet nginx; then
  echo "$(date) - nginx caiu - reiniciando" >> $LOG
  systemctl restart nginx
fi

# api_fila
if systemctl list-unit-files | grep -q "fila-api"; then
  if ! systemctl is-active --quiet fila-api; then
    echo "$(date) - fila-api caiu - reiniciando" >> $LOG
    systemctl restart fila-api
  fi
fi

# telegram-bot
if systemctl list-unit-files | grep -q "telegram-bot"; then
  if ! systemctl is-active --quiet telegram-bot; then
    echo "$(date) - telegram-bot caiu - reiniciando" >> $LOG
    systemctl restart telegram-bot
  fi
fi
