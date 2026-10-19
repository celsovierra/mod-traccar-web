#!/bin/bash
echo ">> Protegendo pasta media (fotos)..."
mkdir -p /opt/traccar/media
if [ -d /opt/traccar/web/media ]; then
  cp -rn /opt/traccar/web/media/* /opt/traccar/media/ 2>/dev/null || true
fi