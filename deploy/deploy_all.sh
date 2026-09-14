#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== 1. Instalando dependencias e buildando frontend ==="
cd "$PROJECT_DIR"
npm install
npm run build

echo "=== 2. Publicando build no Traccar ==="
rm -rf /opt/traccar/web.bak
mv /opt/traccar/web /opt/traccar/web.bak
cp -a build /opt/traccar/web

echo "=== 3. Reiniciando Traccar ==="
systemctl restart traccar

echo "=== 4. Aplicando servicos auxiliares (idempotente) ==="
bash "$SCRIPT_DIR/device-edit-proxy/install_device_edit_proxy.sh" || true
bash "$SCRIPT_DIR/fix_timezone.sh" || true
bash "$SCRIPT_DIR/install.sh" || true

echo "=== Deploy completo! ==="
