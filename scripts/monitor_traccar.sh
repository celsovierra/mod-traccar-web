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
