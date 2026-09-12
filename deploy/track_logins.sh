#!/bin/bash
DB_USER="traccar_user"
DB_PASS="Traccar@2026#Sec"
DB_NAME="traccar"

tail -F -n0 /opt/traccar/logs/tracker-server.log | while read -r line; do
  if echo "$line" | grep -qE "action: login"; then
    USER_ID=$(echo "$line" | grep -oP 'user: \K[0-9]+')
    if [[ -n "$USER_ID" ]]; then
      NOW=$(date -u +"%Y-%m-%dT%H:%M:%S.000+00:00")
      mysql -u "$DB_USER" -p"$DB_PASS" -D "$DB_NAME" -e \
        "UPDATE tc_users SET attributes = JSON_SET(COALESCE(attributes, '{}'), '\$.lastUpdate', '$NOW') WHERE id = $USER_ID;"
    fi
  fi
done
