#!/bin/bash
set -e
echo "==> Gerando build de producao..."
npm run build
echo "==> Copiando para a pasta que o Traccar realmente serve (/opt/traccar/web)..."
cp -r build/* /opt/traccar/web/
echo "==> Deploy concluido! Site atualizado."
