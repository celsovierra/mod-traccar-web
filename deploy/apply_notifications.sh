#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_USER="traccar_user"
DB_PASS="Traccar@2026#Sec"
DB_NAME="traccar"

mysql -u "$DB_USER" -p"$DB_PASS" -D "$DB_NAME" < "$SCRIPT_DIR/sql/default_notifications.sql"
echo "Notificacoes padrao aplicadas com sucesso."
