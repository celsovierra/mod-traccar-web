#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Atualizando device-edit-proxy..."
cp "$SCRIPT_DIR/server.js" /opt/device-edit-proxy/server.js
systemctl restart device-edit-proxy
echo "device-edit-proxy atualizado e reiniciado."
systemctl status device-edit-proxy --no-pager
