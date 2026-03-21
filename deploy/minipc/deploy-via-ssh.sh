#!/usr/bin/env bash

set -euo pipefail

TARGET_HOST="${TARGET_HOST:-}"
TARGET_USER="${TARGET_USER:-root}"
TARGET_PATH="${TARGET_PATH:-/opt/trazabilidad}"
SSH_PORT="${SSH_PORT:-22}"
SSH_IDENTITY="${SSH_IDENTITY:-}"
RUN_INSTALL="${RUN_INSTALL:-1}"
RUN_BUILD="${RUN_BUILD:-1}"
RESTART_SERVICE="${RESTART_SERVICE:-0}"
SERVICE_NAME="${SERVICE_NAME:-trazabilidad.service}"

if [[ -z "$TARGET_HOST" ]]; then
  echo "Falta TARGET_HOST"
  echo "Ejemplo: TARGET_HOST=192.168.1.80 TARGET_USER=root bash deploy/minipc/deploy-via-ssh.sh"
  exit 1
fi

REMOTE="$TARGET_USER@$TARGET_HOST"
SSH_CMD="ssh -p $SSH_PORT"

if [[ -n "$SSH_IDENTITY" ]]; then
  SSH_CMD="$SSH_CMD -i $SSH_IDENTITY"
fi

echo "==> Preparando ruta remota $TARGET_PATH"
$SSH_CMD "$REMOTE" "mkdir -p '$TARGET_PATH'"

echo "==> Sincronizando proyecto"
rsync -az --delete \
  --exclude '.git/' \
  --exclude 'node_modules/' \
  --exclude 'dist/' \
  --exclude 'local_mirror/' \
  --exclude 'local_iot/' \
  --exclude 'credenciales.json' \
  -e "$SSH_CMD" \
  ./ "$REMOTE:$TARGET_PATH/"

if [[ "$RUN_INSTALL" == "1" ]]; then
  echo "==> Instalando dependencias en remoto"
  $SSH_CMD "$REMOTE" "cd '$TARGET_PATH' && npm install"
fi

if [[ "$RUN_BUILD" == "1" ]]; then
  echo "==> Compilando frontend en remoto"
  $SSH_CMD "$REMOTE" "cd '$TARGET_PATH' && npm run build"
fi

if [[ "$RESTART_SERVICE" == "1" ]]; then
  echo "==> Reiniciando servicio remoto $SERVICE_NAME"
  $SSH_CMD "$REMOTE" "systemctl restart '$SERVICE_NAME' && systemctl is-active '$SERVICE_NAME'"
fi

echo "==> Despliegue completado"
echo "Siguiente paso sugerido en el host remoto:"
echo "cd '$TARGET_PATH' && npm run server"
