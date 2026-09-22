#!/bin/bash
set -e

if command -v npm >/dev/null 2>&1; then
  echo "==> npm encontrado, gerando build de producao..."
  npm run build
else
  echo "==> npm nao encontrado nessa maquina - usando a pasta build que ja veio do GitHub..."
fi

echo "==> Copiando para a pasta que o Traccar realmente serve (/opt/traccar/web)..."
rm -rf /opt/traccar/web/*
cp -r build/* /opt/traccar/web/
echo "==> Deploy concluido! Site atualizado."
